/**
 * GENESIS PHASE 46: CUTOVER MANAGER
 *
 * Orchestrates the zero-downtime cutover from legacy to genesis tables.
 * Implements a multi-step process with pre-checks, final backfill,
 * parity verification, swap, and rollback capability.
 *
 * Cutover Flow:
 * pre_check → freeze_writes → final_backfill → final_parity → swap_active → verify_swap → cleanup → complete
 *
 * At any point, can abort and rollback.
 */

import {
  CutoverState,
  CutoverStep,
  CutoverPhase,
  CutoverPreCheck,
  CutoverResult,
  RollbackResult,
  MigrationDB,
  PARITY_THRESHOLDS,
  MIGRATION_DEFAULTS,
} from './types';
import { MigrationStateManager, MigrationStateError } from './migration-state-manager';
import { ParityChecker } from './parity-checker';
import { DualWriteService } from './dual-write-service';

export class CutoverError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly phase?: CutoverPhase,
    public readonly workspaceId?: string,
  ) {
    super(message);
    this.name = 'CutoverError';
  }
}

const CUTOVER_STEPS: Array<{ name: string; phase: CutoverPhase }> = [
  { name: 'Pre-flight checks', phase: 'pre_check' },
  { name: 'Freeze writes', phase: 'freeze_writes' },
  { name: 'Final backfill delta', phase: 'final_backfill' },
  { name: 'Final parity verification', phase: 'final_parity' },
  { name: 'Swap active table', phase: 'swap_active' },
  { name: 'Verify swap', phase: 'verify_swap' },
  { name: 'Cleanup', phase: 'cleanup' },
  { name: 'Complete', phase: 'complete' },
];

export class CutoverManager {
  private readonly stateManager: MigrationStateManager;
  private readonly parityChecker: ParityChecker;
  private readonly dualWriteService: DualWriteService;

  constructor(private readonly db: MigrationDB) {
    this.stateManager = new MigrationStateManager(db);
    this.parityChecker = new ParityChecker(db);
    this.dualWriteService = new DualWriteService(db);
  }

