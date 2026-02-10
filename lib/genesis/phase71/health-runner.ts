/**
 * GENESIS PHASE 71: HEALTH CHECK RUNNER
 *
 * Orchestrates the execution of all enabled health checks in parallel,
 * enforces per-check timeouts, retries transient failures, and builds
 * a unified HealthReport.
 */

import {
  HealthCheck,
  HealthCheckResult,
  HealthReport,
  HealthStatus,
  ServiceHealth,
  HealthCheckTimeoutError,
  HEALTH_CHECK_DEFAULTS,
} from './types';
import { CheckRegistry } from './check-registry';

export interface HealthRunnerConfig {
  /** Max concurrent checks at once (controls fan-out) */
  concurrency: number;
  /** Default timeout per check (ms); individual checks can override */
  defaultTimeoutMs: number;
  /** Number of automatic retries for transient (non-auth) failures */
  retryCount: number;
  /** Delay between retries (ms) */
  retryDelayMs: number;
}

const DEFAULT_CONFIG: HealthRunnerConfig = {
  concurrency: 10,
  defaultTimeoutMs: HEALTH_CHECK_DEFAULTS.CHECK_TIMEOUT_MS,
  retryCount: HEALTH_CHECK_DEFAULTS.RETRY_COUNT,
  retryDelayMs: HEALTH_CHECK_DEFAULTS.RETRY_DELAY_MS,
};

export class HealthRunner {
  private readonly config: HealthRunnerConfig;

