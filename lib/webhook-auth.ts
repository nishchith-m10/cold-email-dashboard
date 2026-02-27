import { supabaseAdmin } from '@/lib/supabase';

/**
 * Resolve the workspace that owns a webhook token.
 *
 * Auth strategies (tried in order):
 * 1. **Per-workspace token** — look up `workspaces.webhook_token` → derive workspace_id
 *    server-side.  This is the secure path; workspace_id is never trusted from the payload.
 * 2. **Global admin token** — if token matches `DASH_WEBHOOK_TOKEN`, accept it.
 *    workspace_id MUST be provided in the payload. A deprecation warning is logged.
 *    Set `ALLOW_GLOBAL_WEBHOOK_TOKEN=false` to disable this path after migration.
 * 3. **Unconfigured** — if `DASH_WEBHOOK_TOKEN` is not set, allow all requests but
 *    require workspace_id in the payload (dev-only convenience).
 *
 * @param token        The `x-webhook-token` header value
 * @param payloadWsId  Workspace ID from the request body (fallback only)
 * @returns            `{ workspaceId }` on success, `{ error, status }` on failure
 */
export async function resolveWebhookAuth(
  token: string | null,
  payloadWsId?: string,
): Promise<{ workspaceId: string } | { error: string; status: number }> {
  if (!token) {
    return { error: 'Missing x-webhook-token header', status: 401 };
  }

  if (!supabaseAdmin) {
    return { error: 'Database not configured', status: 500 };
  }

  // ── Strategy 1: Per-workspace token ─────────────────────────────
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('webhook_token', token)
    .maybeSingle();

  if (workspace) {
    return { workspaceId: workspace.id };
  }

  // ── Strategy 2 / 3: Global token fallback ───────────────────────
  const expectedGlobalToken = process.env.DASH_WEBHOOK_TOKEN;

  // Dev-mode: no token configured at all → accept with payload workspace_id
  if (!expectedGlobalToken) {
    console.warn('[webhook-auth] DASH_WEBHOOK_TOKEN not configured — allowing all requests');
    if (!payloadWsId) {
      return { error: 'workspace_id is required when DASH_WEBHOOK_TOKEN is not configured', status: 400 };
    }
    return { workspaceId: payloadWsId };
  }

  // Check if global token path is explicitly disabled
  if (process.env.ALLOW_GLOBAL_WEBHOOK_TOKEN === 'false') {
    return { error: 'Unauthorized — invalid or unrecognized webhook token', status: 401 };
  }

  // Check global token match
  if (token === expectedGlobalToken) {
    if (!payloadWsId) {
      return { error: 'workspace_id is required when using global webhook token', status: 400 };
    }
    console.warn(
      `[webhook-auth] Global DASH_WEBHOOK_TOKEN used for workspace ${payloadWsId}. ` +
      `Migrate to per-workspace tokens. Set ALLOW_GLOBAL_WEBHOOK_TOKEN=false to block.`,
    );
    return { workspaceId: payloadWsId };
  }

  // No match at all
  return { error: 'Unauthorized — invalid or unrecognized webhook token', status: 401 };
}
