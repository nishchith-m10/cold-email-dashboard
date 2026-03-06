/**
 * GENESIS: Per-Workspace Credential Health Runner
 *
 * Decrypts each workspace credential and tests it against the real API.
 * Results are cached in genesis.workspace_health for the admin UI.
 *
 * Supported types:
 *   openai_api     → GET /v1/models with Bearer key
 *   anthropic_api  → GET /v1/models with x-api-key header
 *   smtp           → TCP connect to host:port
 *   n8n_sidecar    → GET https://{sslip_domain}/healthz
 *   others         → marked 'unchecked' (OAuth, http_auth — no generic test)
 */

import * as net from 'net';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptCredential } from '@/lib/genesis/credential-vault';

// ============================================
// TYPES
// ============================================

export interface WorkspaceCredentialHealth {
  credential_id: string | null;
  credential_type: string;
  service_name: string;
  status: 'ok' | 'degraded' | 'error' | 'unchecked';
  error_message?: string;
  latency_ms?: number;
  checked_at: string;
}

export interface WorkspaceHealthReport {
  workspace_id: string;
  overall_status: 'ok' | 'degraded' | 'error';
  credentials: WorkspaceCredentialHealth[];
  checked_at: string;
}

// ============================================
// INDIVIDUAL CHECKS
// ============================================

async function checkOpenAI(apiKey: string): Promise<Omit<WorkspaceCredentialHealth, 'credential_id' | 'credential_type' | 'service_name' | 'checked_at'>> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const latency_ms = Date.now() - start;
    if (r.status === 401) return { status: 'error', error_message: 'Invalid API key — key rejected by OpenAI', latency_ms };
    if (r.status === 429) return { status: 'degraded', error_message: 'Rate limit hit', latency_ms };
    if (!r.ok) return { status: 'error', error_message: `HTTP ${r.status}`, latency_ms };
    return { status: 'ok', latency_ms };
  } catch (e) {
    return { status: 'error', error_message: e instanceof Error ? e.message : 'Unknown error', latency_ms: Date.now() - start };
  }
}

async function checkAnthropic(apiKey: string): Promise<Omit<WorkspaceCredentialHealth, 'credential_id' | 'credential_type' | 'service_name' | 'checked_at'>> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const latency_ms = Date.now() - start;
    if (r.status === 401) return { status: 'error', error_message: 'Invalid API key — key rejected by Anthropic', latency_ms };
    if (!r.ok) return { status: 'error', error_message: `HTTP ${r.status}`, latency_ms };
    return { status: 'ok', latency_ms };
  } catch (e) {
    return { status: 'error', error_message: e instanceof Error ? e.message : 'Unknown error', latency_ms: Date.now() - start };
  }
}

function checkSMTP(host: string, port: number): Promise<Omit<WorkspaceCredentialHealth, 'credential_id' | 'credential_type' | 'service_name' | 'checked_at'>> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port, timeout: 8000 });
    socket.on('connect', () => {
      const latency_ms = Date.now() - start;
      socket.destroy();
      resolve({ status: 'ok', latency_ms });
    });
    socket.on('error', (err) => {
      resolve({ status: 'error', error_message: `SMTP TCP error: ${err.message}`, latency_ms: Date.now() - start });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ status: 'error', error_message: 'SMTP connection timed out', latency_ms: Date.now() - start });
    });
  });
}

async function checkN8N(domain: string): Promise<Omit<WorkspaceCredentialHealth, 'credential_id' | 'credential_type' | 'service_name' | 'checked_at'>> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    // n8n exposes /healthz as a health endpoint
    const r = await fetch(`https://${domain}/healthz`, { signal: ctrl.signal });
    clearTimeout(t);
    const latency_ms = Date.now() - start;
    if (r.ok) return { status: 'ok', latency_ms };
    return { status: 'error', error_message: `n8n /healthz returned HTTP ${r.status}`, latency_ms };
  } catch (e) {
    return { status: 'error', error_message: e instanceof Error ? e.message : 'Unknown', latency_ms: Date.now() - start };
  }
}

// ============================================
// MAIN RUNNER
// ============================================

