/**
 * Onboarding Draft API
 * 
 * GET  /api/onboarding/draft?workspace_id=X&stage=Y — retrieve draft for a stage
 * PUT  /api/onboarding/draft — save { workspace_id, stage, data } as a draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET — Retrieve draft data for a specific workspace + stage
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    const stage = searchParams.get('stage');

    if (!workspaceId || !stage) {
      return NextResponse.json(
        { error: 'workspace_id and stage required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('genesis.onboarding_progress')
      .select('drafts')
      .eq('workspace_id', workspaceId)
      .single();

    if (error) {
      // Row might not exist yet — return empty draft
      if (error.code === 'PGRST116') {
        return NextResponse.json({ draft: null });
      }
      console.error('Draft GET error:', error.message);
      return NextResponse.json({ draft: null });
    }

    const drafts = (data?.drafts ?? {}) as Record<string, unknown>;
    return NextResponse.json({ draft: drafts[stage] ?? null });
  } catch (error) {
    console.error('Onboarding draft GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT — Auto-save draft data for a specific workspace + stage
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const body = await req.json();
    const { workspace_id, stage, data } = body as {
      workspace_id?: string;
      stage?: string;
      data?: Record<string, unknown>;
    };

    if (!workspace_id || !stage || data === undefined) {
      return NextResponse.json(
        { error: 'workspace_id, stage, and data required' },
        { status: 400 },
      );
    }

    // First, get current drafts
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('genesis.onboarding_progress')
      .select('drafts')
      .eq('workspace_id', workspace_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Draft fetch error:', fetchError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to save draft' },
        { status: 500 },
      );
    }

    const existingDrafts = ((row?.drafts ?? {}) as Record<string, unknown>);
    const updatedDrafts = { ...existingDrafts, [stage]: data };

    if (fetchError?.code === 'PGRST116') {
      // Row doesn't exist — insert with draft
      const { error: insertError } = await supabaseAdmin
        .from('genesis.onboarding_progress')
        .insert({
          workspace_id,
          current_stage: stage,
          completed_stages: [],
          drafts: updatedDrafts,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Draft insert error:', insertError.message);
        return NextResponse.json(
          { success: false, error: 'Failed to save draft' },
          { status: 500 },
        );
      }
    } else {
      // Row exists — update drafts column
      const { error: updateError } = await supabaseAdmin
        .from('genesis.onboarding_progress')
        .update({
          drafts: updatedDrafts,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspace_id);

      if (updateError) {
        console.error('Draft update error:', updateError.message);
        return NextResponse.json(
          { success: false, error: 'Failed to save draft' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding draft PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
