/**
 * GENESIS PHASE 46: DUAL-WRITE SERVICE
 *
 * Manages dual-write triggers that replicate data from legacy (public)
 * tables to genesis partitioned tables in real-time.
 *
 * The dual-write trigger is a Postgres trigger function that fires
 * AFTER INSERT/UPDATE/DELETE on the source table and replicates the
 * change to the target genesis partition.
 */

import {
  DualWriteConfig,
  DualWriteResult,
  DualWriteEvent,
  MigrationDB,
  MigrationStateRow,
} from './types';
import { MigrationStateManager, MigrationStateError } from './migration-state-manager';

export class DualWriteServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly workspaceId?: string,
  ) {
    super(message);
    this.name = 'DualWriteServiceError';
  }
}

export class DualWriteService {
  private readonly stateManager: MigrationStateManager;

  constructor(private readonly db: MigrationDB) {
    this.stateManager = new MigrationStateManager(db);
  }

  /**
   * Enable dual-write for a workspace.
   * This creates a Postgres trigger on the source table that
   * replicates writes to the target genesis partition.
   */
  async enable(workspaceId: string): Promise<DualWriteResult> {
    // Validate migration exists and is in correct state
    const state = await this.stateManager.getStateOrThrow(workspaceId);

    if (state.dualWriteEnabled) {
      return {
        success: true,
        triggerName: this.generateTriggerName(workspaceId),
        error: 'Dual-write already enabled (idempotent)',
      };
    }

    if (state.status !== 'idle' && state.status !== 'dual_write') {
      throw new DualWriteServiceError(
        `Cannot enable dual-write in '${state.status}' state. Must be 'idle' or 'dual_write'.`,
        'INVALID_STATE',
        workspaceId,
      );
    }

    const triggerName = this.generateTriggerName(workspaceId);

    try {
      // Create the trigger in the database
      const triggerCreated = await this.db.enableDualWriteTrigger(
        workspaceId,
        state.sourceTable,
      );

      if (!triggerCreated) {
        throw new DualWriteServiceError(
          'Failed to create dual-write trigger in database',
          'TRIGGER_CREATION_FAILED',
          workspaceId,
        );
      }

      // Update migration state
      await this.stateManager.transitionTo(workspaceId, 'dual_write', {
        dual_write_enabled: true,
      });

      // Log the event
      await this.db.logMigrationEvent({
        workspaceId,
        eventType: 'dual_write_enabled',
        details: {
          triggerName,
          sourceTable: state.sourceTable,
          targetTable: state.targetTable,
        },
      });

      return {
        success: true,
        triggerName,
      };
    } catch (error) {
      // If trigger creation fails, ensure we don't leave state inconsistent
      if (error instanceof DualWriteServiceError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.stateManager.recordError(workspaceId, `Dual-write enable failed: ${errorMessage}`);

      return {
        success: false,
        triggerName,
        error: errorMessage,
      };
    }
  }

  /**
   * Disable dual-write for a workspace.
   * Removes the trigger but keeps the migration state.
   */
  async disable(workspaceId: string): Promise<DualWriteResult> {
    const state = await this.stateManager.getStateOrThrow(workspaceId);

    if (!state.dualWriteEnabled) {
      return {
        success: true,
        triggerName: this.generateTriggerName(workspaceId),
        error: 'Dual-write already disabled (idempotent)',
      };
    }

    const triggerName = this.generateTriggerName(workspaceId);

    try {
      // Remove the trigger from the database
      const triggerRemoved = await this.db.disableDualWriteTrigger(
        workspaceId,
        state.sourceTable,
      );

      if (!triggerRemoved) {
        throw new DualWriteServiceError(
          'Failed to remove dual-write trigger from database',
          'TRIGGER_REMOVAL_FAILED',
          workspaceId,
        );
      }

      // Update state — transition to idle if currently in dual_write
      if (state.status === 'dual_write') {
        await this.stateManager.transitionTo(workspaceId, 'idle', {
          dual_write_enabled: false,
        });
      } else {
        // Just update the flag, don't change status
        await this.db.updateMigrationState(workspaceId, {
          dual_write_enabled: false,
          updated_at: new Date().toISOString(),
        });
      }

      await this.db.logMigrationEvent({
        workspaceId,
        eventType: 'dual_write_disabled',
        details: {
          triggerName,
          sourceTable: state.sourceTable,
          previousStatus: state.status,
        },
      });

      return {
        success: true,
        triggerName,
      };
    } catch (error) {
      if (error instanceof DualWriteServiceError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.stateManager.recordError(workspaceId, `Dual-write disable failed: ${errorMessage}`);

      return {
        success: false,
        triggerName,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if dual-write is currently enabled for a workspace.
   */
  async isEnabled(workspaceId: string): Promise<boolean> {
    const state = await this.stateManager.getState(workspaceId);
    return state?.dualWriteEnabled ?? false;
  }

  /**
   * Get the status of dual-write including health info.
   */
  async getStatus(workspaceId: string): Promise<{
    enabled: boolean;
    migrationStatus: string;
    triggerName: string;
    sourceTable: string | null;
    targetTable: string | null;
    errorCount: number;
  }> {
    const state = await this.stateManager.getState(workspaceId);
    return {
      enabled: state?.dualWriteEnabled ?? false,
      migrationStatus: state?.status ?? 'not_configured',
      triggerName: this.generateTriggerName(workspaceId),
      sourceTable: state?.sourceTable ?? null,
      targetTable: state?.targetTable ?? null,
      errorCount: state?.errorCount ?? 0,
    };
  }

  /**
   * Generate the trigger name for a workspace.
   * Uses a deterministic naming convention based on workspace ID.
   */
  generateTriggerName(workspaceId: string): string {
    return `dual_write_${workspaceId.replace(/-/g, '_')}`;
  }

  /**
   * Generate the trigger function name for a workspace.
   */
  generateFunctionName(workspaceId: string): string {
    return `genesis.dual_write_fn_${workspaceId.replace(/-/g, '_')}`;
  }
}
