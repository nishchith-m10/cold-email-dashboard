-- ============================================
-- PHASE 67: AUDIT LOGGING & SUPPORT ACCESS
-- ============================================
-- Creates comprehensive audit trail for compliance
-- Source: GENESIS_SINGULARITY_PLAN_V35.md Section 67 (Previously Phase 63)
-- ============================================

-- ============================================
-- ENUM: Actor Types
-- ============================================
CREATE TYPE genesis.actor_type AS ENUM (
    'user',
    'system',
    'support',
    'sidecar',
    'admin'
);

-- ============================================
-- TABLE: audit_log (Append-Only)
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Temporal
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Actor Information
    actor_type genesis.actor_type NOT NULL,
    actor_id TEXT NOT NULL, -- User ID, system name, support agent ID, or 'system'
    actor_email TEXT, -- Optional: for user/support actors
    
    -- Action Information
    action TEXT NOT NULL, -- e.g., 'IGNITION_STARTED', 'CREDENTIAL_ACCESSED'
    action_category TEXT NOT NULL, -- 'provisioning', 'security', 'billing', 'data', etc.
    
    -- Target Information
    target_type TEXT, -- e.g., 'workspace', 'credential', 'workflow', 'droplet'
    target_id UUID, -- ID of affected resource
    workspace_id UUID REFERENCES genesis.workspaces(id) ON DELETE CASCADE,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    region TEXT, -- Data region where event occurred
    
    -- Details
    details JSONB DEFAULT '{}'::jsonb,
    
    -- Indexes
    CONSTRAINT audit_log_timestamp_check CHECK (timestamp <= now())
);

-- ============================================
-- INDEXES: Audit Log (For Query Performance)
-- ============================================

-- Primary query patterns
CREATE INDEX idx_audit_log_timestamp ON genesis.audit_log (timestamp DESC);
CREATE INDEX idx_audit_log_workspace_id ON genesis.audit_log (workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_audit_log_actor_id ON genesis.audit_log (actor_id);
CREATE INDEX idx_audit_log_action ON genesis.audit_log (action);
CREATE INDEX idx_audit_log_action_category ON genesis.audit_log (action_category);

-- Support access auditing
CREATE INDEX idx_audit_log_support_access ON genesis.audit_log (actor_type, timestamp DESC) 
    WHERE actor_type = 'support';

-- Security event queries
CREATE INDEX idx_audit_log_security_events ON genesis.audit_log (action_category, timestamp DESC) 
    WHERE action_category = 'security';

-- Composite index for workspace-scoped queries
CREATE INDEX idx_audit_log_workspace_timestamp ON genesis.audit_log (workspace_id, timestamp DESC);

-- JSONB details search
CREATE INDEX idx_audit_log_details_gin ON genesis.audit_log USING gin(details);

-- ============================================
-- ROW LEVEL SECURITY: Audit Log
-- ============================================
ALTER TABLE genesis.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read audit logs for their own workspaces
CREATE POLICY audit_log_read_own_workspace
    ON genesis.audit_log
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT uw.workspace_id 
            FROM user_workspaces uw
            WHERE uw.user_id = auth.uid()
        )
    );

-- Policy: System can write all audit logs
CREATE POLICY audit_log_system_write
    ON genesis.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- All authenticated connections can write audit logs

-- Policy: No updates or deletes allowed (append-only)
-- (No policies needed - absence of UPDATE/DELETE policies prevents those operations)

-- ============================================
-- TABLE: support_access_tokens
-- ============================================
-- Time-limited JWT tokens for support access
CREATE TABLE IF NOT EXISTS genesis.support_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Token Info
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of JWT
    
    -- Support Agent
    support_agent_id TEXT NOT NULL,
    support_agent_email TEXT NOT NULL,
    
    -- Access Details
    workspace_id UUID NOT NULL REFERENCES genesis.workspaces(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('read_only', 'debug', 'write', 'emergency')),
    
    -- Justification
    ticket_id TEXT NOT NULL, -- e.g., 'SUPPORT-12345'
    reason TEXT NOT NULL,
    
    -- Temporal
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    
    -- Permissions (JSONB array of permission strings)
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT max_duration CHECK (expires_at <= created_at + INTERVAL '4 hours')
);

-- ============================================
-- INDEXES: Support Access Tokens
-- ============================================
CREATE INDEX idx_support_tokens_workspace ON genesis.support_access_tokens (workspace_id);
CREATE INDEX idx_support_tokens_agent ON genesis.support_access_tokens (support_agent_id);
CREATE INDEX idx_support_tokens_expires ON genesis.support_access_tokens (expires_at);
CREATE INDEX idx_support_tokens_active ON genesis.support_access_tokens (workspace_id, expires_at) 
    WHERE revoked_at IS NULL AND expires_at > now();

