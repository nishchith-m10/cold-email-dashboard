/**
 * GENESIS PHASE 71: ALERT MANAGER
 *
 * Evaluates health reports against alert rules, manages cooldowns to
 * prevent alert storms, tracks consecutive failures, and dispatches
 * notifications through configured channels.
 */

import {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertChannel,
  HealthReport,
  HealthStatus,
  ALERT_THRESHOLDS,
  AlertDeliveryError,
} from './types';

// ============================================
// ALERT DISPATCHER INTERFACE
// ============================================

/**
 * Abstract interface for sending alerts through a channel.
 * Implementations are injected at construction time.
 */
export interface AlertDispatcher {
  channel: AlertChannel;
  send(alert: Alert): Promise<void>;
}

// ============================================
// ALERT MANAGER
// ============================================

export class AlertManager {
  private alerts: Alert[] = [];
  private dispatchers: Map<AlertChannel, AlertDispatcher> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();
  private lastAlertedAt: Map<string, number> = new Map();
  private rules: AlertRule[];

  constructor(
    rules?: AlertRule[],
    dispatchers?: AlertDispatcher[],
  ) {
    this.rules = rules ?? this.getDefaultRules();

    if (dispatchers) {
      for (const d of dispatchers) {
        this.dispatchers.set(d.channel, d);
      }
    }
  }

  // ============================================
  // EVALUATE REPORT
  // ============================================

  /**
   * Evaluate a health report and trigger alerts based on configured rules.
   * Returns any new alerts that were generated.
   */
  async evaluate(report: HealthReport): Promise<Alert[]> {
    const newAlerts: Alert[] = [];

    // Update consecutive failure tracking
    this.updateConsecutiveFailures(report);

    // Evaluate each rule
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const shouldAlert = this.evaluateRule(rule, report);
      if (!shouldAlert) continue;

      // Check cooldown
      if (this.isInCooldown(rule)) continue;

      // Build alert
      const failingServices = report.services
        .filter((s) => s.status !== 'ok')
        .map((s) => s.name);

      const alert = this.buildAlert(rule, report, failingServices);
      newAlerts.push(alert);
      this.alerts.push(alert);

      // Update cooldown
      this.lastAlertedAt.set(rule.id, Date.now());
      rule.lastTriggeredAt = new Date().toISOString();

      // Dispatch
      await this.dispatchAlert(alert, rule.channels);
    }

