/**
 * PHASE 72: ROLLOUT ENGINE
 *
 * Orchestrates staged fleet rollouts following the spec 68.4 flow:
 *   Phase 1: CANARY (1% of tenants, ~150 tenants) — monitor 1 hour
 *   Phase 2: STAGED ROLLOUT
 *     Wave 1: 10% — monitor 30 min
 *     Wave 2: 25% — monitor 30 min
 *     Wave 3: 50% — monitor 30 min
 *     Wave 4: 100% — final deployment
 *
 * Auto-rollback if error rate exceeds thresholds.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.4
 */

import {
  createFleetRollout,
  updateFleetRollout,
  getFleetRollout,
  getTenantsNeedingUpdate,
  logUpdateHistory,
  setTenantUpdateStatus,
} from './db-service';

import { enqueueWave, cancelRolloutJobs, getRolloutQueueStats, getWaveProgress } from './update-queue';

import type {
  FleetComponent,
  FleetRolloutRecord,
  FleetRolloutStatus,
  InitiateRolloutInput,
  RolloutProgressSnapshot,
  WaveProgressSummary,
  RolloutStrategy,
  TenantVersionRecord,
} from './types';

import { DEFAULT_ROLLOUT_WAVES, CANARY_ERROR_THRESHOLD, STAGED_ERROR_THRESHOLD } from './types';

// ============================================
// ROLLOUT INITIATION
// ============================================

/**
 * Initiate a new fleet rollout.
 * Creates the rollout record and enqueues the first wave (canary or all).
 */
export async function initiateRollout(
  input: InitiateRolloutInput
): Promise<FleetRolloutRecord> {
  const {
    component,
    from_version,
    to_version,
    strategy,
    initiated_by,
    error_threshold,
    canary_percentage,
    metadata,
  } = input;

  // Get tenants that need updating
  const tenants = await getTenantsNeedingUpdate(component, to_version);
  if (tenants.length === 0) {
    throw new Error(`No tenants need updating for ${component} to ${to_version}`);
  }

  // Create rollout record
  const rollout = await createFleetRollout({
    component,
    from_version,
    to_version,
    strategy,
    status: strategy === 'immediate' ? 'wave_4' : 'canary',
    total_tenants: tenants.length,
    updated_tenants: 0,
    failed_tenants: 0,
    error_threshold: error_threshold ?? (strategy === 'immediate' ? 1.0 : STAGED_ERROR_THRESHOLD),
    canary_percentage: canary_percentage ?? 0.01,
    initiated_by,
    metadata,
  });

  // Log the initiation
  await logUpdateHistory({
    workspace_id: null,
    component,
    from_version,
    to_version,
    status: 'in_progress',
    error_message: null,
    executed_by: initiated_by,
    rollout_strategy: strategy,
    affected_tenants: tenants.length,
    rollout_id: rollout.id,
    wave_number: null,
  });

  // Enqueue the first wave based on strategy
  if (strategy === 'immediate') {
    // Immediate: enqueue all tenants at once
    await enqueueWave({
      rolloutId: rollout.id,
      component,
      fromVersion: from_version,
      toVersion: to_version,
      workspaceIds: tenants.map(t => t.workspace_id),
      waveNumber: 4,
    });
  } else {
    // Canary / Staged: start with canary wave
    const canarySize = Math.max(1, Math.ceil(tenants.length * (canary_percentage ?? 0.01)));
    const canaryTenants = selectCanaryTenants(tenants, canarySize);

    await enqueueWave({
      rolloutId: rollout.id,
      component,
      fromVersion: from_version,
      toVersion: to_version,
      workspaceIds: canaryTenants.map(t => t.workspace_id),
      waveNumber: 0, // Canary wave
    });

    // Mark canary tenants as updating
    for (const t of canaryTenants) {
      await setTenantUpdateStatus(t.workspace_id, 'updating');
    }
  }

  return rollout;
}

/**
 * Select tenants for the canary wave.
 * Prefers test/dev accounts first (if identifiable), then random selection.
 */
function selectCanaryTenants(
  tenants: TenantVersionRecord[],
  size: number
): TenantVersionRecord[] {
  // Shuffle array (Fisher-Yates)
  const shuffled = [...tenants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, size);
}

// ============================================
// WAVE PROGRESSION
// ============================================

