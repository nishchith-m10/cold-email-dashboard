/**
 * PHASE 72: UPDATE MONITOR — Real-time rollout monitoring
 *
 * Provides monitoring data for the Update Monitoring Dashboard:
 *   - Active rollout progress
 *   - Error rate tracking
 *   - Wave status summaries
 *   - Fleet version distribution
 *   - Health metric computation
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.9
 */

import {
  getActiveRollouts,
  getRecentRollouts,
  getFleetRollout,
  getRecentUpdateHistory,
} from './db-service';

import { getRolloutProgress, shouldAutoHalt } from './rollout-engine';
import { getRolloutQueueStats } from './update-queue';
import { getVersionSummary } from './version-registry';

import type {
  ActiveRolloutStatus,
  FleetVersionSummary,
  RolloutHealthMetrics,
  FleetComponent,
  FleetRolloutRecord,
  RolloutProgressSnapshot,
  UpdateHistoryRecord,
} from './types';

// ============================================
// ACTIVE ROLLOUT MONITORING
// ============================================

/**
 * Get all currently active rollouts with their progress and health.
 */
export async function getActiveRolloutStatuses(): Promise<ActiveRolloutStatus[]> {
  const activeRollouts = await getActiveRollouts();
  const statuses: ActiveRolloutStatus[] = [];

  for (const rollout of activeRollouts) {
    const progress = await getRolloutProgress(rollout.id);
    const health = await computeRolloutHealth(rollout.id);
    statuses.push({ rollout, progress, health });
  }

  return statuses;
}

/**
 * Get detailed status for a specific rollout.
 */
export async function getRolloutStatus(
  rolloutId: string
): Promise<ActiveRolloutStatus | null> {
  const rollout = await getFleetRollout(rolloutId);
  if (!rollout) return null;

  const progress = await getRolloutProgress(rolloutId);
  const health = await computeRolloutHealth(rolloutId);

  return { rollout, progress, health };
}

// ============================================
// HEALTH METRICS
// ============================================

/**
 * Compute health metrics for a rollout.
 */
async function computeRolloutHealth(
  rolloutId: string
): Promise<RolloutHealthMetrics> {
  const stats = await getRolloutQueueStats(rolloutId);
  const haltCheck = await shouldAutoHalt(rolloutId);

  const terminal = stats.completed + stats.failed;
  const errorRate = terminal > 0 ? stats.failed / terminal : 0;
  const successRate = terminal > 0 ? stats.completed / terminal : 1;

  // Estimate avg update time (would need per-job timing in production)
  const avgUpdateTime = 1.2; // Default from spec: 1.2s per tenant

  return {
    error_rate: errorRate,
    execution_success_rate: successRate,
    avg_update_time_seconds: avgUpdateTime,
    failed_updates: stats.failed,
    retried_updates: 0, // Would need per-job retry tracking
    stuck_updates: stats.processing, // Jobs stuck in processing state
    is_healthy: !haltCheck.halt,
  };
}

// ============================================
// FLEET VERSION OVERVIEW
// ============================================

/**
 * Get fleet version summaries for all components.
 */
export async function getFleetOverview(): Promise<{
  components: FleetVersionSummary[];
  active_rollouts: number;
  recent_failures: number;
}> {
  const components: FleetComponent[] = [
    'dashboard',
    'workflow_email_1',
    'workflow_email_2',
    'workflow_email_3',
    'workflow_email_1_smtp',
    'workflow_email_2_smtp',
    'workflow_email_3_smtp',
    'workflow_email_preparation',
    'workflow_reply_tracker',
    'workflow_research',
    'workflow_opt_out',
    'sidecar',
  ];

  const summaries: FleetVersionSummary[] = [];
  for (const comp of components) {
    summaries.push(await getVersionSummary(comp));
  }

  const activeRollouts = await getActiveRollouts();
  const recentHistory = await getRecentUpdateHistory(100);
  const recentFailures = recentHistory.filter(
    (h: UpdateHistoryRecord) => h.status === 'failed'
  ).length;

  return {
    components: summaries,
    active_rollouts: activeRollouts.length,
    recent_failures: recentFailures,
  };
}

/**
 * Get version distribution for a single component.
 */
export async function getComponentVersionDistribution(
  component: FleetComponent
): Promise<FleetVersionSummary> {
  return getVersionSummary(component);
}

// ============================================
// HISTORY & AUDIT
// ============================================

/**
 * Get recent rollout history (completed, aborted, etc.).
 */
export async function getRolloutHistory(
  limit: number = 20
): Promise<FleetRolloutRecord[]> {
  return getRecentRollouts(limit);
}

/**
 * Get recent update events (per-tenant updates).
 */
export async function getUpdateEventHistory(
  limit: number = 50
): Promise<UpdateHistoryRecord[]> {
  return getRecentUpdateHistory(limit);
}

// ============================================
// DASHBOARD DATA
// ============================================

/**
 * Get all data needed for the monitoring dashboard in a single call.
 */
export async function getDashboardData(): Promise<{
  active_rollouts: ActiveRolloutStatus[];
  fleet_overview: {
    components: FleetVersionSummary[];
    active_rollouts: number;
    recent_failures: number;
  };
  recent_history: FleetRolloutRecord[];
}> {
  const [activeRollouts, fleetOverview, recentHistory] = await Promise.all([
    getActiveRolloutStatuses(),
    getFleetOverview(),
    getRolloutHistory(10),
  ]);

  return {
    active_rollouts: activeRollouts,
    fleet_overview: fleetOverview,
    recent_history: recentHistory,
  };
}
