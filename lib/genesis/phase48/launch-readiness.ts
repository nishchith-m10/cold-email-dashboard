/**
 * GENESIS PHASE 48: LAUNCH READINESS
 *
 * Pre-cutover checklist engine with configurable checks,
 * severity levels, and GO/NO-GO determination.
 */

import {
  ReadinessCheck,
  ReadinessCheckResult,
  ReadinessReport,
  ReadinessCheckSeverity,
  DeploymentEnvironment,
} from './types';

export class LaunchReadinessError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'LaunchReadinessError';
  }
}

// ============================================
// DEFAULT CHECKS
// ============================================

export function getDefaultReadinessChecks(env: DeploymentEnvironment): ReadinessCheck[] {
  return [
    {
      id: 'db-connection',
      name: 'Database Connection',
      description: 'Verify database is reachable and responding',
      severity: 'blocker',
      category: 'database',
      check: async () => {
        const start = Date.now();
        try {
          const health = await env.checkHealth('blue');
          return {
            checkId: 'db-connection',
            passed: health.healthy,
            message: health.healthy ? 'Database connected' : 'Database unreachable',
            durationMs: Date.now() - start,
            details: health.details,
          };
        } catch (error) {
          return {
            checkId: 'db-connection',
            passed: false,
            message: `Database check failed: ${error instanceof Error ? error.message : 'unknown'}`,
            durationMs: Date.now() - start,
          };
        }
      },
    },
    {
      id: 'error-rate',
      name: 'Current Error Rate',
      description: 'Verify error rate is below threshold before cutover',
      severity: 'blocker',
      category: 'performance',
      check: async () => {
        const start = Date.now();
        const rate = await env.getErrorRate();
        return {
          checkId: 'error-rate',
          passed: rate < 0.01,
          message: rate < 0.01 ? `Error rate healthy: ${rate}` : `Error rate too high: ${rate}`,
          durationMs: Date.now() - start,
          details: { errorRate: rate },
        };
      },
    },
    {
      id: 'latency',
      name: 'P95 Latency',
      description: 'Verify P95 latency is within acceptable range',
      severity: 'blocker',
      category: 'performance',
      check: async () => {
        const start = Date.now();
        const latency = await env.getP95Latency();
        return {
          checkId: 'latency',
          passed: latency < 2000,
          message: latency < 2000 ? `P95 latency OK: ${latency}ms` : `P95 latency too high: ${latency}ms`,
          durationMs: Date.now() - start,
          details: { p95Latency: latency },
        };
      },
    },
    {
      id: 'standby-health',
      name: 'Standby Slot Health',
      description: 'Verify standby deployment is healthy',
      severity: 'critical',
      category: 'connectivity',
      check: async () => {
        const start = Date.now();
        const state = await env.getDeploymentState();
        const health = await env.checkHealth(state.standbySlot);
        return {
          checkId: 'standby-health',
          passed: health.healthy,
          message: health.healthy ? 'Standby slot healthy' : 'Standby slot unhealthy',
          durationMs: Date.now() - start,
          details: { slot: state.standbySlot, ...health.details },
        };
      },
    },
    {
      id: 'version-different',
      name: 'Version Difference',
      description: 'Verify standby has a different version than active',
      severity: 'warning',
      category: 'configuration',
      check: async () => {
        const start = Date.now();
        const state = await env.getDeploymentState();
        const different = state.standbyVersion !== null && state.standbyVersion !== state.activeVersion;
        return {
          checkId: 'version-different',
          passed: different,
          message: different
            ? `Versions differ: active=${state.activeVersion}, standby=${state.standbyVersion}`
            : 'Active and standby versions are the same',
          durationMs: Date.now() - start,
          details: { activeVersion: state.activeVersion, standbyVersion: state.standbyVersion },
        };
      },
    },
    {
      id: 'db-connections',
      name: 'DB Connection Failures',
      description: 'Check for recent database connection failures',
      severity: 'critical',
      category: 'database',
      check: async () => {
        const start = Date.now();
        const failures = await env.getDbConnectionFailures();
        return {
          checkId: 'db-connections',
          passed: failures === 0,
          message: failures === 0 ? 'No DB connection failures' : `${failures} DB connection failures detected`,
          durationMs: Date.now() - start,
          details: { failures },
        };
      },
    },
  ];
}

// ============================================
// READINESS ENGINE
// ============================================

export class LaunchReadinessEngine {
  private checks: ReadinessCheck[] = [];

  constructor(private readonly env: DeploymentEnvironment) {
    this.checks = getDefaultReadinessChecks(env);
  }

  /**
   * Add a custom readiness check.
   */
  addCheck(check: ReadinessCheck): void {
    // Replace if same ID exists
    const idx = this.checks.findIndex(c => c.id === check.id);
    if (idx >= 0) {
      this.checks[idx] = check;
    } else {
      this.checks.push(check);
    }
  }

  /**
   * Remove a check by ID.
   */
  removeCheck(checkId: string): boolean {
    const idx = this.checks.findIndex(c => c.id === checkId);
    if (idx >= 0) {
      this.checks.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered checks.
   */
  getChecks(): ReadinessCheck[] {
    return [...this.checks];
  }

  /**
   * Run all readiness checks and produce a report.
   */
  async generateReport(): Promise<ReadinessReport> {
    const startTime = Date.now();
    const results: ReadinessCheckResult[] = [];
    const blockers: string[] = [];
    const criticals: string[] = [];
    const warnings: string[] = [];

    for (const check of this.checks) {
      try {
        const result = await check.check();
        results.push(result);

        if (!result.passed) {
          switch (check.severity) {
            case 'blocker':
              blockers.push(`[${check.id}] ${check.name}: ${result.message}`);
              break;
            case 'critical':
              criticals.push(`[${check.id}] ${check.name}: ${result.message}`);
              break;
            case 'warning':
              warnings.push(`[${check.id}] ${check.name}: ${result.message}`);
              break;
          }
        }
      } catch (error) {
        const failResult: ReadinessCheckResult = {
          checkId: check.id,
          passed: false,
          message: `Check threw error: ${error instanceof Error ? error.message : 'unknown'}`,
          durationMs: 0,
        };
        results.push(failResult);
        if (check.severity === 'blocker') {
          blockers.push(`[${check.id}] ${check.name}: ${failResult.message}`);
        }
      }
    }

    const passedChecks = results.filter(r => r.passed).length;

    return {
      status: blockers.length === 0 ? 'GO' : 'NO-GO',
      timestamp: new Date().toISOString(),
      totalChecks: results.length,
      passedChecks,
      failedChecks: results.length - passedChecks,
      blockers,
      criticals,
      warnings,
      results,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Quick check — returns true only if no blockers.
   */
  async isReady(): Promise<boolean> {
    const report = await this.generateReport();
    return report.status === 'GO';
  }
}
