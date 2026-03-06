/**
 * ADMIN: Rotate Credential
 *
 * POST /api/admin/rotate-credential
 * Body: {
 *   workspace_id:      string  — UUID of the workspace
 *   db_credential_id:  string  — UUID from genesis.workspace_credentials
 *   new_data:          Record<string, string>  — plaintext new field values
 * }
 *
 * Flow:
 *  1. Validate super-admin auth
 *  2. Fetch the credential row (get n8n_credential_id + type)
 *  3. Re-encrypt new_data with CREDENTIAL_MASTER_KEY → update DB row
 *  4. If row has n8n_credential_id AND workspace has an active sidecar:
 *     - Re-encrypt new_data with INTERNAL_ENCRYPTION_KEY (transit key)
 *     - Send ROTATE_CREDENTIAL via JWT-signed HttpSidecarClient
 *     - If sidecar ACKs → mark status='synced' in DB
 *  5. Return { success, db_updated, sidecar_updated, note? }
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/workspace-access';
import { encryptCredential } from '@/lib/genesis/credential-vault';
import { HttpSidecarClient } from '@/lib/genesis/http-sidecar-client';

export const dynamic = 'force-dynamic';

// Private-IP SSRF guard (mirrors sidecar-command/route.ts)
function isPrivateHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '0.0.0.0' ||
    host.startsWith('169.254.')
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !isSuperAdmin(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { workspace_id, db_credential_id, new_data } = body;

    if (!workspace_id || !db_credential_id || !new_data || typeof new_data !== 'object') {
      return NextResponse.json(
        { error: 'workspace_id, db_credential_id, and new_data are required' },
        { status: 400 }
      );
    }

    // Basic sanity check on new_data values to prevent injection
    for (const [k, v] of Object.entries(new_data)) {
      if (typeof k !== 'string' || typeof v !== 'string') {
        return NextResponse.json({ error: 'new_data must be a flat string→string map' }, { status: 400 });
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const credMasterKey = process.env.CREDENTIAL_MASTER_KEY;
    const internalKey   = process.env.INTERNAL_ENCRYPTION_KEY;

    if (!credMasterKey || !internalKey) {
      return NextResponse.json({ error: 'Encryption keys not configured' }, { status: 500 });
    }

    // ── Step 1: Fetch the credential row ────────────────────────────────────
    const { data: cred, error: fetchErr } = await supabaseAdmin
      .schema('genesis' as any)
      .from('workspace_credentials')
      .select('id, credential_type, credential_name, n8n_credential_id')
      .eq('id', db_credential_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (fetchErr || !cred) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // ── Step 2: Re-encrypt for DB storage ───────────────────────────────────
    const dbEncrypted  = encryptCredential(new_data, workspace_id, credMasterKey);
    const fingerprint  = crypto
      .createHash('sha256')
      .update(JSON.stringify(new_data))
      .digest('hex')
      .slice(0, 16);

    const { error: updateErr } = await supabaseAdmin
      .schema('genesis' as any)
      .from('workspace_credentials')
      .update({
        encrypted_data:   dbEncrypted,
        data_fingerprint: fingerprint,
        status:           'pending',
        updated_at:       new Date().toISOString(),
      })
      .eq('id', db_credential_id)
      .eq('workspace_id', workspace_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // ── Step 3: If no n8n credential ID, we're done (will sync on re-provision)
    if (!cred.n8n_credential_id) {
      return NextResponse.json({
        success:         true,
        db_updated:      true,
        sidecar_updated: false,
        note: 'DB updated. Credential has no n8n ID — will be injected on next workspace provision.',
      });
    }

    // ── Step 4: Look up active sidecar ──────────────────────────────────────
    const { data: fleet } = await supabaseAdmin
      .schema('genesis' as any)
      .from('fleet_status')
      .select('ip_address, sslip_domain, droplet_id, status')
      .eq('workspace_id', workspace_id)
      .in('status', ['ACTIVE_HEALTHY', 'ACTIVE_DEGRADED'])
      .single();

    if (!fleet) {
      return NextResponse.json({
        success:         true,
        db_updated:      true,
        sidecar_updated: false,
        note: 'DB updated. No active sidecar found — change will apply on next provision.',
      });
    }

    const sidecarHost = (fleet.sslip_domain || fleet.ip_address) as string;

    if (!sidecarHost || isPrivateHost(sidecarHost)) {
      return NextResponse.json({ error: 'Sidecar host resolves to a private or missing IP' }, { status: 400 });
    }

    // ── Step 5: Encrypt for transit and push to sidecar ─────────────────────
    const transitEncrypted = encryptCredential(new_data, workspace_id, internalKey);

    const client = new HttpSidecarClient({
      workspaceId: workspace_id,
      dropletId:   String(fleet.droplet_id),
    });

    const sidecarResult = await client.sendCommand(sidecarHost, {
      action:  'ROTATE_CREDENTIAL',
      payload: {
        credential_id:  cred.n8n_credential_id,
        encrypted_data: transitEncrypted,
      },
    });

    // ── Step 6: Update sync status ───────────────────────────────────────────
    if (sidecarResult.success) {
      await supabaseAdmin
        .schema('genesis' as any)
        .from('workspace_credentials')
        .update({ status: 'synced', last_synced_at: new Date().toISOString() })
        .eq('id', db_credential_id);
    }

    return NextResponse.json({
      success:         sidecarResult.success,
      db_updated:      true,
      sidecar_updated: sidecarResult.success,
      error:           sidecarResult.error,
    });
  } catch (err: any) {
    console.error('[Admin:RotateCredential]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
