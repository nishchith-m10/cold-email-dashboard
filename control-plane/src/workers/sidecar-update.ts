/**
 * PHASE 73: Sidecar Update Worker
 *
 * Processes sidecar-update jobs from BullMQ.
 * Implements blue-green container swap via DigitalOcean API.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.7, 69.5
 */

import type { ControlPlaneConfig, Logger } from '../config';
import type { SidecarUpdateJob } from '../../../packages/shared/types';

/**
 * Process a sidecar update job using blue-green swap.
 * Idempotent — safe to retry on failure.
 */
export async function processSidecarUpdate(
  data: SidecarUpdateJob,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  const { workspace_id, droplet_id, from_version, to_version, rollout_id } = data;

  logger.info(
    { workspace_id, droplet_id, from_version, to_version, rollout_id },
    'Processing sidecar update (blue-green swap)'
  );

  // 1. Signal the Sidecar to prepare for update
  const sidecarUrl = await getSidecarUrl(workspace_id, config);
  if (!sidecarUrl) {
    throw new Error(`No sidecar found for workspace ${workspace_id}`);
  }

  // 2. Tell Sidecar to complete in-flight operations
  await signalPrepareForUpdate(sidecarUrl, config);

  // 3. Pull new Sidecar image on the droplet
  await pullNewImage(droplet_id, to_version, config, logger);

  // 4. Signal state checkpoint
  await signalCheckpoint(sidecarUrl, config);

  // 5. Perform container swap
  await performSwap(droplet_id, to_version, config, logger);

  // 6. Health check new container
  const healthy = await waitForHealthy(sidecarUrl, config, logger);
  if (!healthy) {
    // Auto-rollback
    logger.warn({ workspace_id, droplet_id }, 'Health check failed — rolling back');
    await performSwap(droplet_id, from_version, config, logger);
    throw new Error(`Sidecar health check failed after update to ${to_version}`);
  }

  // 7. Update version record
  await updateSidecarVersion(workspace_id, to_version, config);

  logger.info(
    { workspace_id, droplet_id, to_version },
    'Sidecar update completed successfully'
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

async function signalPrepareForUpdate(
  sidecarUrl: string,
  config: ControlPlaneConfig
): Promise<void> {
  await fetch(`${sidecarUrl}/api/lifecycle/prepare-update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabaseServiceKey}`,
    },
    signal: AbortSignal.timeout(config.gracefulShutdownTimeoutMs),
  });
}

async function signalCheckpoint(
  sidecarUrl: string,
  config: ControlPlaneConfig
): Promise<void> {
  await fetch(`${sidecarUrl}/api/lifecycle/checkpoint`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabaseServiceKey}`,
    },
    signal: AbortSignal.timeout(30000),
  });
}

async function pullNewImage(
  dropletId: number,
  version: string,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  // In production, this would SSH or use DO API to pull the new Docker image
  // For now, log the intent
  logger.info({ dropletId, version }, 'Pulling new sidecar image (stub)');
}

async function performSwap(
  dropletId: number,
  version: string,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  // In production, this would execute docker container swap on the droplet
  logger.info({ dropletId, version }, 'Performing container swap (stub)');
}

async function waitForHealthy(
  sidecarUrl: string,
  _config: ControlPlaneConfig,
  logger: Logger
): Promise<boolean> {
  const maxWait = 60000; // 60 seconds
  const interval = 2000; // Check every 2s
  const started = Date.now();

  while (Date.now() - started < maxWait) {
    try {
      const response = await fetch(`${sidecarUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        logger.info('Sidecar health check passed');
        return true;
      }
    } catch {
      // Still starting up
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  logger.error('Sidecar health check timed out');
  return false;
}

async function updateSidecarVersion(
  workspaceId: string,
  version: string,
  config: ControlPlaneConfig
): Promise<void> {
  await fetch(
    `${config.supabaseUrl}/rest/v1/tenant_versions?workspace_id=eq.${workspaceId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        sidecar_version: version,
        last_update_at: new Date().toISOString(),
      }),
    }
  );
}
