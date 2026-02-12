/**
 * GENESIS PHASE 71: ALERT MANAGER TESTS
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AlertManager, AlertDispatcher } from '../../../lib/genesis/phase71/alert-manager';
import {
  HealthReport,
  Alert,
  AlertRule,
  ALERT_THRESHOLDS,
} from '../../../lib/genesis/phase71/types';

function makeReport(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    id: 'rpt-1',
    timestamp: new Date().toISOString(),
    overallStatus: overrides.overallStatus ?? 'ok',
    services: overrides.services ?? [],
    issueCount: overrides.issueCount ?? 0,
    degradedCount: overrides.degradedCount ?? 0,
    errorCount: overrides.errorCount ?? 0,
    totalLatencyMs: overrides.totalLatencyMs ?? 100,
    slowestService: overrides.slowestService,
  };
}

function makeErrorReport(): HealthReport {
  return makeReport({
    overallStatus: 'error',
    issueCount: 1,
    errorCount: 1,
    services: [
      {
        id: 'supabase',
        name: 'Supabase',
        category: 'infrastructure',
        criticalLevel: 'critical',
        status: 'error',
        result: {
          status: 'error',
          error: 'Connection timeout',
          checkedAt: new Date().toISOString(),
        },
        fixPath: '/admin/database',
      },
    ],
  });
}

function makeDegradedReport(): HealthReport {
  return makeReport({
    overallStatus: 'degraded',
    issueCount: 1,
    degradedCount: 1,
    services: [
      {
        id: 'openai',
        name: 'OpenAI',
        category: 'ai',
        criticalLevel: 'critical',
        status: 'degraded',
        result: {
          status: 'degraded',
          latencyMs: 6000,
          message: 'High latency',
          checkedAt: new Date().toISOString(),
        },
        fixPath: '/settings/api-keys#openai',
      },
    ],
  });
}

class MockDispatcher implements AlertDispatcher {
  channel: 'email' | 'slack' | 'webhook';
  sent: Alert[] = [];

  constructor(channel: 'email' | 'slack' | 'webhook') {
    this.channel = channel;
  }

  async send(alert: Alert): Promise<void> {
    this.sent.push(alert);
  }
}

describe('AlertManager - Rule Evaluation', () => {
  it('should not trigger alerts for healthy report', async () => {
    const manager = new AlertManager();
    const report = makeReport({ overallStatus: 'ok' });

    const alerts = await manager.evaluate(report);

    expect(alerts).toHaveLength(0);
  });

  it('should trigger alert for error status', async () => {
    const manager = new AlertManager();
    const report = makeErrorReport();

    const alerts = await manager.evaluate(report);

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].services).toContain('Supabase');
  });

  it('should trigger alert for degraded status', async () => {
    const manager = new AlertManager();
    const report = makeDegradedReport();

    const alerts = await manager.evaluate(report);

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe('warning');
  });
});

describe('AlertManager - Cooldown', () => {
  it('should not re-alert during cooldown period', async () => {
    const rules: AlertRule[] = [
      {
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        conditions: [{ type: 'status', operator: '=', value: 'error' }],
        channels: [],
        cooldownMinutes: 60,
      },
    ];

    const manager = new AlertManager(rules);
    const report = makeErrorReport();

    // First evaluation — should alert
    const alerts1 = await manager.evaluate(report);
    expect(alerts1).toHaveLength(1);

    // Second evaluation immediately — should be in cooldown
    const alerts2 = await manager.evaluate(report);
    expect(alerts2).toHaveLength(0);
  });
});

describe('AlertManager - Consecutive Failures', () => {
  it('should track consecutive failures across evaluations', async () => {
    const manager = new AlertManager();
    const errorReport = makeErrorReport();

    // Evaluate multiple times to build up consecutive failures
    await manager.evaluate(errorReport);
    expect(manager.getConsecutiveFailures('supabase')).toBe(1);

    await manager.evaluate(errorReport);
    expect(manager.getConsecutiveFailures('supabase')).toBe(2);

    await manager.evaluate(errorReport);
    expect(manager.getConsecutiveFailures('supabase')).toBe(3);
  });

  it('should reset consecutive failures when service recovers', async () => {
    const manager = new AlertManager();

    // Fail twice
    await manager.evaluate(makeErrorReport());
    await manager.evaluate(makeErrorReport());
    expect(manager.getConsecutiveFailures('supabase')).toBe(2);

    // Recover
    const okReport = makeReport({
      overallStatus: 'ok',
      services: [
        {
          id: 'supabase',
          name: 'Supabase',
          category: 'infrastructure',
          criticalLevel: 'critical',
          status: 'ok',
          result: { status: 'ok', checkedAt: new Date().toISOString() },
          fixPath: '/admin',
        },
      ],
    });
    await manager.evaluate(okReport);

    expect(manager.getConsecutiveFailures('supabase')).toBe(0);
  });
});

describe('AlertManager - Dispatch', () => {
  it('should dispatch alerts through configured channels', async () => {
    const emailDispatcher = new MockDispatcher('email');
    const slackDispatcher = new MockDispatcher('slack');

    const manager = new AlertManager(undefined, [emailDispatcher, slackDispatcher]);
    const report = makeErrorReport();

    await manager.evaluate(report);

    // The default "critical-error" rule dispatches to email + slack
    expect(emailDispatcher.sent.length).toBeGreaterThan(0);
    expect(slackDispatcher.sent.length).toBeGreaterThan(0);
  });

  it('should not crash if dispatcher is not registered for a channel', async () => {
    const manager = new AlertManager(); // No dispatchers
    const report = makeErrorReport();

    // Should not throw
    const alerts = await manager.evaluate(report);
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should register dispatcher at runtime', async () => {
    const manager = new AlertManager();
    const webhook = new MockDispatcher('webhook');

    manager.registerDispatcher(webhook);

    // Create a rule that dispatches to webhook
    const rules: AlertRule[] = [
      {
        id: 'webhook-rule',
        name: 'Webhook Alert',
        enabled: true,
        conditions: [{ type: 'status', operator: '=', value: 'error' }],
        channels: ['webhook'],
        cooldownMinutes: 0,
      },
    ];

    const manager2 = new AlertManager(rules, [webhook]);
    await manager2.evaluate(makeErrorReport());

    expect(webhook.sent.length).toBeGreaterThan(0);
  });
});

describe('AlertManager - Alert History', () => {
  it('should track alert history', async () => {
    const rules: AlertRule[] = [
      {
        id: 'no-cooldown',
        name: 'No Cooldown',
        enabled: true,
        conditions: [{ type: 'status', operator: '=', value: 'error' }],
        channels: [],
        cooldownMinutes: 0, // No cooldown for testing
      },
    ];

    const manager = new AlertManager(rules);

    await manager.evaluate(makeErrorReport());
    await manager.evaluate(makeErrorReport());
    await manager.evaluate(makeErrorReport());

    expect(manager.totalAlerts).toBe(3);
    expect(manager.getAlerts()).toHaveLength(3);
    expect(manager.getAlerts(2)).toHaveLength(2);
  });

  it('should acknowledge alerts', async () => {
    const rules: AlertRule[] = [
      {
        id: 'ack-test',
        name: 'Ack Test',
        enabled: true,
        conditions: [{ type: 'status', operator: '=', value: 'error' }],
        channels: [],
        cooldownMinutes: 0,
      },
    ];

    const manager = new AlertManager(rules);
    const [alert] = await manager.evaluate(makeErrorReport());

    expect(manager.getUnacknowledged()).toHaveLength(1);

    const result = manager.acknowledge(alert.id, 'admin@example.com');

    expect(result).toBe(true);
    expect(manager.getUnacknowledged()).toHaveLength(0);

    const acked = manager.getAlerts()[0];
    expect(acked.acknowledged).toBe(true);
    expect(acked.acknowledgedBy).toBe('admin@example.com');
    expect(acked.acknowledgedAt).toBeTruthy();
  });

  it('should return false when acknowledging unknown alert', () => {
    const manager = new AlertManager();
    expect(manager.acknowledge('nonexistent', 'admin')).toBe(false);
  });

  it('should clear alerts', async () => {
    const rules: AlertRule[] = [
      {
        id: 'clear-test',
        name: 'Clear Test',
        enabled: true,
        conditions: [{ type: 'status', operator: '=', value: 'error' }],
        channels: [],
        cooldownMinutes: 0,
      },
    ];

    const manager = new AlertManager(rules);
    await manager.evaluate(makeErrorReport());
    expect(manager.totalAlerts).toBe(1);

    manager.clearAlerts();
    expect(manager.totalAlerts).toBe(0);
  });
});

describe('AlertManager - Latency & Quota Rules', () => {
  it('should trigger alert for high latency', async () => {
    const rules: AlertRule[] = [
      {
        id: 'latency-rule',
        name: 'Latency Alert',
        enabled: true,
        conditions: [{ type: 'latency', operator: '>', value: 5000 }],
        channels: [],
        cooldownMinutes: 0,
      },
    ];

    const manager = new AlertManager(rules);
    const report = makeReport({
      overallStatus: 'ok',
      services: [
        {
          id: 'slow',
          name: 'Slow Service',
          category: 'ai',
          criticalLevel: 'medium',
          status: 'ok',
          result: { status: 'ok', latencyMs: 8000, checkedAt: new Date().toISOString() },
          fixPath: '/settings',
        },
      ],
    });

    const alerts = await manager.evaluate(report);

    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should trigger alert when quota exceeds threshold', async () => {
    const rules: AlertRule[] = [
      {
        id: 'quota-rule',
        name: 'Quota Alert',
        enabled: true,
        conditions: [{ type: 'quota', operator: '>', value: 80 }],
        channels: [],
        cooldownMinutes: 0,
      },
    ];

    const manager = new AlertManager(rules);
    const report = makeReport({
      overallStatus: 'ok',
      services: [
        {
          id: 'apify',
          name: 'Apify',
          category: 'integration',
          criticalLevel: 'high',
          status: 'ok',
          result: {
            status: 'ok',
            quotaUsed: 92,
            quotaLimit: 100,
            checkedAt: new Date().toISOString(),
          },
          fixPath: '/settings',
        },
      ],
    });

    const alerts = await manager.evaluate(report);
    expect(alerts.length).toBeGreaterThan(0);
  });
});
