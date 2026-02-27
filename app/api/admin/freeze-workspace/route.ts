import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { clearAllWorkspaceEntries } from '@/lib/api-workspace-guard';
import { invalidateFrozenCache } from '@/lib/workspace-frozen-cache';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Super Admin IDs - should be in env vars
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * POST /api/admin/freeze-workspace
 * 
 * Freeze a workspace (Kill Switch).
 * Blocks all API access for the tenant.
 * Super Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    // Check Super Admin
    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const body = await req.json();
    const { workspace_id, reason } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get workspace info for audit
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, status')
      .eq('id', workspace_id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404, headers: API_HEADERS }
      );
    }

    if (workspace.status === 'frozen') {
      return NextResponse.json(
        { error: 'Workspace is already frozen' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get actor email for audit
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerk = await clerkClient();
    const actor = await clerk.users.getUser(userId);
    const actorEmail = actor.emailAddresses?.[0]?.emailAddress || 'unknown';

    // Freeze the workspace
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        status: 'frozen',
        frozen_at: new Date().toISOString(),
        frozen_by: userId,
        freeze_reason: reason || 'No reason provided',
      })
      .eq('id', workspace_id);

    if (updateError) {
      /* eslint-disable-next-line no-console */
      console.error('[Kill Switch] Failed to freeze workspace:', updateError);
      return NextResponse.json(
        { error: 'Failed to freeze workspace' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Revoke all workspace API keys
    await supabase
      .from('workspace_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id)
      .is('revoked_at', null);

    // D8-003: Invalidate the workspace webhook token to immediately block event/cost ingestion
    await supabase
      .from('workspaces')
      .update({ webhook_token: null })
      .eq('id', workspace_id);

    // D8-003: Best-effort sidecar deactivation — send DEACTIVATE_ALL_WORKFLOWS
    try {
      const genesisClient = (supabase as any).schema('genesis');
      const { data: partition } = await genesisClient
        .from('partition_registry')
        .select('sidecar_url')
        .eq('workspace_id', workspace_id)
        .maybeSingle();

      if (partition?.sidecar_url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
        try {
          await fetch(`${partition.sidecar_url}/admin/deactivate-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id, reason: reason || 'Workspace frozen' }),
            signal: controller.signal,
          });
          /* eslint-disable-next-line no-console */
          console.log(`[Kill Switch] Sidecar deactivation sent for workspace ${workspace_id}`);
        } catch (sidecarErr) {
          /* eslint-disable-next-line no-console */
          console.warn(`[Kill Switch] Sidecar deactivation failed (non-blocking):`, sidecarErr instanceof Error ? sidecarErr.message : sidecarErr);
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch {
      /* eslint-disable-next-line no-console */
      console.warn(`[Kill Switch] Could not look up sidecar URL for workspace ${workspace_id}`);
    }

    // Log to governance audit
    await supabase.from('governance_audit_log').insert({
      workspace_id,
      workspace_name: workspace.name,
      actor_id: userId,
      actor_email: actorEmail,
      action: 'freeze',
      reason: reason || 'No reason provided',
      metadata: { previous_status: workspace.status, webhook_token_invalidated: true },
    });

    // D5-003: Invalidate cached access for all users of this workspace
    clearAllWorkspaceEntries(workspace_id);
    // D8-002: Invalidate frozen status cache
    invalidateFrozenCache(workspace_id);

    /* eslint-disable-next-line no-console */
    console.log(`[Kill Switch] Workspace "${workspace.name}" frozen by ${actorEmail}`);

    return NextResponse.json({
      success: true,
      message: `Workspace "${workspace.name}" has been frozen`,
      workspace_id,
    }, { headers: API_HEADERS });

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Kill Switch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * DELETE /api/admin/freeze-workspace
 * 
 * Unfreeze a workspace.
 * Restores normal operation.
 * Super Admin only.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    // Check Super Admin
    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspace_id = searchParams.get('workspace_id');

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get workspace info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, status')
      .eq('id', workspace_id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404, headers: API_HEADERS }
      );
    }

    if (workspace.status !== 'frozen') {
      return NextResponse.json(
        { error: 'Workspace is not frozen' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get actor email for audit
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerk = await clerkClient();
    const actor = await clerk.users.getUser(userId);
    const actorEmail = actor.emailAddresses?.[0]?.emailAddress || 'unknown';

    // Unfreeze the workspace
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        status: 'active',
        frozen_at: null,
        frozen_by: null,
        freeze_reason: null,
      })
      .eq('id', workspace_id);

    if (updateError) {
      /* eslint-disable-next-line no-console */
      console.error('[Kill Switch] Failed to unfreeze workspace:', updateError);
      return NextResponse.json(
        { error: 'Failed to unfreeze workspace' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // D8-003: Generate a new webhook token for the unfrozen workspace
    const newWebhookToken = randomUUID();
    await supabase
      .from('workspaces')
      .update({ webhook_token: newWebhookToken })
      .eq('id', workspace_id);

    // Log to governance audit
    await supabase.from('governance_audit_log').insert({
      workspace_id,
      workspace_name: workspace.name,
      actor_id: userId,
      actor_email: actorEmail,
      action: 'unfreeze',
      reason: 'Workspace restored to active status',
      metadata: {
        previous_status: 'frozen',
        new_webhook_token_generated: true,
        new_webhook_token: newWebhookToken,
      },
    });

    // D5-003: Invalidate cached access for all users of this workspace
    clearAllWorkspaceEntries(workspace_id);
    // D8-002: Invalidate frozen status cache
    invalidateFrozenCache(workspace_id);

    /* eslint-disable-next-line no-console */
    console.log(`[Kill Switch] Workspace "${workspace.name}" unfrozen by ${actorEmail}`);

    return NextResponse.json({
      success: true,
      message: `Workspace "${workspace.name}" has been unfrozen`,
      workspace_id,
      new_webhook_token: newWebhookToken,
    }, { headers: API_HEADERS });

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Kill Switch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
