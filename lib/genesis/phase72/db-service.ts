/**
 * PHASE 72: ZERO-DOWNTIME FLEET UPDATE PROTOCOL — DATABASE SERVICE
 *
 * CRUD operations for:
 *   - genesis.tenant_versions
 *   - genesis.workflow_templates
 *   - genesis.update_history
 *   - genesis.fleet_rollouts
 *   - genesis.fleet_update_queue
 *
 * Uses supabaseAdmin (service_role) for all write operations.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.3
 */

import { supabaseAdmin } from '@/lib/supabase';
import type {
  TenantVersionRecord,
  WorkflowTemplateRecord,
  UpdateHistoryRecord,
  FleetRolloutRecord,
  FleetUpdateQueueRecord,
  FleetComponent,
  RolloutStrategy,
  TenantUpdateStatus,
  FleetRolloutStatus,
  QueueJobStatus,
  UpdateHistoryStatus,
} from './types';

// ============================================
// HELPERS
// ============================================

function assertAdmin(): void {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable — supabaseAdmin not initialized');
  }
}

// ============================================
// TENANT VERSIONS
// ============================================

/**
 * Get version info for a single tenant.
 */
export async function getTenantVersion(
  workspaceId: string
): Promise<TenantVersionRecord | null> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_tenant_version_by_workspace', {
    p_workspace_id: workspaceId,
  });

  if (error) throw new Error(`getTenantVersion failed: ${error.message}`);
  return data as TenantVersionRecord | null;
}

/**
 * Upsert a tenant version row (used during onboarding or first update).
 */
export async function upsertTenantVersion(
  record: Partial<TenantVersionRecord> & { workspace_id: string }
): Promise<TenantVersionRecord> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('upsert_tenant_version', {
    p_record: record as any,
  });

  if (error) throw new Error(`upsertTenantVersion failed: ${error.message}`);
  return data as TenantVersionRecord;
}

/**
 * Update a specific component version for a tenant.
 */
export async function updateTenantComponentVersion(
  workspaceId: string,
  component: FleetComponent,
  newVersion: string
): Promise<void> {
  assertAdmin();

  const columnMap: Record<FleetComponent, string> = {
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

  const column = columnMap[component];
  const { error } = await supabaseAdmin!.rpc('update_tenant_component_version', {
    p_workspace_id: workspaceId,
    p_column: column,
    p_version: newVersion,
  });

  if (error) throw new Error(`updateTenantComponentVersion failed: ${error.message}`);
}

/**
 * Set update_status for a tenant (e.g., 'updating', 'failed', 'rollback').
 */
export async function setTenantUpdateStatus(
  workspaceId: string,
  status: TenantUpdateStatus
): Promise<void> {
  assertAdmin();
  const { error } = await supabaseAdmin!.rpc('set_tenant_update_status', {
    p_workspace_id: workspaceId,
    p_status: status,
  });

  if (error) throw new Error(`setTenantUpdateStatus failed: ${error.message}`);
}

/**
 * Get all tenants running a specific component version.
 */
export async function getTenantsByComponentVersion(
  component: FleetComponent,
  version: string
): Promise<TenantVersionRecord[]> {
  assertAdmin();

  const columnMap: Record<FleetComponent, string> = {
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

  const column = columnMap[component];
  const { data, error } = await supabaseAdmin!
    .rpc('get_all_tenant_versions');

  if (error) throw new Error(`getTenantsByComponentVersion failed: ${error.message}`);
  
  // Filter client-side for the specific component version
  const records = (data ?? []) as TenantVersionRecord[];
  return records.filter(r => (r as any)[column] === version);
}

/**
 * Get all tenants NOT on the specified version (need update).
 */
export async function getTenantsNeedingUpdate(
  component: FleetComponent,
  targetVersion: string
): Promise<TenantVersionRecord[]> {
  assertAdmin();

  const columnMap: Record<FleetComponent, string> = {
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

  const column = columnMap[component];
  const { data, error} = await supabaseAdmin!
    .rpc('get_all_tenant_versions');

  if (error) throw new Error(`getTenantsNeedingUpdate failed: ${error.message}`);
  
  // Filter client-side for the specific component and status
  const records = (data ?? []) as TenantVersionRecord[];
  return records.filter(r => 
    (r as any)[column] !== targetVersion && r.update_status !== 'updating'
  );
}

/**
 * Get fleet version summary for a component (how many on each version).
 */
export async function getFleetVersionSummary(
  component: FleetComponent
): Promise<{ total: number; by_version: Record<string, number>; updating: number; failed: number }> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!
    .rpc('get_all_tenant_versions');

  if (error) throw new Error(`getFleetVersionSummary failed: ${error.message}`);

  const records = (data ?? []) as TenantVersionRecord[];
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

  const column = columnMap[component];
  const by_version: Record<string, number> = {};
  let updating = 0;
  let failed = 0;

  for (const r of records) {
    const ver = r[column] as string;
    by_version[ver] = (by_version[ver] ?? 0) + 1;
    if (r.update_status === 'updating') updating++;
    if (r.update_status === 'failed') failed++;
  }

  return { total: records.length, by_version, updating, failed };
}

// ============================================
// WORKFLOW TEMPLATES
// ============================================

/**
 * Get the current template for a workflow.
 */
export async function getCurrentTemplate(
  workflowName: string
): Promise<WorkflowTemplateRecord | null> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_current_template', {
    p_workflow_name: workflowName,
  });

  if (error) throw new Error(`getCurrentTemplate failed: ${error.message}`);
  return data as WorkflowTemplateRecord | null;
}

