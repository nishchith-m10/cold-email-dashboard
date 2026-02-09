/**
 * PHASE 45 - GET /api/sandbox/history
 * 
 * Returns sandbox test run history for a workspace.
 * Requires Clerk auth + workspace access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { mapSandboxTestRunRow } from '@/lib/genesis/phase45/types';
import { isGenesisSchemaAvailable } from '@/lib/genesis/schema-check';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId query parameter is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Check if genesis schema is accessible via PostgREST
    if (!(await isGenesisSchemaAvailable())) {
      return NextResponse.json(
        { success: true, runs: [], total: 0, _notice: 'genesis schema not exposed in PostgREST' },
        { headers: API_HEADERS }
      );
    }

    // Verify workspace access
    const { data: membership } = await supabaseAdmin
      .from('user_workspaces')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);
    const clampedLimit = Math.min(Math.max(limit, 1), 100);

    const { data, error } = await (supabaseAdmin as any).schema('genesis')
      .from('sandbox_test_runs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('started_at', { ascending: false })
      .limit(clampedLimit);

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SandboxHistory] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500, headers: API_HEADERS }
      );
    }

    const runs = (data || []).map(mapSandboxTestRunRow);

    return NextResponse.json(
      { success: true, runs, total: runs.length },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[SandboxHistory] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
