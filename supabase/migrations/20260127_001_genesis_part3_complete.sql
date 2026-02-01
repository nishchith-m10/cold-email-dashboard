/**
 * PHASE 41: IGNITION ORCHESTRATOR - DATABASE SCHEMA
 * 
 * Stores ignition state, credential vault, and rollback tracking.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 41
 */

-- ============================================
-- IGNITION STATE TABLE
-- ============================================

/**
 * Tracks the state of workspace provisioning operations.
 * Enables atomic rollback on failure.
 */
CREATE TABLE IF NOT EXISTS genesis.ignition_state (
  workspace_id UUID PRIMARY KEY,
  
  -- State machine
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'partition_creating',
    'droplet_provisioning',
    'handshake_pending',
    'credentials_injecting',
    'workflows_deploying',
    'activating',
    'active',
    'rollback_in_progress',
    'failed'
  )),
  
  -- Progress tracking
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 6,
  
  -- Resources created
  partition_name TEXT,
  droplet_id TEXT,
  droplet_ip TEXT,
  webhook_url TEXT,
  workflow_ids TEXT[] DEFAULT '{}',
  credential_ids UUID[] DEFAULT '{}',
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  error_step TEXT,
  
  -- Rollback tracking
  rollback_started_at TIMESTAMPTZ,
  rollback_completed_at TIMESTAMPTZ,
  rollback_success BOOLEAN,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  requested_by TEXT NOT NULL,
  region TEXT NOT NULL,
  droplet_size TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ignition_state_status 
  ON genesis.ignition_state(status);

CREATE INDEX IF NOT EXISTS idx_ignition_state_started 
  ON genesis.ignition_state(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ignition_state_droplet 
  ON genesis.ignition_state(droplet_id) 
  WHERE droplet_id IS NOT NULL;

-- ============================================
-- CREDENTIAL VAULT TABLE
-- ============================================

/**
 * Stores encrypted workspace credentials with AES-256-GCM.
 * Used by Ignition Orchestrator to inject credentials into Sidecar.
 */
CREATE TABLE IF NOT EXISTS genesis.workspace_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  
  -- Credential identification
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'google_oauth2',
    'openai_api',
    'smtp',
    'supabase',
    'postgres',
    'http_header_auth',
    'http_basic_auth'
  )),
  credential_name TEXT NOT NULL,
  
  -- n8n integration
  n8n_credential_id TEXT,
  template_credential_id TEXT,
  
  -- Encrypted data (AES-256-GCM)
  encrypted_data TEXT NOT NULL,  -- Base64-encoded encrypted blob
  encryption_version INTEGER NOT NULL DEFAULT 1,
  data_fingerprint TEXT NOT NULL,
  
  -- Sync status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'synced',
    'sync_failed',
    'revoked'
  )),
  last_synced_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  
  -- Constraints
  CONSTRAINT workspace_credentials_unique 
    UNIQUE (workspace_id, credential_type, credential_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_workspace 
  ON genesis.workspace_credentials(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_type 
  ON genesis.workspace_credentials(credential_type);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_status 
  ON genesis.workspace_credentials(status);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_n8n_id 
  ON genesis.workspace_credentials(n8n_credential_id) 
  WHERE n8n_credential_id IS NOT NULL;

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.workspace_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_credentials_select" 
  ON genesis.workspace_credentials 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY "workspace_credentials_insert" 
  ON genesis.workspace_credentials 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (workspace_id = genesis.get_workspace_context());

CREATE POLICY "workspace_credentials_update" 
  ON genesis.workspace_credentials 
  FOR UPDATE 
  TO authenticated 
  USING (workspace_id = genesis.get_workspace_context());

-- ============================================
-- CREDENTIAL AUDIT LOG TABLE
-- ============================================

/**
 * Audit trail for all credential operations.
 */
CREATE TABLE IF NOT EXISTS genesis.credential_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  credential_id UUID NOT NULL,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'updated',
    'synced',
    'verified',
    'revoked',
    'accessed',
    'decrypted'
  )),
  
  -- Actor information
  actor_id TEXT,
  actor_type TEXT CHECK (actor_type IN ('user', 'system', 'sidecar')),
  
  -- Context
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credential_audit_workspace 
  ON genesis.credential_audit_log(workspace_id);

