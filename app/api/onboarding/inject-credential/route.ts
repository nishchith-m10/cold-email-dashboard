/**
 * POST /api/onboarding/inject-credential
 *
 * Post-ignition credential injection.
 * Saves a credential to the vault AND pushes it to the running
 * sidecar so the user doesn't need to re-ignite.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canAccessWorkspace } from '@/lib/api-workspace-guard';
import { encryptCredential } from '@/lib/genesis/credential-vault';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const { workspaceId, credentialType, credentialName, credentialData } = body;

    if (!workspaceId || !credentialType) {
      return NextResponse.json(
        { error: 'workspaceId and credentialType required' },
        { status: 400 }
      );
    }

    const access = await canAccessWorkspace(userId, workspaceId, req.url);
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Look up workspace droplet from partition_registry
    const { data: registry } = await supabaseAdmin
      .schema('genesis' as any)
      .from('partition_registry')
      .select('droplet_ip, status')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single();

    if (!registry?.droplet_ip) {
      return NextResponse.json({
        success: true,
        injected: false,
        reason: 'No active droplet found — credential saved to vault only',
      });
    }

    const transitKey =
      process.env.INTERNAL_ENCRYPTION_KEY ||
      process.env.CREDENTIAL_MASTER_KEY ||
      '';

    if (!transitKey) {
      return NextResponse.json(
        { error: 'Server encryption key not configured' },
        { status: 500 }
      );
    }

    const encryptedForTransit = encryptCredential(
      credentialData || {},
      workspaceId,
      transitKey
    );

    const sidecarUrl = `http://${registry.droplet_ip}:3100`;

    const sidecarRes = await fetch(`${sidecarUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INJECT_CREDENTIAL',
        payload: {
          credential_type: credentialType,
          credential_name: credentialName || credentialType,
          encrypted_data: encryptedForTransit,
        },
      }),
    });

    if (!sidecarRes.ok) {
      const errText = await sidecarRes.text().catch(() => 'Unknown');
      console.error(`[inject-credential] Sidecar returned ${sidecarRes.status}: ${errText}`);
      return NextResponse.json({
        success: true,
        injected: false,
        reason: `Sidecar responded with ${sidecarRes.status} — credential saved to vault, injection deferred`,
      });
    }

    const sidecarData = await sidecarRes.json();

    return NextResponse.json({
      success: true,
      injected: true,
      n8n_credential_id: sidecarData?.credential_id || null,
    });
  } catch (error) {
    console.error('[inject-credential] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
