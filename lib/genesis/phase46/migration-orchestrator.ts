/**
 * GENESIS PHASE 46: MIGRATION ORCHESTRATOR
 *
 * Top-level orchestrator that composes all migration services
 * into a unified API. This is the main entry point for Phase 46 operations.
 *
 * Provides:
 * - End-to-end migration lifecycle management
 * - Unified status reporting
 * - Safe operation sequencing
 */

import {
  MigrationState,
  MigrationDB,
  CreateMigrationInput,
  BackfillConfig,
  BackfillResult,
  ParityCheckResult,
  CutoverResult,
  RollbackResult,
  CutoverPreCheck,
  MigrationEvent,
  MIGRATION_DEFAULTS,
  PARITY_THRESHOLDS,
} from './types';
import { MigrationStateManager, MigrationStateError } from './migration-state-manager';
import { DualWriteService, DualWriteServiceError } from './dual-write-service';
import { BackfillEngine, BackfillEngineError } from './backfill-engine';
import { ParityChecker, ParityCheckerError } from './parity-checker';
import { CutoverManager, CutoverError } from './cutover-manager';

export class MigrationOrchestratorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly workspaceId?: string,
  ) {
    super(message);
    this.name = 'MigrationOrchestratorError';
  }
}

export interface MigrationSummary {
  state: MigrationState;
  readiness: {
    ready: boolean;
    blockers: string[];
    warnings: string[];
  };
  recentEvents: MigrationEvent[];
}

export class MigrationOrchestrator {
  readonly stateManager: MigrationStateManager;
  readonly dualWriteService: DualWriteService;
  readonly backfillEngine: BackfillEngine;
  readonly parityChecker: ParityChecker;
  readonly cutoverManager: CutoverManager;

  constructor(private readonly db: MigrationDB) {
    this.stateManager = new MigrationStateManager(db);
    this.dualWriteService = new DualWriteService(db);
    this.backfillEngine = new BackfillEngine(db);
    this.parityChecker = new ParityChecker(db);
    this.cutoverManager = new CutoverManager(db);
  }

  // ============================================
  // LIFECYCLE OPERATIONS
  // ============================================

  /**
   * Initialize a new migration for a workspace.
   */
  async initializeMigration(input: CreateMigrationInput): Promise<MigrationState> {
    return this.stateManager.createMigration(input);
  }

  /**
   * Start the dual-write phase.
   */
  async startDualWrite(workspaceId: string): Promise<{
    success: boolean;
    triggerName: string;
    error?: string;
  }> {
    return this.dualWriteService.enable(workspaceId);
  }

  /**
   * Stop the dual-write phase.
   */
  async stopDualWrite(workspaceId: string): Promise<{
    success: boolean;
    triggerName: string;
    error?: string;
  }> {
    return this.dualWriteService.disable(workspaceId);
  }

  /**
   * Start or resume the backfill process.
   */
  async startBackfill(
    workspaceId: string,
    options?: Partial<BackfillConfig>,
  ): Promise<BackfillResult> {
    const config = await this.backfillEngine.createConfigFromState(workspaceId);
    return this.backfillEngine.run({
      ...config,
      ...options,
      workspaceId, // ensure workspace ID is not overridden
    });
  }

  /**
   * Run a parity check.
   */
  async runParityCheck(
    workspaceId: string,
    fullScan: boolean = false,
  ): Promise<ParityCheckResult> {
    if (fullScan) {
      return this.parityChecker.fullCheck(workspaceId);
    }
    return this.parityChecker.quickCheck(workspaceId);
  }

  /**
   * Execute the cutover process.
   */
  async executeCutover(workspaceId: string): Promise<CutoverResult> {
    return this.cutoverManager.execute(workspaceId);
  }

  /**
   * Rollback a cutover.
   */
  async rollback(workspaceId: string): Promise<RollbackResult> {
    return this.cutoverManager.rollback(workspaceId);
  }

