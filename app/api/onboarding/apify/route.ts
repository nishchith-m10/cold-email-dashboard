/**
 * PHASE 64: Apify Selection API
 * 
 * GET /api/onboarding/apify - Get Apify mode selection
 * POST /api/onboarding/apify - Save Apify mode selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET - Get Apify selection
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    // Try to get existing selection from genesis.workspace_apify_config
    const result = await (supabaseAdmin as any)
      .from('genesis.workspace_apify_config')
      .select('mode, validated')
      .eq('workspace_id', workspaceId)
      .single();

    const data = result.data as { mode?: string; validated?: boolean } | null;
    const error = result.error;

    if (error) {
      // Table might not exist yet, return default
      return NextResponse.json({ mode: 'managed', validated: false });
    }

    return NextResponse.json({
      mode: data?.mode || 'managed',
      validated: data?.validated || false,
    });
  } catch (error) {
    console.error('Apify GET error:', error);
    // Return default on error
    return NextResponse.json({ mode: 'managed', validated: false });
  }
}

/**
 * POST - Save Apify selection
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const { workspaceId, mode, apiToken } = body;

    if (!workspaceId || !mode) {
      return NextResponse.json(
        { error: 'workspaceId and mode required' },
        { status: 400 }
      );
    }

    if (!['byo', 'managed'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // For now, just return success - full implementation would store in DB
    // This allows the onboarding to proceed without requiring the genesis schema
    console.log('Apify selection:', { workspaceId, mode, hasApiToken: !!apiToken });

    // TODO: Store in genesis.workspace_apify_config when table exists
    // For BYO mode, also store the encrypted API token

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Apify POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
