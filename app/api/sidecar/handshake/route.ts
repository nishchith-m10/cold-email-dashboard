/**
 * POST /api/sidecar/handshake
 *
 * Called by a sidecar instance on startup (and periodically as a keep-alive)
 * to register or refresh its entry in the genesis.sidecar_registry table.
 *
 * Body shape:
 * {
 *   workspace_id: string;     // UUID of the workspace this sidecar serves
 *   sidecar_url: string;      // Base URL where the sidecar is reachable (e.g. http://1.2.3.4:3001)
 *   version?: string;         // Sidecar build version string
 *   capabilities?: string[];  // e.g. ["gmail", "smtp", "deploy"]
 * }
 *
 * Authentication: Bearer token in Authorization header must match
 * the SIDECAR_HANDSHAKE_SECRET env var (shared secret for server-to-server auth).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface HandshakeBody {
  workspace_id: string;
  sidecar_url: string;
  version?: string;
  capabilities?: string[];
}

interface HandshakeResponse {
  success: boolean;
  registered_at: string;
  workspace_id: string;
  message?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<HandshakeResponse>> {
  // ── Auth — shared secret ──────────────────────────────────────────────
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

  // ── Parse body ────────────────────────────────────────────────────────
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
      {
        success: false,
        registered_at: new Date().toISOString(),
        workspace_id: workspace_id ?? '',
        error: 'workspace_id and sidecar_url are required',
      },
      { status: 400 }
    );
  }

  // ── Validate workspace exists ─────────────────────────────────────────
  const { data: workspace, error: wsErr } = await supabaseAdmin!
    .from('workspaces')
    .select('id')
    .eq('id', workspace_id)
    .maybeSingle();

  if (wsErr || !workspace) {
    return NextResponse.json(
      {
        success: false,
        registered_at: new Date().toISOString(),
        workspace_id,
        error: 'workspace_id not found',
      },
      { status: 404 }
    );
  }

  // ── Upsert into sidecar_registry ──────────────────────────────────────
  const now = new Date().toISOString();

  const { error: upsertErr } = await supabaseAdmin!
    .from('genesis.sidecar_registry')
    .upsert(
      {
        workspace_id,
        sidecar_url,
        version: version ?? null,
        capabilities: capabilities ?? [],
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: 'workspace_id' }
    );

  if (upsertErr) {
    console.error('[sidecar/handshake] DB upsert failed:', upsertErr.message);
    return NextResponse.json(
      {
        success: false,
        registered_at: now,
        workspace_id,
        error: 'Failed to register sidecar: ' + upsertErr.message,
      },
      { status: 500 }
    );
  }

  console.log(`[sidecar/handshake] ✅ Registered sidecar for workspace ${workspace_id} @ ${sidecar_url}`);

  return NextResponse.json({
    success: true,
    registered_at: now,
    workspace_id,
    message: `Sidecar registered for workspace ${workspace_id}`,
  });
}
