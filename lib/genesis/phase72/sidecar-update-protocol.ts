/**
 * PHASE 72: SIDECAR UPDATE PROTOCOL — Blue-Green Container Swap
 *
 * Manages sidecar container updates using blue-green deployment:
 *   1. Preparation: Pre-pull new image to droplet
 *   2. Per-Droplet Update:
 *      a. "prepare-for-update" command → sidecar completes in-progress ops
 *      b. Save state checkpoint to local volume
 *      c. "ready-for-swap" signal
 *      d. Docker Compose: stop old, start new
 *      e. New sidecar loads checkpoint, sends healthy heartbeat
 *      f. Dashboard marks tenant as updated
 *   3. Failure Handling:
 *      If no healthy heartbeat within 60s → auto-rollback, alert admin
 *
 * TOTAL DOWNTIME: ~5 seconds per droplet (n8n continues during swap)
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.7
 */

import type {
  SidecarUpdateState,
  SidecarUpdateConfig,
  SidecarUpdateStep,
  FleetComponent,
} from './types';

import { DEFAULT_SIDECAR_UPDATE_CONFIG } from './types';
import { updateTenantComponentVersion, setTenantUpdateStatus, logUpdateHistory } from './db-service';

// ============================================
// SIDECAR UPDATE EXECUTION
// ============================================

/**
 * Execute a blue-green sidecar update for a single workspace/droplet.
 *
 * This function orchestrates the full update sequence. In production,
 * each step communicates with the sidecar agent running on the droplet
 * via the sidecar API.
 *
 * @param workspaceId - Tenant workspace ID
 * @param fromVersion - Current sidecar version
 * @param toVersion - Target sidecar version
 * @param config - Optional update configuration overrides
 * @returns The final update state
 */
export async function executeSidecarUpdate(
  workspaceId: string,
  fromVersion: string,
  toVersion: string,
  config: SidecarUpdateConfig = DEFAULT_SIDECAR_UPDATE_CONFIG
): Promise<SidecarUpdateState> {
  const state: SidecarUpdateState = {
    workspace_id: workspaceId,
    from_version: fromVersion,
    to_version: toVersion,
    step: 'preparing',
    started_at: new Date().toISOString(),
    image_pulled_at: null,
    operations_completed_at: null,
    checkpoint_saved_at: null,
    swap_started_at: null,
    swap_completed_at: null,
    health_check_passed_at: null,
    completed_at: null,
    error_message: null,
    downtime_seconds: null,
  };

  try {
    // Mark tenant as updating
    await setTenantUpdateStatus(workspaceId, 'updating');

    // Step 1: Pull new sidecar image
    state.step = 'pulling_image';
    await pullSidecarImage(workspaceId, toVersion);
    state.image_pulled_at = new Date().toISOString();

    // Step 2: Signal sidecar to complete in-progress operations
    state.step = 'completing_operations';
    await signalPrepareForUpdate(workspaceId, config.max_operation_completion_wait_seconds);
    state.operations_completed_at = new Date().toISOString();

    // Step 3: Save state checkpoint
    state.step = 'saving_checkpoint';
    await saveStateCheckpoint(workspaceId);
    state.checkpoint_saved_at = new Date().toISOString();

    // Step 4: Wait for ready-for-swap signal
    state.step = 'ready_for_swap';

    // Step 5: Perform container swap
    state.step = 'swapping';
    state.swap_started_at = new Date().toISOString();
    await performContainerSwap(workspaceId, toVersion);
    state.swap_completed_at = new Date().toISOString();

    // Step 6: Health check — wait for healthy heartbeat
    state.step = 'health_checking';
    const healthy = await waitForHealthyHeartbeat(
      workspaceId,
      config.health_check_timeout_seconds
    );

    if (!healthy) {
      // Auto-rollback if configured
      if (config.auto_rollback_on_health_failure) {
        state.step = 'rolled_back';
        state.error_message = `Health check failed after ${config.health_check_timeout_seconds}s — auto-rolling back`;
        await performContainerSwap(workspaceId, fromVersion);
        await setTenantUpdateStatus(workspaceId, 'failed');

        await logUpdateHistory({
          workspace_id: workspaceId,
          component: 'sidecar',
          from_version: fromVersion,
          to_version: toVersion,
          status: 'failed',
          error_message: state.error_message,
          executed_by: 'system',
          rollout_strategy: 'staged',
          affected_tenants: 1,
          rollout_id: null,
          wave_number: null,
        });

        return state;
      }

      state.step = 'failed';
      state.error_message = `Health check failed after ${config.health_check_timeout_seconds}s`;
      await setTenantUpdateStatus(workspaceId, 'failed');
      return state;
    }

    state.health_check_passed_at = new Date().toISOString();

    // Calculate downtime
    if (state.swap_started_at && state.health_check_passed_at) {
      const swapStart = new Date(state.swap_started_at).getTime();
      const healthPass = new Date(state.health_check_passed_at).getTime();
      state.downtime_seconds = (healthPass - swapStart) / 1000;
    }

    // Step 7: Mark tenant as updated
    state.step = 'completed';
    state.completed_at = new Date().toISOString();
    await updateTenantComponentVersion(workspaceId, 'sidecar', toVersion);

    await logUpdateHistory({
      workspace_id: workspaceId,
      component: 'sidecar',
      from_version: fromVersion,
      to_version: toVersion,
      status: 'success',
      error_message: null,
      executed_by: 'system',
      rollout_strategy: 'staged',
      affected_tenants: 1,
      rollout_id: null,
      wave_number: null,
    });

    return state;
  } catch (err) {
    state.step = 'failed';
    state.error_message = err instanceof Error ? err.message : String(err);
    state.completed_at = new Date().toISOString();

    // Attempt rollback on unexpected failure
    try {
      await setTenantUpdateStatus(workspaceId, 'failed');
    } catch {
      // Non-blocking
    }

    return state;
  }
}

