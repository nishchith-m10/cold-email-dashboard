/**
 * POST /api/sidecar/cloud-init-complete
 *
 * Called by the Cloud-Init user-data script at the END of droplet
 * initialization, once Docker containers are up and the Sidecar is running.
 *
 * Authenticated by the per-workspace PROVISIONING_TOKEN that was injected
 * into the droplet at creation time (never a static global secret).
 *
 * What it does:
 *   1. Validates the X-Provisioning-Token header against fleet_status
 *   2. Updates fleet_status.status → 'ACTIVE_HEALTHY'
 *   3. Records the droplet IP (useful when DHCP changes between reboots)
 *   4. Logs to droplet_lifecycle_log
 *
 * The ignition orchestrator's handshake step polls the Sidecar /health
 * endpoint separately — this webhook is a supplemental signal for dashboard
 * health checks and the admin Fleet tab.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface CloudInitPayload {
  workspace_id: string;
  workspace_slug: string;
  droplet_ip: string;
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const provisioningToken = req.headers.get('x-provisioning-token');
  if (!provisioningToken) {
    return NextResponse.json({ error: 'Missing X-Provisioning-Token header' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: CloudInitPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspace_id, workspace_slug, droplet_ip } = body;

  if (!workspace_id || !droplet_ip) {
    return NextResponse.json(
      { error: 'workspace_id and droplet_ip are required' },
      { status: 400 }
    );
  }

  if (!supabaseAdmin) {
    // In dev, log and return 200 so the curl doesn't fail the cloud-init script
    console.log(
      `[cloud-init-complete] supabaseAdmin not available (dev mode). ` +
      `workspace_id=${workspace_id} droplet_ip=${droplet_ip}`
    );
    return NextResponse.json({ ok: true, dev: true });
  }

  // ── Validate provisioning token ───────────────────────────────────────────
  const { data: fleetRow, error: lookupErr } = await supabaseAdmin
    .schema('genesis')
    .from('fleet_status')
    .select('droplet_id, workspace_id, status')
    .eq('workspace_id', workspace_id)
    .eq('provisioning_token', provisioningToken)
    .maybeSingle();

  if (lookupErr || !fleetRow) {
    console.warn(
      `[cloud-init-complete] Invalid provisioning token for workspace=${workspace_id}`,
      lookupErr?.message
    );
    return NextResponse.json({ error: 'Invalid or expired provisioning token' }, { status: 403 });
  }

  // ── Update fleet_status ───────────────────────────────────────────────────
  const now = new Date().toISOString();

  const { error: updateErr } = await supabaseAdmin
    .schema('genesis')
    .from('fleet_status')
    .update({
      status: 'ACTIVE_HEALTHY',
      ip_address: droplet_ip,
      cloud_init_completed_at: now,
      updated_at: now,
    })
    .eq('workspace_id', workspace_id)
    .eq('provisioning_token', provisioningToken);

  if (updateErr) {
    console.error('[cloud-init-complete] fleet_status update failed:', updateErr.message);
    // Return 200 anyway — don't fail the droplet boot over a DB write
    return NextResponse.json({ ok: true, warning: 'fleet_status update failed' });
  }

  // ── Lifecycle log ─────────────────────────────────────────────────────────
  await supabaseAdmin
    .schema('genesis')
    .from('droplet_lifecycle_log')
    .insert({
      droplet_id: fleetRow.droplet_id,
      workspace_id,
      from_state: fleetRow.status,
      to_state: 'ACTIVE_HEALTHY',
      transition_reason: 'cloud_init_complete',
      triggered_by: 'cloud-init',
      metadata: { droplet_ip, workspace_slug, reported_at: now },
    })
    .select()
    .maybeSingle(); // non-fatal if log insert fails

  console.log(
    `[cloud-init-complete] workspace=${workspace_id} slug=${workspace_slug} ` +
    `ip=${droplet_ip} → ACTIVE_HEALTHY`
  );

  return NextResponse.json({ ok: true, status: 'ACTIVE_HEALTHY' });
}
