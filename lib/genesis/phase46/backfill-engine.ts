/**
 * GENESIS PHASE 46: BACKFILL ENGINE
 *
 * Handles batched data migration from legacy tables to genesis partitions.
 * Supports:
 * - Resumable backfill (tracks last processed ID)
 * - Progress reporting
 * - Error recovery with configurable retries
 * - Abort capability
 * - Batch-level transaction safety
 */

import {
  BackfillConfig,
  BackfillProgress,
  BackfillResult,
  BackfillBatchResult,
  BackfillError,
  MigrationDB,
  MIGRATION_DEFAULTS,
} from './types';
import { MigrationStateManager, MigrationStateError } from './migration-state-manager';

export class BackfillEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly workspaceId?: string,
  ) {
    super(message);
    this.name = 'BackfillEngineError';
  }
}

export class BackfillEngine {
  private readonly stateManager: MigrationStateManager;

  constructor(private readonly db: MigrationDB) {
    this.stateManager = new MigrationStateManager(db);
  }

  /**
   * Start or resume a backfill for a workspace.
   * This copies data from the source (legacy) table to the target (genesis) partition.
   */
  async run(config: BackfillConfig): Promise<BackfillResult> {
    const startTime = Date.now();
    const state = await this.stateManager.getStateOrThrow(config.workspaceId);

    // Validate state
    if (state.status !== 'dual_write' && state.status !== 'backfilling') {
      throw new BackfillEngineError(
        `Cannot start backfill in '${state.status}' state. Must be 'dual_write' or 'backfilling'.`,
        'INVALID_STATE',
        config.workspaceId,
      );
    }

    // Transition to backfilling if not already
    if (state.status === 'dual_write') {
      await this.stateManager.transitionTo(config.workspaceId, 'backfilling');
    }

    await this.db.logMigrationEvent({
      workspaceId: config.workspaceId,
      eventType: 'backfill_started',
      details: {
        batchSize: config.batchSize,
        resumeFromId: config.resumeFromId,
        sourceTable: config.sourceTable,
        targetTable: config.targetTable,
      },
    });

    // Get total row count for progress tracking
    const totalRows = await this.db.getSourceRowCount(
      config.sourceTable,
      config.workspaceId,
    );

    let processedRows = 0;
    let lastId = config.resumeFromId;
    let batchesCompleted = 0;
    let errorsEncountered = 0;
    let skippedRows = 0;
    let consecutiveErrors = 0;

    const progress: BackfillProgress = {
      workspaceId: config.workspaceId,
      processedRows: 0,
      totalRows,
      percentComplete: 0,
      lastProcessedId: lastId,
      batchesCompleted: 0,
      errorsEncountered: 0,
      estimatedTimeRemainingMs: null,
      startedAt: new Date().toISOString(),
      currentBatchStartedAt: new Date().toISOString(),
    };

    try {
      while (true) {
        // Check for abort signal
        if (config.abortSignal?.aborted) {
          await this.stateManager.updateBackfillProgress(
            config.workspaceId,
            processedRows,
            totalRows,
            lastId,
          );

          return {
            success: false,
            processedRows,
            totalRows,
            batchesCompleted,
            errorsEncountered,
            skippedRows,
            durationMs: Date.now() - startTime,
            resumeFromId: lastId,
            error: 'Backfill aborted by signal',
          };
        }

        progress.currentBatchStartedAt = new Date().toISOString();

        // Fetch a batch from source
        const sourceBatch = await this.db.getSourceBatch(
          config.sourceTable,
          config.workspaceId,
          lastId,
          config.batchSize,
        );

        // If no more rows, backfill is complete
        if (sourceBatch.length === 0) {
          break;
        }

        // Process the batch with retries
        const batchResult = await this.processBatchWithRetries(
          config,
          sourceBatch,
        );

        processedRows += batchResult.rowsProcessed;
        batchesCompleted++;
        errorsEncountered += batchResult.errors.length;

        if (batchResult.lastId) {
          lastId = batchResult.lastId;
        }

        if (batchResult.success) {
          consecutiveErrors = 0;
        } else {
          consecutiveErrors++;
          skippedRows += sourceBatch.length - batchResult.rowsProcessed;
        }

        // Check if too many consecutive errors
        if (consecutiveErrors >= config.maxRetries) {
          const errorMsg = `Backfill aborted after ${consecutiveErrors} consecutive batch failures`;

          await this.stateManager.recordError(
            config.workspaceId,
            errorMsg,
            true, // transition to failed
          );

          await this.db.logMigrationEvent({
            workspaceId: config.workspaceId,
            eventType: 'backfill_failed',
            details: {
              processedRows,
              totalRows,
              consecutiveErrors,
              lastError: batchResult.errors[0]?.error,
            },
          });

          return {
            success: false,
            processedRows,
            totalRows,
            batchesCompleted,
            errorsEncountered,
            skippedRows,
            durationMs: Date.now() - startTime,
            resumeFromId: lastId,
            error: errorMsg,
          };
        }

        // Update progress
        const percentComplete = totalRows > 0
          ? Math.min(100, Math.round((processedRows / totalRows) * 100))
          : 0;

        progress.processedRows = processedRows;
        progress.percentComplete = percentComplete;
        progress.lastProcessedId = lastId;
        progress.batchesCompleted = batchesCompleted;
        progress.errorsEncountered = errorsEncountered;

        // Estimate time remaining
        const elapsedMs = Date.now() - startTime;
        if (processedRows > 0 && processedRows < totalRows) {
          const msPerRow = elapsedMs / processedRows;
          progress.estimatedTimeRemainingMs = Math.round(
            msPerRow * (totalRows - processedRows),
          );
        }

        // Report progress
        config.onProgress?.(progress);

        // Persist progress periodically
        await this.stateManager.updateBackfillProgress(
          config.workspaceId,
          processedRows,
          totalRows,
          lastId,
        );

        // Log progress events periodically
        if (batchesCompleted % 10 === 0) {
          await this.db.logMigrationEvent({
            workspaceId: config.workspaceId,
            eventType: 'backfill_progress',
            details: {
              processedRows,
              totalRows,
              percentComplete,
              batchesCompleted,
              errorsEncountered,
            },
          });
        }
      }

      // Backfill complete — update final progress
      await this.stateManager.updateBackfillProgress(
        config.workspaceId,
        processedRows,
        totalRows,
        lastId,
      );

      // Transition to verifying
      await this.stateManager.transitionTo(config.workspaceId, 'verifying');

      await this.db.logMigrationEvent({
        workspaceId: config.workspaceId,
        eventType: 'backfill_completed',
        details: {
          processedRows,
          totalRows,
          batchesCompleted,
          errorsEncountered,
          skippedRows,
          durationMs: Date.now() - startTime,
        },
      });

      return {
        success: true,
        processedRows,
        totalRows,
        batchesCompleted,
        errorsEncountered,
        skippedRows,
        durationMs: Date.now() - startTime,
        resumeFromId: null,
      };
    } catch (error) {
      // Unexpected error — save progress and re-throw
      try {
        await this.stateManager.updateBackfillProgress(
          config.workspaceId,
          processedRows,
          totalRows,
          lastId,
        );
      } catch {
        // Best-effort progress save
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      try {
        await this.stateManager.recordError(config.workspaceId, errorMessage);
      } catch {
        // Best-effort error recording
      }

      throw new BackfillEngineError(
        `Backfill failed: ${errorMessage}`,
        'BACKFILL_FAILED',
        config.workspaceId,
      );
    }
  }

  /**
   * Create a default backfill config from migration state.
   */
  async createConfigFromState(workspaceId: string): Promise<BackfillConfig> {
    const state = await this.stateManager.getStateOrThrow(workspaceId);

    return {
      workspaceId,
      sourceTable: state.sourceTable,
      targetTable: state.targetTable,
      batchSize: state.backfillBatchSize || MIGRATION_DEFAULTS.BATCH_SIZE,
      resumeFromId: state.backfillLastId,
      maxRetries: MIGRATION_DEFAULTS.MAX_RETRIES,
      retryDelayMs: MIGRATION_DEFAULTS.RETRY_DELAY_MS,
    };
  }

  /**
   * Get current backfill progress for a workspace.
   */
  async getProgress(workspaceId: string): Promise<BackfillProgress | null> {
    const state = await this.stateManager.getState(workspaceId);
    if (!state) return null;

    return {
      workspaceId,
      processedRows: state.backfillProcessedRows,
      totalRows: state.backfillTotalRows,
      percentComplete: state.backfillProgress,
      lastProcessedId: state.backfillLastId,
      batchesCompleted: Math.ceil(
        state.backfillProcessedRows / (state.backfillBatchSize || MIGRATION_DEFAULTS.BATCH_SIZE),
      ),
      errorsEncountered: state.errorCount,
      estimatedTimeRemainingMs: null,
      startedAt: state.createdAt,
      currentBatchStartedAt: state.updatedAt,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Process a single batch with retry logic.
   */
  private async processBatchWithRetries(
    config: BackfillConfig,
    batch: Array<Record<string, unknown>>,
  ): Promise<BackfillBatchResult> {
    let lastError: BackfillError | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff
        const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }

      try {
        const result = await this.db.insertTargetBatch(
          config.targetTable,
          batch,
        );

        const lastRow = batch[batch.length - 1];
        const lastId = lastRow?.id as string | undefined;

        return {
          success: result.errors.length === 0,
          rowsProcessed: result.inserted,
          lastId: lastId || null,
          errors: result.errors,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = {
          recordId: 'batch',
          error: errorMessage,
          retryable: attempt < config.maxRetries,
        };
      }
    }

    // All retries exhausted
    return {
      success: false,
      rowsProcessed: 0,
      lastId: batch.length > 0 ? (batch[batch.length - 1]?.id as string) : null,
      errors: lastError ? [lastError] : [],
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