-- ============================================
-- FUNCTION: Log Audit Event
-- ============================================
CREATE OR REPLACE FUNCTION genesis.fn_log_audit_event(
    p_actor_type genesis.actor_type,
    p_actor_id TEXT,
    p_action TEXT,
    p_action_category TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_workspace_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_actor_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO genesis.audit_log (
        actor_type,
        actor_id,
        actor_email,
        action,
        action_category,
        target_type,
        target_id,
        workspace_id,
        ip_address,
        user_agent,
        region,
        details
    ) VALUES (
        p_actor_type,
        p_actor_id,
        p_actor_email,
        p_action,
        p_action_category,
        p_target_type,
        p_target_id,
        p_workspace_id,
        p_ip_address,
        p_user_agent,
        p_region,
        p_details
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Create Support Access Token
-- ============================================
CREATE OR REPLACE FUNCTION genesis.fn_create_support_access_token(
    p_support_agent_id TEXT,
    p_support_agent_email TEXT,
    p_workspace_id UUID,
    p_access_level TEXT,
    p_ticket_id TEXT,
    p_reason TEXT,
    p_duration_minutes INTEGER DEFAULT 30,
    p_permissions JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
    token_id UUID,
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_token_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Validate access level
    IF p_access_level NOT IN ('read_only', 'debug', 'write', 'emergency') THEN
        RAISE EXCEPTION 'Invalid access level: %', p_access_level;
    END IF;
    
    -- Validate duration
    IF p_duration_minutes > 240 THEN -- Max 4 hours
        RAISE EXCEPTION 'Duration cannot exceed 240 minutes (4 hours)';
    END IF;
    
    -- Calculate expiry
    v_expires_at := now() + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Create token record (token_hash will be set by application layer)
    INSERT INTO genesis.support_access_tokens (
        token_hash,
        support_agent_id,
        support_agent_email,
        workspace_id,
        access_level,
        ticket_id,
        reason,
        expires_at,
        permissions
    ) VALUES (
        'pending', -- Placeholder, will be updated by app
        p_support_agent_id,
        p_support_agent_email,
        p_workspace_id,
        p_access_level,
        p_ticket_id,
        p_reason,
        v_expires_at,
        p_permissions
    )
    RETURNING id INTO v_token_id;
    
    -- Log audit event
    PERFORM genesis.fn_log_audit_event(
        'support'::genesis.actor_type,
        p_support_agent_id,
        'SUPPORT_ACCESS_GRANTED',
        'security',
        'workspace',
        p_workspace_id,
        p_workspace_id,
        NULL, -- ip_address (will be set by app)
        NULL, -- user_agent
        NULL, -- region
        jsonb_build_object(
            'access_level', p_access_level,
            'ticket_id', p_ticket_id,
            'duration_minutes', p_duration_minutes,
            'expires_at', v_expires_at
        ),
        p_support_agent_email
    );
    
    RETURN QUERY SELECT v_token_id, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Revoke Support Access Token
-- ============================================
CREATE OR REPLACE FUNCTION genesis.fn_revoke_support_access_token(
    p_token_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_token_record RECORD;
BEGIN
    -- Get token info
    SELECT * INTO v_token_record
    FROM genesis.support_access_tokens
    WHERE id = p_token_id
    AND revoked_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Revoke token
    UPDATE genesis.support_access_tokens
    SET revoked_at = now()
    WHERE id = p_token_id;
    
    -- Log audit event
    PERFORM genesis.fn_log_audit_event(
        'support'::genesis.actor_type,
        v_token_record.support_agent_id,
        'SUPPORT_ACCESS_REVOKED',
        'security',
        'workspace',
        v_token_record.workspace_id,
        v_token_record.workspace_id,
        NULL,
        NULL,
        NULL,
        jsonb_build_object(
            'token_id', p_token_id,
            'ticket_id', v_token_record.ticket_id
        ),
        v_token_record.support_agent_email
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENT: Documentation
-- ============================================
COMMENT ON TABLE genesis.audit_log IS 
'Phase 67: Append-only audit trail for compliance (SOC2, GDPR). Records all significant system actions with actor, target, and context information.';

COMMENT ON TABLE genesis.support_access_tokens IS 
'Phase 67: Time-limited JWT tokens for support access. Enables controlled, audited access to tenant environments for debugging.';

COMMENT ON FUNCTION genesis.fn_log_audit_event IS 
'Phase 67: Logs an audit event. Used by all system components to record significant actions.';

COMMENT ON FUNCTION genesis.fn_create_support_access_token IS 
'Phase 67: Creates a time-limited support access token with specified permissions. Automatically logs SUPPORT_ACCESS_GRANTED event.';

COMMENT ON FUNCTION genesis.fn_revoke_support_access_token IS 
'Phase 67: Revokes a support access token before expiry. Automatically logs SUPPORT_ACCESS_REVOKED event.';
