/**
 * WORKSPACE MANIFEST — Flaw-3 fix from the Ralph Loop evaluation
 *
 * Problem this solves:
 *   `IgnitionOrchestrator` was building its variable map with dozens of `|| ''`
 *   fallbacks.  That means n8n could be deployed with a blank sender email,
 *   empty Calendly link, or silently missing credentials — the pipeline would
 *   complete but produce broken workflows.
 *
 * Solution:
 *   Before ignition is allowed to start, `buildManifestFromOnboarding()` reads
 *   ALL staged onboarding data from the database, assembles a `WorkspaceManifest`,
 *   and passes it through `validateManifest()`.  Validation throws a typed
 *   `ManifestValidationError` listing every missing field — ignition never starts
 *   with a partial configuration.
 *
 * The manifest is then persisted to `genesis.workspace_manifests` and its ID is
 * threaded into `IgnitionConfig.manifest_id`.  The orchestrator derives its
 * variable map entirely from the manifest, eliminating the `|| ''` escapes.
 *
 * Credential modes:
 *   'global'  — operator's API keys (genesis.operator_credentials).  The user
 *               never enters OpenAI/Anthropic/etc. — the operator pays.
 *   'byok'    — user supplied their own keys through the onboarding wizard.
 *               Stored per-workspace in genesis.workspace_credentials.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Phase 41, Flaw 3
 */

// ============================================
// MANIFEST TYPES
// ============================================

export type ManifestEmailProvider = 'gmail' | 'smtp';
export type ManifestCredentialMode = 'global' | 'byok';

/**
 * Gmail credential snapshot (resolved from genesis.workspace_credentials)
 */
export interface ManifestGmailCredential {
  credential_id: string;   // genesis.workspace_credentials PK
  sender_email: string;    // the Gmail address (required, non-empty)
}

/**
 * SMTP credential snapshot
 */
export interface ManifestSmtpCredential {
  credential_id: string;   // genesis.workspace_credentials PK
  sender_email: string;    // SMTP From: address (required, non-empty)
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
}

/**
 * Byok (Bring-Your-Own-Key) credential IDs.
 * Only present when credential_mode = 'byok'.
 */
export interface ManifestByokCredentials {
  openai_credential_id: string;
  anthropic_credential_id: string;
  google_cse_credential_id: string;
  relevance_credential_id: string;
  apify_credential_id: string;
}

/**
 * The WorkspaceManifest is a fully-validated, point-in-time snapshot of
 * everything the orchestrator needs to provision a workspace.  Every required
 * field is non-optional — there are no `|| ''` escapes.
 */
export interface WorkspaceManifest {
  // Manifest identity
  manifest_id: string;        // UUID (generated at build time)
  manifest_version: number;   // Increment on schema changes (current: 1)
  workspace_id: string;
  workspace_slug: string;
  workspace_name: string;     // Raw workspace name (display name)
  company_name: string;       // Brand name for email copy

  // Infrastructure
  region: string;             // DO region slug, e.g. 'nyc3'
  droplet_size: 'starter' | 'professional' | 'scale' | 'enterprise';

  // Email
  email_provider: ManifestEmailProvider;
  gmail?: ManifestGmailCredential;        // present iff email_provider = 'gmail'
  smtp?: ManifestSmtpCredential;          // present iff email_provider = 'smtp'

  // Scheduling link (inserted as YOUR_CALENDLY_LINK_1)
  calendly_url: string;

  // API key sourcing strategy
  credential_mode: ManifestCredentialMode;
  byok?: ManifestByokCredentials;         // present iff credential_mode = 'byok'

  // Per-workspace webhook auth token (prevents forged inbound webhooks)
  webhook_token: string;

  // Timestamps
  built_at: string;           // ISO — when buildManifestFromOnboarding() ran
  locked_at: string | null;   // ISO — when persist()ed (null = draft)
}

// ============================================
// VALIDATION
// ============================================

export interface ManifestFieldError {
  field: string;
  message: string;
}

export class ManifestValidationError extends Error {
  public readonly fieldErrors: ManifestFieldError[];

