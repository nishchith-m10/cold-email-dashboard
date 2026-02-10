/**
 * GENESIS PHASE 71: HEALTH RUNNER TESTS
 *
 * Tests for the core orchestration engine — concurrency, timeout
 * enforcement, retry logic, report building.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CheckRegistry } from '../../../lib/genesis/phase71/check-registry';
import { HealthRunner } from '../../../lib/genesis/phase71/health-runner';
import { HealthCheck, HealthCheckResult } from '../../../lib/genesis/phase71/types';

function makeCheck(
  id: string,
  checkFn: () => Promise<HealthCheckResult>,
  overrides: Partial<HealthCheck> = {},
): HealthCheck {
  return {
    id,
    name: overrides.name ?? `Service ${id}`,
    category: overrides.category ?? 'ai',
    criticalLevel: overrides.criticalLevel ?? 'medium',
    fixPath: overrides.fixPath ?? '/settings',
    enabled: overrides.enabled ?? true,
    timeoutMs: overrides.timeoutMs ?? 5000,
    check: checkFn,
  };
}

function okCheck(id: string, latencyMs: number = 50): HealthCheck {
  return makeCheck(id, async () => {
    await delay(latencyMs);
    return { status: 'ok', latencyMs, checkedAt: new Date().toISOString() };
  });
}

function errorCheck(id: string, error: string = 'Something broke'): HealthCheck {
  return makeCheck(id, async () => ({
    status: 'error',
    error,
    checkedAt: new Date().toISOString(),
  }));
}

function degradedCheck(id: string): HealthCheck {
  return makeCheck(id, async () => ({
    status: 'degraded',
    message: 'Slightly broken',
    checkedAt: new Date().toISOString(),
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('HealthRunner - Basic Execution', () => {
  it('should run all enabled checks and produce a report', async () => {
    const registry = new CheckRegistry([okCheck('a'), okCheck('b'), okCheck('c')]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();

    expect(report.services).toHaveLength(3);
    expect(report.overallStatus).toBe('ok');
    expect(report.issueCount).toBe(0);
    expect(report.errorCount).toBe(0);
    expect(report.degradedCount).toBe(0);
    expect(report.id).toMatch(/^rpt-/);
    expect(report.timestamp).toBeTruthy();
  });

  it('should skip disabled checks', async () => {
    const registry = new CheckRegistry([
      okCheck('a'),
      makeCheck('disabled', async () => ({ status: 'ok', checkedAt: new Date().toISOString() }), { enabled: false }),
    ]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();

    expect(report.services).toHaveLength(1);
    expect(report.services[0].id).toBe('a');
  });

  it('should run a single check by id', async () => {
    const registry = new CheckRegistry([okCheck('target'), okCheck('other')]);
    const runner = new HealthRunner(registry);

    const result = await runner.runOne('target');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('target');
    expect(result!.status).toBe('ok');
  });

  it('should return null for unknown check id', async () => {
    const registry = new CheckRegistry([okCheck('a')]);
    const runner = new HealthRunner(registry);

    expect(await runner.runOne('nonexistent')).toBeNull();
  });
});

describe('HealthRunner - Overall Status', () => {
  it('should report "error" if any service is in error', async () => {
    const registry = new CheckRegistry([
      okCheck('a'),
      errorCheck('b'),
      okCheck('c'),
    ]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();

    expect(report.overallStatus).toBe('error');
    expect(report.errorCount).toBe(1);
    expect(report.issueCount).toBe(1);
  });

  it('should report "degraded" if worst is degraded', async () => {
    const registry = new CheckRegistry([
      okCheck('a'),
      degradedCheck('b'),
      okCheck('c'),
    ]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();

    expect(report.overallStatus).toBe('degraded');
    expect(report.degradedCount).toBe(1);
  });

  it('should report "error" even if degraded is also present', async () => {
    const registry = new CheckRegistry([
      degradedCheck('a'),
      errorCheck('b'),
    ]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();

    expect(report.overallStatus).toBe('error');
    expect(report.errorCount).toBe(1);
    expect(report.degradedCount).toBe(1);
    expect(report.issueCount).toBe(2);
  });
});

describe('HealthRunner - Timeout Enforcement', () => {
  it('should timeout a check that takes too long', async () => {
    const slowCheck = makeCheck(
      'slow',
      async () => {
        await delay(5000); // takes 5s
        return { status: 'ok', checkedAt: new Date().toISOString() };
      },
      { timeoutMs: 200 }, // timeout after 200ms
    );

    const registry = new CheckRegistry([slowCheck]);
    const runner = new HealthRunner(registry, { retryCount: 0 });

    const report = await runner.runAll();

    expect(report.services[0].status).toBe('error');
    expect(report.services[0].result.error).toContain('Timed out');
  }, 10000);
});

describe('HealthRunner - Retry Logic', () => {
  it('should retry transient errors and succeed on second attempt', async () => {
    let attempts = 0;
    const flaky = makeCheck('flaky', async () => {
      attempts++;
      if (attempts === 1) {
        return { status: 'error', error: 'Network glitch', checkedAt: new Date().toISOString() };
      }
      return { status: 'ok', checkedAt: new Date().toISOString() };
    });

    const registry = new CheckRegistry([flaky]);
    const runner = new HealthRunner(registry, { retryCount: 2, retryDelayMs: 10 });

    const report = await runner.runAll();

    expect(report.services[0].status).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('should NOT retry auth errors (non-transient)', async () => {
    let attempts = 0;
    const authFail = makeCheck('auth', async () => {
      attempts++;
      return {
        status: 'error',
        error: 'Invalid API key',
        checkedAt: new Date().toISOString(),
      };
    });

    const registry = new CheckRegistry([authFail]);
    const runner = new HealthRunner(registry, { retryCount: 3, retryDelayMs: 10 });

    const report = await runner.runAll();

    expect(report.services[0].status).toBe('error');
    expect(attempts).toBe(1); // No retries for auth errors
  });

  it('should NOT retry config-missing errors', async () => {
    let attempts = 0;
    const configMissing = makeCheck('config', async () => {
      attempts++;
      return {
        status: 'error',
        error: 'Redis URL not configured',
        checkedAt: new Date().toISOString(),
      };
    });

    const registry = new CheckRegistry([configMissing]);
    const runner = new HealthRunner(registry, { retryCount: 3, retryDelayMs: 10 });

    await runner.runAll();

    expect(attempts).toBe(1);
  });

  it('should exhaust retries and report last error', async () => {
    let attempts = 0;
    const persistent = makeCheck('persistent', async () => {
      attempts++;
      return {
        status: 'error',
        error: 'Connection refused',
        checkedAt: new Date().toISOString(),
      };
    });

    const registry = new CheckRegistry([persistent]);
    const runner = new HealthRunner(registry, { retryCount: 2, retryDelayMs: 10 });

    const report = await runner.runAll();

    expect(report.services[0].status).toBe('error');
    expect(report.services[0].result.error).toBe('Connection refused');
    expect(attempts).toBe(3); // 1 initial + 2 retries
  });
});

describe('HealthRunner - Report Metadata', () => {
  it('should track totalLatencyMs across all checks', async () => {
    const registry = new CheckRegistry([
      okCheck('a', 100),
      okCheck('b', 200),
    ]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();

    expect(report.totalLatencyMs).toBe(300);
  });

  it('should identify the slowest service', async () => {
    const registry = new CheckRegistry([
      okCheck('fast', 10),
      okCheck('slow', 500),
      okCheck('medium', 100),
    ]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();

    expect(report.slowestService).toBe('Service slow');
  });

  it('should populate service metadata correctly', async () => {
    const registry = new CheckRegistry([
      makeCheck('test', async () => ({
        status: 'ok',
        latencyMs: 42,
        quotaUsed: 60,
        quotaLimit: 100,
        message: 'All good',
        checkedAt: new Date().toISOString(),
      }), {
        name: 'Test Service',
        category: 'integration',
        criticalLevel: 'high',
        fixPath: '/fix/me',
      }),
    ]);
    const runner = new HealthRunner(registry);

    const report = await runner.runAll();
    const svc = report.services[0];

    expect(svc.id).toBe('test');
    expect(svc.name).toBe('Test Service');
    expect(svc.category).toBe('integration');
    expect(svc.criticalLevel).toBe('high');
    expect(svc.fixPath).toBe('/fix/me');
    expect(svc.result.quotaUsed).toBe(60);
    expect(svc.result.message).toBe('All good');
  });
});

describe('HealthRunner - Concurrency', () => {
  it('should respect concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const checks: HealthCheck[] = [];
    for (let i = 0; i < 10; i++) {
      checks.push(
        makeCheck(`c-${i}`, async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await delay(50);
          concurrent--;
          return { status: 'ok', checkedAt: new Date().toISOString() };
        }),
      );
    }

    const registry = new CheckRegistry(checks);
    const runner = new HealthRunner(registry, { concurrency: 3 });

    await runner.runAll();

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  }, 10000);
});