  /**
   * Execute the full cutover process.
   */
  async execute(workspaceId: string): Promise<CutoverResult> {
    const startTime = Date.now();
    const state = await this.stateManager.getStateOrThrow(workspaceId);

    // Must be in cutover_ready or verifying state
    if (state.status !== 'cutover_ready' && state.status !== 'verifying') {
      throw new CutoverError(
        `Cannot start cutover in '${state.status}' state. Must be 'cutover_ready' or 'verifying'.`,
        'INVALID_STATE',
        'pre_check',
        workspaceId,
      );
    }

    const cutoverState = this.initializeCutoverState(workspaceId);

    await this.db.logMigrationEvent({
      workspaceId,
      eventType: 'cutover_started',
      details: { previousStatus: state.status },
    });

    try {
      // Step 1: Pre-flight checks
      await this.executeStep(cutoverState, 0, async () => {
        const checks = await this.runPreChecks(workspaceId);
        const blockers = checks.filter(c => c.severity === 'blocker' && !c.passed);
        if (blockers.length > 0) {
          throw new CutoverError(
            `Pre-flight check failed: ${blockers.map(b => b.message).join('; ')}`,
            'PRECHECK_FAILED',
            'pre_check',
            workspaceId,
          );
        }
        cutoverState.preChecksPassed = true;
      });

      // Step 2: Freeze writes (disable dual-write trigger momentarily)
      // In practice, dual-write stays on but we note the freeze point
      await this.executeStep(cutoverState, 1, async () => {
        // Record the "freeze point" — any writes after this need to be caught by final backfill
        cutoverState.phase = 'freeze_writes';
      });

      // Step 3: Final backfill delta — catch any rows written during backfill
      await this.executeStep(cutoverState, 2, async () => {
        const currentState = await this.stateManager.getStateOrThrow(workspaceId);
        const sourceCount = await this.db.getSourceRowCount(
          currentState.sourceTable,
          workspaceId,
        );
        const targetCount = await this.db.getTargetRowCount(
          currentState.targetTable,
          workspaceId,
        );

        if (sourceCount !== targetCount) {
          // Fetch and insert missing rows
          const missingCount = sourceCount - targetCount;
          if (missingCount > 0) {
            const lastId = currentState.backfillLastId;
            const missingRows = await this.db.getSourceBatch(
              currentState.sourceTable,
              workspaceId,
              lastId,
              Math.max(missingCount, 100),
            );

            if (missingRows.length > 0) {
              await this.db.insertTargetBatch(currentState.targetTable, missingRows);
            }
          }
        }
      });

      // Step 4: Final parity check
      await this.executeStep(cutoverState, 3, async () => {
        const parityResult = await this.parityChecker.fullCheck(workspaceId);
        cutoverState.finalParityScore = parityResult.parityScore;

        if (!this.parityChecker.isCutoverReady(parityResult.parityScore)) {
          throw new CutoverError(
            `Final parity check failed: ${parityResult.parityScore}% (need ${PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER}%)`,
            'PARITY_INSUFFICIENT',
            'final_parity',
            workspaceId,
          );
        }
      });

      // Step 5: Swap active table
      await this.executeStep(cutoverState, 4, async () => {
        // Disable dual-write trigger (no longer needed)
        await this.dualWriteService.disable(workspaceId);

        // Mark the target as active
        await this.db.updateMigrationState(workspaceId, {
          status: 'cutover_complete',
          dual_write_enabled: false,
          updated_at: new Date().toISOString(),
        });

        cutoverState.phase = 'swap_active';
      });

      // Step 6: Verify swap
      await this.executeStep(cutoverState, 5, async () => {
        // Quick parity check to confirm swap is healthy
        const verifyResult = await this.parityChecker.quickCheck(workspaceId);
        if (verifyResult.parityScore < PARITY_THRESHOLDS.CRITICAL_THRESHOLD) {
          throw new CutoverError(
            `Post-swap verification failed: ${verifyResult.parityScore}%`,
            'VERIFY_FAILED',
            'verify_swap',
            workspaceId,
          );
        }
      });

      // Step 7: Cleanup
      await this.executeStep(cutoverState, 6, async () => {
        // Record completion metadata
        await this.db.updateMigrationState(workspaceId, {
          metadata: {
            cutoverCompletedAt: new Date().toISOString(),
            finalParityScore: cutoverState.finalParityScore,
          },
          updated_at: new Date().toISOString(),
        });
      });

      // Step 8: Complete
      await this.executeStep(cutoverState, 7, async () => {
        cutoverState.phase = 'complete';
        cutoverState.completedAt = new Date().toISOString();
        cutoverState.rollbackAvailable = true;
      });

      await this.db.logMigrationEvent({
        workspaceId,
        eventType: 'cutover_completed',
        details: {
          totalDurationMs: Date.now() - startTime,
          finalParityScore: cutoverState.finalParityScore,
          steps: cutoverState.steps.map(s => ({
            name: s.name,
            status: s.status,
            durationMs: s.durationMs,
          })),
        },
      });

      return {
        success: true,
        phase: 'complete',
        steps: cutoverState.steps,
        totalDurationMs: Date.now() - startTime,
        finalParityScore: cutoverState.finalParityScore,
      };
    } catch (error) {
      // Abort on any failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      const phase = error instanceof CutoverError ? error.phase : cutoverState.phase;

      cutoverState.phase = 'aborted';
      cutoverState.error = errorMessage;

      await this.db.logMigrationEvent({
        workspaceId,
        eventType: 'cutover_aborted',
        details: {
          phase,
          error: errorMessage,
          durationMs: Date.now() - startTime,
        },
      });

      return {
        success: false,
        phase: phase || 'aborted',
        steps: cutoverState.steps,
        totalDurationMs: Date.now() - startTime,
        finalParityScore: cutoverState.finalParityScore,
        error: errorMessage,
      };
    }
  }

