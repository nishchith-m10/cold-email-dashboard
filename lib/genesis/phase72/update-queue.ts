/**
 * PHASE 72: SUPABASE-BACKED UPDATE QUEUE
 *
 * Replaces BullMQ with a Supabase table-backed job queue.
 * This is Vercel-compatible (no Redis dependency required).
 *
 * Queue operations:
 *   - Enqueue: Insert jobs into genesis.fleet_update_queue
 *   - Claim: Atomically mark queued jobs as processing
 *   - Complete/Fail: Update job status with retry logic
 *   - Rollback: Cancel pending jobs for a rollout
 *
 * Processing is driven by a cron route (app/api/cron/fleet-update-processor)
 * that claims and processes batches of jobs.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.4, 68.5
 */

import {
  enqueueUpdateJobs,
  claimQueuedJobs,
  completeQueueJob,
  failQueueJob,
  getQueueStats,
  getQueueJobsByWave,
  rollbackQueueJobs,
} from './db-service';

import type {
  FleetUpdateQueueRecord,
  FleetComponent,
  QueueJobStatus,
} from './types';

import {
  MAX_QUEUE_ATTEMPTS,
  EMERGENCY_PRIORITY,
  NORMAL_PRIORITY,
} from './types';

// ============================================
// QUEUE OPERATIONS
// ============================================

/**
 * Enqueue update jobs for a wave of tenants.
 * Each tenant gets one job per component update.
 */
export async function enqueueWave(params: {
  rolloutId: string;
  component: FleetComponent;
  fromVersion: string;
  toVersion: string;
  workspaceIds: string[];
  waveNumber: number;
  priority?: number;
}): Promise<number> {
  const {
    rolloutId,
    component,
    fromVersion,
    toVersion,
    workspaceIds,
    waveNumber,
    priority = NORMAL_PRIORITY,
  } = params;

  const jobs = workspaceIds.map(wsId => ({
    rollout_id: rolloutId,
    workspace_id: wsId,
    component,
    from_version: fromVersion,
    to_version: toVersion,
    priority,
    status: 'queued' as QueueJobStatus,
    attempt_count: 0,
    max_attempts: MAX_QUEUE_ATTEMPTS,
    error_message: null,
    wave_number: waveNumber,
  }));

  return enqueueUpdateJobs(jobs);
}

/**
 * Enqueue emergency rollback jobs with CRITICAL priority.
 * These jump ahead of normal update jobs in the queue.
 */
export async function enqueueEmergencyRollback(params: {
  rolloutId: string;
  component: FleetComponent;
  rollbackToVersion: string;
  currentVersion: string;
  workspaceIds: string[];
}): Promise<number> {
  const {
    rolloutId,
    component,
    rollbackToVersion,
    currentVersion,
    workspaceIds,
  } = params;

  const jobs = workspaceIds.map(wsId => ({
    rollout_id: rolloutId,
    workspace_id: wsId,
    component,
    from_version: currentVersion,
    to_version: rollbackToVersion,
    priority: EMERGENCY_PRIORITY,
    status: 'queued' as QueueJobStatus,
    attempt_count: 0,
    max_attempts: MAX_QUEUE_ATTEMPTS,
    error_message: null,
    wave_number: 0, // Rollback wave
  }));

  return enqueueUpdateJobs(jobs);
}

/**
 * Claim the next batch of jobs for processing.
 * Returns jobs atomically marked as 'processing'.
 */
export async function claimBatch(
  batchSize: number = 50
): Promise<FleetUpdateQueueRecord[]> {
  return claimQueuedJobs(batchSize);
}

/**
 * Report a job as successfully completed.
 */
export async function reportJobSuccess(jobId: string): Promise<void> {
  return completeQueueJob(jobId);
}

/**
 * Report a job as failed (auto-retries up to MAX_QUEUE_ATTEMPTS).
 */
export async function reportJobFailure(
  jobId: string,
  errorMessage: string
): Promise<void> {
  return failQueueJob(jobId, errorMessage);
}

/**
 * Cancel all pending jobs for a rollout (abort/rollback).
 */
export async function cancelRolloutJobs(
  rolloutId: string
): Promise<number> {
  return rollbackQueueJobs(rolloutId);
}

/**
 * Get job queue statistics for a rollout.
 */
export async function getRolloutQueueStats(
  rolloutId: string
): Promise<{
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  rolled_back: number;
  completion_percent: number;
  error_rate: number;
}> {
  const stats = await getQueueStats(rolloutId);

  const total = Object.values(stats).reduce((sum, n) => sum + n, 0);
  const terminal = stats.completed + stats.failed + stats.rolled_back;

  return {
    total,
    ...stats,
    completion_percent: total > 0 ? (stats.completed / total) * 100 : 0,
    error_rate: terminal > 0 ? stats.failed / terminal : 0,
  };
}

/**
 * Get wave-level progress for a rollout.
 */
export async function getWaveProgress(
  rolloutId: string,
  waveNumber: number
): Promise<{
  total: number;
  completed: number;
  failed: number;
  processing: number;
  queued: number;
  error_rate: number;
  is_complete: boolean;
}> {
  const jobs = await getQueueJobsByWave(rolloutId, waveNumber);

  let completed = 0;
  let failed = 0;
  let processing = 0;
  let queued = 0;

  for (const job of jobs) {
    switch (job.status) {
      case 'completed': completed++; break;
      case 'failed': failed++; break;
      case 'processing': processing++; break;
      case 'queued': queued++; break;
    }
  }

  const terminal = completed + failed;

  return {
    total: jobs.length,
    completed,
    failed,
    processing,
    queued,
    error_rate: terminal > 0 ? failed / terminal : 0,
    is_complete: processing === 0 && queued === 0 && jobs.length > 0,
  };
}