/**
 * Advance a rollout to the next wave.
 * Called after the current wave completes and monitoring passes.
 *
 * Wave mapping:
 *   canary  (wave 0) → wave_1 (wave 1, 10%)
 *   wave_1  (wave 1) → wave_2 (wave 2, 25%)
 *   wave_2  (wave 2) → wave_3 (wave 3, 50%)
 *   wave_3  (wave 3) → wave_4 (wave 4, 100%)
 *   wave_4  (wave 4) → completed
 */
export async function advanceRollout(
  rolloutId: string
): Promise<FleetRolloutRecord> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) throw new Error(`Rollout ${rolloutId} not found`);

  const statusProgression: Record<FleetRolloutStatus, FleetRolloutStatus | 'complete'> = {
    pending: 'canary',
    canary: 'wave_1',
    wave_1: 'wave_2',
    wave_2: 'wave_3',
    wave_3: 'wave_4',
    wave_4: 'complete',
    completed: 'complete',
    paused: rollout.status, // Can't advance paused
    aborted: rollout.status,
    rolled_back: rollout.status,
  };

  const nextStatus = statusProgression[rollout.status];

  // If already complete or terminal, return as-is
  if (nextStatus === 'complete' || nextStatus === rollout.status) {
    if (nextStatus === 'complete') {
      return updateFleetRollout(rolloutId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_tenants: rollout.total_tenants,
      });
    }
    return rollout;
  }

  // Get tenants still needing update
  const tenants = await getTenantsNeedingUpdate(
    rollout.component as FleetComponent,
    rollout.to_version
  );

  // Calculate wave size
  const waveConfig = getWaveConfig(nextStatus);
  const waveSize = Math.ceil(tenants.length * (waveConfig.percentage / 100));
  const waveTenants = tenants.slice(0, waveSize);
  const waveNumber = getWaveNumber(nextStatus);

  // Enqueue wave jobs
  if (waveTenants.length > 0) {
    await enqueueWave({
      rolloutId,
      component: rollout.component as FleetComponent,
      fromVersion: rollout.from_version,
      toVersion: rollout.to_version,
      workspaceIds: waveTenants.map(t => t.workspace_id),
      waveNumber,
    });

    // Mark tenants as updating
    for (const t of waveTenants) {
      await setTenantUpdateStatus(t.workspace_id, 'updating');
    }
  }

  // Update rollout status
  return updateFleetRollout(rolloutId, {
    status: nextStatus,
  });
}

function getWaveConfig(status: FleetRolloutStatus) {
  const configMap: Record<string, { percentage: number }> = {
    canary: { percentage: 1 },
    wave_1: { percentage: 10 },
    wave_2: { percentage: 25 },
    wave_3: { percentage: 50 },
    wave_4: { percentage: 100 },
  };
  return configMap[status] ?? { percentage: 100 };
}

function getWaveNumber(status: FleetRolloutStatus): number {
  const map: Record<string, number> = {
    canary: 0,
    wave_1: 1,
    wave_2: 2,
    wave_3: 3,
    wave_4: 4,
  };
  return map[status] ?? 0;
}

// ============================================
// ROLLOUT CONTROL
// ============================================

/**
 * Pause an active rollout (stops processing new jobs).
 */
export async function pauseRollout(
  rolloutId: string
): Promise<FleetRolloutRecord> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) throw new Error(`Rollout ${rolloutId} not found`);

  const terminalStatuses: FleetRolloutStatus[] = ['completed', 'aborted', 'rolled_back', 'paused'];
  if (terminalStatuses.includes(rollout.status)) {
    throw new Error(`Cannot pause rollout in status: ${rollout.status}`);
  }

  return updateFleetRollout(rolloutId, {
    status: 'paused',
    paused_at: new Date().toISOString(),
    metadata: {
      ...rollout.metadata,
      paused_from_status: rollout.status,
    },
  });
}

/**
 * Resume a paused rollout.
 */
export async function resumeRollout(
  rolloutId: string
): Promise<FleetRolloutRecord> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) throw new Error(`Rollout ${rolloutId} not found`);

  if (rollout.status !== 'paused') {
    throw new Error(`Cannot resume rollout in status: ${rollout.status}`);
  }

  const previousStatus = (rollout.metadata as Record<string, unknown>)?.paused_from_status as FleetRolloutStatus | undefined;

  return updateFleetRollout(rolloutId, {
    status: previousStatus ?? 'canary',
    paused_at: null,
  });
}