/**
 * Get a specific template version.
 */
export async function getTemplateVersion(
  workflowName: string,
  version: string
): Promise<WorkflowTemplateRecord | null> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_template_version', {
    p_workflow_name: workflowName,
    p_version: version,
  });

  if (error) throw new Error(`getTemplateVersion failed: ${error.message}`);
  return data as WorkflowTemplateRecord | null;
}

/**
 * List all template versions for a workflow (ordered by created_at desc).
 */
export async function listTemplateVersions(
  workflowName: string
): Promise<WorkflowTemplateRecord[]> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('list_template_versions', {
    p_workflow_name: workflowName,
  });

  if (error) throw new Error(`listTemplateVersions failed: ${error.message}`);
  return (data ?? []) as WorkflowTemplateRecord[];
}

/**
 * Insert a new template version.
 */
export async function insertTemplate(
  record: Omit<WorkflowTemplateRecord, 'id' | 'created_at'>
): Promise<WorkflowTemplateRecord> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('insert_template', {
    p_workflow_name: record.workflow_name,
    p_version: record.version,
    p_template_json: record.workflow_json,
    p_is_current: record.is_current ?? false,
    p_is_canary: record.is_canary ?? false,
  });

  if (error) throw new Error(`insertTemplate failed: ${error.message}`);
  return data as WorkflowTemplateRecord;
}

/**
 * Promote a template version to current (un-sets current from others).
 */
export async function promoteTemplate(
  workflowName: string,
  version: string
): Promise<void> {
  assertAdmin();

  const { error } = await supabaseAdmin!.rpc('promote_template', {
    p_workflow_name: workflowName,
    p_version: version,
  });

  if (error) throw new Error(`promoteTemplate failed: ${error.message}`);
}

/**
 * Set canary flag on a template version.
 */
export async function setTemplateCanary(
  workflowName: string,
  version: string,
  isCanary: boolean
): Promise<void> {
  assertAdmin();

  const { error } = await supabaseAdmin!.rpc('set_template_canary', {
    p_workflow_name: workflowName,
    p_version: version,
    p_is_canary: isCanary,
  });

  if (error) throw new Error(`setTemplateCanary failed: ${error.message}`);
}

