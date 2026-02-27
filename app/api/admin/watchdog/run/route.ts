/**
 * D8-007: Watchdog Admin Scheduling Route
 *
 * GET /api/admin/watchdog/run — Triggers a full watchdog drift-detection cycle.
 * Protected with super admin auth. Uses SupabaseWatchdogDB for persistence.
 *
 * This route is designed to be called by:
 * - Manual trigger from the admin panel
 * - External cron scheduler (Vercel Cron, Railway cron) every 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseWatchdogDB } from '@/lib/genesis/phase43/supabase-watchdog-db';
import type { WatchdogRunConfig, WatchdogEvent, DriftType } from '@/lib/genesis/phase43/watchdog-types';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * GET /api/admin/watchdog/run
 *
 * Triggers a watchdog drift-detection cycle across all active workspaces.
 * Super Admin only.
 *
 * Query params:
 * - workspace_id (optional): Limit scan to a specific workspace
 * - dry_run (optional): If 'true', detect but don't auto-heal
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth check
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const specificWorkspaceId = searchParams.get('workspace_id');
    const dryRun = searchParams.get('dry_run') === 'true';

    // Get all active workspace IDs
    let workspaceIds: string[];
    if (specificWorkspaceId) {
      workspaceIds = [specificWorkspaceId];
    } else {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('status', 'active');
      workspaceIds = (workspaces || []).map((w: { id: string }) => w.id);
    }

    if (workspaceIds.length === 0) {
      return NextResponse.json({
        success: true,
        run_id: null,
        drifts_found: 0,
        workspaces_scanned: 0,
        duration_ms: Date.now() - startTime,
        message: 'No active workspaces to scan',
      }, { headers: API_HEADERS });
    }

    // Initialize watchdog DB
    const watchdogDb = new SupabaseWatchdogDB();

    // Create run config
    const config: WatchdogRunConfig = {
      autoHeal: !dryRun,
      dryRun,
      workspaceIds,
    };

    const event: WatchdogEvent = {
      trigger: 'manual',
      initiatedBy: userId,
      timestamp: new Date(),
      metadata: {
        specific_workspace: specificWorkspaceId || null,
        dry_run: dryRun,
      },
    };

    // Create a run record
    const runId = await watchdogDb.createRun(config, event);

    // Run drift detection for each workspace using the DB layer
    // Note: Full drift detection (comparing n8n state) requires the StateReconciliationWatchdog
    // with an N8nClient. Here we do DB-level drift detection + persistence.
    let totalDrifts = 0;
    const errors: string[] = [];
    const driftsByType: Record<string, number> = {};

    for (const wsId of workspaceIds) {
      try {
        // Check for common DB-level drifts
        // 1. Workspaces with campaigns but no partition
        const genesisClient = (supabase as any).schema('genesis');
        const { data: partition } = await genesisClient
          .from('partition_registry')
          .select('id')
          .eq('workspace_id', wsId)
          .maybeSingle();

        if (!partition) {
          // Missing partition drift
          await watchdogDb.storeDrift({
            workspaceId: wsId,
            driftType: 'missing_partition' as DriftType,
            severity: 'critical',
            details: { reason: 'Workspace has no partition registered' },
            autoHealable: false,
            detectedAt: new Date(),
            healingAttempts: 0,
          });
          totalDrifts++;
          driftsByType['missing_partition'] = (driftsByType['missing_partition'] || 0) + 1;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Workspace ${wsId}: ${errMsg}`);
        /* eslint-disable-next-line no-console */
        console.error(`[Watchdog] Error scanning workspace ${wsId}:`, errMsg);
      }
    }

    const durationMs = Date.now() - startTime;

    // Update run with results
    await watchdogDb.updateRun(runId, {
      completedAt: new Date(),
      workspacesScanned: workspaceIds.length,
      totalDrifts,
      driftsHealed: 0,
      driftsFailed: 0,
      driftsByType: driftsByType as Record<DriftType, number>,
      driftsBySeverity: {} as any,
      durationMs,
      errors,
    });

    return NextResponse.json({
      success: true,
      run_id: runId,
      drifts_found: totalDrifts,
      drifts_by_type: driftsByType,
      workspaces_scanned: workspaceIds.length,
      duration_ms: durationMs,
      dry_run: dryRun,
      errors: errors.length > 0 ? errors : undefined,
    }, { headers: API_HEADERS });

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Watchdog] Admin run error:', error);
    return NextResponse.json(
      { error: 'Internal server error', duration_ms: Date.now() - startTime },
      { status: 500, headers: API_HEADERS }
    );
  }
}
