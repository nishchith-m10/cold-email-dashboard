/**
 * PHASE 41: IGNITION ORCHESTRATOR - TYPE DEFINITIONS
 * 
 * Types for the V35 Sovereign Stack provisioning orchestrator.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 41
 */

// ============================================
// IGNITION STATUS (State Machine)
// ============================================

/**
 * Ignition state machine states per Phase 41 specification.
 * 
 * Flow: pending → partition_creating → droplet_provisioning → handshake_pending 
 *       → credentials_injecting → workflows_deploying → activating → active
 * 
 * Failure: any state → rollback_in_progress → failed
 */
export type IgnitionStatus =
  | 'pending'
  | 'partition_creating'
  | 'droplet_provisioning'
  | 'handshake_pending'
  | 'credentials_injecting'
  | 'workflows_deploying'
  | 'activating'
  | 'active'
  | 'rollback_in_progress'
  | 'failed';

/**
 * Step timeouts per Phase 41 specification.
 */
export const STEP_TIMEOUTS: Record<string, number> = {
  partition_creating: 30000,      // 30 seconds
  droplet_provisioning: 120000,   // 2 minutes
  handshake_pending: 300000,      // 5 minutes
  credentials_injecting: 60000,   // 1 minute
  workflows_deploying: 120000,    // 2 minutes
  activating: 30000,              // 30 seconds
};

// ============================================
// CREDENTIAL TYPES
// ============================================

/**
 * Supported credential types.
 */
export type CredentialType =
  | 'google_oauth2'
  | 'openai_api'
  | 'smtp'
  | 'supabase'
  | 'postgres'
  | 'http_header_auth'
  | 'http_basic_auth';

/**
 * Credential configuration for ignition.
 */
export interface CredentialConfig {
  type: CredentialType;
  name: string;
  data: Record<string, string | number | boolean>;
  /**
   * The YOUR_CREDENTIAL_*_ID placeholder used in workflow templates for this
   * credential type. After n8n assigns a real UUID on creation, the orchestrator
   * replaces this placeholder in the deployed workflow JSON.
   *
   * Standard values:
   *   'YOUR_CREDENTIAL_GMAIL_ID'             — gmailOAuth2
   *   'YOUR_CREDENTIAL_POSTGRES_ID'          — postgres
   *   'YOUR_CREDENTIAL_GOOGLE_SHEETS_ID'     — googleSheetsOAuth2Api
   *   'YOUR_CREDENTIAL_OPENAI_ID'            — openAiApi
   *   'YOUR_CREDENTIAL_ANTHROPIC_ID'         — anthropicApi
   *   'YOUR_CREDENTIAL_GOOGLE_CSE_QUERY_ID'  — httpQueryAuth (Google CSE)
   *   'YOUR_CREDENTIAL_GOOGLE_CSE_HEADER_ID' — httpHeaderAuth (Google CSE)
   */
  template_placeholder?: string;
}

/**
 * Stored credential (from database).
 */
export interface StoredCredential {
  id: string;
  workspace_id: string;
  credential_type: CredentialType;
  credential_name: string;
  n8n_credential_id: string | null;
  template_credential_id: string | null;
  status: 'pending' | 'synced' | 'sync_failed' | 'revoked';
  last_synced_at: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// IGNITION CONFIGURATION
// ============================================

/**
 * Configuration for workspace ignition.
 */
export interface IgnitionConfig {
  workspace_id: string;
  workspace_slug: string;
  workspace_name: string;
  region: string;
  droplet_size: 'starter' | 'professional' | 'scale' | 'enterprise';
  requested_by: string;
  
  // Credentials to inject
  credentials: CredentialConfig[];
  
  // Variable overrides — merged into the template variable map at deploy time.
  //
  // REQUIRED keys (ignition will throw if missing):
  //   YOUR_SENDER_EMAIL       — Gmail/SMTP address for this workspace (e.g. 'hello@acme.com')
  //
  // OPTIONAL keys (have sensible defaults but should be supplied for production):
  //   YOUR_COMPANY_NAME       — Overrides workspace_name in email copy
  //   YOUR_TEST_EMAIL         — Sandbox test recipient email
  //   YOUR_UNSUBSCRIBE_REDIRECT_URL — Defaults to https://{dropletIp}.sslip.io/webhook/opt-out
  //   YOUR_N8N_INSTANCE_URL   — Defaults to https://{dropletIp}.sslip.io
  variables?: Record<string, string>;
  
  // Campaign group association — used to tag workflows and attribute costs
  // If not provided, defaults to workspace_id / workspace_name
  campaign_group_id?: string;
  campaign_group_name?: string;

  // Per-workspace webhook token (D4-001)
  // If provided, injected as YOUR_WEBHOOK_TOKEN into n8n workflows.
  // Falls back to process.env.DASH_WEBHOOK_TOKEN if not provided.
  webhook_token?: string;

  // Workflow selection
  workflow_templates?: string[];  // Defaults to all templates
  
  // Options
  skip_activation?: boolean;
  dry_run?: boolean;

  /**
   * LOCAL MODE — skips DigitalOcean droplet creation and uses a manually-provided
   * n8n instance instead. Useful for beta testing without spending DO API quota.
   *
   * Set `local_mode: true` in config OR set `LOCAL_MODE=true` in .env.local.
   * Provide `local_n8n_ip` (default: '127.0.0.1') to point at a local Docker n8n.
   */
  local_mode?: boolean;
  local_n8n_ip?: string;  // e.g. '127.0.0.1' for local Docker n8n
}

// ============================================
// IGNITION STATE
// ============================================

/**
 * Current state of an ignition operation.
 */
export interface IgnitionState {
  workspace_id: string;
  status: IgnitionStatus;
  current_step: number;
  total_steps: number;
  
