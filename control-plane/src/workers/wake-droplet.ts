/**
 * PHASE 73: Wake Droplet Worker
 *
 * Processes wake-droplet jobs from BullMQ.
 * Powers on idle DigitalOcean droplets via the DO API.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5
 */

import type { ControlPlaneConfig, Logger } from '../config';
import type { WakeDropletJob } from '../../../packages/shared/types';

/**
 * Process a wake-droplet job.
 * Idempotent — if the droplet is already running, this is a no-op.
 */
export async function processWakeDroplet(
  data: WakeDropletJob,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  const { workspace_id, droplet_id, reason } = data;

  logger.info(
    { workspace_id, droplet_id, reason },
    'Processing wake-droplet request'
  );

  // 1. Check current droplet status
  const status = await getDropletStatus(droplet_id, config);

  if (status === 'active') {
    logger.info({ droplet_id }, 'Droplet already active — skipping wake');
    return;
  }

  // 2. Power on the droplet
  await powerOnDroplet(droplet_id, config, logger);

  // 3. Wait for the droplet to become active
  const awake = await waitForActive(droplet_id, config, logger);
  if (!awake) {
    throw new Error(`Droplet ${droplet_id} failed to wake within timeout`);
  }

  // 4. Wait for sidecar health check
  const sidecarUrl = await getSidecarUrl(workspace_id, config);
  if (sidecarUrl) {
    const healthy = await waitForSidecarHealth(sidecarUrl, logger);
    if (!healthy) {
      logger.warn(
        { droplet_id, workspace_id },
        'Sidecar health check failed after wake — droplet may need manual intervention'
      );
    }
  }

  // 5. Update droplet_health record
  await updateDropletStatus(workspace_id, 'active', config);

  logger.info({ workspace_id, droplet_id }, 'Droplet woken successfully');
}

// ============================================
// HELPERS
// ============================================

async function getDropletStatus(
  dropletId: number,
  config: ControlPlaneConfig
): Promise<string> {
  const response = await fetch(
    `https://api.digitalocean.com/v2/droplets/${dropletId}`,
    {
      headers: {
        Authorization: `Bearer ${config.digitalOceanApiToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get droplet status: ${response.status} ${response.statusText}`
    );
  }

  const body = (await response.json()) as {
    droplet: { status: string };
  };
  return body.droplet.status;
}

async function powerOnDroplet(
  dropletId: number,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  logger.info({ dropletId }, 'Sending power_on action');

  const response = await fetch(
    `https://api.digitalocean.com/v2/droplets/${dropletId}/actions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.digitalOceanApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'power_on' }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to power on droplet: ${response.status} ${response.statusText}`
    );
  }
}

async function waitForActive(
  dropletId: number,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<boolean> {
  const maxWait = 120000; // 2 minutes
  const interval = 5000; // Check every 5s
  const started = Date.now();

  while (Date.now() - started < maxWait) {
    try {
      const status = await getDropletStatus(dropletId, config);
      if (status === 'active') {
        logger.info({ dropletId }, 'Droplet is now active');
        return true;
      }
      logger.debug({ dropletId, status }, 'Droplet not yet active');
    } catch (error) {
      logger.debug({ dropletId, error }, 'Error checking droplet status');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

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

async function waitForSidecarHealth(
  sidecarUrl: string,
  logger: Logger
): Promise<boolean> {
  const maxWait = 60000;
  const interval = 3000;
  const started = Date.now();

  while (Date.now() - started < maxWait) {
    try {
      const response = await fetch(`${sidecarUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        logger.info('Sidecar health check passed after wake');
        return true;
      }
    } catch {
      // Still booting
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

async function updateDropletStatus(
  workspaceId: string,
  status: string,
  config: ControlPlaneConfig
): Promise<void> {
  await fetch(
    `${config.supabaseUrl}/rest/v1/droplet_health?workspace_id=eq.${workspaceId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status,
        last_heartbeat: new Date().toISOString(),
      }),
    }
  );
}
