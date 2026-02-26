/**
 * GET /api/sidecar/heartbeat
 *
 * Proxy endpoint that checks (and caches) the health of a sidecar
 * instance registered to the requesting workspace.
 *
 * The sidecar agent POSTs its URL + workspace_id to /api/sidecar/handshake.
 * The dashboard then pings the sidecar's own /health endpoint here and
 * returns the aggregated status to the frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';
import { cacheManager } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const HEARTBEAT_CACHE_TTL_MS = 15_000; // 15 s — sidecar pings every 10 s

interface SidecarHeartbeatResponse {
  status: 'online' | 'offline' | 'unknown';
  workspace_id: string;
  sidecar_url: string | null;
  sidecar_version?: string;
  last_seen?: string;
  latency_ms?: number;
  error?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Auth ──────────────────────────────────────────────────────────────
  // validateWorkspaceAccess returns null on success, NextResponse on error
  const guardError = await validateWorkspaceAccess(req, searchParams);
  if (guardError) return guardError;

  const workspaceId = searchParams.get('workspace_id');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
  }

  // ── Cache ─────────────────────────────────────────────────────────────
  const cacheKey = `sidecar:heartbeat:${workspaceId}`;
  const cached = cacheManager.get<SidecarHeartbeatResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=15' },
    });
  }

  // ── Look up registered sidecar ────────────────────────────────────────
  const { data: sidecarRecord, error: dbErr } = await supabaseAdmin!
    .from('genesis.sidecar_registry')
    .select('sidecar_url, version, last_seen_at')
    .eq('workspace_id', workspaceId)
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbErr) {
    // Table may not exist yet — return unknown rather than 500
    const response: SidecarHeartbeatResponse = {
      status: 'unknown',
      workspace_id: workspaceId,
      sidecar_url: null,
      error: 'Sidecar registry not available',
    };
    return NextResponse.json(response, { status: 200 });
  }

  if (!sidecarRecord) {
    const response: SidecarHeartbeatResponse = {
      status: 'unknown',
      workspace_id: workspaceId,
      sidecar_url: null,
    };
    return NextResponse.json(response, { status: 200 });
  }

  // ── Ping the sidecar's /health endpoint ───────────────────────────────
  const sidecarUrl: string = sidecarRecord.sidecar_url;
  const pingStart = Date.now();
  let status: SidecarHeartbeatResponse['status'] = 'offline';
  let latency_ms: number | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const pingRes = await fetch(`${sidecarUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    latency_ms = Date.now() - pingStart;
    status = pingRes.ok ? 'online' : 'offline';
  } catch {
    latency_ms = Date.now() - pingStart;
    status = 'offline';
  }

  const response: SidecarHeartbeatResponse = {
    status,
    workspace_id: workspaceId,
    sidecar_url: sidecarUrl,
    sidecar_version: sidecarRecord.version,
    last_seen: sidecarRecord.last_seen_at,
    latency_ms,
  };

  cacheManager.set(cacheKey, response, HEARTBEAT_CACHE_TTL_MS);

  return NextResponse.json(response, {
    headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=15' },
  });
}
