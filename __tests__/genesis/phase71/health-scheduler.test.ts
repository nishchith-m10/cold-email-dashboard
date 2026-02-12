/**
 * GENESIS PHASE 71: HEALTH SCHEDULER TESTS
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CheckRegistry } from '../../../lib/genesis/phase71/check-registry';
import {
  HealthCheckScheduler,
  InMemoryHealthStore,
} from '../../../lib/genesis/phase71/health-scheduler';
import { HealthCheck, HealthCheckResult } from '../../../lib/genesis/phase71/types';

function makeCheck(
  id: string,
  status: 'ok' | 'degraded' | 'error' = 'ok',
  latencyMs: number = 50,
): HealthCheck {
  return {
    id,
    name: `Service ${id}`,
    category: 'ai',
    criticalLevel: 'medium',
    fixPath: '/settings',
    enabled: true,
    timeoutMs: 5000,
    check: async (): Promise<HealthCheckResult> => ({
      status,
      latencyMs,
      message: `${id} is ${status}`,
      checkedAt: new Date().toISOString(),
    }),
  };
}

describe('HealthCheckScheduler - Tick', () => {
  it('should execute a tick and produce a report', async () => {
    const registry = new CheckRegistry([
      makeCheck('a'),
      makeCheck('b'),
    ]);
    const store = new InMemoryHealthStore();
    const scheduler = new HealthCheckScheduler({ registry, store });

    const report = await scheduler.tick();

    expect(report.services).toHaveLength(2);
    expect(report.overallStatus).toBe('ok');
  });

  it('should store snapshot after tick', async () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const store = new InMemoryHealthStore();
    const scheduler = new HealthCheckScheduler({ registry, store });

    await scheduler.tick();

    const snapshots = store.getAll();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].overall_status).toBe('ok');
  });

  it('should store multiple snapshots over multiple ticks', async () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const store = new InMemoryHealthStore();
    const scheduler = new HealthCheckScheduler({ registry, store });

    await scheduler.tick();
    await scheduler.tick();
    await scheduler.tick();

    expect(store.getAll()).toHaveLength(3);
  });

  it('should record error status in snapshot', async () => {
    const registry = new CheckRegistry([makeCheck('db', 'error')]);
    const store = new InMemoryHealthStore();
    const scheduler = new HealthCheckScheduler({ registry, store });

    await scheduler.tick();

    const snapshot = store.getAll()[0];
    expect(snapshot.overall_status).toBe('error');
    expect(snapshot.error_count).toBe(1);
  });
});

describe('HealthCheckScheduler - History', () => {
  it('should return history from store', async () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const store = new InMemoryHealthStore();
    const scheduler = new HealthCheckScheduler({ registry, store });

    await scheduler.tick();
    await scheduler.tick();

    const history = await scheduler.getHistory(10);
    expect(history).toHaveLength(2);
    // Most recent first
    expect(
      new Date(history[0].timestamp).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(history[1].timestamp).getTime(),
    );
  });

  it('should return latest snapshot', async () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const store = new InMemoryHealthStore();
    const scheduler = new HealthCheckScheduler({ registry, store });

    await scheduler.tick();
    await scheduler.tick();

    const latest = await scheduler.getLatestSnapshot();
    expect(latest).not.toBeNull();
  });

  it('should return null if no snapshots', async () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const scheduler = new HealthCheckScheduler({ registry });

    const latest = await scheduler.getLatestSnapshot();
    expect(latest).toBeNull();
  });
});

describe('HealthCheckScheduler - Last Report', () => {
  it('should track the last report', async () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const scheduler = new HealthCheckScheduler({ registry });

    expect(scheduler.getLastReport()).toBeNull();

    await scheduler.tick();

    const report = scheduler.getLastReport();
    expect(report).not.toBeNull();
    expect(report!.services).toHaveLength(1);
  });
});

describe('HealthCheckScheduler - RunNow', () => {
  it('should force an immediate check', async () => {
    const registry = new CheckRegistry([makeCheck('a', 'degraded')]);
    const scheduler = new HealthCheckScheduler({ registry });

    const report = await scheduler.runNow();

    expect(report.overallStatus).toBe('degraded');
    expect(scheduler.getLastReport()?.overallStatus).toBe('degraded');
  });
});

describe('HealthCheckScheduler - Lifecycle', () => {
  let scheduler: HealthCheckScheduler;

  afterEach(() => {
    scheduler?.stop();
  });

  it('should start and stop the scheduler', () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    scheduler = new HealthCheckScheduler({
      registry,
      config: { checkIntervalMinutes: 1 },
    });

    expect(scheduler.isRunning()).toBe(false);

    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('should not start if disabled', () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    scheduler = new HealthCheckScheduler({
      registry,
      config: { enabled: false },
    });

    scheduler.start();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('should be idempotent on multiple starts', () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    scheduler = new HealthCheckScheduler({
      registry,
      config: { checkIntervalMinutes: 1 },
    });

    scheduler.start();
    scheduler.start(); // should not double-start

    expect(scheduler.isRunning()).toBe(true);
  });
});

describe('HealthCheckScheduler - Diagnostics & Alerts', () => {
  it('should expose diagnostic engine', () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const scheduler = new HealthCheckScheduler({ registry });

    expect(scheduler.getDiagnosticEngine()).toBeDefined();
  });

  it('should expose alert manager', () => {
    const registry = new CheckRegistry([makeCheck('a')]);
    const scheduler = new HealthCheckScheduler({ registry });

    expect(scheduler.getAlertManager()).toBeDefined();
  });

  it('should trigger alerts on error reports', async () => {
    const registry = new CheckRegistry([makeCheck('db', 'error')]);
    const scheduler = new HealthCheckScheduler({ registry });

    await scheduler.tick();

    const alertManager = scheduler.getAlertManager();
    expect(alertManager.totalAlerts).toBeGreaterThan(0);
  });
});

describe('InMemoryHealthStore', () => {
  it('should save and retrieve snapshots', async () => {
    const store = new InMemoryHealthStore();

    await store.save({
      id: 'snap-1',
      timestamp: new Date().toISOString(),
      overall_status: 'ok',
      services: {},
      issue_count: 0,
      degraded_count: 0,
      error_count: 0,
      total_latency_ms: 100,
      created_at: new Date().toISOString(),
    });

    const latest = await store.getLatest();
    expect(latest).not.toBeNull();
    expect(latest!.id).toBe('snap-1');
  });

  it('should delete snapshots older than N days', async () => {
    const store = new InMemoryHealthStore();
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date().toISOString();

    await store.save({
      id: 'old',
      timestamp: old,
      overall_status: 'ok',
      services: {},
      issue_count: 0,
      degraded_count: 0,
      error_count: 0,
      total_latency_ms: 0,
      created_at: old,
    });

    await store.save({
      id: 'recent',
      timestamp: recent,
      overall_status: 'ok',
      services: {},
      issue_count: 0,
      degraded_count: 0,
      error_count: 0,
      total_latency_ms: 0,
      created_at: recent,
    });

    const deleted = await store.deleteOlderThan(30);

    expect(deleted).toBe(1);
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].id).toBe('recent');
  });

  it('should clear all snapshots', async () => {
    const store = new InMemoryHealthStore();
    await store.save({
      id: 'snap-1',
      timestamp: new Date().toISOString(),
      overall_status: 'ok',
      services: {},
      issue_count: 0,
      degraded_count: 0,
      error_count: 0,
      total_latency_ms: 0,
      created_at: new Date().toISOString(),
    });

    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });
});
