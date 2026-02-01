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
