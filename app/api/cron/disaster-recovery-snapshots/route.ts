/**
 * GENESIS PHASE 70: DISASTER RECOVERY DAILY SNAPSHOT CRON
 *
 * Automated daily snapshot creation for all active workspaces.
 * Schedule: 0 2 * * * (Daily at 2 AM UTC via Vercel Cron)
 * Auth: CRON_SECRET via query param or Authorization header
 * DRY_RUN: Respects mock environment mode
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 70
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createDOClient,
} from '@/lib/genesis/phase70';
import { listSnapshots } from '@/lib/genesis/phase70/db-service';

// ============================================
// CONSTANTS
// ============================================
const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

// ============================================
// HELPER: Check if workspace has recent snapshot (<24h)
// ============================================
async function hasRecentSnapshot(workspaceId: string): Promise<boolean> {
  const last24h = new Date();
  last24h.setHours(last24h.getHours() - 24);

  const snapshots = await listSnapshots({
    workspaceId,
    isDryRun: false,
  });

  return snapshots.some(
    (s) => new Date(s.created_at) > last24h && s.status !== 'failed'
  );
}

// ============================================
// POST HANDLER
// ============================================
/**
 * POST /api/cron/disaster-recovery-snapshots
 *
 * Creates daily snapshots for all active workspaces.
 * Skips workspaces that already have a snapshot <24h old.
 *
 * Auth:
 *   - Query param: ?secret={CRON_SECRET}
 *   - OR Header: Authorization: Bearer {CRON_SECRET}
 *
 * Response:
 *   200: { success: true, created, skipped, failed }
 *   401: { error: 'Unauthorized' }
 *   500: { error: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================
    // 1. AUTHENTICATE
    // ============================================
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron:DRSnapshots] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Support both query param and Authorization header
    const querySecret = new URL(request.url).searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const headerSecret = authHeader?.replace('Bearer ', '');

    const providedSecret = querySecret || headerSecret;

    if (providedSecret !== cronSecret) {
      console.warn('[Cron:DRSnapshots] Unauthorized cron access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    console.log('[Cron:DRSnapshots] Starting daily snapshot creation...');

    // ============================================
    // 2. GET ALL ACTIVE WORKSPACES
    // ============================================
    if (!supabaseAdmin) {
      console.error('[Cron:DRSnapshots] Database unavailable');
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500, headers: API_HEADERS }
      );
    }

    const { data: workspaces, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, status')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (wsError) {
      console.error('[Cron:DRSnapshots] Failed to fetch workspaces:', wsError);
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500, headers: API_HEADERS }
      );
    }

    const activeWorkspaces = workspaces || [];
    console.log(`[Cron:DRSnapshots] Found ${activeWorkspaces.length} active workspaces`);

    // ============================================
    // 3. CREATE SNAPSHOTS FOR EACH WORKSPACE
    // ============================================
    const isDryRun = process.env.NODE_ENV !== 'production';
    const env = createDOClient(isDryRun);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    const errors: Array<{ workspaceId: string; error: string }> = [];

    for (const workspace of activeWorkspaces) {
      try {
        // Check if snapshot exists <24h
        const hasRecent = await hasRecentSnapshot(workspace.id);

        if (hasRecent) {
          console.log(`[Cron:DRSnapshots] Skipping ${workspace.id} - recent snapshot exists`);
          skipped++;
          continue;
        }

        // Generate droplet ID (in production this comes from workspace metadata)
        const dropletId = `droplet-${workspace.id}`;

        // Create snapshot via DigitalOcean API (persists to DB automatically)
        const snapshotName = `daily_${new Date().toISOString().split('T')[0]}_${workspace.id}`;
        await env.createSnapshot(dropletId, snapshotName, 'daily');

        console.log(`[Cron:DRSnapshots] Created snapshot for workspace ${workspace.id}`);
        created++;
      } catch (error: any) {
        console.error(`[Cron:DRSnapshots] Failed to create snapshot for ${workspace.id}:`, error);
        failed++;
        errors.push({
          workspaceId: workspace.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    // ============================================
    // 4. RETURN RESULTS
    // ============================================
    const duration = Date.now() - startTime;

    console.log(
      `[Cron:DRSnapshots] Completed: ${created} created, ${skipped} skipped, ${failed} failed (${duration}ms)`
    );

    return NextResponse.json(
      {
        success: true,
        created,
        skipped,
        failed,
        totalWorkspaces: activeWorkspaces.length,
        duration,
        errors: errors.length > 0 ? errors : undefined,
        isDryRun,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cron:DRSnapshots] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        duration: Date.now() - startTime,
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}