  /**
   * Rollback a completed or in-progress cutover.
   */
  async rollback(workspaceId: string): Promise<RollbackResult> {
    const startTime = Date.now();
    const state = await this.stateManager.getStateOrThrow(workspaceId);

    await this.db.logMigrationEvent({
      workspaceId,
      eventType: 'rollback_started',
      details: { fromStatus: state.status },
    });

    try {
      // Re-enable dual-write if it was disabled during cutover
      if (!state.dualWriteEnabled && state.status !== 'idle') {
        try {
          await this.dualWriteService.enable(workspaceId);
        } catch {
          // Dual-write re-enable is best-effort during rollback
        }
      }

      // Transition to rolled_back
      const validForRollback = ['cutover_complete', 'failed'];
      if (validForRollback.includes(state.status)) {
        await this.db.updateMigrationState(workspaceId, {
          status: 'rolled_back',
          dual_write_enabled: false,
          updated_at: new Date().toISOString(),
          metadata: {
            ...state.metadata,
            rolledBackAt: new Date().toISOString(),
            rolledBackFromStatus: state.status,
          },
        });
      } else {
        // For in-progress states, go back to dual_write or idle
        const revertStatus = state.dualWriteEnabled ? 'dual_write' : 'idle';
        await this.db.updateMigrationState(workspaceId, {
          status: revertStatus,
          updated_at: new Date().toISOString(),
        });
      }

      await this.db.logMigrationEvent({
        workspaceId,
        eventType: 'rollback_completed',
        details: {
          fromStatus: state.status,
          durationMs: Date.now() - startTime,
        },
      });

      return {
        success: true,
        fromPhase: state.status as CutoverPhase,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        fromPhase: state.status as CutoverPhase,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Run pre-cutover checks.
   */
  async runPreChecks(workspaceId: string): Promise<CutoverPreCheck[]> {
    const state = await this.stateManager.getStateOrThrow(workspaceId);
    const checks: CutoverPreCheck[] = [];

    // Check 1: Migration exists
    checks.push({
      id: 'migration_exists',
      name: 'Migration configured',
      severity: 'blocker',
      passed: true,
      message: 'Migration state found',
    });

    // Check 2: Parity score meets threshold
    const parityMeetsThreshold = state.parityScore >= PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER;
    checks.push({
      id: 'parity_score',
      name: 'Parity score meets threshold',
      severity: 'blocker',
      passed: parityMeetsThreshold,
      message: parityMeetsThreshold
        ? `Parity: ${state.parityScore}% (>= ${PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER}%)`
        : `Parity: ${state.parityScore}% (need ${PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER}%)`,
    });

    // Check 3: Backfill complete (100%)
    const backfillComplete = state.backfillProgress >= 100;
    checks.push({
      id: 'backfill_complete',
      name: 'Backfill completed',
      severity: 'blocker',
      passed: backfillComplete,
      message: backfillComplete
        ? 'Backfill 100% complete'
        : `Backfill only ${state.backfillProgress}% complete`,
    });

    // Check 4: No recent errors
    const noRecentErrors = state.errorCount === 0;
    checks.push({
      id: 'no_errors',
      name: 'No recent errors',
      severity: 'critical',
      passed: noRecentErrors,
      message: noRecentErrors
        ? 'No errors recorded'
        : `${state.errorCount} errors recorded`,
    });

    // Check 5: Dual-write was active
    checks.push({
      id: 'dual_write_active',
      name: 'Dual-write was active',
      severity: 'warning',
      passed: state.dualWriteEnabled || state.status === 'cutover_ready' || state.status === 'verifying',
      message: state.dualWriteEnabled
        ? 'Dual-write is active'
        : 'Dual-write is not currently active',
    });

    // Check 6: Row counts roughly match
    const sourceCount = await this.db.getSourceRowCount(state.sourceTable, workspaceId);
    const targetCount = await this.db.getTargetRowCount(state.targetTable, workspaceId);
    const countDiff = Math.abs(sourceCount - targetCount);
    const countMatch = sourceCount === 0 || countDiff / sourceCount < 0.01; // < 1% difference
    checks.push({
      id: 'row_count_match',
      name: 'Row counts match',
      severity: 'critical',
      passed: countMatch,
      message: `Source: ${sourceCount}, Target: ${targetCount} (diff: ${countDiff})`,
    });

    return checks;
  }

  /**
   * Get the cutover readiness summary.
   */
  async getReadiness(workspaceId: string): Promise<{
    ready: boolean;
    checks: CutoverPreCheck[];
    blockers: string[];
    warnings: string[];
  }> {
    const checks = await this.runPreChecks(workspaceId);
    const blockers = checks
      .filter(c => c.severity === 'blocker' && !c.passed)
      .map(c => c.message);
    const warnings = checks
      .filter(c => (c.severity === 'warning' || c.severity === 'critical') && !c.passed)
      .map(c => c.message);

    return {
      ready: blockers.length === 0,
      checks,
      blockers,
      warnings,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private initializeCutoverState(workspaceId: string): CutoverState {
    return {
      workspaceId,
      phase: 'pre_check',
      startedAt: new Date().toISOString(),
      completedAt: null,
      rollbackAvailable: false,
      preChecksPassed: false,
      finalParityScore: 0,
      error: null,
      steps: CUTOVER_STEPS.map(s => ({
        name: s.name,
        status: 'pending' as const,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        error: null,
      })),
    };
  }

  private async executeStep(
    cutoverState: CutoverState,
    stepIndex: number,
    action: () => Promise<void>,
  ): Promise<void> {
    const step = cutoverState.steps[stepIndex];
    if (!step) return;

    step.status = 'running';
    step.startedAt = new Date().toISOString();

    try {
      await action();
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.durationMs = Date.now() - new Date(step.startedAt).getTime();

      await this.db.logMigrationEvent({
        workspaceId: cutoverState.workspaceId,
        eventType: 'cutover_step_completed',
        details: {
          stepName: step.name,
          stepIndex,
          durationMs: step.durationMs,
        },
      });
    } catch (error) {
      step.status = 'failed';
      step.completedAt = new Date().toISOString();
      step.durationMs = Date.now() - new Date(step.startedAt).getTime();
      step.error = error instanceof Error ? error.message : String(error);

      // Mark remaining steps as skipped
      for (let i = stepIndex + 1; i < cutoverState.steps.length; i++) {
        cutoverState.steps[i].status = 'skipped';
      }

      throw error;
    }
  }
}