export async function runWorkspaceHealthCheck(workspaceId: string): Promise<WorkspaceHealthReport> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not available');

  const masterKey = process.env.CREDENTIAL_MASTER_KEY;
  if (!masterKey) throw new Error('CREDENTIAL_MASTER_KEY not configured');

  const checkedAt = new Date().toISOString();
  const results: WorkspaceCredentialHealth[] = [];

  // ── Fetch all non-revoked credentials ──────────────────────────────────────
  const { data: creds, error: credsError } = await (supabaseAdmin as any)
    .schema('genesis')
    .from('workspace_credentials')
    .select('id, credential_type, credential_name, encrypted_data')
    .eq('workspace_id', workspaceId)
    .neq('status', 'revoked');

  if (credsError) throw new Error(`Failed to fetch credentials: ${credsError.message}`);

  for (const cred of (creds ?? [])) {
    let decrypted: Record<string, unknown>;
    try {
      decrypted = decryptCredential(cred.encrypted_data, workspaceId, masterKey);
    } catch {
      results.push({
        credential_id: cred.id,
        credential_type: cred.credential_type,
        service_name: cred.credential_name,
        status: 'error',
        error_message: 'Decryption failed — master key mismatch or data corruption',
        checked_at: checkedAt,
      });
      continue;
    }

    let result: Omit<WorkspaceCredentialHealth, 'credential_id' | 'credential_type' | 'service_name' | 'checked_at'>;

    switch (cred.credential_type) {
      case 'openai_api':
        result = await checkOpenAI(decrypted.apiKey as string);
        break;
      case 'anthropic_api':
        result = await checkAnthropic(decrypted.apiKey as string);
        break;
      case 'smtp':
        result = await checkSMTP(decrypted.host as string, Number(decrypted.port) || 587);
        break;
      default:
        // google_oauth2, google_sheets, http_header_auth, http_query_auth, postgres, supabase
        result = { status: 'unchecked' };
        break;
    }

    results.push({
      credential_id: cred.id,
      credential_type: cred.credential_type,
      service_name: cred.credential_name,
      checked_at: checkedAt,
      ...result,
    });
  }

  // ── Check n8n instance via fleet_status ────────────────────────────────────
  const { data: fleet } = await (supabaseAdmin as any)
    .schema('genesis')
    .from('fleet_status')
    .select('sslip_domain, ip_address, status')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (fleet) {
    const host = fleet.sslip_domain || fleet.ip_address;
    let n8nResult: Omit<WorkspaceCredentialHealth, 'credential_id' | 'credential_type' | 'service_name' | 'checked_at'>;
    if (host) {
      n8nResult = await checkN8N(host);
    } else {
      n8nResult = { status: 'error', error_message: 'No domain or IP in fleet_status' };
    }
    results.push({
      credential_id: null,
      credential_type: 'n8n_sidecar',
      service_name: 'n8n Instance',
      checked_at: checkedAt,
      ...n8nResult,
    });
  }

  // ── Persist results (replace mode — delete + insert) ──────────────────────
  await (supabaseAdmin as any)
    .schema('genesis')
    .from('workspace_health')
    .delete()
    .eq('workspace_id', workspaceId);

  if (results.length > 0) {
    await (supabaseAdmin as any)
      .schema('genesis')
      .from('workspace_health')
      .insert(results.map((r) => ({
        workspace_id: workspaceId,
        credential_id: r.credential_id ?? null,
        credential_type: r.credential_type,
        service_name: r.service_name,
        status: r.status,
        error_message: r.error_message ?? null,
        latency_ms: r.latency_ms ?? null,
        checked_at: r.checked_at,
      })));
  }

  // ── Derive overall status ──────────────────────────────────────────────────
  const testable = results.filter((r) => r.status !== 'unchecked');
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
  if (testable.some((r) => r.status === 'error')) overallStatus = 'error';
  else if (testable.some((r) => r.status === 'degraded')) overallStatus = 'degraded';

  return {
    workspace_id: workspaceId,
    overall_status: overallStatus,
    credentials: results,
    checked_at: checkedAt,
  };
}

// ============================================
// FETCH LAST RESULTS (no recheck)
// ============================================

export async function getWorkspaceHealth(workspaceId: string): Promise<WorkspaceHealthReport | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await (supabaseAdmin as any)
    .schema('genesis')
    .from('workspace_health')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('checked_at', { ascending: false });

  if (error || !data || data.length === 0) return null;

  const credentials: WorkspaceCredentialHealth[] = data.map((r: any) => ({
    credential_id: r.credential_id,
    credential_type: r.credential_type,
    service_name: r.service_name,
    status: r.status,
    error_message: r.error_message,
    latency_ms: r.latency_ms,
    checked_at: r.checked_at,
  }));

  const testable = credentials.filter((r) => r.status !== 'unchecked');
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
  if (testable.some((r) => r.status === 'error')) overallStatus = 'error';
  else if (testable.some((r) => r.status === 'degraded')) overallStatus = 'degraded';

  return {
    workspace_id: workspaceId,
    overall_status: overallStatus,
    credentials,
    checked_at: data[0].checked_at,
  };
}
