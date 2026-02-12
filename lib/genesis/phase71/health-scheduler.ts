/**
 * GENESIS PHASE 71: HEALTH CHECK SCHEDULER
 *
 * Manages the scheduling of periodic health checks via BullMQ repeatable
 * jobs. Stores snapshots for history, triggers alerts, and integrates
 * with the diagnostic engine.
 *
 * This module is designed to be instantiated once at application startup
 * and coordinates the HealthRunner, AlertManager, and DiagnosticEngine.
 */

import {
  HealthReport,
  HealthMonitorConfig,
  HealthSnapshot,
  HEALTH_CHECK_DEFAULTS,
} from './types';
import { CheckRegistry, createDefaultRegistry } from './check-registry';
import { HealthRunner, HealthRunnerConfig } from './health-runner';
import { DiagnosticEngine } from './diagnostic-engine';
import { AlertManager, AlertDispatcher } from './alert-manager';

// ============================================
// STORAGE INTERFACE
// ============================================

/**
 * Abstract storage interface for health snapshots.
 * Implemented by Supabase adapter in production,
 * in-memory adapter for tests.
 */
export interface HealthSnapshotStore {
  save(snapshot: HealthSnapshot): Promise<void>;
  getLatest(): Promise<HealthSnapshot | null>;
  getHistory(limit: number): Promise<HealthSnapshot[]>;
  deleteOlderThan(days: number): Promise<number>;
}

// ============================================
// IN-MEMORY STORE (for testing / dev)
// ============================================

export class InMemoryHealthStore implements HealthSnapshotStore {
  private snapshots: HealthSnapshot[] = [];

  async save(snapshot: HealthSnapshot): Promise<void> {
    this.snapshots.push(snapshot);
  }

  async getLatest(): Promise<HealthSnapshot | null> {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1];
  }

  async getHistory(limit: number): Promise<HealthSnapshot[]> {
    return this.snapshots
      .slice()
      .reverse()
      .slice(0, limit);
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter(
      (s) => new Date(s.timestamp).getTime() >= cutoff,
    );
    return before - this.snapshots.length;
  }

  /** Visible for testing */
  getAll(): HealthSnapshot[] {
    return [...this.snapshots];
  }

  /** Visible for testing */
  clear(): void {
    this.snapshots = [];
  }
}

// ============================================
// SCHEDULER
// ============================================

export class HealthCheckScheduler {
  private readonly runner: HealthRunner;
  private readonly diagnostics: DiagnosticEngine;
  private readonly alertManager: AlertManager;
  private readonly store: HealthSnapshotStore;
  private readonly config: HealthMonitorConfig;

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;
  private lastReport: HealthReport | null = null;

  constructor(options: {
    registry?: CheckRegistry;
    store?: HealthSnapshotStore;
    alertDispatchers?: AlertDispatcher[];
    config?: Partial<HealthMonitorConfig>;
    runnerConfig?: Partial<HealthRunnerConfig>;
  } = {}) {
    const registry = options.registry ?? createDefaultRegistry();
    this.store = options.store ?? new InMemoryHealthStore();
    this.diagnostics = new DiagnosticEngine();
    this.alertManager = new AlertManager(undefined, options.alertDispatchers);
    this.config = {
      enabled: true,
      checkIntervalMinutes: HEALTH_CHECK_DEFAULTS.CHECK_INTERVAL_MINUTES,
      checkTimeoutMs: HEALTH_CHECK_DEFAULTS.CHECK_TIMEOUT_MS,
      retryCount: HEALTH_CHECK_DEFAULTS.RETRY_COUNT,
      retryDelayMs: HEALTH_CHECK_DEFAULTS.RETRY_DELAY_MS,
      storeHistoryDays: HEALTH_CHECK_DEFAULTS.STORE_HISTORY_DAYS,
      alertThresholds: {
        degradedServices: 2,
        errorServices: 1,
        consecutiveFailures: 3,
      },
      ...options.config,
    };

    this.runner = new HealthRunner(registry, {
      defaultTimeoutMs: this.config.checkTimeoutMs,
      retryCount: this.config.retryCount,
      retryDelayMs: this.config.retryDelayMs,
      ...options.runnerConfig,
    });
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Start the scheduled health checking loop.
   * In production this would be backed by a BullMQ repeatable job;
   * for simplicity and testability we use setInterval here with
   * the same semantics.
   */
  start(): void {
    if (this.running) return;
    if (!this.config.enabled) return;

    this.running = true;
    const intervalMs = this.config.checkIntervalMinutes * 60 * 1000;

    // Run immediately on start
    this.tick().catch((e) =>
      console.error('[HealthScheduler] initial tick failed:', e),
    );

    this.intervalHandle = setInterval(() => {
      this.tick().catch((e) =>
        console.error('[HealthScheduler] tick failed:', e),
      );
    }, intervalMs);
  }

  /**
   * Stop the scheduled loop.
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.running = false;
  }

  /**
   * Is the scheduler currently running?
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================
  // TICK (single check cycle)
  // ============================================

  /**
   * Execute a single health check cycle:
   * 1. Run all checks
   * 2. Build diagnostics
   * 3. Evaluate alerts
   * 4. Store snapshot
   * 5. Clean up old snapshots
   */
  async tick(): Promise<HealthReport> {
    // 1. Run checks
    const report = await this.runner.runAll();
    this.lastReport = report;

    // 2. Build diagnostics (for any failing services)
    const failingServices = report.services.filter((s) => s.status !== 'ok');
    const diagnosticGuides =
      this.diagnostics.getDiagnosticsForReport(failingServices);

    // 3. Evaluate alert rules
    const newAlerts = await this.alertManager.evaluate(report);

    // 4. Store snapshot
    const snapshot = this.reportToSnapshot(report);
    await this.store.save(snapshot);

    // 5. Clean up old snapshots (non-critical, catch errors)
    try {
      await this.store.deleteOlderThan(this.config.storeHistoryDays);
    } catch {
      // Cleanup failure is not critical
    }

    return report;
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get the most recent health report (from last tick).
   */
  getLastReport(): HealthReport | null {
    return this.lastReport;
  }

  /**
   * Force an immediate health check (bypasses schedule).
   */
  async runNow(): Promise<HealthReport> {
    return this.tick();
  }

  /**
   * Get health check history from storage.
   */
  async getHistory(limit: number = 10): Promise<HealthSnapshot[]> {
    return this.store.getHistory(limit);
  }

  /**
   * Get the latest stored snapshot.
   */
  async getLatestSnapshot(): Promise<HealthSnapshot | null> {
    return this.store.getLatest();
  }

  /**
   * Get the diagnostic engine (for external access).
   */
  getDiagnosticEngine(): DiagnosticEngine {
    return this.diagnostics;
  }

  /**
   * Get the alert manager (for external access).
   */
  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  // ============================================
  // CONVERSION
  // ============================================

  /**
   * Convert a HealthReport to a storable HealthSnapshot.
   */
  private reportToSnapshot(report: HealthReport): HealthSnapshot {
    const services: Record<string, any> = {};
    for (const s of report.services) {
      services[s.id] = s.result;
    }

    return {
      id: report.id,
      timestamp: report.timestamp,
      overall_status: report.overallStatus,
      services,
      issue_count: report.issueCount,
      degraded_count: report.degradedCount,
      error_count: report.errorCount,
      total_latency_ms: report.totalLatencyMs,
      created_at: new Date().toISOString(),
    };
  }
}
