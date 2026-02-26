import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';
import { canWriteCampaigns, canManageCampaignGroups } from '@/lib/workspace-access';
import { canAccessWorkspace } from '@/lib/api-workspace-guard';
import { auth } from '@clerk/nextjs/server';
import type { CampaignGroup } from '@/lib/dashboard-types';

export const dynamic = 'force-dynamic';

// ============================================
// GET /api/campaign-groups
// Returns campaign groups for a workspace, with their campaigns.
// Filters is_test=true groups unless ?include_test=true is passed.
// ============================================
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;
  const includeTest = searchParams.get('include_test') === 'true';

  // Enforce workspace membership
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  try {
    // Fetch groups scoped to workspace — explicit workspace_id match for tenant isolation
    let groupQuery = supabaseAdmin
      .from('campaign_groups')
      .select(`
        id,
        name,
        workspace_id,
        is_test,
        created_at,
        updated_at,
        campaigns (
          id,
          name,
          status,
          campaign_group_id,
          n8n_workflow_id,
          n8n_status,
          created_at,
          updated_at
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    // Filter out test groups unless explicitly requested
    if (!includeTest) {
      groupQuery = groupQuery.eq('is_test', false);
    }

    const { data: groups, error } = await groupQuery;

    if (error) {
      console.error('campaign-groups GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { groups: groups || [] },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    console.error('campaign-groups API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// POST /api/campaign-groups
// Create a new campaign group. Requires canWrite (member+).
// ============================================
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Step 1: workspace membership check
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  // Step 2: role must have canWrite
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { hasAccess, role } = await canAccessWorkspace(userId, workspaceId);
  if (!hasAccess || !canWriteCampaigns(role as any)) {
    return NextResponse.json(
      { error: 'Insufficient permissions — write access required' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('campaign_groups')
      .insert({ name: name.trim(), workspace_id: workspaceId, is_test: false })
      .select()
      .single();

    if (error) {
      console.error('campaign-groups POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: data }, { status: 201 });
  } catch (err) {
    console.error('campaign-groups POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// PATCH /api/campaign-groups
// Rename a group. Requires canWrite (member+).
// Body: { id, name }
// ============================================
export async function PATCH(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { hasAccess, role } = await canAccessWorkspace(userId, workspaceId);
  if (!hasAccess || !canWriteCampaigns(role as any)) {
    return NextResponse.json(
      { error: 'Insufficient permissions — write access required' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    // Verify the group belongs to this workspace (tenant isolation)
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('campaign_groups')
      .select('id, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: 'Campaign group not found in this workspace' },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('campaign_groups')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId) // Double fence
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: data });
  } catch (err) {
    console.error('campaign-groups PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// DELETE /api/campaign-groups
// Delete a group. Requires canManage (admin+).
// Query param: ?id=<uuid>
// ============================================
export async function DELETE(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;
  const groupId = searchParams.get('id');

  if (!groupId) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { hasAccess, role } = await canAccessWorkspace(userId, workspaceId);
  if (!hasAccess || !canManageCampaignGroups(role as any)) {
    return NextResponse.json(
      { error: 'Insufficient permissions — admin or owner required to delete groups' },
      { status: 403 }
    );
  }

  // Verify group ownership (tenant isolation)
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('campaign_groups')
    .select('id, workspace_id, is_test')
    .eq('id', groupId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json(
      { error: 'Campaign group not found in this workspace' },
      { status: 404 }
    );
  }

  const { error } = await supabaseAdmin
    .from('campaign_groups')
    .delete()
    .eq('id', groupId)
    .eq('workspace_id', workspaceId); // Double fence

  if (error) {
    console.error('campaign-groups DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