// ============================================
// UPDATE HISTORY
// ============================================

/**
 * Log an update event to the history table.
 */
export async function logUpdateHistory(
  record: Omit<UpdateHistoryRecord, 'id' | 'executed_at' | 'metadata'> & {
    metadata?: Record<string, unknown>;
  }
): Promise<UpdateHistoryRecord> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('log_update_history', {
    p_workspace_id: record.workspace_id || null,
    p_component: record.component,
    p_from_version: record.from_version,
    p_to_version: record.to_version,
    p_rollout_id: record.rollout_id || null,
    p_status: record.status,
    p_rollout_strategy: record.rollout_strategy || 'staged',
    p_affected_tenants: record.affected_tenants || 1,
    p_wave_number: record.wave_number || null,
    p_error_message: record.error_message || null,
    p_executed_by: record.executed_by || null,
    p_metadata: record.metadata || {},
  });

  if (error) throw new Error(`logUpdateHistory failed: ${error.message}`);
  return data as UpdateHistoryRecord;
}

/**
 * Get update history for a specific rollout.
 */
export async function getUpdateHistoryByRollout(
  rolloutId: string
): Promise<UpdateHistoryRecord[]> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_update_history_by_rollout', {
    p_rollout_id: rolloutId,
  });

  if (error) throw new Error(`getUpdateHistoryByRollout failed: ${error.message}`);
  return (data ?? []) as UpdateHistoryRecord[];
}

/**
 * Get recent update history (last N entries).
 */
export async function getRecentUpdateHistory(
  limit: number = 50
): Promise<UpdateHistoryRecord[]> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_recent_update_history', {
    p_limit: limit,
  });

  if (error) throw new Error(`getRecentUpdateHistory failed: ${error.message}`);
  return (data ?? []) as UpdateHistoryRecord[];
}

// ============================================
// FLEET ROLLOUTS
// ============================================

/**
 * Create a new fleet rollout.
 */
export async function createFleetRollout(
  record: Omit<FleetRolloutRecord, 'id' | 'started_at' | 'completed_at' | 'paused_at' | 'abort_reason' | 'metadata'> & {
    metadata?: Record<string, unknown>;
  }
): Promise<FleetRolloutRecord> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('create_fleet_rollout', {
    p_component: record.component,
    p_from_version: record.from_version,
    p_to_version: record.to_version,
    p_strategy: record.strategy,
    p_wave_size: 0,
    p_wave_delay_minutes: 0,
    p_status: record.status || 'pending',
    p_metadata: record.metadata || {},
  });

  if (error) throw new Error(`createFleetRollout failed: ${error.message}`);
  return data as FleetRolloutRecord;
}

/**
 * Get a fleet rollout by ID.
 */
export async function getFleetRollout(
  rolloutId: string
): Promise<FleetRolloutRecord | null> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_fleet_rollout_by_id', {
    p_rollout_id: rolloutId,
  });

  if (error) throw new Error(`getFleetRollout failed: ${error.message}`);
  return data as FleetRolloutRecord | null;
}

/**
 * Update a fleet rollout.
 */
export async function updateFleetRollout(
  rolloutId: string,
  updates: Partial<FleetRolloutRecord>
): Promise<FleetRolloutRecord> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('update_fleet_rollout', {
    p_rollout_id: rolloutId,
    p_updates: updates as any,
  });

  if (error) throw new Error(`updateFleetRollout failed: ${error.message}`);
  return data as FleetRolloutRecord;
}

/**
 * Get all active (non-terminal) rollouts.
 */
export async function getActiveRollouts(): Promise<FleetRolloutRecord[]> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_active_rollouts');

  if (error) throw new Error(`getActiveRollouts failed: ${error.message}`);
  return (data ?? []) as FleetRolloutRecord[];
}

/**
 * Get recent rollouts (active + last N completed).
 */