  /**
   * Reset a failed migration back to idle.
   */
  async resetMigration(workspaceId: string): Promise<MigrationState> {
    return this.stateManager.resetMigration(workspaceId);
  }

  /**
   * Delete a migration (only in terminal states).
   */
  async deleteMigration(workspaceId: string): Promise<boolean> {
    return this.stateManager.deleteMigration(workspaceId);
  }

  // ============================================
  // STATUS & REPORTING
  // ============================================

  /**
   * Get the current migration state for a workspace.
   */
  async getState(workspaceId: string): Promise<MigrationState | null> {
    return this.stateManager.getState(workspaceId);
  }

  /**
   * Get a comprehensive migration summary.
   */
  async getSummary(workspaceId: string): Promise<MigrationSummary | null> {
    const state = await this.stateManager.getState(workspaceId);
    if (!state) return null;

    let readiness = { ready: false, blockers: ['Migration not in cutover-ready state'], warnings: [] as string[] };
    try {
      readiness = await this.cutoverManager.getReadiness(workspaceId);
    } catch {
      // Readiness check may fail if state is not appropriate
    }

    const recentEvents = await this.db.getMigrationEvents(workspaceId, 20);

    return {
      state,
      readiness,
      recentEvents,
    };
  }

  /**
   * Get pre-cutover checks.
   */
  async getPreChecks(workspaceId: string): Promise<CutoverPreCheck[]> {
    return this.cutoverManager.runPreChecks(workspaceId);
  }

  /**
   * List all migrations.
   */
  async listMigrations(filter?: { status?: string }): Promise<MigrationState[]> {
    return this.stateManager.listMigrations(filter as any);
  }

  /**
   * Get migration events for a workspace.
   */
  async getEvents(workspaceId: string, limit?: number): Promise<MigrationEvent[]> {
    return this.db.getMigrationEvents(workspaceId, limit);
  }

  // ============================================
  // CONVENIENCE: END-TO-END MIGRATION
  // ============================================

  /**
   * Run the complete migration pipeline for a workspace.
   * This is a convenience method that runs all steps in sequence.
   *
   * WARNING: Long-running operation. Use individual methods for production.
   */
  async runFullMigration(
    workspaceId: string,
    onProgress?: (phase: string, detail: string) => void,
  ): Promise<{
    success: boolean;
    backfillResult?: BackfillResult;
    parityResult?: ParityCheckResult;
    cutoverResult?: CutoverResult;
    error?: string;
  }> {
    try {
      // Step 1: Enable dual-write
      onProgress?.('dual_write', 'Enabling dual-write trigger...');
      const dualWriteResult = await this.startDualWrite(workspaceId);
      if (!dualWriteResult.success) {
        return { success: false, error: `Dual-write failed: ${dualWriteResult.error}` };
      }

      // Step 2: Run backfill
      onProgress?.('backfill', 'Starting backfill...');
      const backfillResult = await this.startBackfill(workspaceId, {
        onProgress: (p) => {
          onProgress?.('backfill', `${p.percentComplete}% complete (${p.processedRows}/${p.totalRows})`);
        },
      });
      if (!backfillResult.success) {
        return { success: false, backfillResult, error: backfillResult.error };
      }

      // Step 3: Parity check
      onProgress?.('parity', 'Running parity check...');
      const parityResult = await this.runParityCheck(workspaceId, true);

      if (!this.parityChecker.isCutoverReady(parityResult.parityScore)) {
        return {
          success: false,
          backfillResult,
          parityResult,
          error: `Parity score ${parityResult.parityScore}% below threshold ${PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER}%`,
        };
      }

      // Transition to cutover_ready
      await this.stateManager.transitionTo(workspaceId, 'cutover_ready');

      // Step 4: Execute cutover
      onProgress?.('cutover', 'Executing cutover...');
      const cutoverResult = await this.executeCutover(workspaceId);

      return {
        success: cutoverResult.success,
        backfillResult,
        parityResult,
        cutoverResult,
        error: cutoverResult.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}