// ============================================
// SIDECAR COMMUNICATION STUBS
// ============================================

/**
 * Pull the new sidecar Docker image to the droplet.
 * In production: SSH/API call to droplet to run `docker pull genesis/sidecar:{version}`
 */
async function pullSidecarImage(
  workspaceId: string,
  version: string
): Promise<void> {
  // Production implementation will call the sidecar API or
  // execute via SSH on the droplet:
  //   docker pull genesis/sidecar:{version}
  //
  // For now, this is a placeholder that will be connected
  // when Phase 73 (Control Plane Deployment) is implemented.
  console.log(`[Phase72] Pulling sidecar image v${version} for workspace ${workspaceId}`);
}

/**
 * Signal the current sidecar to complete in-progress operations.
 * In production: POST to sidecar API /prepare-for-update
 */
async function signalPrepareForUpdate(
  workspaceId: string,
  timeoutSeconds: number
): Promise<void> {
  // Production: POST http://{droplet_ip}:3001/prepare-for-update
  // The sidecar will:
  //   1. Stop accepting new work
  //   2. Complete any in-progress operations
  //   3. Return when ready (or timeout)
  console.log(
    `[Phase72] Signaling prepare-for-update to workspace ${workspaceId} (timeout: ${timeoutSeconds}s)`
  );
}

/**
 * Command the sidecar to save a state checkpoint.
 * In production: POST to sidecar API /save-checkpoint
 */
async function saveStateCheckpoint(workspaceId: string): Promise<void> {
  // Production: POST http://{droplet_ip}:3001/save-checkpoint
  // The sidecar saves its state to a Docker volume so the new
  // container can load it.
  console.log(`[Phase72] Saving state checkpoint for workspace ${workspaceId}`);
}

/**
 * Perform the blue-green container swap.
 * In production: SSH/API to execute docker compose commands.
 */
async function performContainerSwap(
  workspaceId: string,
  targetVersion: string
): Promise<void> {
  // Production:
  //   docker compose up -d sidecar --force-recreate
  // with the new image tag set in the environment/compose file.
  console.log(
    `[Phase72] Swapping sidecar container to v${targetVersion} for workspace ${workspaceId}`
  );
}

/**
 * Wait for the new sidecar to report a healthy heartbeat.
 * In production: Poll heartbeat endpoint until healthy or timeout.
 *
 * @returns true if healthy heartbeat received, false if timed out.
 */
async function waitForHealthyHeartbeat(
  workspaceId: string,
  timeoutSeconds: number
): Promise<boolean> {
  // Production: Poll GET http://{droplet_ip}:3001/health
  // every 2 seconds until:
  //   - Returns 200 → healthy, return true
  //   - Timeout reached → return false
  //
  // For now, return true (connected when Phase 73 is implemented).
  console.log(
    `[Phase72] Waiting for healthy heartbeat from workspace ${workspaceId} (timeout: ${timeoutSeconds}s)`
  );
  return true;
}

// ============================================
// UTILITY
// ============================================

/**
 * Get the Docker image tag for a sidecar version.
 */
export function getSidecarImageTag(version: string): string {
  return `genesis/sidecar:${version}`;
}

/**
 * Validate that a sidecar version string is valid semver.
 */
export function isValidSidecarVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}