export async function getRecentRollouts(
  limit: number = 20
): Promise<FleetRolloutRecord[]> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_recent_rollouts', {
    p_limit: limit,
  });

  if (error) throw new Error(`getRecentRollouts failed: ${error.message}`);
  return (data ?? []) as FleetRolloutRecord[];
}

// ============================================
// FLEET UPDATE QUEUE
// ============================================

/**
 * Enqueue update jobs for a batch of workspaces.
 */
export async function enqueueUpdateJobs(
  jobs: Omit<FleetUpdateQueueRecord, 'id' | 'queued_at' | 'started_at' | 'completed_at' | 'metadata'>[]
): Promise<number> {
  assertAdmin();
  if (jobs.length === 0) return 0;

  const { data, error } = await supabaseAdmin!.rpc('enqueue_update_jobs', {
    p_jobs: jobs as any,
  });

  if (error) throw new Error(`enqueueUpdateJobs failed: ${error.message}`);
  return Number(data) || 0;
}

/**
 * Claim the next batch of queued jobs (atomic: sets status to 'processing').
 * Uses a SELECT ... FOR UPDATE SKIP LOCKED pattern via RPC if available,
 * otherwise simple update-based claim.
 */
export async function claimQueuedJobs(
  batchSize: number = 50
): Promise<FleetUpdateQueueRecord[]> {
  assertAdmin();

  const { data, error } = await supabaseAdmin!.rpc('claim_queued_jobs', {
    p_batch_size: batchSize,
  });

  if (error) throw new Error(`claimQueuedJobs failed: ${error.message}`);
  return (data ?? []) as FleetUpdateQueueRecord[];
}

/**
 * Mark a queue job as completed.
 */
export async function completeQueueJob(jobId: string): Promise<void> {
  assertAdmin();
  const { error } = await supabaseAdmin!.rpc('complete_queue_job', {
    p_job_id: jobId,
  });

  if (error) throw new Error(`completeQueueJob failed: ${error.message}`);
}

/**
 * Mark a queue job as failed (increments attempt_count, may re-queue).
 */
export async function failQueueJob(
  jobId: string,
  errorMessage: string
): Promise<void> {
  assertAdmin();

  const { error } = await supabaseAdmin!.rpc('fail_queue_job', {
    p_job_id: jobId,
    p_error_message: errorMessage,
  });

  if (error) throw new Error(`failQueueJob failed: ${error.message}`);
}

/**
 * Get queue stats for a rollout (counts by status).
 */
export async function getQueueStats(
  rolloutId: string
): Promise<Record<QueueJobStatus, number>> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_queue_stats', {
    p_rollout_id: rolloutId,
  });

  if (error) throw new Error(`getQueueStats failed: ${error.message}`);

  const results = (data || []) as Array<{ status: QueueJobStatus; count: number }>;
  const stats: Record<QueueJobStatus, number> = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    rolled_back: 0,
  };

  for (const row of results) {
    stats[row.status] = Number(row.count);
  }

  return stats;
}

/**
 * Get queue jobs by rollout and wave.
 */
export async function getQueueJobsByWave(
  rolloutId: string,
  waveNumber: number
): Promise<FleetUpdateQueueRecord[]> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('get_queue_jobs_by_wave', {
    p_rollout_id: rolloutId,
    p_wave_number: waveNumber,
  });

  if (error) throw new Error(`getQueueJobsByWave failed: ${error.message}`);
  return (data ?? []) as FleetUpdateQueueRecord[];
}

/**
 * Mark all queued/processing jobs for a rollout as rolled_back.
 */
export async function rollbackQueueJobs(rolloutId: string): Promise<number> {
  assertAdmin();
  const { data, error } = await supabaseAdmin!.rpc('rollback_queue_jobs', {
    p_rollout_id: rolloutId,
  });

  if (error) throw new Error(`rollbackQueueJobs failed: ${error.message}`);
  return Number(data) ?? 0;
}
