/**
 * PHASE 73: Workflow Update Worker
 *
 * Processes workflow-update jobs from BullMQ.
 * Calls Sidecar API to push updated workflow JSON to tenant's n8n instance.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5
 */

import type { ControlPlaneConfig, Logger } from '../config';
import type { WorkflowUpdateJob } from '../../../packages/shared/types';

/**
 * Process a single workflow update job.
 * Idempotent — safe to retry on failure.
 */
export async function processWorkflowUpdate(
  data: WorkflowUpdateJob,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  const { workspace_id, workflow_name, workflow_json, version, rollout_id } = data;

  logger.info(
    { workspace_id, workflow_name, version, rollout_id },
    'Processing workflow update'
  );

  // 1. Look up the Sidecar's IP/URL for this workspace from Supabase
  const sidecarUrl = await getSidecarUrl(workspace_id, config);
  if (!sidecarUrl) {
    throw new Error(`No sidecar found for workspace ${workspace_id}`);
  }

  // 2. Push the workflow to the Sidecar
  const response = await fetch(`${sidecarUrl}/api/workflows/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.supabaseServiceKey}`,
    },
    body: JSON.stringify({
      workflow_name,
      workflow_json,
      version,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Sidecar deploy failed for ${workspace_id}: ${response.status} ${body}`
    );
  }

  // 3. Update tenant version record in Supabase
  await updateTenantVersion(workspace_id, workflow_name, version, config);

  logger.info(
    { workspace_id, workflow_name, version },
    'Workflow update completed'
  );
}

// ============================================
// HELPERS
// ============================================

async function getSidecarUrl(
  workspaceId: string,
  config: ControlPlaneConfig
): Promise<string | null> {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/droplet_health?workspace_id=eq.${workspaceId}&select=droplet_ip`,
    {
      headers: {
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
    }
  );

  if (!response.ok) return null;
  const rows = (await response.json()) as { droplet_ip: string }[];
  if (!rows || rows.length === 0) return null;

  return `http://${rows[0].droplet_ip}:3001`;
}

async function updateTenantVersion(
  workspaceId: string,
  workflowName: string,
  version: string,
  config: ControlPlaneConfig
): Promise<void> {
  // Map workflow name to column
  const columnMap: Record<string, string> = {
    email_1: 'workflow_email_1',
    email_2: 'workflow_email_2',
    email_3: 'workflow_email_3',
    research: 'workflow_research',
    opt_out: 'workflow_opt_out',
  };

  const column = columnMap[workflowName];
  if (!column) return;

  await fetch(
    `${config.supabaseUrl}/rest/v1/rpc/update_tenant_version`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
      body: JSON.stringify({
        p_workspace_id: workspaceId,
        p_column: column,
        p_version: version,
      }),
    }
  );
}