CREATE INDEX IF NOT EXISTS idx_credential_audit_credential 
  ON genesis.credential_audit_log(credential_id);

CREATE INDEX IF NOT EXISTS idx_credential_audit_created 
  ON genesis.credential_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credential_audit_action 
  ON genesis.credential_audit_log(action);

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.credential_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credential_audit_log_select" 
  ON genesis.credential_audit_log 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id = genesis.get_workspace_context());

-- ============================================
-- IGNITION OPERATIONS TABLE
-- ============================================

/**
 * Tracks individual ignition operation steps for detailed auditing.
 */
CREATE TABLE IF NOT EXISTS genesis.ignition_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES genesis.ignition_state(workspace_id),
  
  -- Operation details
  operation TEXT NOT NULL, -- 'create_partition', 'provision_droplet', etc.
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  
  -- Execution details
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Result
  result JSONB,
  error_message TEXT,
  
  -- Rollback info
  rollback_action TEXT,
  rolled_back_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ignition_operations_workspace 
  ON genesis.ignition_operations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_ignition_operations_status 
  ON genesis.ignition_operations(status);

CREATE INDEX IF NOT EXISTS idx_ignition_operations_started 
  ON genesis.ignition_operations(started_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

/**
 * Get current ignition state for a workspace.
 */
CREATE OR REPLACE FUNCTION genesis.fn_get_ignition_state(
  p_workspace_id UUID
)
RETURNS TABLE (
  workspace_id UUID,
  status TEXT,
  current_step INTEGER,
  total_steps INTEGER,
  partition_name TEXT,
  droplet_id TEXT,
  droplet_ip TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ist.workspace_id,
    ist.status,
    ist.current_step,
    ist.total_steps,
    ist.partition_name,
    ist.droplet_id,
    ist.droplet_ip,
    ist.error_message,
    ist.started_at,
    ist.updated_at
  FROM genesis.ignition_state ist
  WHERE ist.workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Update ignition state.
 */
CREATE OR REPLACE FUNCTION genesis.fn_update_ignition_state(
  p_workspace_id UUID,
  p_status TEXT,
  p_current_step INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_partition_name TEXT DEFAULT NULL,
  p_droplet_id TEXT DEFAULT NULL,
  p_droplet_ip TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE genesis.ignition_state
  SET 
    status = p_status,
    current_step = COALESCE(p_current_step, current_step),
    error_message = p_error_message,
    partition_name = COALESCE(p_partition_name, partition_name),
    droplet_id = COALESCE(p_droplet_id, droplet_id),
    droplet_ip = COALESCE(p_droplet_ip, droplet_ip),
    updated_at = now()
  WHERE workspace_id = p_workspace_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Log credential action.
 */
CREATE OR REPLACE FUNCTION genesis.fn_log_credential_action(
  p_workspace_id UUID,
  p_credential_id UUID,
  p_action TEXT,
  p_actor_id TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO genesis.credential_audit_log (
    workspace_id,
    credential_id,
    action,
    actor_id,
    actor_type,
    details
  ) VALUES (
    p_workspace_id,
    p_credential_id,
    p_action,
    p_actor_id,
    p_actor_type,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Clean up old ignition states (completed or failed > 30 days).
 */
CREATE OR REPLACE FUNCTION genesis.fn_cleanup_old_ignition_states()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM genesis.ignition_state
    WHERE status IN ('active', 'failed')
      AND updated_at < now() - INTERVAL '30 days'
    RETURNING workspace_id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE genesis.ignition_state IS 'Phase 41: Tracks workspace provisioning state with atomic rollback';
COMMENT ON TABLE genesis.workspace_credentials IS 'Phase 41: AES-256-GCM encrypted credential vault';
COMMENT ON TABLE genesis.credential_audit_log IS 'Phase 41: Audit trail for credential operations';
COMMENT ON TABLE genesis.ignition_operations IS 'Phase 41: Detailed step-by-step operation log';
-- ============================================
-- PHASE 42: ATOMIC HANDSHAKE PROTOCOL
-- Database Schema
-- ============================================
-- 
-- This schema implements the V35 Atomic Handshake Protocol for
-- secure Sidecar->Dashboard registration.
--
-- Security Properties:
-- - Provisioning tokens: One-time use, 15-minute expiry, hashed storage
-- - Sidecar tokens: Long-lived (30 days), revocable
-- - Atomic updates: webhook_url, status, health in single transaction
-- - Replay attack prevention: Single-use provisioning tokens
-- - Audit trail: Complete handshake history

-- ============================================
-- TABLE: provisioning_tokens
-- ============================================
-- One-time tokens generated during ignition for initial handshake.
-- Tokens are hashed (SHA-256) before storage to prevent exposure if DB leaks.

CREATE TABLE IF NOT EXISTS genesis.provisioning_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    
    -- Security: Token is hashed with SHA-256
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
    used_at TIMESTAMPTZ,
    
    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    max_usage INTEGER NOT NULL DEFAULT 1, -- Single-use token
    
    -- Invalidation
    invalidated_at TIMESTAMPTZ,
    invalidation_reason TEXT,
    
    -- Creation context
    created_by TEXT NOT NULL, -- e.g., 'ignition_orchestrator'
    ignition_id UUID, -- Link to ignition_state if applicable
    
    -- IP tracking for security audit
    last_attempt_ip INET,
    last_attempt_at TIMESTAMPTZ
);

CREATE INDEX idx_prov_tokens_workspace ON genesis.provisioning_tokens(workspace_id);
CREATE INDEX idx_prov_tokens_hash ON genesis.provisioning_tokens(token_hash) WHERE used_at IS NULL;
CREATE INDEX idx_prov_tokens_expires ON genesis.provisioning_tokens(expires_at) WHERE used_at IS NULL;

-- ============================================
-- TABLE: sidecar_tokens
-- ============================================
-- Long-lived tokens for Sidecar->Dashboard authentication.
-- Used for heartbeats, status reports, and event publishing.

CREATE TABLE IF NOT EXISTS genesis.sidecar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE, -- One active token per workspace
    
    -- Security: Token is hashed with SHA-256
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    last_used_at TIMESTAMPTZ,
    
    -- Revocation
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revocation_reason TEXT,
    
    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_usage_ip INET,
    
    -- Rotation tracking
    previous_token_id UUID REFERENCES genesis.sidecar_tokens(id),
    rotation_scheduled_at TIMESTAMPTZ
);

CREATE INDEX idx_sidecar_tokens_workspace ON genesis.sidecar_tokens(workspace_id);
CREATE INDEX idx_sidecar_tokens_hash ON genesis.sidecar_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_sidecar_tokens_expires ON genesis.sidecar_tokens(expires_at) WHERE revoked_at IS NULL;

-- ============================================
-- TABLE: handshake_attempts
-- ============================================
-- Audit log for all handshake attempts (successful and failed).
-- Critical for security monitoring and replay attack detection.

CREATE TABLE IF NOT EXISTS genesis.handshake_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    
    -- Request details
    provisioning_token_hash TEXT,
    droplet_ip INET NOT NULL,
    webhook_url TEXT,
    n8n_version TEXT,
    
    -- Result
    success BOOLEAN NOT NULL,
    error_code TEXT, -- e.g., 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_ALREADY_USED'
    error_message TEXT,
    
    -- Timing
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    
    -- Security context
    request_ip INET NOT NULL,
    user_agent TEXT,
    
    -- Generated tokens (if successful)
    sidecar_token_id UUID REFERENCES genesis.sidecar_tokens(id),
    
    -- Request payload (for forensics)
    request_payload JSONB
);

CREATE INDEX idx_handshake_attempts_workspace ON genesis.handshake_attempts(workspace_id);
CREATE INDEX idx_handshake_attempts_time ON genesis.handshake_attempts(attempted_at DESC);
CREATE INDEX idx_handshake_attempts_success ON genesis.handshake_attempts(success, attempted_at);
CREATE INDEX idx_handshake_attempts_ip ON genesis.handshake_attempts(request_ip);

-- ============================================
-- TABLE: droplet_health
-- ============================================
-- Health status for each droplet, updated during handshake and heartbeats.

CREATE TABLE IF NOT EXISTS genesis.droplet_health (
    workspace_id UUID PRIMARY KEY,
    
    -- Connection info
    droplet_ip INET NOT NULL,
    webhook_url TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN (
        'provisioning',   -- Droplet created, waiting for handshake
        'online',         -- Handshake complete, receiving heartbeats
        'degraded',       -- Missing heartbeats or errors
        'offline',        -- No heartbeats for extended period
        'terminated'      -- Droplet terminated
    )),
    
    -- Health metrics
    n8n_version TEXT,
    last_handshake_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    heartbeat_interval INTEGER DEFAULT 60, -- seconds
    missed_heartbeats INTEGER DEFAULT 0,
    
    -- Resource usage (populated by heartbeats)
    cpu_usage_percent NUMERIC(5,2),
    memory_usage_percent NUMERIC(5,2),
    disk_usage_percent NUMERIC(5,2),
    active_executions INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Degradation tracking
    first_degradation_at TIMESTAMPTZ,
    degradation_reason TEXT
);

CREATE INDEX idx_droplet_health_status ON genesis.droplet_health(status);
CREATE INDEX idx_droplet_health_heartbeat ON genesis.droplet_health(last_heartbeat_at) WHERE status IN ('online', 'degraded');

-- ============================================
-- TABLE: workspace_webhooks
-- ============================================
-- Webhook URL registry for routing incoming n8n events.
-- Atomic updates during handshake ensure consistency.

CREATE TABLE IF NOT EXISTS genesis.workspace_webhooks (
    workspace_id UUID PRIMARY KEY,
    
    -- Webhook URL from n8n
    webhook_url TEXT NOT NULL,
    webhook_secret TEXT, -- For validating incoming webhooks
    
    -- Discovery
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discovered_via TEXT NOT NULL DEFAULT 'handshake', -- or 'manual', 'api'
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    last_verification_at TIMESTAMPTZ,
    verification_failures INTEGER DEFAULT 0,
    
    -- Usage tracking
    last_event_received_at TIMESTAMPTZ,
    total_events_received INTEGER DEFAULT 0,
    
    -- Invalidation (if webhook URL changes)
    invalidated_at TIMESTAMPTZ,
    invalidation_reason TEXT,
    previous_webhook_url TEXT,
    
    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspace_webhooks_verified ON genesis.workspace_webhooks(verified, last_verification_at);

-- ============================================
-- HELPER FUNCTION: Hash Token
-- ============================================
-- SHA-256 hashing for token storage.

CREATE OR REPLACE FUNCTION genesis.hash_token(p_token TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(p_token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- HELPER FUNCTION: Validate Provisioning Token
-- ============================================
-- Atomic token validation with usage tracking.

CREATE OR REPLACE FUNCTION genesis.validate_provisioning_token(
    p_token_hash TEXT,
    p_workspace_id UUID,
    p_request_ip INET
)
RETURNS TABLE (
    valid BOOLEAN,
    token_id UUID,
    error_code TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_token RECORD;
BEGIN
    -- Find token
    SELECT * INTO v_token
    FROM genesis.provisioning_tokens
    WHERE token_hash = p_token_hash
    AND workspace_id = p_workspace_id;
    
    -- Update last attempt
    IF FOUND THEN
        UPDATE genesis.provisioning_tokens
        SET last_attempt_ip = p_request_ip,
            last_attempt_at = NOW()
        WHERE id = v_token.id;
    END IF;
    
    -- Validate
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'TOKEN_NOT_FOUND'::TEXT, 'Provisioning token not found'::TEXT;
        RETURN;
    END IF;
    
    IF v_token.used_at IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, v_token.id, 'TOKEN_ALREADY_USED'::TEXT, 'Provisioning token already used'::TEXT;
        RETURN;
    END IF;
    
    IF v_token.invalidated_at IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, v_token.id, 'TOKEN_INVALIDATED'::TEXT, 
            'Provisioning token invalidated: ' || COALESCE(v_token.invalidation_reason, 'unknown')::TEXT;
        RETURN;
    END IF;
    
    IF v_token.expires_at < NOW() THEN
        RETURN QUERY SELECT FALSE, v_token.id, 'TOKEN_EXPIRED'::TEXT, 'Provisioning token expired'::TEXT;
        RETURN;
    END IF;
    
    IF v_token.usage_count >= v_token.max_usage THEN
        RETURN QUERY SELECT FALSE, v_token.id, 'TOKEN_MAX_USAGE_EXCEEDED'::TEXT, 'Token usage limit exceeded'::TEXT;
        RETURN;
    END IF;
    
    -- Valid
    RETURN QUERY SELECT TRUE, v_token.id, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Mark Token Used
-- ============================================

CREATE OR REPLACE FUNCTION genesis.mark_token_used(p_token_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE genesis.provisioning_tokens
    SET used_at = NOW(),
        usage_count = usage_count + 1
    WHERE id = p_token_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Create Sidecar Token
-- ============================================

CREATE OR REPLACE FUNCTION genesis.create_sidecar_token(
    p_workspace_id UUID,
    p_token_hash TEXT
)
RETURNS UUID AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Revoke any existing token
    UPDATE genesis.sidecar_tokens
    SET revoked_at = NOW(),
        revoked_by = 'system',
        revocation_reason = 'New token issued'
    WHERE workspace_id = p_workspace_id
    AND revoked_at IS NULL;
    
    -- Create new token
    INSERT INTO genesis.sidecar_tokens (
        workspace_id,
        token_hash
    ) VALUES (
        p_workspace_id,
        p_token_hash
    ) RETURNING id INTO v_token_id;
    
    RETURN v_token_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Atomic Handshake Update
-- ============================================
-- Updates droplet_health, workspace_webhooks, and workspace status atomically.

CREATE OR REPLACE FUNCTION genesis.complete_handshake(
    p_workspace_id UUID,
    p_droplet_ip INET,
    p_webhook_url TEXT,
    p_n8n_version TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update droplet health
    INSERT INTO genesis.droplet_health (
        workspace_id,
        droplet_ip,
        webhook_url,
        status,
        n8n_version,
        last_handshake_at
    ) VALUES (
        p_workspace_id,
        p_droplet_ip,
        p_webhook_url,
        'online',
        p_n8n_version,
        NOW()
    )
    ON CONFLICT (workspace_id) DO UPDATE SET
        droplet_ip = EXCLUDED.droplet_ip,
        webhook_url = EXCLUDED.webhook_url,
        status = 'online',
        n8n_version = EXCLUDED.n8n_version,
        last_handshake_at = NOW(),
        updated_at = NOW();
    
    -- Update webhook registry
    INSERT INTO genesis.workspace_webhooks (
        workspace_id,
        webhook_url,
        discovered_at,
        discovered_via
    ) VALUES (
        p_workspace_id,
        p_webhook_url,
        NOW(),
        'handshake'
    )
    ON CONFLICT (workspace_id) DO UPDATE SET
        previous_webhook_url = workspace_webhooks.webhook_url,
        webhook_url = EXCLUDED.webhook_url,
        discovered_at = NOW(),
        discovered_via = 'handshake',
        verified = FALSE, -- Reset verification on URL change
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Cleanup Expired Tokens
-- ============================================
-- Run periodically to clean up expired provisioning tokens.

CREATE OR REPLACE FUNCTION genesis.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete expired, unused provisioning tokens (older than 24 hours)
    WITH deleted AS (
        DELETE FROM genesis.provisioning_tokens
        WHERE expires_at < NOW() - INTERVAL '24 hours'
        AND used_at IS NULL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE genesis.provisioning_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sidecar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.handshake_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.droplet_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.workspace_webhooks ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY provisioning_tokens_service ON genesis.provisioning_tokens FOR ALL TO service_role USING (true);
CREATE POLICY sidecar_tokens_service ON genesis.sidecar_tokens FOR ALL TO service_role USING (true);
CREATE POLICY handshake_attempts_service ON genesis.handshake_attempts FOR ALL TO service_role USING (true);
CREATE POLICY droplet_health_service ON genesis.droplet_health FOR ALL TO service_role USING (true);
CREATE POLICY workspace_webhooks_service ON genesis.workspace_webhooks FOR ALL TO service_role USING (true);

-- User access (with workspace context)
CREATE POLICY provisioning_tokens_user ON genesis.provisioning_tokens FOR SELECT TO authenticated
    USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY sidecar_tokens_user ON genesis.sidecar_tokens FOR SELECT TO authenticated
    USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY handshake_attempts_user ON genesis.handshake_attempts FOR SELECT TO authenticated
    USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY droplet_health_user ON genesis.droplet_health FOR SELECT TO authenticated
    USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY workspace_webhooks_user ON genesis.workspace_webhooks FOR SELECT TO authenticated
    USING (workspace_id = genesis.get_workspace_context());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE genesis.provisioning_tokens IS 'One-time tokens for initial Sidecar->Dashboard handshake (Phase 42)';
COMMENT ON TABLE genesis.sidecar_tokens IS 'Long-lived tokens for ongoing Sidecar->Dashboard authentication (Phase 42)';
COMMENT ON TABLE genesis.handshake_attempts IS 'Audit log for all handshake attempts, successful and failed (Phase 42)';
COMMENT ON TABLE genesis.droplet_health IS 'Health status and metrics for each droplet (Phase 42, 54)';
COMMENT ON TABLE genesis.workspace_webhooks IS 'Webhook URL registry for routing n8n events (Phase 42)';
/**
 * PHASE 53: DYNAMIC UUID MAPPER - DATABASE SCHEMA
 * 
 * Stores template credential mappings and workflow templates.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 53
 */

-- ============================================
-- TEMPLATE CREDENTIAL MAP TABLE
-- ============================================

/**
 * Stores placeholder UUIDs used in Golden Templates.
 * 
 * When deploying a workflow, the Dashboard looks up these placeholders
 * and maps them to the tenant's actual credential UUIDs.
 */
CREATE TABLE IF NOT EXISTS genesis.template_credential_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  template_name TEXT NOT NULL,
  template_version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Placeholder details
  placeholder_uuid TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  description TEXT,
  
  -- Metadata
  is_required BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT template_credential_map_unique_placeholder 
    UNIQUE (template_name, template_version, placeholder_uuid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_credential_map_template 
  ON genesis.template_credential_map(template_name, template_version);

CREATE INDEX IF NOT EXISTS idx_template_credential_map_type 
  ON genesis.template_credential_map(credential_type);

-- RLS Policies (readable by all authenticated users, writable by admins only)
ALTER TABLE genesis.template_credential_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_credential_map_select" 
  ON genesis.template_credential_map 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "template_credential_map_admin_all" 
  ON genesis.template_credential_map 
  FOR ALL 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- VARIABLE PLACEHOLDERS TABLE
-- ============================================

/**
 * Stores non-credential placeholders used in templates.
 * 
 * Examples: YOUR_DASHBOARD_URL, YOUR_WORKSPACE_ID, YOUR_NAME, etc.
 */
CREATE TABLE IF NOT EXISTS genesis.template_variable_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  template_name TEXT NOT NULL,
  template_version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Placeholder details
  placeholder_key TEXT NOT NULL,
  variable_type TEXT NOT NULL, -- 'workspace', 'user', 'system', 'custom'
  source_field TEXT NOT NULL, -- Where to get the value (e.g., 'workspace.name')
  description TEXT,
  default_value TEXT,
  
  -- Validation
  is_required BOOLEAN NOT NULL DEFAULT true,
  validation_regex TEXT,
  
  -- Metadata
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT template_variable_map_unique_placeholder 
    UNIQUE (template_name, template_version, placeholder_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_variable_map_template 
  ON genesis.template_variable_map(template_name, template_version);

CREATE INDEX IF NOT EXISTS idx_template_variable_map_type 
  ON genesis.template_variable_map(variable_type);

-- RLS Policies
ALTER TABLE genesis.template_variable_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_variable_map_select" 
  ON genesis.template_variable_map 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "template_variable_map_admin_all" 
  ON genesis.template_variable_map 
  FOR ALL 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- GOLDEN TEMPLATES TABLE
-- ============================================

/**
 * Stores the Golden Template workflows with their validation rules.
 */
CREATE TABLE IF NOT EXISTS genesis.golden_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'email', -- 'email', 'research', 'scraping', etc.
  
  -- Workflow JSON
  workflow_json JSONB NOT NULL,
  
  -- Validation rules
  required_node_types TEXT[] NOT NULL DEFAULT '{}',
  required_credential_types TEXT[] NOT NULL DEFAULT '{}',
  forbidden_node_types TEXT[] NOT NULL DEFAULT '{}',
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT golden_templates_unique_name_version 
    UNIQUE (name, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_golden_templates_name 
  ON genesis.golden_templates(name);

CREATE INDEX IF NOT EXISTS idx_golden_templates_category 
  ON genesis.golden_templates(category);

CREATE INDEX IF NOT EXISTS idx_golden_templates_active 
  ON genesis.golden_templates(is_active) 
  WHERE is_active = true;

-- RLS Policies
ALTER TABLE genesis.golden_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "golden_templates_select" 
  ON genesis.golden_templates 
  FOR SELECT 
  TO authenticated 
  USING (is_active = true);

CREATE POLICY "golden_templates_admin_all" 
  ON genesis.golden_templates 
  FOR ALL 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- WORKSPACE CREDENTIAL MAPPINGS TABLE
-- ============================================

/**
 * Stores the actual credential UUIDs for each workspace.
 * Maps template placeholders to tenant-specific credentials.
 */
CREATE TABLE IF NOT EXISTS genesis.workspace_credential_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace reference
  workspace_id UUID NOT NULL,
  
  -- Credential details
  credential_type TEXT NOT NULL,
  credential_uuid TEXT NOT NULL, -- The actual UUID in the tenant's n8n
  credential_name TEXT NOT NULL,
  
  -- Droplet reference
  droplet_id TEXT NOT NULL,
  
  -- Status
  is_valid BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workspace_credential_mappings_unique 
    UNIQUE (workspace_id, credential_type, droplet_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_credential_mappings_workspace 
  ON genesis.workspace_credential_mappings(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_credential_mappings_droplet 
  ON genesis.workspace_credential_mappings(droplet_id);

CREATE INDEX IF NOT EXISTS idx_workspace_credential_mappings_type 
  ON genesis.workspace_credential_mappings(credential_type);

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.workspace_credential_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_credential_mappings_select" 
  ON genesis.workspace_credential_mappings 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY "workspace_credential_mappings_insert" 
  ON genesis.workspace_credential_mappings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (workspace_id = genesis.get_workspace_context());

CREATE POLICY "workspace_credential_mappings_update" 
  ON genesis.workspace_credential_mappings 
  FOR UPDATE 
  TO authenticated 
  USING (workspace_id = genesis.get_workspace_context());

-- ============================================
-- WORKFLOW DEPLOYMENT LOG TABLE
-- ============================================

/**
 * Logs all workflow deployments for audit and rollback.
 */
CREATE TABLE IF NOT EXISTS genesis.workflow_deployment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace & Droplet
  workspace_id UUID NOT NULL,
  droplet_id TEXT NOT NULL,
  
  -- Template info
  template_name TEXT NOT NULL,
  template_version TEXT NOT NULL,
  
  -- Deployment details
  workflow_id TEXT, -- n8n workflow ID after deployment
  workflow_json JSONB NOT NULL, -- The actual JSON sent (after mapping)
  credential_map JSONB NOT NULL, -- The mapping used
  variable_map JSONB NOT NULL, -- The variable replacements used
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  
  -- Metadata
  deployed_by TEXT NOT NULL,
  deployment_duration_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_workspace 
  ON genesis.workflow_deployment_log(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_droplet 
  ON genesis.workflow_deployment_log(droplet_id);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_template 
  ON genesis.workflow_deployment_log(template_name, template_version);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_status 
  ON genesis.workflow_deployment_log(status);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_created 
  ON genesis.workflow_deployment_log(created_at DESC);

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.workflow_deployment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_deployment_log_select" 
  ON genesis.workflow_deployment_log 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY "workflow_deployment_log_insert" 
  ON genesis.workflow_deployment_log 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (workspace_id = genesis.get_workspace_context());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

/**
 * Get template credential map for a specific template.
 */
CREATE OR REPLACE FUNCTION genesis.fn_get_template_credential_map(
  p_template_name TEXT,
  p_template_version TEXT DEFAULT '1.0.0'
)
RETURNS TABLE (
  placeholder_uuid TEXT,
  credential_type TEXT,
  description TEXT,
  is_required BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tcm.placeholder_uuid,
    tcm.credential_type,
    tcm.description,
    tcm.is_required
  FROM genesis.template_credential_map tcm
  WHERE tcm.template_name = p_template_name
    AND tcm.template_version = p_template_version
  ORDER BY tcm.display_order, tcm.credential_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Get workspace credential mappings for a workspace.
 */
CREATE OR REPLACE FUNCTION genesis.fn_get_workspace_credential_map(
  p_workspace_id UUID,
  p_droplet_id TEXT
)
RETURNS TABLE (
  credential_type TEXT,
  credential_uuid TEXT,
  credential_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wcm.credential_type,
    wcm.credential_uuid,
    wcm.credential_name
  FROM genesis.workspace_credential_mappings wcm
  WHERE wcm.workspace_id = p_workspace_id
    AND wcm.droplet_id = p_droplet_id
    AND wcm.is_valid = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Record a workflow deployment.
 */
CREATE OR REPLACE FUNCTION genesis.fn_record_workflow_deployment(
  p_workspace_id UUID,
  p_droplet_id TEXT,
  p_template_name TEXT,
  p_template_version TEXT,
  p_workflow_json JSONB,
  p_credential_map JSONB,
  p_variable_map JSONB,
  p_deployed_by TEXT
)
RETURNS UUID AS $$
DECLARE
  v_deployment_id UUID;
BEGIN
  INSERT INTO genesis.workflow_deployment_log (
    workspace_id,
    droplet_id,
    template_name,
    template_version,
    workflow_json,
    credential_map,
    variable_map,
    deployed_by,
    status
  ) VALUES (
    p_workspace_id,
    p_droplet_id,
    p_template_name,
    p_template_version,
    p_workflow_json,
    p_credential_map,
    p_variable_map,
    p_deployed_by,
    'pending'
  ) RETURNING id INTO v_deployment_id;
  
  RETURN v_deployment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Update deployment status.
 */
CREATE OR REPLACE FUNCTION genesis.fn_update_deployment_status(
  p_deployment_id UUID,
  p_status TEXT,
  p_workflow_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE genesis.workflow_deployment_log
  SET 
    status = p_status,
    workflow_id = COALESCE(p_workflow_id, workflow_id),
    error_message = p_error_message,
    deployment_duration_ms = p_duration_ms,
    completed_at = now()
  WHERE id = p_deployment_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Example Templates)
-- ============================================

-- Insert example template credential mappings
INSERT INTO genesis.template_credential_map (template_name, template_version, placeholder_uuid, credential_type, description, display_order)
VALUES 
  ('email_1', '1.0.0', 'TEMPLATE_GMAIL_UUID', 'gmailOAuth2', 'Gmail OAuth2 credentials for sending emails', 1),
  ('email_1', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2),
  ('email_2', '1.0.0', 'TEMPLATE_GMAIL_UUID', 'gmailOAuth2', 'Gmail OAuth2 credentials for sending emails', 1),
  ('email_2', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2),
  ('email_3', '1.0.0', 'TEMPLATE_GMAIL_UUID', 'gmailOAuth2', 'Gmail OAuth2 credentials for sending emails', 1),
  ('email_3', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2),
  ('research_report', '1.0.0', 'TEMPLATE_OPENAI_UUID', 'openAiApi', 'OpenAI API key for content generation', 1),
  ('research_report', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2)
ON CONFLICT (template_name, template_version, placeholder_uuid) DO NOTHING;

-- Insert example variable mappings
INSERT INTO genesis.template_variable_map (template_name, template_version, placeholder_key, variable_type, source_field, description, display_order)
VALUES 
  ('email_1', '1.0.0', 'YOUR_DASHBOARD_URL', 'system', 'system.dashboard_url', 'Dashboard URL for webhook callbacks', 1),
  ('email_1', '1.0.0', 'YOUR_WORKSPACE_ID', 'workspace', 'workspace.id', 'Workspace UUID', 2),
  ('email_1', '1.0.0', 'YOUR_LEADS_TABLE', 'workspace', 'workspace.partition_name', 'Partition table name', 3),
  ('email_1', '1.0.0', 'YOUR_NAME', 'user', 'user.name', 'User display name', 4),
  ('email_1', '1.0.0', 'YOUR_SENDER_EMAIL', 'user', 'user.email', 'Email sender address', 5)
ON CONFLICT (template_name, template_version, placeholder_key) DO NOTHING;

-- Comments
COMMENT ON TABLE genesis.template_credential_map IS 'Phase 53: Stores placeholder UUIDs for Golden Templates';
COMMENT ON TABLE genesis.template_variable_map IS 'Phase 53: Stores variable placeholders for templates';
COMMENT ON TABLE genesis.golden_templates IS 'Phase 53: Stores Golden Template workflows with validation rules';
COMMENT ON TABLE genesis.workspace_credential_mappings IS 'Phase 53: Maps template placeholders to tenant credentials';
COMMENT ON TABLE genesis.workflow_deployment_log IS 'Phase 53: Audit log for workflow deployments';
