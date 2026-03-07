/**
 * POST /api/sidecar/handshake
 *
 * Called by a sidecar instance after bootstrapN8n() completes, and periodically
 * as a keep-alive, to register its entry in genesis.sidecar_registry.
 * Automatically triggers Phase 2 (credential injection + workflow deployment)
 * server-side so it runs even if the user has navigated away.
 *
 * Body shape:
 * {
 *   workspace_id: string;
 *   sidecar_url:  string;      // e.g. http://1.2.3.4:3100
 *   version?:     string;
 *   capabilities?: string[];
 * }
 *
 * Auth: Bearer token must match SIDECAR_HANDSHAKE_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface HandshakeBody {
  workspace_id:  string;
  sidecar_url:   string;
  version?:      string;
  capabilities?: string[];
}

interface HandshakeResponse {
  success:      boolean;
  registered_at: string;
  workspace_id: string;
  message?:     string;
  error?:       string;
}

export async function POST(req: NextRequest): Promise<NextResponse<HandshakeResponse>> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const secret = process.env.SIDECAR_HANDSHAKE_SECRET;

  if (!secret) {
    console.error('[sidecar/handshake] SIDECAR_HANDSHAKE_SECRET is not set');
    return NextResponse.json(
      { success: false, registered_at: new Date().toISOString(), workspace_id: '', error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  if (!token || token !== secret) {
    return NextResponse.json(
      { success: false, registered_at: new Date().toISOString(), workspace_id: '', error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: HandshakeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, registered_at: new Date().toISOString(), workspace_id: '', error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { workspace_id, sidecar_url, version, capabilities } = body;

  if (!workspace_id || !sidecar_url) {
    return NextResponse.json(
      { success: false, registered_at: new Date().toISOString(), workspace_id: workspace_id ?? '', error: 'workspace_id and sidecar_url are required' },
      { status: 400 }
    );
  }

  // ── Validate workspace ────────────────────────────────────────────────────
  const { data: workspace, error: wsErr } = await supabaseAdmin!
    .from('workspaces')
    .select('id')
    .eq('id', workspace_id)
    .maybeSingle();

  if (wsErr || !workspace) {
    return NextResponse.json(
      { success: false, registered_at: new Date().toISOString(), workspace_id, error: 'workspace_id not found' },
      { status: 404 }
    );
  }

  // ── Upsert sidecar_registry ───────────────────────────────────────────────
  const now = new Date().toISOString();
  const { error: upsertErr } = await (supabaseAdmin! as any)
    .schema('genesis')
    .from('sidecar_registry')
    .upsert(
      {
        workspace_id,
        sidecar_url,
        version:      version ?? null,
        capabilities: capabilities ?? [],
        last_seen_at: now,
        updated_at:   now,
      },
      { onConflict: 'workspace_id' }
    );

  if (upsertErr) {
    console.error('[sidecar/handshake] DB upsert failed:', upsertErr.message);
    return NextResponse.json(
      { success: false, registered_at: now, workspace_id, error: 'Failed to register sidecar: ' + upsertErr.message },
      { status: 500 }
    );
  }

  console.log(`[sidecar/handshake] ✅ Registered sidecar for workspace ${workspace_id} @ ${sidecar_url}`);

  // ── Auto-trigger Phase 2 if ignition is still waiting ────────────────────
  triggerPhase2IfPending(workspace_id).catch((err) =>
    console.error('[sidecar/handshake] Phase 2 auto-trigger failed:', err?.message ?? err)
  );

  return NextResponse.json({
    success:      true,
    registered_at: now,
    workspace_id,
    message:      `Sidecar registered for workspace ${workspace_id}`,
  });
}

// ── Server-side Phase 2 trigger ───────────────────────────────────────────────
async function triggerPhase2IfPending(workspace_id: string): Promise<void> {
  // Only fire Phase 2 if ignition is still waiting for the sidecar
  const { data: state } = await (supabaseAdmin! as any)
    .schema('genesis')
    .from('ignition_state')
    .select('status, requested_by')
    .eq('workspace_id', workspace_id)
    .maybeSingle() as { data: { status: string; requested_by: string } | null };

  if (!state) {
    console.log(`[sidecar/handshake] No ignition state found for workspace ${workspace_id} — skipping Phase 2 trigger`);
    return;
  }

  const triggerableStatuses = ['handshake_pending', 'credentials_injecting', 'workflows_deploying'];
  if (!triggerableStatuses.includes(state.status)) {
    console.log(`[sidecar/handshake] Workspace ${workspace_id} status is '${state.status}' — no Phase 2 needed`);
    return;
  }

  console.log(`[sidecar/handshake] Triggering Phase 2 for workspace ${workspace_id} (status: ${state.status})`);

  // Build the absolute URL for the server-to-server call
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    'http://localhost:3000';

  const userId = state.requested_by || '00000000-0000-0000-0000-000000000000';

  try {
    const res = await fetch(`${appUrl}/api/onboarding/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: workspace_id,
        userId,
        phase: 2,
      }),
    });
    const data = await res.json();
    console.log(`[sidecar/handshake] Phase 2 trigger response:`, data?.status ?? data);
  } catch (err) {
    console.error('[sidecar/handshake] Phase 2 fetch failed:', err instanceof Error ? err.message : err);
  }
}