/**
 * Abort a rollout (cancels remaining jobs, does NOT rollback completed ones).
 */
export async function abortRollout(
  rolloutId: string,
  reason: string
): Promise<FleetRolloutRecord> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) throw new Error(`Rollout ${rolloutId} not found`);

  // Cancel pending queue jobs
  const cancelled = await cancelRolloutJobs(rolloutId);

  // Log the abort
  await logUpdateHistory({
    workspace_id: null,
    component: rollout.component,
    from_version: rollout.from_version,
    to_version: rollout.to_version,
    status: 'rolled_back',
    error_message: reason,
    executed_by: rollout.initiated_by,
    rollout_strategy: rollout.strategy,
    affected_tenants: cancelled,
    rollout_id: rolloutId,
    wave_number: null,
  });

  return updateFleetRollout(rolloutId, {
    status: 'aborted',
    abort_reason: reason,
    completed_at: new Date().toISOString(),
  });
}

// ============================================
// ROLLOUT MONITORING
// ============================================

/**
 * Get a full progress snapshot for a rollout.
 */
export async function getRolloutProgress(
  rolloutId: string
): Promise<RolloutProgressSnapshot> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) throw new Error(`Rollout ${rolloutId} not found`);

  const queueStats = await getRolloutQueueStats(rolloutId);

  // Build wave summaries
  const waves: WaveProgressSummary[] = [];
  const waveNames = ['canary', 'wave_1', 'wave_2', 'wave_3', 'wave_4'];

  for (let i = 0; i < waveNames.length; i++) {
    const waveProgress = await getWaveProgress(rolloutId, i);
    if (waveProgress.total > 0) {
      waves.push({
        wave_name: waveNames[i],
        status: waveProgress.is_complete
          ? (waveProgress.failed > 0 ? 'failed' : 'completed')
          : (waveProgress.processing > 0 || waveProgress.queued > 0 ? 'active' : 'pending'),
        total_jobs: waveProgress.total,
        completed_jobs: waveProgress.completed,
        failed_jobs: waveProgress.failed,
        error_rate: waveProgress.error_rate,
        started_at: null, // Could track from queue jobs
        completed_at: waveProgress.is_complete ? new Date().toISOString() : null,
      });
    }
  }

  // Determine current wave
  const activeWave = waves.find(w => w.status === 'active');

  return {
    rollout,
    waves,
    current_wave: activeWave?.wave_name ?? null,
    overall_progress_percent: queueStats.completion_percent,
    overall_error_rate: queueStats.error_rate,
    estimated_completion: null, // Could compute from avg job time
  };
}

/**
 * Check if the current wave's error rate exceeds the threshold.
 * Returns true if the rollout should be auto-halted.
 */
export async function shouldAutoHalt(
  rolloutId: string
): Promise<{ halt: boolean; reason: string | null; error_rate: number }> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) return { halt: false, reason: null, error_rate: 0 };

  const waveNumber = getWaveNumber(rollout.status);
  const waveProgress = await getWaveProgress(rolloutId, waveNumber);

  // Only check if we have enough data (at least 10 completed jobs)
  const terminalJobs = waveProgress.completed + waveProgress.failed;
  if (terminalJobs < 10) {
    return { halt: false, reason: null, error_rate: waveProgress.error_rate };
  }

  const threshold = rollout.status === 'canary'
    ? CANARY_ERROR_THRESHOLD
    : STAGED_ERROR_THRESHOLD;

  if (waveProgress.error_rate > threshold) {
    return {
      halt: true,
      reason: `Error rate ${(waveProgress.error_rate * 100).toFixed(2)}% exceeds threshold ${(threshold * 100).toFixed(2)}% in ${rollout.status}`,
      error_rate: waveProgress.error_rate,
    };
  }

  return { halt: false, reason: null, error_rate: waveProgress.error_rate };
}

/**
 * Check if the current wave is complete and ready for advancement.
 */
export async function isWaveComplete(
  rolloutId: string
): Promise<boolean> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) return false;

  const waveNumber = getWaveNumber(rollout.status);
  const waveProgress = await getWaveProgress(rolloutId, waveNumber);

  return waveProgress.is_complete;
}