  constructor(
    private readonly registry: CheckRegistry,
    config?: Partial<HealthRunnerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Run all enabled health checks and return a consolidated report.
   */
  async runAll(): Promise<HealthReport> {
    const checks = this.registry.getEnabled();
    return this.runChecks(checks);
  }

  /**
   * Run a single health check by id.
   */
  async runOne(checkId: string): Promise<ServiceHealth | null> {
    const check = this.registry.getById(checkId);
    if (!check) return null;

    const result = await this.executeWithRetry(check);
    return this.toServiceHealth(check, result);
  }

  /**
   * Run checks for a specific category only.
   */
  async runCategory(category: string): Promise<HealthReport> {
    const checks = this.registry
      .getEnabled()
      .filter((c) => c.category === category);
    return this.runChecks(checks);
  }

  // ============================================
  // INTERNAL: ORCHESTRATION
  // ============================================

  /**
   * Run a set of checks concurrently (with concurrency limit).
   */
  private async runChecks(checks: HealthCheck[]): Promise<HealthReport> {
    const timestamp = new Date().toISOString();
    const reportId = `rpt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const services: ServiceHealth[] = [];

    // Execute with bounded concurrency
    const batches = this.chunk(checks, this.config.concurrency);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(async (check) => {
          const result = await this.executeWithRetry(check);
          return this.toServiceHealth(check, result);
        }),
      );

      for (const outcome of batchResults) {
        if (outcome.status === 'fulfilled') {
          services.push(outcome.value);
        } else {
          // Promise.allSettled rejection should not happen (executeWithRetry
          // never throws), but handle defensively.
          services.push({
            id: 'unknown',
            name: 'Unknown',
            category: 'infrastructure',
            criticalLevel: 'low',
            status: 'error',
            result: {
              status: 'error',
              error:
                outcome.reason instanceof Error
                  ? outcome.reason.message
                  : String(outcome.reason),
              checkedAt: new Date().toISOString(),
            },
            fixPath: '/admin',
          });
        }
      }
    }

    return this.buildReport(reportId, timestamp, services);
  }

  // ============================================
  // INTERNAL: EXECUTION WITH TIMEOUT & RETRY
  // ============================================

  /**
   * Execute a single check with timeout enforcement and retry logic.
   * Never throws — always returns a HealthCheckResult.
   */
  private async executeWithRetry(check: HealthCheck): Promise<HealthCheckResult> {
    const maxAttempts = 1 + this.config.retryCount; // initial + retries
    let lastResult: HealthCheckResult | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastResult = await this.executeWithTimeout(check);

      // Success or non-transient error → stop retrying
      if (lastResult.status === 'ok' || lastResult.status === 'degraded') {
        return lastResult;
      }

      // Auth errors are not transient — do not retry
      if (this.isAuthError(lastResult)) {
        return lastResult;
      }

      // Config-missing errors are not transient
      if (this.isConfigError(lastResult)) {
        return lastResult;
      }

      // Transient error and we have retries left — wait then retry
      if (attempt < maxAttempts) {
        await this.delay(this.config.retryDelayMs);
      }
    }

    // Exhausted retries — return last failure
    return lastResult!;
  }

  /**
   * Execute a single check with timeout enforcement.
   * If the check does not resolve within its timeout, return an error result.
   *
   * Uses a cleanup pattern to ensure the timeout timer is cleared
   * regardless of whether the check or the timer wins the race.
   */
  private async executeWithTimeout(
    check: HealthCheck,
  ): Promise<HealthCheckResult> {
    const timeoutMs = check.timeoutMs || this.config.defaultTimeoutMs;

    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
      const result = await Promise.race([
        check.check(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new HealthCheckTimeoutError(check.id, timeoutMs)),
            timeoutMs,
          );
        }),
      ]);
      return result;
    } catch (error) {
      if (error instanceof HealthCheckTimeoutError) {
        return {
          status: 'error',
          error: `Timed out after ${timeoutMs}ms`,
          message: `${check.name} health check timed out`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        message: `${check.name} health check threw an exception`,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      // Always clear the timeout timer to prevent leaks
      if (timer !== null) {
        clearTimeout(timer);
      }
    }
  }

  // ============================================
  // INTERNAL: REPORT BUILDING
  // ============================================

  /**
   * Build a HealthReport from the collected ServiceHealth entries.
   */
  private buildReport(
    id: string,
    timestamp: string,
    services: ServiceHealth[],
  ): HealthReport {
    const errorCount = services.filter((s) => s.status === 'error').length;
    const degradedCount = services.filter(
      (s) => s.status === 'degraded',
    ).length;
    const issueCount = errorCount + degradedCount;

    // Overall status: worst status wins
    let overallStatus: HealthStatus = 'ok';
    if (errorCount > 0) overallStatus = 'error';
    else if (degradedCount > 0) overallStatus = 'degraded';

    // Total latency across all checks (for benchmarking)
    const totalLatencyMs = services.reduce(
      (sum, s) => sum + (s.result.latencyMs ?? 0),
      0,
    );

    // Identify slowest service
    let slowestService: string | undefined;
    let maxLatency = 0;
    for (const s of services) {
      const lat = s.result.latencyMs ?? 0;
      if (lat > maxLatency) {
        maxLatency = lat;
        slowestService = s.name;
      }
    }

    return {
      id,
      timestamp,
      overallStatus,
      services,
      issueCount,
      degradedCount,
      errorCount,
      totalLatencyMs,
      slowestService,
    };
  }

  /**
   * Convert a HealthCheck + HealthCheckResult into a ServiceHealth record.
   */
  private toServiceHealth(
    check: HealthCheck,
    result: HealthCheckResult,
  ): ServiceHealth {
    return {
      id: check.id,
      name: check.name,
      category: check.category,
      criticalLevel: check.criticalLevel,
      status: result.status,
      result,
      fixPath: check.fixPath,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Determine if the error is an authentication failure (non-transient).
   */
  private isAuthError(result: HealthCheckResult): boolean {
    const errorLower = (result.error || '').toLowerCase();
    return (
      errorLower.includes('invalid api key') ||
      errorLower.includes('authentication failed') ||
      errorLower.includes('unauthorized') ||
      errorLower.includes('api key lacks permissions') ||
      errorLower.includes('oauth token invalid')
    );
  }

  /**
   * Determine if the error is a missing-config issue (non-transient).
   * Patterns are intentionally specific to avoid matching transient errors
   * like "Missing response from server" or "Failed to add record".
   */
  private isConfigError(result: HealthCheckResult): boolean {
    const errorLower = (result.error || '').toLowerCase();
    return (
      errorLower.includes('not configured') ||
      errorLower.includes('api key not configured') ||
      errorLower.includes('url not configured') ||
      errorLower.includes('tokens missing') ||
      errorLower.includes('oauth not configured') ||
      errorLower.includes('add ') && errorLower.includes('to environment')
    );
  }

  /**
   * Split array into chunks.
   */
  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Async delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
