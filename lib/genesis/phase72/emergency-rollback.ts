/**
 * PHASE 72: EMERGENCY ROLLBACK — "The Oh Shit Button"
 *
 * Provides immediate rollback capability when things go wrong:
 *   1. Fetch previous version JSON from template repository
 *   2. Push via queue with PRIORITY=CRITICAL (jumps queue)
 *   3. All sidecars process rollback within 30 seconds
 *   4. Update version registry atomically
 *   5. Alert all admins of rollback event
 *
 * Scope modes:
 *   - all_tenants: Rollback every tenant
 *   - affected_only: Only tenants on the bad version
 *   - specific_tenant: Single tenant rollback
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.6
 */

import {
  getFleetRollout,
  updateFleetRollout,
  getActiveRollouts,
  getTenantsByComponentVersion,
  getTenantVersion,
  setTenantUpdateStatus,
  logUpdateHistory,
  getTenantsNeedingUpdate,
} from './db-service';

import { enqueueEmergencyRollback, cancelRolloutJobs } from './update-queue';

import type {
  EmergencyRollbackInput,
  EmergencyRollbackResult,
  FleetComponent,
  FleetRolloutRecord,
  TenantVersionRecord,
} from './types';

// ============================================
// EMERGENCY ROLLBACK EXECUTION
// ============================================

/**
 * Execute an emergency rollback.
 *
 * 1. Identifies affected tenants based on scope
 * 2. Aborts any active rollout for this component
 * 3. Enqueues high-priority rollback jobs
 * 4. Logs the event
 *
 * @param input - Rollback parameters (component, target version, scope, etc.)
 * @returns Rollback result summary.
 */
export async function executeEmergencyRollback(
  input: EmergencyRollbackInput
): Promise<EmergencyRollbackResult> {
  const {
    component,
    rollback_to_version,
    scope,
    specific_workspace_id,
    initiated_by,
    reason,
  } = input;

  const startedAt = new Date().toISOString();

  // Step 1: Identify affected tenants
  const affectedTenants = await getAffectedTenants(
    component,
    rollback_to_version,
    scope,
    specific_workspace_id
  );

  if (affectedTenants.length === 0) {
    throw new Error(
      `No affected tenants found for ${component} rollback to ${rollback_to_version}`
    );
  }

  // Determine the current (bad) version from the first affected tenant
  const columnMap: Record<FleetComponent, keyof TenantVersionRecord> = {
    dashboard: 'dashboard_version',
    workflow_email_1: 'workflow_email_1',
    workflow_email_2: 'workflow_email_2',
    workflow_email_3: 'workflow_email_3',
    workflow_email_1_smtp: 'workflow_email_1_smtp',
    workflow_email_2_smtp: 'workflow_email_2_smtp',
    workflow_email_3_smtp: 'workflow_email_3_smtp',
    workflow_email_preparation: 'workflow_email_preparation',
    workflow_reply_tracker: 'workflow_reply_tracker',
    workflow_research: 'workflow_research',
    workflow_opt_out: 'workflow_opt_out',
    sidecar: 'sidecar_version',
  };

  const currentVersion = affectedTenants[0][columnMap[component]] as string;

  // Step 2: Abort any active rollouts for this component
  const activeRollouts = await getActiveRollouts();
  const componentRollouts = activeRollouts.filter(r => r.component === component);

  for (const rollout of componentRollouts) {
    await cancelRolloutJobs(rollout.id);
    await updateFleetRollout(rollout.id, {
      status: 'rolled_back',
      abort_reason: `Emergency rollback: ${reason}`,
      completed_at: new Date().toISOString(),
    });
  }

  // Step 3: Create a rollback rollout record
  // (We do NOT use createFleetRollout here since we imported directly from db-service)
  const { createFleetRollout } = await import('./db-service');
  const rollbackRollout = await createFleetRollout({
    component,
    from_version: currentVersion,
    to_version: rollback_to_version,
    strategy: 'immediate',
    status: 'wave_4', // Immediate: all at once
    total_tenants: affectedTenants.length,
    updated_tenants: 0,
    failed_tenants: 0,
    error_threshold: 1.0, // Accept all for rollback
    canary_percentage: 0,
    initiated_by,
  });

  // Step 4: Enqueue emergency rollback jobs (CRITICAL priority)
  const enqueuedCount = await enqueueEmergencyRollback({
    rolloutId: rollbackRollout.id,
    component,
    rollbackToVersion: rollback_to_version,
    currentVersion,
    workspaceIds: affectedTenants.map(t => t.workspace_id),
  });

  // Step 5: Mark all affected tenants as 'rollback' status
  for (const tenant of affectedTenants) {
    await setTenantUpdateStatus(tenant.workspace_id, 'rollback');
  }

  // Step 6: Log the rollback event
  await logUpdateHistory({
    workspace_id: scope === 'specific_tenant' ? specific_workspace_id ?? null : null,
    component,
    from_version: currentVersion,
    to_version: rollback_to_version,
    status: 'in_progress',
    error_message: `Emergency rollback: ${reason}`,
    executed_by: initiated_by,
    rollout_strategy: 'immediate',
    affected_tenants: affectedTenants.length,
    rollout_id: rollbackRollout.id,
    wave_number: null,
  });

  return {
    rollout_id: rollbackRollout.id,
    component,
    from_version: currentVersion,
    rollback_to_version,
    scope,
    total_affected: affectedTenants.length,
    rolled_back: enqueuedCount, // Enqueued for rollback
    failed: 0, // Not known yet — jobs are just enqueued
    started_at: startedAt,
    completed_at: null, // Completion tracked via queue processing
    duration_seconds: null,
  };
}

// ============================================
// TENANT SELECTION
// ============================================

/**
 * Get affected tenants based on rollback scope.
 */
async function getAffectedTenants(
  component: FleetComponent,
  rollbackToVersion: string,
  scope: EmergencyRollbackInput['scope'],
  specificWorkspaceId?: string
): Promise<TenantVersionRecord[]> {
  switch (scope) {
    case 'all_tenants': {
      // All tenants NOT already on the rollback target version
      return getTenantsNeedingUpdate(component, rollbackToVersion);
    }

    case 'affected_only': {
      // Only tenants on versions OTHER than the rollback target
      return getTenantsNeedingUpdate(component, rollbackToVersion);
    }

    case 'specific_tenant': {
      if (!specificWorkspaceId) {
        throw new Error('specific_workspace_id required for specific_tenant scope');
      }
      const record = await getTenantVersion(specificWorkspaceId);
      if (!record) {
        throw new Error(`Tenant ${specificWorkspaceId} not found in version registry`);
      }
      return [record];
    }

    default:
      throw new Error(`Unknown rollback scope: ${scope}`);
  }
}

/**
 * Estimate rollback time based on tenant count (spec 68.6 timing).
 */
export function estimateRollbackTime(tenantCount: number): {
  estimated_seconds: number;
  formatted: string;
} {
  // From spec:
  //   1,000 tenants: ~30 seconds
  //   5,000 tenants: ~90 seconds
  //   15,000 tenants: ~5 minutes (300 seconds)
  //
  // Linear approximation: ~0.02 seconds per tenant
  const seconds = Math.max(10, Math.ceil(tenantCount * 0.02));

  let formatted: string;
  if (seconds < 60) {
    formatted = `~${seconds} seconds`;
  } else {
    const minutes = Math.ceil(seconds / 60);
    formatted = `~${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return { estimated_seconds: seconds, formatted };
}