  // Resources created
  partition_name?: string;
  droplet_id?: string;
  droplet_ip?: string;
  webhook_url?: string;
  workflow_ids: string[];
  credential_ids: string[];
  
  // Error tracking
  error_message?: string;
  error_stack?: string;
  error_step?: string;
  
  // Rollback tracking
  rollback_started_at?: string;
  rollback_completed_at?: string;
  rollback_success?: boolean;
  
  // Timestamps
  started_at: string;
  updated_at: string;
  completed_at?: string;
  
  // Metadata
  requested_by: string;
  region: string;
  droplet_size: string;
}

// ============================================
// IGNITION RESULT
// ============================================

/**
 * Result of an ignition operation.
 */
export interface IgnitionResult {
  success: boolean;
  workspace_id: string;
  
  // Resources created
  partition_name?: string;
  droplet_id?: string;
  droplet_ip?: string;
  workflow_ids?: string[];
  credential_count?: number;
  
  // Metrics
  duration_ms: number;
  steps_completed: number;
  
  // Error details
  error?: string;
  error_step?: string;
  rollback_performed?: boolean;
}

// ============================================
// OPERATION TRACKING
// ============================================

/**
 * Individual operation within an ignition.
 */
export interface IgnitionOperation {
  id: string;
  workspace_id: string;
  operation: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  result?: unknown;
  error_message?: string;
  rollback_action?: string;
  rolled_back_at?: string;
}

// ============================================
// ROLLBACK TRACKING
// ============================================

/**
 * Resources created during ignition (for rollback).
 */
export interface CreatedResources {
  partition_name?: string;
  droplet_id?: string;
  credential_ids: string[];
  workflow_ids: string[];
  n8n_credential_ids: string[];
}

/**
 * Rollback result.
 */
export interface RollbackResult {
  success: boolean;
  rolled_back: {
    partition: boolean;
    droplet: boolean;
    credentials: number;
    workflows: number;
  };
  errors: string[];
}

// ============================================
// TEMPLATE CONFIGURATION
// ============================================

/**
 * Golden Template reference for ignition.
 */
export interface TemplateReference {
  template_id: string;
  template_name: string;
  display_name: string;
  category: string;
  required_credentials: CredentialType[];
  is_default: boolean;
}

/**
 * Default templates deployed during ignition.
 */
export const DEFAULT_TEMPLATES: TemplateReference[] = [
  {
    template_id: 'email_1',
    template_name: 'email_1',
    display_name: 'Email 1',
    category: 'email',
    required_credentials: ['google_oauth2', 'postgres'],
    is_default: true,
  },
  {
    template_id: 'email_2',
    template_name: 'email_2',
    display_name: 'Email 2',
    category: 'email',
    required_credentials: ['google_oauth2', 'postgres'],
    is_default: true,
  },
  {
    template_id: 'email_3',
    template_name: 'email_3',
    display_name: 'Email 3',
    category: 'email',
    required_credentials: ['google_oauth2', 'postgres'],
    is_default: true,
  },
  {
    template_id: 'research_report',
    template_name: 'research_report',
    display_name: 'Research Report',
    category: 'research',
    required_credentials: ['openai_api', 'postgres'],
    is_default: true,
  },
  {
    template_id: 'email_preparation',
    template_name: 'email_preparation',
    display_name: 'Email Preparation',
    category: 'preparation',
    // Reads leads from Supabase (postgres), enriches via Google Sheets
    required_credentials: ['google_oauth2', 'postgres'],
    is_default: true,
  },
  {
    template_id: 'reply_tracker',
    template_name: 'reply_tracker',
    display_name: 'Reply Tracker',
    category: 'tracking',
    // Gmail trigger + Google Sheets + Supabase write-back
    required_credentials: ['google_oauth2', 'postgres'],
    is_default: true,
  },
  {
    template_id: 'opt_out',
    template_name: 'opt_out',
    display_name: 'Opt-Out Handler',
    category: 'compliance',
    // Webhook receives unsubscribes, writes to Google Sheets + Supabase
    required_credentials: ['google_oauth2', 'postgres'],
    is_default: true,
  },
];

// ============================================
// PROGRESS EVENTS
// ============================================

/**
 * Event types emitted during ignition.
 */
export type IgnitionEvent =
  | { type: 'started'; workspace_id: string }
  | { type: 'step_started'; workspace_id: string; step: IgnitionStatus; step_number: number }
  | { type: 'step_completed'; workspace_id: string; step: IgnitionStatus; duration_ms: number }
  | { type: 'step_failed'; workspace_id: string; step: IgnitionStatus; error: string }
  | { type: 'rollback_started'; workspace_id: string; reason: string }
  | { type: 'rollback_completed'; workspace_id: string; success: boolean }
  | { type: 'completed'; workspace_id: string; result: IgnitionResult }
  | { type: 'failed'; workspace_id: string; error: string };

/**
 * Progress callback for ignition operations.
 */
export type IgnitionProgressCallback = (event: IgnitionEvent) => void;

// ============================================
// ERROR TYPES
// ============================================

/**
 * Ignition-specific error with step context.
 */
export class IgnitionError extends Error {
  constructor(
    message: string,
    public step: IgnitionStatus,
    public workspaceId: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'IgnitionError';
  }
}

/**
 * Rollback-specific error.
 */
export class RollbackError extends Error {
  constructor(
    message: string,
    public workspaceId: string,
    public failedRollbacks: string[]
  ) {
    super(message);
    this.name = 'RollbackError';
  }
}
