/**
 * GET /api/admin/provisioning-events
 *   → Returns all workspaces in non-active ignition states + failed operations
 *
 * GET /api/admin/provisioning-events?workspace_id=<id>
 *   → Returns ignition_state + full operation log for one workspace
 *
 * Auth: Super Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/workspace-access';

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } as const;

// Ignition statuses that are "stuck" — not terminal, should have progressed
const IN_PROGRESS_STATUSES = [
  'partition_creating',
  'droplet_provisioning',
  'handshake_pending',
  'credentials_injecting',
  'workflows_deploying',
  'activating',
];

const STUCK_THRESHOLD_MINUTES = 30;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: HEADERS });
  if (!isSuperAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: HEADERS });

  if (!supabaseAdmin) return NextResponse.json({ error: 'DB not configured' }, { status: 503, headers: HEADERS });

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspace_id');

  try {
    // ── Single workspace drill-down ──────────────────────────────────────────
    if (workspaceId) {
      const [stateResult, opsResult] = await Promise.all([
        (supabaseAdmin as any)
          .schema('genesis')
          .from('ignition_state')
          .select('*')
          .eq('workspace_id', workspaceId)
          .maybeSingle(),
        (supabaseAdmin as any)
          .schema('genesis')
          .from('ignition_operations')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('started_at', { ascending: true }),
      ]);

      return NextResponse.json({
        success: true,
        state: stateResult.data,
        operations: opsResult.data ?? [],
      }, { headers: HEADERS });
    }

    // ── Fleet overview — all non-active workspaces ───────────────────────────
    const { data: states, error } = await (supabaseAdmin as any)
      .schema('genesis')
      .from('ignition_state')
      .select('workspace_id, status, current_step, total_steps, error_message, error_step, started_at, updated_at, completed_at, requested_by, region, droplet_size')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const now = Date.now();
    const stuckCutoff = now - STUCK_THRESHOLD_MINUTES * 60 * 1000;

    const failed = (states ?? []).filter((s: any) => s.status === 'failed');
    const stuck  = (states ?? []).filter((s: any) =>
      IN_PROGRESS_STATUSES.includes(s.status) &&
      new Date(s.updated_at).getTime() < stuckCutoff
    );
    const active = (states ?? []).filter((s: any) => s.status === 'active');
    const inProgress = (states ?? []).filter((s: any) =>
      IN_PROGRESS_STATUSES.includes(s.status) &&
      new Date(s.updated_at).getTime() >= stuckCutoff
    );

    return NextResponse.json({
      success: true,
      summary: {
        total: (states ?? []).length,
        failed: failed.length,
        stuck: stuck.length,
        in_progress: inProgress.length,
        active: active.length,
      },
      failed,
      stuck,
      in_progress: inProgress,
      active,
    }, { headers: HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: HEADERS }
    );
  }
}