    return newAlerts;
  }

  // ============================================
  // RULE EVALUATION
  // ============================================

  /**
   * Evaluate a single rule against the health report.
   */
  private evaluateRule(rule: AlertRule, report: HealthReport): boolean {
    return rule.conditions.every((condition) => {
      switch (condition.type) {
        case 'status': {
          // e.g. { type: 'status', operator: '=', value: 'error' }
          const status = report.overallStatus;
          return this.compareValues(status, condition.operator, condition.value);
        }

        case 'latency': {
          // e.g. { type: 'latency', operator: '>', value: 5000 }
          const latencies = report.services.map((s) => s.result.latencyMs ?? 0);
          if (latencies.length === 0) return false;
          const maxLatency = Math.max(...latencies);
          return this.compareValues(
            maxLatency,
            condition.operator,
            condition.value,
          );
        }

        case 'quota': {
          // e.g. { type: 'quota', operator: '>', value: 90 }
          const quotas = report.services
            .filter((s) => s.result.quotaUsed !== undefined)
            .map((s) => s.result.quotaUsed!);

          if (quotas.length === 0) return false;
          const maxQuota = Math.max(...quotas);
          return this.compareValues(maxQuota, condition.operator, condition.value);
        }

        case 'consecutive_failures': {
          // e.g. { type: 'consecutive_failures', operator: '>=', value: 3 }
          const failureCounts = Array.from(this.consecutiveFailures.values());
          const maxConsecutive = failureCounts.length > 0
            ? Math.max(...failureCounts)
            : 0;
          return this.compareValues(
            maxConsecutive,
            condition.operator,
            condition.value,
          );
        }

        default:
          return false;
      }
    });
  }

  /**
   * Generic value comparison.
   */
  private compareValues(
    actual: string | number,
    operator: string,
    expected: string | number,
  ): boolean {
    switch (operator) {
      case '=':
        return actual === expected;
      case '>':
        return actual > expected;
      case '<':
        return actual < expected;
      case '>=':
        return actual >= expected;
      case '<=':
        return actual <= expected;
      default:
        return false;
    }
  }

  // ============================================
  // COOLDOWN MANAGEMENT
  // ============================================

  /**
   * Check if a rule is still in its cooldown period.
   */
  private isInCooldown(rule: AlertRule): boolean {
    const lastAlerted = this.lastAlertedAt.get(rule.id);
    if (!lastAlerted) return false;

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    return Date.now() - lastAlerted < cooldownMs;
  }

  // ============================================
  // CONSECUTIVE FAILURE TRACKING
  // ============================================

  /**
   * Update the consecutive failure counter for each service.
   */
  private updateConsecutiveFailures(report: HealthReport): void {
    for (const service of report.services) {
      const key = service.id;
      const current = this.consecutiveFailures.get(key) ?? 0;

      if (service.status === 'error') {
        this.consecutiveFailures.set(key, current + 1);
      } else {
        // Reset on success or degraded (degraded is not a hard failure)
        this.consecutiveFailures.set(key, 0);
      }
    }
  }

  /**
   * Get the current consecutive failure count for a service.
   */
  getConsecutiveFailures(serviceId: string): number {
    return this.consecutiveFailures.get(serviceId) ?? 0;
  }

  // ============================================
  // ALERT BUILDING
  // ============================================

  /**
   * Build an alert from a triggered rule and health report.
   */
  private buildAlert(
    rule: AlertRule,
    report: HealthReport,
    failingServices: string[],
  ): Alert {
    const severity = this.determineSeverity(report);

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      severity,
      title: this.buildTitle(severity, report),
      message: this.buildMessage(report, failingServices),
      services: failingServices,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
  }

  /**
   * Determine alert severity from report state.
   */
  private determineSeverity(report: HealthReport): AlertSeverity {
    if (report.errorCount > 0) return 'critical';
    if (report.degradedCount > 0) return 'warning';
    return 'info';
  }

  /**
   * Build a human-readable alert title.
   */
  private buildTitle(severity: AlertSeverity, report: HealthReport): string {
    const prefix =
      severity === 'critical'
        ? '🔴 CRITICAL'
        : severity === 'warning'
          ? '🟡 WARNING'
          : 'ℹ️ INFO';

    return `${prefix}: ${report.issueCount} API health issue(s) detected`;
  }

  /**
   * Build a detailed alert message.
   */
  private buildMessage(
    report: HealthReport,
    failingServices: string[],
  ): string {
    const lines: string[] = [];
    lines.push(`Overall status: ${report.overallStatus.toUpperCase()}`);
    lines.push(`Errors: ${report.errorCount} | Degraded: ${report.degradedCount}`);
    lines.push('');
    lines.push('Affected services:');

    for (const service of report.services) {
      if (service.status !== 'ok') {
        lines.push(
          `  - ${service.name}: ${service.status.toUpperCase()} — ${service.result.error || service.result.message || 'Unknown issue'}`,
        );
      }
    }

    return lines.join('\n');
  }

  // ============================================
  // DISPATCH
  // ============================================

  /**
   * Dispatch an alert through specified channels.
   */
  private async dispatchAlert(
    alert: Alert,
    channels: AlertChannel[],
  ): Promise<void> {
    for (const channel of channels) {
      const dispatcher = this.dispatchers.get(channel);
      if (!dispatcher) continue;

      try {
        await dispatcher.send(alert);
      } catch (error) {
        // Log but don't throw — alert delivery failure should not
        // crash the health check pipeline.
        console.error(
          `Alert delivery failed on ${channel}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  // ============================================
  // ALERT HISTORY
  // ============================================

  /**
   * Get all alerts (most recent first).
   */
  getAlerts(limit?: number): Alert[] {
    const sorted = [...this.alerts].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Acknowledge an alert by id.
   */
  acknowledge(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = acknowledgedBy;
    return true;
  }

  /**
   * Get unacknowledged alerts.
   */
  getUnacknowledged(): Alert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Total alert count.
   */
  get totalAlerts(): number {
    return this.alerts.length;
  }

  /**
   * Register a new dispatcher at runtime.
   */
  registerDispatcher(dispatcher: AlertDispatcher): void {
    this.dispatchers.set(dispatcher.channel, dispatcher);
  }

  /**
   * Clear all alerts (for testing or reset).
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Clear all tracking state (for testing).
   */
  resetState(): void {
    this.alerts = [];
    this.consecutiveFailures.clear();
    this.lastAlertedAt.clear();
  }

  // ============================================
  // DEFAULT RULES
  // ============================================

  private getDefaultRules(): AlertRule[] {
    return [
      {
        id: 'rule-critical-error',
        name: 'Critical service error',
        enabled: true,
        conditions: [
          { type: 'status', operator: '=', value: 'error' },
        ],
        channels: ['email', 'slack'],
        cooldownMinutes: 60,
      },
      {
        id: 'rule-degraded-services',
        name: 'Multiple degraded services',
        enabled: true,
        conditions: [
          { type: 'status', operator: '=', value: 'degraded' },
        ],
        channels: ['slack'],
        cooldownMinutes: 120,
      },
      {
        id: 'rule-high-latency',
        name: 'High API latency',
        enabled: true,
        conditions: [
          {
            type: 'latency',
            operator: '>',
            value: ALERT_THRESHOLDS.LATENCY_ERROR_MS,
          },
        ],
        channels: ['slack'],
        cooldownMinutes: 30,
      },
      {
        id: 'rule-quota-warning',
        name: 'Quota near exhaustion',
        enabled: true,
        conditions: [
          {
            type: 'quota',
            operator: '>',
            value: ALERT_THRESHOLDS.QUOTA_WARNING_PERCENT,
          },
        ],
        channels: ['email'],
        cooldownMinutes: 240,
      },
      {
        id: 'rule-consecutive-failures',
        name: 'Consecutive failures threshold',
        enabled: true,
        conditions: [
          {
            type: 'consecutive_failures',
            operator: '>=',
            value: ALERT_THRESHOLDS.CONSECUTIVE_FAILURES,
          },
        ],
        channels: ['email', 'slack'],
        cooldownMinutes: 60,
      },
    ];
  }
}
