/**
 * GENESIS PHASE 46: MIGRATION STATE MANAGER
 *
 * Manages the lifecycle of migration state for each workspace.
 * Enforces valid state transitions and maintains audit trail.
 */

import {
  MigrationState,
  MigrationStatus,
  MigrationDB,
  CreateMigrationInput,
  MigrationStateRow,
  isValidTransition,
  migrationStateRowToModel,
  MIGRATION_DEFAULTS,
} from './types';

export class MigrationStateError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly workspaceId?: string,
  ) {
    super(message);
    this.name = 'MigrationStateError';
  }
}

export class MigrationStateManager {
  constructor(private readonly db: MigrationDB) {}

  /**
   * Get migration state for a workspace.
   * Returns null if no migration is configured.
   */
  async getState(workspaceId: string): Promise<MigrationState | null> {
    this.validateWorkspaceId(workspaceId);
    const row = await this.db.getMigrationState(workspaceId);
    return row ? migrationStateRowToModel(row) : null;
  }

  /**
   * Get migration state or throw if not found.
   */
  async getStateOrThrow(workspaceId: string): Promise<MigrationState> {
    const state = await this.getState(workspaceId);
    if (!state) {
      throw new MigrationStateError(
        `No migration configured for workspace ${workspaceId}`,
        'MIGRATION_NOT_FOUND',
        workspaceId,
      );
    }
    return state;
  }

  /**
   * Create a new migration state entry for a workspace.
   */
  async createMigration(input: CreateMigrationInput): Promise<MigrationState> {
    this.validateWorkspaceId(input.workspaceId);
    this.validateTableName(input.sourceTable, 'sourceTable');
    this.validateTableName(input.targetTable, 'targetTable');

    if (input.sourceTable === input.targetTable) {
      throw new MigrationStateError(
        'Source and target tables cannot be the same',
        'INVALID_CONFIG',
        input.workspaceId,
      );
    }

    // Check for existing migration
    const existing = await this.db.getMigrationState(input.workspaceId);
    if (existing) {
      throw new MigrationStateError(
        `Migration already exists for workspace ${input.workspaceId} (status: ${existing.status})`,
        'MIGRATION_EXISTS',
        input.workspaceId,
      );
    }

    const row = await this.db.createMigrationState({
      ...input,
      batchSize: input.batchSize || MIGRATION_DEFAULTS.BATCH_SIZE,
    });

    await this.db.logMigrationEvent({
      workspaceId: input.workspaceId,
      eventType: 'migration_created',
      details: {
        sourceTable: input.sourceTable,
        targetTable: input.targetTable,
        batchSize: input.batchSize || MIGRATION_DEFAULTS.BATCH_SIZE,
      },
    });

    return migrationStateRowToModel(row);
  }

