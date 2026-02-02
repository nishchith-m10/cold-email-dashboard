import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/join
 * Join a workspace using an invite code
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { inviteCode } = await req.json();

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    // Look up the invite code - NOTE: relationship join requires proper schema setup
    const result = await (supabaseAdmin as any)
      .from('workspace_invites')
      .select('*, workspaces(*)')
      .eq('code', inviteCode.toUpperCase().trim())
      .single();

    const invite = result.data as { 
      id: string;
      workspace_id: string;
      role: string;
      uses_remaining: number | null;
      expires_at: string | null;
      workspaces?: { name: string } | null;
    } | null;
    const inviteError = result.error;

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 404 }
      );
    }

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invite code has expired' },
        { status: 410 }
      );
    }

    // Check if invite has uses remaining
    if (invite.uses_remaining !== null && invite.uses_remaining <= 0) {
      return NextResponse.json(
        { error: 'This invite code has been used too many times' },
        { status: 410 }
      );
    }

    // Check if user is already a member of this workspace
    const { data: existingMembership } = await supabaseAdmin
      .from('user_workspaces')
      .select('id')
      .eq('user_id', userId)
      .eq('workspace_id', invite.workspace_id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 409 }
      );
    }

    // Add user to workspace
    const { error: joinError } = await supabaseAdmin
      .from('user_workspaces')
      .insert({
        user_id: userId,
        workspace_id: invite.workspace_id,
        role: invite.role || 'member',
      });

    if (joinError) {
      console.error('Join error:', joinError);
      return NextResponse.json(
        { error: 'Failed to join workspace' },
        { status: 500 }
      );
    }

    // Decrement uses_remaining if it's set
    if (invite.uses_remaining !== null) {
      await supabaseAdmin
        .from('workspace_invites')
        .update({ uses_remaining: invite.uses_remaining - 1 })
        .eq('id', invite.id);
    }

    return NextResponse.json({
      success: true,
      workspace: {
        id: invite.workspace_id,
        name: invite.workspaces?.name || 'Workspace',
      },
      role: invite.role,
    });
  } catch (error) {
    console.error('Join workspace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

