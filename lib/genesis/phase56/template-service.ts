/**
 * PHASE 56: FLEET-WIDE TEMPLATE RECONCILIATION - SERVICE IMPLEMENTATION
 * 
 * Core service for managing fleet-wide template updates with batched rollouts.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 56
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  TemplateReconciliationService,
  TemplateDB,
  UpdateClient,
  VersionMismatch,
  BlueGreenUpdate,
  BlueGreenConfig,
  RolloutProgress,
  BatchedRolloutConfig,
  CanaryRollout,
  CanaryRolloutConfig,
  RolloutBatch,
  UpdateResult,
} from './template-types';
import {
  DEFAULT_BLUE_GREEN_CONFIG,
  DEFAULT_BATCHED_ROLLOUT_CONFIG,
  DEFAULT_CANARY_CONFIG,
} from './template-types';

// ============================================
// TEMPLATE RECONCILIATION SERVICE
// ============================================

export class TemplateReconciliationManager implements TemplateReconciliationService {
  constructor(
    private db: TemplateDB,
    private updateClient: UpdateClient
  ) {}

  // ============================================
  // VERSION DETECTION
  // ============================================

  async detectVersionMismatches(): Promise<VersionMismatch[]> {
    const latestTemplate = await this.db.getLatestTemplateVersion();
    
    if (!latestTemplate) {
      return [];
    }
    
    return await this.db.findVersionMismatches(latestTemplate.version);
  }

  // ============================================
  // BLUE-GREEN UPDATE
  // ============================================

  async executeBlueGreenUpdate(
    workspaceId: string,
    dropletId: string,
    targetVersion: string,
    config: BlueGreenConfig = DEFAULT_BLUE_GREEN_CONFIG
  ): Promise<BlueGreenUpdate> {
    const startTime = Date.now();
    const status = await this.db.getWorkspaceTemplateStatus(workspaceId);
    
    const update: BlueGreenUpdate = {
      workspace_id: workspaceId,
      droplet_id: dropletId,
      from_version: status?.current_version || 'unknown',
      to_version: targetVersion,
      step: 'pull_image',
      started_at: new Date(),
      pull_completed_at: null,
      quiet_period_achieved_at: null,
      swap_completed_at: null,
      health_check_passed_at: null,
      completed_at: null,
      downtime_seconds: null,
    };

    try {
      // STEP 1: Pull new image
      await this.updateClient.pullImage(dropletId, `n8nio/n8n:${targetVersion}`);
      update.pull_completed_at = new Date();

      // STEP 2: Wait for quiet period
      update.step = 'wait_quiet_period';
      const quietAchieved = await this.updateClient.waitForQuietPeriod(
        dropletId,
        config.quiet_period_timeout_seconds
      );
      
      if (!quietAchieved && !config.force_swap_after_timeout) {
        throw new Error('Quiet period not achieved and force swap disabled');
      }
      
      update.quiet_period_achieved_at = new Date();

      // STEP 3: Swap containers
      update.step = 'swap_containers';
      const swapStart = Date.now();
      await this.updateClient.swapContainers(dropletId, targetVersion);
      const swapEnd = Date.now();
      
      update.swap_completed_at = new Date();
      update.downtime_seconds = (swapEnd - swapStart) / 1000;

      // STEP 4: Health check
      update.step = 'health_check';
      const healthOk = await this.updateClient.checkHealth(dropletId);
      
      if (!healthOk) {
        // Rollback
        update.step = 'rollback';
        update.rollback_reason = 'Health check failed';
        await this.updateClient.rollbackContainer(dropletId, update.from_version);
        throw new Error('Health check failed, rolled back');
      }
      
      update.health_check_passed_at = new Date();

      // STEP 5: Cleanup
      update.step = 'cleanup';
      update.completed_at = new Date();
      
      // Update workspace version
      await this.db.updateWorkspaceTemplateVersion(workspaceId, targetVersion);
      
      return update;
    } catch (error) {
      update.error = error instanceof Error ? error.message : String(error);
      return update;
    }
  }

  // ============================================
  // BATCHED ROLLOUT
  // ============================================

  async startBatchedRollout(
    targetVersion: string,
    workspaceIds: string[],
    config: BatchedRolloutConfig = DEFAULT_BATCHED_ROLLOUT_CONFIG
  ): Promise<RolloutProgress> {
    const rolloutId = uuidv4();
    
    // Create batches
    const batches: RolloutBatch[] = [];
    for (let i = 0; i < workspaceIds.length; i += config.batch_size) {
      const batchWorkspaces = workspaceIds.slice(i, i + config.batch_size);
      batches.push({
        batch_number: batches.length + 1,
        workspace_ids: batchWorkspaces,
        started_at: null,
        completed_at: null,
        success_count: 0,
        failure_count: 0,
        failure_rate: 0,
      });
    }

    const progress: RolloutProgress = {
      rollout_id: rolloutId,
      template_version: targetVersion,
      status: 'in_progress',
      config,
      total_workspaces: workspaceIds.length,
      batches,
      current_batch: 0,
      total_success: 0,
      total_failures: 0,
      overall_failure_rate: 0,
      started_at: new Date(),
      paused_at: null,
      completed_at: null,
      aborted_at: null,
    };

    await this.db.createRollout(progress);

    // Execute batches (in production, this would be async via BullMQ)
    await this.executeBatchedRollout(progress);

    return progress;
  }

  private async executeBatchedRollout(progress: RolloutProgress): Promise<void> {
    for (let i = 0; i < progress.batches.length; i++) {
      const batch = progress.batches[i];
      batch.started_at = new Date();
      progress.current_batch = i + 1;

      await this.db.updateRollout(progress.rollout_id, {
        current_batch: progress.current_batch,
        batches: progress.batches,
      });

      // Execute batch
      for (const workspaceId of batch.workspace_ids) {
        const status = await this.db.getWorkspaceTemplateStatus(workspaceId);
        
        if (!status) continue;

        try {
          const result = await this.updateClient.triggerUpdate({
            workspace_id: workspaceId,
            droplet_id: status.droplet_id,
            from_version: status.current_version || 'unknown',
            to_version: progress.template_version,
            update_type: 'workflow',
            priority: 'normal',
          });

          if (result.success) {
            batch.success_count++;
            progress.total_success++;
          } else {
            batch.failure_count++;
            progress.total_failures++;
          }

          await this.db.recordUpdateResult(result);
        } catch (error) {
          batch.failure_count++;
          progress.total_failures++;
        }
      }

      batch.completed_at = new Date();
      batch.failure_rate = batch.failure_count / batch.workspace_ids.length;
      progress.overall_failure_rate = progress.total_failures / (progress.total_success + progress.total_failures);

      // Check failure threshold
      if (batch.failure_rate * 100 >= progress.config.failure_threshold_percent) {
        progress.status = 'paused';
        progress.paused_at = new Date();
        
        await this.db.updateRollout(progress.rollout_id, {
          status: 'paused',
          paused_at: progress.paused_at,
          batches: progress.batches,
          total_success: progress.total_success,
          total_failures: progress.total_failures,
          overall_failure_rate: progress.overall_failure_rate,
        });
        
        return; // Pause for human review
      }

      // Check abort threshold
      if (progress.overall_failure_rate * 100 >= progress.config.max_failures_before_abort_percent) {
        progress.status = 'aborted';
        progress.aborted_at = new Date();
        progress.abort_reason = `Failure rate ${(progress.overall_failure_rate * 100).toFixed(1)}% exceeded max ${progress.config.max_failures_before_abort_percent}%`;
        
        await this.db.updateRollout(progress.rollout_id, {
          status: 'aborted',
          aborted_at: progress.aborted_at,
          abort_reason: progress.abort_reason,
          batches: progress.batches,
          total_success: progress.total_success,
          total_failures: progress.total_failures,
          overall_failure_rate: progress.overall_failure_rate,
        });
        
        return;
      }

      // Pause between batches
      if (i < progress.batches.length - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, progress.config.pause_between_batches_seconds * 1000)
        );
      }
    }

    // Completed successfully
    progress.status = 'completed';
    progress.completed_at = new Date();
    
    await this.db.updateRollout(progress.rollout_id, {
      status: 'completed',
      completed_at: progress.completed_at,
      batches: progress.batches,
      total_success: progress.total_success,
      total_failures: progress.total_failures,
      overall_failure_rate: progress.overall_failure_rate,
    });
  }

  // ============================================
  // CANARY ROLLOUT
  // ============================================

  async startCanaryRollout(
    targetVersion: string,
    config: CanaryRolloutConfig = DEFAULT_CANARY_CONFIG
  ): Promise<CanaryRollout> {
    const rolloutId = uuidv4();
    
    // Get all workspaces needing update
    const workspaces = await this.db.findWorkspacesNeedingUpdate(targetVersion);
    const workspaceIds = workspaces.map(w => w.workspace_id);

    // Create canary wave
    const canaryIds = workspaceIds.slice(0, config.canary_size);
    
    const canary: CanaryRollout = {
      rollout_id: rolloutId,
      template_version: targetVersion,
      config,
      waves: [{
        wave_number: 1,
        workspace_count: canaryIds.length,
        workspace_ids: canaryIds,
        started_at: null,
        completed_at: null,
        success_count: 0,
        failure_count: 0,
        success_rate: 0,
      }],
      current_wave: 1,
      status: 'in_progress',
      canary_success_rate: null,
      proceed_to_full_rollout: false,
    };

    // Execute canary (simplified for Phase 56)
    return canary;
  }

  // ============================================
  // ROLLOUT CONTROL
  // ============================================

  async pauseRollout(rolloutId: string): Promise<void> {
    await this.db.updateRollout(rolloutId, {
      status: 'paused',
      paused_at: new Date(),
    });
  }

  async resumeRollout(rolloutId: string): Promise<void> {
    const progress = await this.db.getRollout(rolloutId);
    
    if (!progress || progress.status !== 'paused') {
      throw new TemplateError('Rollout not in paused state', 'INVALID_STATE', { rolloutId });
    }

    await this.db.updateRollout(rolloutId, {
      status: 'in_progress',
      paused_at: null,
    });

    // Resume execution (would continue from current batch)
    await this.executeBatchedRollout(progress);
  }

  async abortRollout(rolloutId: string, reason: string): Promise<void> {
    await this.db.updateRollout(rolloutId, {
      status: 'aborted',
      aborted_at: new Date(),
      abort_reason: reason,
    });
  }

  // ============================================
  // STATUS QUERIES
  // ============================================

  async getRolloutStatus(rolloutId: string): Promise<RolloutProgress | null> {
    return await this.db.getRollout(rolloutId);
  }

  async getFleetVersionSummary(): Promise<{
    total_workspaces: number;
    by_version: Record<string, number>;
    needs_update: number;
  }> {
    const latestTemplate = await this.db.getLatestTemplateVersion();
    
    if (!latestTemplate) {
      return {
        total_workspaces: 0,
        by_version: {},
        needs_update: 0,
      };
    }

    const needingUpdate = await this.db.findWorkspacesNeedingUpdate(latestTemplate.version);
    
    return {
      total_workspaces: needingUpdate.length,
      by_version: { [latestTemplate.version]: needingUpdate.length },
      needs_update: needingUpdate.filter(w => w.needs_update).length,
    };
  }
}

// ============================================
// FACTORY
// ============================================

export function createTemplateReconciliationService(
  db: TemplateDB,
  updateClient: UpdateClient
): TemplateReconciliationService {
  return new TemplateReconciliationManager(db, updateClient);
}

// ============================================
// ERRORS
// ============================================

export class TemplateError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}
