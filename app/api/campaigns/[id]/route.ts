/**
 * Campaign Update API
 * 
 * PATCH /api/campaigns/[id]
 * 
 * Updates a campaign's details (name, description).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTypedSupabaseAdmin, DEFAULT_WORKSPACE_ID, TypedSupabaseClient } from '@/lib/supabase';

// ============================================
// HELPERS
// ============================================

function jsonResponse(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// ============================================
// PATCH HANDLER
// ============================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  
  // Get typed Supabase client - throws if not configured
  let db: TypedSupabaseClient;
  try {
    db = getTypedSupabaseAdmin();
  } catch {
    return jsonResponse({ success: false, error: 'Database not configured' }, 500);
  }

  // 2. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  // 3. Parse and validate request body
  let body: { name?: string; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const name: string | undefined = body.name;
  const description: string | null | undefined = body.description;
  
  // Check if there are any updates to make
  if (name === undefined && description === undefined) {
    return jsonResponse({ success: true, message: 'No changes provided' });
  }

  // 4. Fetch campaign to verify ownership/access
  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('workspace_id')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    return jsonResponse({ success: false, error: 'Campaign not found' }, 404);
  }

  // 5. Verify workspace authorization
  const { data: membership } = await db
    .from('user_workspaces')
    .select('role')
    .eq('workspace_id', campaign.workspace_id)
    .eq('user_id', userId)
    .single();

  if (!membership && campaign.workspace_id !== DEFAULT_WORKSPACE_ID) {
    return jsonResponse(
      { success: false, error: 'Not authorized to modify this campaign' },
      403
    );
  }

  // 6. Update campaign with inline object literal (required for Supabase typing)
  const { data: updatedCampaign, error: updateError } = await db
    .from('campaigns')
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (updateError) {
    console.error('Campaign update error:', updateError);
    return jsonResponse({ success: false, error: 'Failed to update campaign' }, 500);
  }

  return jsonResponse({
    success: true,
    campaign: updatedCampaign
  });
}

// ============================================
// DELETE HANDLER
// ============================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  
  // Get typed Supabase client - throws if not configured
  let db: TypedSupabaseClient;
  try {
    db = getTypedSupabaseAdmin();
  } catch {
    return jsonResponse({ success: false, error: 'Database not configured' }, 500);
  }

  // 2. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  // 3. Fetch campaign to verify ownership/access
  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('workspace_id, name')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    return jsonResponse({ success: false, error: 'Campaign not found' }, 404);
  }

  // 4. Verify workspace authorization (requires manage permission)
  const { data: membership } = await db
    .from('user_workspaces')
    .select('role')
    .eq('workspace_id', campaign.workspace_id)
    .eq('user_id', userId)
    .single();

  const hasAccess = membership || campaign.workspace_id === DEFAULT_WORKSPACE_ID;
  const canManage = membership?.role === 'owner' || membership?.role === 'admin';

  if (!hasAccess || !canManage) {
    return jsonResponse(
      { success: false, error: 'Not authorized to delete this campaign' },
      403
    );
  }

  // 5. Delete the campaign
  const { error: deleteError } = await db
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (deleteError) {
    console.error('Campaign delete error:', deleteError);
    return jsonResponse({ success: false, error: 'Failed to delete campaign' }, 500);
  }

  return jsonResponse({
    success: true,
    message: `Campaign "${campaign.name}" deleted successfully`
  });
}
