/**
 * DOMAIN 6, TASK 6.3.1: Ignition Status Polling API
 *
 * GET /api/onboarding/ignition-status?workspace_id=X
 *
 * Returns the current ignition state for real-time progress tracking.
 * Reads from the genesis.ignition_state table via SupabaseIgnitionStateDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { canAccessWorkspace } from '@/lib/api-workspace-guard';
import { SupabaseIgnitionStateDB } from '@/lib/genesis/supabase-ignition-state-db';

// ============================================
// GET — Poll ignition status
// ============================================

export async function GET(req: NextRequest) {
  try {
    // 1. Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id query param required' }, { status: 400 });
    }

    // 2. Workspace access
    const access = await canAccessWorkspace(userId, workspaceId, req.url);
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Load ignition state
    const stateDB = new SupabaseIgnitionStateDB();
    const state = await stateDB.load(workspaceId);

    if (!state) {
      return NextResponse.json({
        workspace_id: workspaceId,
        status: 'not_started',
        current_step: 0,
        total_steps: 0,
        message: 'Ignition has not been initiated for this workspace',
      });
    }

    return NextResponse.json({
      workspace_id: state.workspace_id,
      status: state.status,
      current_step: state.current_step,
      total_steps: state.total_steps,
      partition_name: state.partition_name,
      droplet_id: state.droplet_id,
      droplet_ip: state.droplet_ip,
      webhook_url: state.webhook_url,
      workflow_ids: state.workflow_ids,
      credential_ids: state.credential_ids,
      error_message: state.error_message,
      error_step: state.error_step,
      started_at: state.started_at,
      updated_at: state.updated_at,
      completed_at: state.completed_at,
    });
  } catch (error) {
    console.error('Ignition status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