  /**
   * Transition migration to a new status.
   * Validates the transition is allowed by the state machine.
   */
  async transitionTo(
    workspaceId: string,
    newStatus: MigrationStatus,
    additionalUpdates?: Partial<MigrationStateRow>,
  ): Promise<MigrationState> {
    const state = await this.getStateOrThrow(workspaceId);
    const currentStatus = state.status;

    if (!isValidTransition(currentStatus, newStatus)) {
      throw new MigrationStateError(
        `Invalid transition from '${currentStatus}' to '${newStatus}'. Allowed: [${(
          await this.getAllowedTransitions(workspaceId)
        ).join(', ')}]`,
        'INVALID_TRANSITION',
        workspaceId,
      );
    }

    const updates: Partial<MigrationStateRow> = {
      ...additionalUpdates,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Reset error state on successful transitions away from 'failed'
    if (currentStatus === 'failed' && newStatus !== 'failed') {
      updates.error_message = null;
    }

    const updated = await this.db.updateMigrationState(workspaceId, updates);
    if (!updated) {
      throw new MigrationStateError(
        `Failed to update migration state for workspace ${workspaceId}`,
        'UPDATE_FAILED',
        workspaceId,
      );
    }

    return migrationStateRowToModel(updated);
  }

  /**
   * Get allowed transitions from current state.
   */
  async getAllowedTransitions(workspaceId: string): Promise<MigrationStatus[]> {
    const state = await this.getStateOrThrow(workspaceId);
    const { VALID_TRANSITIONS } = await import('./types');
    return VALID_TRANSITIONS[state.status] || [];
  }

  /**
   * Update backfill progress without changing status.
   */
  async updateBackfillProgress(
    workspaceId: string,
    processedRows: number,
    totalRows: number,
    lastId: string | null,
  ): Promise<MigrationState> {
    const state = await this.getStateOrThrow(workspaceId);
    if (state.status !== 'backfilling') {
      throw new MigrationStateError(
        `Cannot update backfill progress in '${state.status}' state`,
        'INVALID_STATE',
        workspaceId,
      );
    }

    const progress = totalRows > 0 ? Math.min(100, Math.round((processedRows / totalRows) * 100)) : 0;

    const updated = await this.db.updateMigrationState(workspaceId, {
      backfill_progress: progress,
      backfill_last_id: lastId,
      backfill_processed_rows: processedRows,
      backfill_total_rows: totalRows,
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      throw new MigrationStateError(
        'Failed to update backfill progress',
        'UPDATE_FAILED',
        workspaceId,
      );
    }

    return migrationStateRowToModel(updated);
  }

  /**
   * Update parity score after a parity check.
   */
  async updateParityScore(
    workspaceId: string,
    parityScore: number,
  ): Promise<MigrationState> {
    const state = await this.getStateOrThrow(workspaceId);
    if (!['verifying', 'cutover_ready', 'backfilling', 'dual_write', 'cutover_complete'].includes(state.status)) {
      throw new MigrationStateError(
        `Cannot update parity score in '${state.status}' state`,
        'INVALID_STATE',
        workspaceId,
      );
    }

    const clampedScore = Math.max(0, Math.min(100, parityScore));

    const updated = await this.db.updateMigrationState(workspaceId, {
      parity_score: clampedScore,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      throw new MigrationStateError(
        'Failed to update parity score',
        'UPDATE_FAILED',
        workspaceId,
      );
    }

    return migrationStateRowToModel(updated);
  }

  /**
   * Record an error and optionally transition to 'failed'.
   */
  async recordError(
    workspaceId: string,
    errorMessage: string,
    transitionToFailed: boolean = false,
  ): Promise<MigrationState> {
    const state = await this.getStateOrThrow(workspaceId);
    const newErrorCount = state.errorCount + 1;

    const updates: Partial<MigrationStateRow> = {
      error_message: errorMessage,
      error_count: newErrorCount,
      updated_at: new Date().toISOString(),
    };

    // Auto-transition to failed if error count exceeds threshold
    const shouldFail =
      transitionToFailed ||
      newErrorCount >= MIGRATION_DEFAULTS.MAX_ERROR_COUNT_BEFORE_ABORT;

    if (shouldFail && isValidTransition(state.status, 'failed')) {
      updates.status = 'failed';
    }

    const updated = await this.db.updateMigrationState(workspaceId, updates);
    if (!updated) {
      throw new MigrationStateError(
        'Failed to record error',
        'UPDATE_FAILED',
        workspaceId,
      );
    }

    await this.db.logMigrationEvent({
      workspaceId,
      eventType: 'error',
      details: {
        message: errorMessage,
        errorCount: newErrorCount,
        previousStatus: state.status,
        transitionedToFailed: shouldFail,
      },
    });

    return migrationStateRowToModel(updated);
  }

  /**
   * Delete a migration state (only allowed in terminal states).
   */
  async deleteMigration(workspaceId: string): Promise<boolean> {
    const state = await this.getStateOrThrow(workspaceId);
    const terminalStates: MigrationStatus[] = ['idle', 'cutover_complete', 'rolled_back', 'failed'];

    if (!terminalStates.includes(state.status)) {
      throw new MigrationStateError(
        `Cannot delete migration in '${state.status}' state. Must be in: [${terminalStates.join(', ')}]`,
        'INVALID_STATE',
        workspaceId,
      );
    }

    return this.db.deleteMigrationState(workspaceId);
  }

  /**
   * List all migrations, optionally filtered by status.
   */
  async listMigrations(filter?: { status?: MigrationStatus }): Promise<MigrationState[]> {
    const rows = await this.db.listMigrationStates(filter);
    return rows.map(migrationStateRowToModel);
  }

  /**
   * Reset a failed migration back to idle.
   */
  async resetMigration(workspaceId: string): Promise<MigrationState> {
    const state = await this.getStateOrThrow(workspaceId);
    const resettableStates: MigrationStatus[] = ['failed', 'rolled_back'];

    if (!resettableStates.includes(state.status)) {
      throw new MigrationStateError(
        `Cannot reset migration in '${state.status}' state. Must be in: [${resettableStates.join(', ')}]`,
        'INVALID_STATE',
        workspaceId,
      );
    }

    const updated = await this.db.updateMigrationState(workspaceId, {
      status: 'idle',
      dual_write_enabled: false,
      backfill_progress: 0,
      backfill_last_id: null,
      backfill_processed_rows: 0,
      parity_score: 0,
      last_verified_at: null,
      error_message: null,
      error_count: 0,
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      throw new MigrationStateError(
        'Failed to reset migration',
        'UPDATE_FAILED',
        workspaceId,
      );
    }

    return migrationStateRowToModel(updated);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private validateWorkspaceId(workspaceId: string): void {
    if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      throw new MigrationStateError(
        'Invalid workspace ID: must be a non-empty string',
        'INVALID_WORKSPACE_ID',
      );
    }
  }

  private validateTableName(tableName: string, fieldName: string): void {
    if (!tableName || typeof tableName !== 'string' || tableName.trim().length === 0) {
      throw new MigrationStateError(
        `Invalid ${fieldName}: must be a non-empty string`,
        'INVALID_TABLE_NAME',
      );
    }
    // Basic SQL injection prevention
    if (/[;'"\\]/.test(tableName)) {
      throw new MigrationStateError(
        `Invalid ${fieldName}: contains disallowed characters`,
        'INVALID_TABLE_NAME',
      );
    }
  }
}
