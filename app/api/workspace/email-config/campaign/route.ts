/**
 * Per-Campaign Email Config API
 *
 * GET  /api/workspace/email-config/campaign?workspace_id=…&campaign_id=…
 *   → Returns campaign-specific config, falling back to workspace default.
 *
 * POST /api/workspace/email-config/campaign
 *   → Upserts a campaign-specific email provider config.
 *
 * DELETE /api/workspace/email-config/campaign?workspace_id=…&campaign_id=…
 *   → Removes campaign override (falls back to workspace default).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTypedSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const workspaceId = sp.get('workspace_id');
    const campaignId = sp.get('campaign_id');

    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    const supabase = getTypedSupabaseAdmin();

    // 1️⃣ Try campaign-specific config first
    const { data: campaignConfig } = await (supabase as any)
      .from('email_provider_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('campaign_id', campaignId)
      .maybeSingle();

    if (campaignConfig) {
      return NextResponse.json({
        source: 'campaign',
        config: sanitiseRow(campaignConfig),
      });
    }

    // 2️⃣ Fall back to workspace default (campaign_id IS NULL)
    const { data: workspaceConfig } = await (supabase as any)
      .from('email_provider_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('campaign_id', null)
      .maybeSingle();

    if (workspaceConfig) {
      return NextResponse.json({
        source: 'workspace_default',
        config: sanitiseRow(workspaceConfig),
      });
    }

    return NextResponse.json({ source: 'none', config: null });
  } catch (error) {
    console.error('[campaign-email-config] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { workspace_id, campaign_id, provider, ...providerFields } = body;

    if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
    if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });

    const supabase = getTypedSupabaseAdmin();

    // Verify workspace + campaign exist
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, workspace_id')
      .eq('id', campaign_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found in workspace' }, { status: 404 });
    }

    // Upsert campaign-specific config
    const row = {
      workspace_id,
      campaign_id,
      provider,
      ...providerFields,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from('email_provider_config')
      .upsert(row, {
        onConflict: 'workspace_id,campaign_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, config: sanitiseRow(data) });
  } catch (error) {
    console.error('[campaign-email-config] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save campaign email config' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const workspaceId = sp.get('workspace_id');
    const campaignId = sp.get('campaign_id');

    if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    const supabase = getTypedSupabaseAdmin();

    const { error } = await (supabase as any)
      .from('email_provider_config')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('campaign_id', campaignId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[campaign-email-config] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete campaign email config' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip encrypted columns from response */
function sanitiseRow(row: Record<string, unknown>) {
  if (!row) return null;
  const cleaned = { ...row };
  // Never return encrypted bytes to the client
  for (const key of Object.keys(cleaned)) {
    if (key.endsWith('_encrypted')) {
      cleaned[key] = cleaned[key] ? '[ENCRYPTED]' : null;
    }
  }
  return cleaned;
}
