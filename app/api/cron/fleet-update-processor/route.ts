/**
 * PHASE 72 — POST /api/cron/fleet-update-processor
 *
 * Processes pending fleet update queue jobs.
 * Called periodically by Vercel Cron or external scheduler.
 *
 * Flow:
 *   1. Authenticate via CRON_SECRET
 *   2. Claim a batch of queued jobs
 *   3. For each job: execute the update, report success/failure
 *   4. Check if current wave is complete → auto-advance or auto-halt
 *   5. Return processing summary
 *
 * Auth: CRON_SECRET via query param or Authorization header
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.4, 68.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

import { claimBatch, reportJobSuccess, reportJobFailure } from '@/lib/genesis/phase72/update-queue';
import { shouldAutoHalt, isWaveComplete, advanceRollout, abortRollout } from '@/lib/genesis/phase72/rollout-engine';
import { updateTenantComponentVersion, setTenantUpdateStatus, logUpdateHistory, getFleetRollout } from '@/lib/genesis/phase72/db-service';
import { executeSidecarUpdate } from '@/lib/genesis/phase72/sidecar-update-protocol';
import { getCurrentTemplate } from '@/lib/genesis/phase72/db-service';
import type { FleetComponent, FleetUpdateQueueRecord } from '@/lib/genesis/phase72/types';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/** Max jobs to process per cron invocation (bounded by Vercel timeout) */
const BATCH_SIZE = 25;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================
    // 1. AUTHENTICATE
    // ============================================
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron:FleetUpdateProcessor] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500, headers: API_HEADERS }
      );
    }

    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const providedSecret = authHeader?.replace('Bearer ', '') ?? querySecret;

    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    // ============================================
    // 2. CLAIM JOBS
    // ============================================
    const jobs = await claimBatch(BATCH_SIZE);

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No pending jobs',
          processed: 0,
          duration_ms: Date.now() - startTime,
        },
        { headers: API_HEADERS }
      );
    }

    // ============================================
    // 3. PROCESS JOBS
    // ============================================
    let succeeded = 0;
    let failed = 0;
    const rolloutIds = new Set<string>();

    for (const job of jobs) {
      rolloutIds.add(job.rollout_id);

      try {
        await processJob(job);
        await reportJobSuccess(job.id);
        succeeded++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await reportJobFailure(job.id, errorMsg);
        failed++;

        console.error(
          `[Cron:FleetUpdateProcessor] Job ${job.id} failed for workspace ${job.workspace_id}:`,
          errorMsg
        );
      }
    }

    // ============================================
    // 4. CHECK ROLLOUT STATUS (auto-halt / auto-advance)
    // ============================================
    const rolloutActions: string[] = [];

    for (const rolloutId of rolloutIds) {
      // Check for auto-halt
      const haltCheck = await shouldAutoHalt(rolloutId);
      if (haltCheck.halt) {
        await abortRollout(rolloutId, haltCheck.reason ?? 'Error threshold exceeded');
        rolloutActions.push(`Rollout ${rolloutId}: AUTO-HALTED (${haltCheck.reason})`);
        continue;
      }

      // Check if wave is complete → advance
      const waveComplete = await isWaveComplete(rolloutId);
      if (waveComplete) {
        const rollout = await getFleetRollout(rolloutId);
        if (rollout && !['completed', 'aborted', 'rolled_back', 'paused'].includes(rollout.status)) {
          await advanceRollout(rolloutId);
          rolloutActions.push(`Rollout ${rolloutId}: Advanced to next wave`);
        }
      }
    }

    // ============================================
    // 5. RETURN SUMMARY
    // ============================================
    return NextResponse.json(
      {
        success: true,
        processed: jobs.length,
        succeeded,
        failed,
        rollout_actions: rolloutActions,
        duration_ms: Date.now() - startTime,
      },
      { headers: API_HEADERS }
    );
  } catch (error) {
    console.error('[Cron:FleetUpdateProcessor] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        duration_ms: Date.now() - startTime,
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}

// ============================================
// JOB PROCESSING
// ============================================

/**
 * Process a single update queue job.
 *
 * For workflow components: Fetches template JSON and pushes to sidecar.
 * For sidecar component: Executes blue-green container swap.
 */
async function processJob(job: FleetUpdateQueueRecord): Promise<void> {
  const component = job.component as FleetComponent;

  if (component === 'sidecar') {
    // Sidecar update: blue-green container swap
    const result = await executeSidecarUpdate(
      job.workspace_id,
      job.from_version,
      job.to_version
    );

    if (result.step === 'failed' || result.step === 'rolled_back') {
      throw new Error(result.error_message ?? 'Sidecar update failed');
    }
    return;
  }

  if (component === 'dashboard') {
    // Dashboard updates are handled by Vercel CI/CD, not per-tenant
    // Just update the version registry
    await updateTenantComponentVersion(job.workspace_id, component, job.to_version);
    return;
  }

  // Workflow component update
  await processWorkflowUpdate(job, component);
}

/**
 * Process a workflow update for a single tenant.
 * Fetches the template JSON and would push it to the tenant's sidecar.
 */
async function processWorkflowUpdate(
  job: FleetUpdateQueueRecord,
  component: FleetComponent
): Promise<void> {
  // Mark tenant as updating
  await setTenantUpdateStatus(job.workspace_id, 'updating');

  try {
    // Get the template JSON for the target version
    const template = await getCurrentTemplate(component);
    if (!template) {
      throw new Error(`No current template found for ${component}`);
    }

    // In production: Push the workflow JSON to the tenant's sidecar
    // via the sidecar API (Phase 51 integration point):
    //   POST http://{droplet_ip}:3001/workflows/{workflow_id}
    //   Body: template.workflow_json
    //
    // For now, we log and update the version registry.
    console.log(
      `[Cron:FleetUpdateProcessor] Pushing ${component} v${job.to_version} to workspace ${job.workspace_id}`
    );

    // Update tenant version
    await updateTenantComponentVersion(job.workspace_id, component, job.to_version);

    // Log success
    await logUpdateHistory({
      workspace_id: job.workspace_id,
      component,
      from_version: job.from_version,
      to_version: job.to_version,
      status: 'success',
      error_message: null,
      executed_by: 'cron',
      rollout_strategy: 'staged',
      affected_tenants: 1,
      rollout_id: job.rollout_id,
      wave_number: job.wave_number,
    });
  } catch (err) {
    // Mark tenant as failed
    await setTenantUpdateStatus(job.workspace_id, 'failed');

    // Log failure
    await logUpdateHistory({
      workspace_id: job.workspace_id,
      component,
      from_version: job.from_version,
      to_version: job.to_version,
      status: 'failed',
      error_message: err instanceof Error ? err.message : String(err),
      executed_by: 'cron',
      rollout_strategy: 'staged',
      affected_tenants: 1,
      rollout_id: job.rollout_id,
      wave_number: job.wave_number,
    });

    throw err;
  }
}