  constructor(fieldErrors: ManifestFieldError[]) {
    const summary = fieldErrors.map(e => `${e.field}: ${e.message}`).join('; ');
    super(`WorkspaceManifest validation failed — ${fieldErrors.length} error(s): ${summary}`);
    this.name = 'ManifestValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Validate a WorkspaceManifest exhaustively.
 *
 * Throws `ManifestValidationError` (never returns false).
 * Call this before calling `IgnitionOrchestrator.ignite()`.
 */
export function validateManifest(m: WorkspaceManifest): void {
  const errors: ManifestFieldError[] = [];

  const require = (field: string, value: unknown, extra?: string) => {
    if (value === undefined || value === null || value === '') {
      errors.push({ field, message: extra ?? 'required, must not be empty' });
    }
  };

  const requireString = (field: string, value: unknown, minLen = 1) => {
    if (typeof value !== 'string' || value.trim().length < minLen) {
      errors.push({ field, message: `required string (min ${minLen} chars)` });
    }
  };

  // Core identity
  requireString('manifest_id', m.manifest_id, 36);      // UUID length
  requireString('workspace_id', m.workspace_id, 36);
  requireString('workspace_slug', m.workspace_slug, 1);
  requireString('workspace_name', m.workspace_name, 1);
  requireString('company_name', m.company_name, 1);

  // Infrastructure
  requireString('region', m.region, 2);
  if (!['starter', 'professional', 'scale', 'enterprise'].includes(m.droplet_size)) {
    errors.push({ field: 'droplet_size', message: 'must be starter | professional | scale | enterprise' });
  }

  // Email
  if (m.email_provider === 'gmail') {
    if (!m.gmail) {
      errors.push({ field: 'gmail', message: 'gmail credential block is required when email_provider = gmail' });
    } else {
      requireString('gmail.credential_id', m.gmail.credential_id);
      requireString('gmail.sender_email', m.gmail.sender_email);
      if (m.gmail.sender_email && !m.gmail.sender_email.includes('@')) {
        errors.push({ field: 'gmail.sender_email', message: 'must be a valid email address' });
      }
    }
  } else if (m.email_provider === 'smtp') {
    if (!m.smtp) {
      errors.push({ field: 'smtp', message: 'smtp credential block is required when email_provider = smtp' });
    } else {
      requireString('smtp.credential_id', m.smtp.credential_id);
      requireString('smtp.sender_email', m.smtp.sender_email);
      requireString('smtp.smtp_host', m.smtp.smtp_host);
      requireString('smtp.smtp_user', m.smtp.smtp_user);
      if (!m.smtp.sender_email.includes('@')) {
        errors.push({ field: 'smtp.sender_email', message: 'must be a valid email address' });
      }
      if (m.smtp.smtp_port <= 0 || m.smtp.smtp_port > 65535) {
        errors.push({ field: 'smtp.smtp_port', message: 'must be a valid port (1-65535)' });
      }
    }
  } else {
    errors.push({ field: 'email_provider', message: 'must be gmail or smtp' });
  }

  // Calendly
  requireString('calendly_url', m.calendly_url);
  if (m.calendly_url && !/^https?:\/\//.test(m.calendly_url)) {
    errors.push({ field: 'calendly_url', message: 'must be a full URL starting with http(s)://' });
  }

  // Credential mode
  if (m.credential_mode === 'byok') {
    if (!m.byok) {
      errors.push({ field: 'byok', message: 'byok block is required when credential_mode = byok' });
    } else {
      requireString('byok.openai_credential_id', m.byok.openai_credential_id);
      requireString('byok.anthropic_credential_id', m.byok.anthropic_credential_id);
      requireString('byok.google_cse_credential_id', m.byok.google_cse_credential_id);
      requireString('byok.relevance_credential_id', m.byok.relevance_credential_id);
      requireString('byok.apify_credential_id', m.byok.apify_credential_id);
    }
  } else if (m.credential_mode !== 'global') {
    errors.push({ field: 'credential_mode', message: 'must be global or byok' });
  }

  // Webhook token
  requireString('webhook_token', m.webhook_token, 16);

  if (errors.length > 0) {
    throw new ManifestValidationError(errors);
  }
}

// ============================================
// BUILD FROM ONBOARDING DATA
// ============================================

/**
 * Assemble a WorkspaceManifest by reading all staged onboarding data from
 * the database.  Calls `validateManifest()` before returning — throws
 * `ManifestValidationError` if anything is missing.
 *
 * @param supabaseAdmin  Service-role Supabase client (bypasses RLS)
 * @param workspaceId    The workspace being provisioned
 * @param credMode       'global' (operator keys) or 'byok' (user-supplied keys)
 */
export async function buildManifestFromOnboarding(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  workspaceId: string,
  credMode: ManifestCredentialMode = 'global',
): Promise<WorkspaceManifest> {
  const errors: ManifestFieldError[] = [];

  // ── 1. Core workspace identity ──────────────────────────────────────
  const { data: wsRow, error: wsErr } = await supabaseAdmin
    .from('workspaces')
    .select('id, slug, name')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsErr || !wsRow) {
    throw new Error(`Cannot build manifest: workspace ${workspaceId} not found — ${wsErr?.message ?? 'no row'}`);
  }

  // ── 2. Brand info ────────────────────────────────────────────────────
  const { data: brandRow } = await supabaseAdmin
    .schema('genesis')
    .from('brand_vault')
    .select('company_name, website')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const companyName: string = brandRow?.company_name || wsRow.name || '';
  if (!companyName) {
    errors.push({ field: 'company_name', message: 'Not found in brand_vault or workspaces — complete the Brand Info stage' });
  }

  // ── 3. Infrastructure (region / size) ────────────────────────────────
  const { data: infraRow } = await supabaseAdmin
    .schema('genesis')
    .from('workspace_infrastructure')
    .select('region, size, do_region_slug')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  // do_region_slug is the canonical DO slug (e.g. 'nyc3'), region is our enum code
  const regionSlug: string = infraRow?.do_region_slug || infraRow?.region || '';
  const dropletSize: string = infraRow?.size || '';

  if (!regionSlug) errors.push({ field: 'region', message: 'Not found — complete the Region Selection stage' });
  if (!dropletSize) errors.push({ field: 'droplet_size', message: 'Not found — complete the Region Selection stage' });

  // ── 4. Email provider & credentials ──────────────────────────────────
  const { data: emailProviderRow } = await supabaseAdmin
    .schema('genesis')
    .from('onboarding_progress')
    .select('email_provider_choice, smtp_host, smtp_port, smtp_user, smtp_from_email')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const emailProvider: ManifestEmailProvider =
    emailProviderRow?.email_provider_choice === 'smtp' ? 'smtp' : 'gmail';

  let gmailBlock: ManifestGmailCredential | undefined;
  let smtpBlock: ManifestSmtpCredential | undefined;

  if (emailProvider === 'gmail') {
    const { data: gmailCred } = await supabaseAdmin
      .schema('genesis')
      .from('workspace_credentials')
      .select('id, metadata')
      .eq('workspace_id', workspaceId)
      .eq('credential_type', 'gmail_oauth')
      .eq('status', 'valid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!gmailCred) {
      errors.push({ field: 'gmail', message: 'No valid Gmail OAuth credential found — complete the Gmail Connection stage' });
    } else {
      const senderEmail: string = gmailCred.metadata?.email || gmailCred.metadata?.sender_email || '';
      if (!senderEmail) {
        errors.push({ field: 'gmail.sender_email', message: 'Gmail credential found but sender email is missing from metadata' });
      }
      gmailBlock = { credential_id: gmailCred.id, sender_email: senderEmail };
    }
  } else {
    const { data: smtpCred } = await supabaseAdmin
      .schema('genesis')
      .from('workspace_credentials')
      .select('id, metadata')
      .eq('workspace_id', workspaceId)
      .eq('credential_type', 'smtp')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const smtpHost: string = emailProviderRow?.smtp_host || smtpCred?.metadata?.host || '';
    const smtpPort: number = parseInt(emailProviderRow?.smtp_port || smtpCred?.metadata?.port || '587', 10);
    const smtpUser: string = emailProviderRow?.smtp_user || smtpCred?.metadata?.user || '';
    const smtpFrom: string = emailProviderRow?.smtp_from_email || smtpCred?.metadata?.from_email || '';

    if (!smtpCred) errors.push({ field: 'smtp', message: 'No SMTP credential found — complete the SMTP Configuration stage' });
    if (!smtpHost) errors.push({ field: 'smtp.smtp_host', message: 'SMTP host is missing' });
    if (!smtpUser) errors.push({ field: 'smtp.smtp_user', message: 'SMTP username is missing' });
    if (!smtpFrom) errors.push({ field: 'smtp.sender_email', message: 'SMTP From address is missing' });

    if (smtpCred) {
      smtpBlock = {
        credential_id: smtpCred.id,
        sender_email: smtpFrom,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
      };
    }
  }

  // ── 5. Calendly URL ───────────────────────────────────────────────────
  const { data: calendlyCred } = await supabaseAdmin
    .schema('genesis')
    .from('workspace_credentials')
    .select('booking_url')
    .eq('workspace_id', workspaceId)
    .eq('credential_type', 'calendly_url')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const calendlyUrl: string = calendlyCred?.booking_url || '';
  if (!calendlyUrl) {
    errors.push({ field: 'calendly_url', message: 'Not found — complete the Calendly URL stage' });
  }

  // ── 6. BYOK credentials (only if credMode = 'byok') ──────────────────
  let byokBlock: ManifestByokCredentials | undefined;

  if (credMode === 'byok') {
    const credTypes = [
      { key: 'openai_credential_id',       type: 'openai_api_key' },
      { key: 'anthropic_credential_id',    type: 'anthropic_api_key' },
      { key: 'google_cse_credential_id',   type: 'google_cse_api_key' },
      { key: 'relevance_credential_id',    type: 'relevance_config' },
      { key: 'apify_credential_id',        type: 'apify_api_token' },
    ];

    const byokIds: Record<string, string> = {};

    for (const { key, type } of credTypes) {
      const { data: row } = await supabaseAdmin
        .schema('genesis')
        .from('workspace_credentials')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('credential_type', type)
        .in('status', ['valid', 'pending_validation'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!row) {
        errors.push({ field: `byok.${key}`, message: `No ${type} credential found — complete the corresponding onboarding stage` });
      } else {
        byokIds[key] = row.id;
      }
    }

    if (Object.keys(byokIds).length === credTypes.length) {
      byokBlock = byokIds as unknown as ManifestByokCredentials;
    }
  }

  // ── 7. Webhook token ─────────────────────────────────────────────────
  const { data: workspaceSecrets } = await supabaseAdmin
    .from('workspaces')
    .select('webhook_token')
    .eq('id', workspaceId)
    .maybeSingle();

  const webhookToken: string =
    workspaceSecrets?.webhook_token || process.env.DASH_WEBHOOK_TOKEN || '';

  if (!webhookToken) {
    errors.push({ field: 'webhook_token', message: 'No webhook_token on workspace row and DASH_WEBHOOK_TOKEN is not set' });
  }

  // ── 8. Abort early if any DB lookups failed ───────────────────────────
  if (errors.length > 0) {
    throw new ManifestValidationError(errors);
  }

  // ── 9. Assemble + validate ────────────────────────────────────────────
  const crypto = await import('crypto');

  const manifest: WorkspaceManifest = {
    manifest_id: crypto.randomUUID(),
    manifest_version: 1,
    workspace_id: workspaceId,
    workspace_slug: wsRow.slug,
    workspace_name: wsRow.name,
    company_name: companyName,
    region: regionSlug,
    droplet_size: dropletSize as WorkspaceManifest['droplet_size'],
    email_provider: emailProvider,
    gmail: gmailBlock,
    smtp: smtpBlock,
    calendly_url: calendlyUrl,
    credential_mode: credMode,
    byok: byokBlock,
    webhook_token: webhookToken,
    built_at: new Date().toISOString(),
    locked_at: null,
  };

  // Final cross-field validation (catches any field-level issues)
  validateManifest(manifest);

  return manifest;
}

// ============================================
// PERSISTENCE
// ============================================

/**
 * Persist a validated manifest to `genesis.workspace_manifests`.
 * Sets `locked_at` to now — the manifest is immutable after this point.
 *
 * Returns the updated manifest (with locked_at populated).
 */
export async function persistManifest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  manifest: WorkspaceManifest,
): Promise<WorkspaceManifest> {
  const locked: WorkspaceManifest = { ...manifest, locked_at: new Date().toISOString() };

  const { error } = await supabaseAdmin
    .schema('genesis')
    .from('workspace_manifests')
    .upsert({
      manifest_id: locked.manifest_id,
      workspace_id: locked.workspace_id,
      manifest_version: locked.manifest_version,
      manifest: locked,
      locked_at: locked.locked_at,
      created_at: locked.built_at,
    }, { onConflict: 'workspace_id' });

  if (error) {
    throw new Error(`Failed to persist WorkspaceManifest: ${error.message}`);
  }

  return locked;
}

/**
 * Load a previously persisted manifest for a workspace.
 * Returns null if no manifest exists yet.
 */
export async function loadManifest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  workspaceId: string,
): Promise<WorkspaceManifest | null> {
  const { data, error } = await supabaseAdmin
    .schema('genesis')
    .from('workspace_manifests')
    .select('manifest')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error || !data) return null;
  return data.manifest as WorkspaceManifest;
}

// ============================================
// MANIFEST → IGNITION CONFIG ADAPTER
// ============================================

/**
 * Derive the sender email from a manifest (works for both gmail and smtp).
 */
export function getSenderEmail(manifest: WorkspaceManifest): string {
  if (manifest.email_provider === 'gmail') {
    return manifest.gmail!.sender_email;
  }
  return manifest.smtp!.sender_email;
}
