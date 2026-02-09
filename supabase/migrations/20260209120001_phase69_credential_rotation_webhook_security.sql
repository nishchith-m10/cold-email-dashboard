-- ============================================
-- PHASE 69: CREDENTIAL ROTATION & WEBHOOK SECURITY
-- ============================================
--
-- Creates infrastructure for:
-- 1. Automated credential rotation (OAuth + API keys)
-- 2. Webhook signature verification (HMAC-SHA256)
-- 3. Dead Letter Queue for failed webhooks
--
-- Dependencies: Phase 64 (workspace_keys, workspace_credentials)
-- ============================================

-- ============================================
-- 1. WEBHOOK REQUEST ID DEDUPLICATION
-- ============================================

-- Stores request IDs to prevent replay attacks
-- TTL: 10 minutes (cleaned by cron)
CREATE TABLE IF NOT EXISTS genesis.webhook_request_ids (
    request_id TEXT PRIMARY KEY,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL, -- 'sidecar', 'n8n', 'dashboard'
    endpoint TEXT NOT NULL -- '/api/n8n/execution-event', '/api/webhooks/heartbeat', etc
);

CREATE INDEX idx_webhook_request_ids_seen_at 
    ON genesis.webhook_request_ids(seen_at) 
    WHERE seen_at > NOW() - INTERVAL '10 minutes';

COMMENT ON TABLE genesis.webhook_request_ids IS 
    'Phase 69: Deduplication table for webhook request IDs. Prevents replay attacks.';

-- ============================================
-- 2. WEBHOOK SECRETS (Dual-Key Rotation)
-- ============================================

-- Stores active + previous webhook secrets for graceful rotation
CREATE TABLE IF NOT EXISTS genesis.webhook_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Dual-key system for zero-downtime rotation
    secret_active TEXT NOT NULL,       -- Current secret (encrypted)
    secret_previous TEXT,               -- Previous secret (encrypted, null after grace period)
    
    -- Rotation metadata
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotation_initiated_by UUID REFERENCES auth.users(id),
    rotation_reason TEXT CHECK (rotation_reason IN ('scheduled', 'compromise_detected', 'admin_action', 'user_request')),
    next_rotation_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    
    -- Grace period tracking
    grace_period_ends_at TIMESTAMPTZ, -- When to drop secret_previous
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_workspace_webhook_secret UNIQUE (workspace_id)
);

CREATE INDEX idx_webhook_secrets_next_rotation 
    ON genesis.webhook_secrets(next_rotation_at) 
    WHERE next_rotation_at <= NOW() + INTERVAL '7 days';

CREATE INDEX idx_webhook_secrets_grace_period 
    ON genesis.webhook_secrets(grace_period_ends_at) 
    WHERE grace_period_ends_at IS NOT NULL AND grace_period_ends_at <= NOW();

COMMENT ON TABLE genesis.webhook_secrets IS 
    'Phase 69: Webhook HMAC secrets with dual-key rotation support for zero-downtime updates.';

-- ============================================
-- 3. DEAD LETTER QUEUE (Webhook Failures)
-- ============================================

-- Captures failed webhook deliveries for retry and investigation
CREATE TABLE IF NOT EXISTS genesis.webhook_dlq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Webhook metadata
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    http_method TEXT NOT NULL DEFAULT 'POST',
    
    -- Request details
    payload JSONB NOT NULL,
    headers JSONB, -- Original headers (minus secrets)
    
    -- Failure tracking
    error_message TEXT,
    error_code TEXT, -- HTTP status code or exception type
    error_stack TEXT, -- Full stack trace for debugging
    
    -- Retry strategy
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'retrying', 'resolved', 'abandoned')) DEFAULT 'pending',
    resolved_at TIMESTAMPTZ,
    abandoned_at TIMESTAMPTZ,
    
    -- Observability
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance index
    CONSTRAINT check_status_timestamps CHECK (
        (status = 'resolved' AND resolved_at IS NOT NULL) OR
        (status = 'abandoned' AND abandoned_at IS NOT NULL) OR
        (status IN ('pending', 'retrying'))
    )
);

CREATE INDEX idx_webhook_dlq_next_retry 
    ON genesis.webhook_dlq(next_retry_at, status) 
    WHERE status IN ('pending', 'retrying') AND next_retry_at IS NOT NULL;

CREATE INDEX idx_webhook_dlq_workspace_status 
    ON genesis.webhook_dlq(workspace_id, status, created_at DESC);

CREATE INDEX idx_webhook_dlq_abandoned 
    ON genesis.webhook_dlq(abandoned_at) 
    WHERE status = 'abandoned';

COMMENT ON TABLE genesis.webhook_dlq IS 
    'Phase 69: Dead Letter Queue for failed webhook deliveries with exponential backoff retry.';

-- ============================================
-- 4. CREDENTIAL ROTATION TRACKING
-- ============================================

-- Extends workspace_credentials from Phase 64 with rotation fields
-- NOTE: workspace_credentials table may already exist from Phase 64
-- This only adds new columns if they don't exist

DO $$
BEGIN
    -- Add expires_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'genesis' 
        AND table_name = 'workspace_credentials' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE genesis.workspace_credentials 
        ADD COLUMN expires_at TIMESTAMPTZ;
        
        COMMENT ON COLUMN genesis.workspace_credentials.expires_at IS 
            'Phase 69: OAuth token expiry timestamp. NULL for non-expiring API keys.';
    END IF;

    -- Add rotation_status if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'genesis' 
        AND table_name = 'workspace_credentials' 
        AND column_name = 'rotation_status'
    ) THEN
        ALTER TABLE genesis.workspace_credentials 
        ADD COLUMN rotation_status TEXT CHECK (rotation_status IN ('valid', 'expiring_soon', 'invalid', 'needs_review')) DEFAULT 'valid';
        
        COMMENT ON COLUMN genesis.workspace_credentials.rotation_status IS 
            'Phase 69: Credential health status. "expiring_soon" triggers auto-rotation, "invalid" requires user action.';
    END IF;

    -- Add last_rotated_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'genesis' 
        AND table_name = 'workspace_credentials' 
        AND column_name = 'last_rotated_at'
    ) THEN
        ALTER TABLE genesis.workspace_credentials 
        ADD COLUMN last_rotated_at TIMESTAMPTZ;
        
        COMMENT ON COLUMN genesis.workspace_credentials.last_rotated_at IS 
            'Phase 69: Timestamp of last successful rotation.';
    END IF;

    -- Add next_rotation_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'genesis' 
        AND table_name = 'workspace_credentials' 
        AND column_name = 'next_rotation_at'
    ) THEN
        ALTER TABLE genesis.workspace_credentials 
        ADD COLUMN next_rotation_at TIMESTAMPTZ;
        
        COMMENT ON COLUMN genesis.workspace_credentials.next_rotation_at IS 
            'Phase 69: Scheduled rotation timestamp. NULL for manual-only keys.';
    END IF;

    -- Add rotation_failure_count if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'genesis' 
        AND table_name = 'workspace_credentials' 
        AND column_name = 'rotation_failure_count'
    ) THEN
        ALTER TABLE genesis.workspace_credentials 
        ADD COLUMN rotation_failure_count INTEGER DEFAULT 0 CHECK (rotation_failure_count >= 0);
        
        COMMENT ON COLUMN genesis.workspace_credentials.rotation_failure_count IS 
            'Phase 69: Count of consecutive rotation failures. Reset to 0 on success.';
    END IF;

    -- Add last_rotation_error if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'genesis' 
        AND table_name = 'workspace_credentials' 
        AND column_name = 'last_rotation_error'
    ) THEN
        ALTER TABLE genesis.workspace_credentials 
        ADD COLUMN last_rotation_error TEXT;
        
        COMMENT ON COLUMN genesis.workspace_credentials.last_rotation_error IS 
            'Phase 69: Last rotation error message for debugging.';
    END IF;
END $$;

-- Add indexes for rotation queries
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_rotation_status 
    ON genesis.workspace_credentials(rotation_status, next_rotation_at);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_expiring 
    ON genesis.workspace_credentials(expires_at) 
    WHERE expires_at IS NOT NULL AND expires_at <= NOW() + INTERVAL '14 days';

-- ============================================
-- 5. CREDENTIAL ROTATION AUDIT LOG
-- ============================================

-- Tracks all rotation attempts for compliance and debugging
CREATE TABLE IF NOT EXISTS genesis.credential_rotation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Credential reference
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    credential_id UUID NOT NULL,
    credential_type TEXT NOT NULL, -- 'gmail_oauth', 'openai_api_key', 'webhook_secret'
    
    -- Rotation details
    rotation_type TEXT NOT NULL CHECK (rotation_type IN ('auto_scheduled', 'user_initiated', 'compromise_detected', 'manual_admin')),
    rotation_result TEXT NOT NULL CHECK (rotation_result IN ('success', 'failed', 'skipped')),
    
    -- Failure details
    failure_reason TEXT,
    failure_code TEXT, -- '4xx', '5xx', 'network_error', 'rate_limit', 'revoked_consent'
    retry_attempt INTEGER DEFAULT 0,
    
    -- Metadata
    initiated_by UUID REFERENCES auth.users(id),
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    execution_time_ms INTEGER,
    
    -- Observability
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credential_rotation_audit_workspace 
    ON genesis.credential_rotation_audit(workspace_id, rotated_at DESC);

CREATE INDEX idx_credential_rotation_audit_credential 
    ON genesis.credential_rotation_audit(credential_id, rotated_at DESC);

CREATE INDEX idx_credential_rotation_audit_failed 
    ON genesis.credential_rotation_audit(rotation_result, rotated_at DESC) 
    WHERE rotation_result = 'failed';

COMMENT ON TABLE genesis.credential_rotation_audit IS 
    'Phase 69: Audit trail for all credential rotation attempts. Tracks success/failure for compliance.';

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function: Calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION genesis.calculate_next_retry(
    attempt_count INTEGER,
    base_delay_seconds INTEGER DEFAULT 1
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    delay_seconds INTEGER;
BEGIN
    -- Exponential backoff: 1s, 5s, 30s, 5min, 30min
    delay_seconds := CASE
        WHEN attempt_count = 0 THEN 1
        WHEN attempt_count = 1 THEN 5
        WHEN attempt_count = 2 THEN 30
        WHEN attempt_count = 3 THEN 300  -- 5 minutes
        WHEN attempt_count >= 4 THEN 1800 -- 30 minutes
        ELSE base_delay_seconds
    END;
    
    RETURN NOW() + (delay_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION genesis.calculate_next_retry IS 
    'Phase 69: Calculates next retry timestamp with exponential backoff (1s, 5s, 30s, 5min, 30min).';

-- Function: Clean old webhook request IDs (called by cron)
CREATE OR REPLACE FUNCTION genesis.clean_webhook_request_ids() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM genesis.webhook_request_ids 
    WHERE seen_at < NOW() - INTERVAL '10 minutes';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION genesis.clean_webhook_request_ids IS 
    'Phase 69: Removes webhook request IDs older than 10 minutes. Prevents table bloat.';

-- Function: Identify expiring credentials (for daily cron)
CREATE OR REPLACE FUNCTION genesis.get_expiring_credentials(
    days_threshold INTEGER DEFAULT 14
) RETURNS TABLE (
    workspace_id UUID,
    credential_id UUID,
    credential_type TEXT,
    expires_at TIMESTAMPTZ,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wc.workspace_id,
        wc.id AS credential_id,
        wc.type AS credential_type,
        wc.expires_at,
        EXTRACT(DAY FROM (wc.expires_at - NOW()))::INTEGER AS days_until_expiry
    FROM genesis.workspace_credentials wc
    WHERE wc.expires_at IS NOT NULL
    AND wc.expires_at > NOW()
    AND wc.expires_at < NOW() + (days_threshold || ' days')::INTERVAL
    AND wc.rotation_status NOT IN ('invalid', 'needs_review')
    AND wc.type IN ('gmail_oauth', 'google_sheets_oauth') -- Only OAuth credentials
    ORDER BY wc.expires_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION genesis.get_expiring_credentials IS 
    'Phase 69: Returns OAuth credentials expiring within N days (default 14) for scheduled rotation.';

-- ============================================
-- 7. ROW-LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE genesis.webhook_request_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.webhook_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.webhook_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.credential_rotation_audit ENABLE ROW LEVEL SECURITY;

-- Policy: webhook_request_ids - Service role only (internal system table)
CREATE POLICY "Service role full access to webhook_request_ids"
    ON genesis.webhook_request_ids
    FOR ALL
    TO service_role
    USING (true);

-- Policy: webhook_secrets - Service role only (contains sensitive secrets)
CREATE POLICY "Service role full access to webhook_secrets"
    ON genesis.webhook_secrets
    FOR ALL
    TO service_role
    USING (true);

-- Policy: webhook_dlq - Users can view their workspace's DLQ entries
CREATE POLICY "Users can view their workspace DLQ entries"
    ON genesis.webhook_dlq
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Policy: webhook_dlq - Service role full access
CREATE POLICY "Service role full access to webhook_dlq"
    ON genesis.webhook_dlq
    FOR ALL
    TO service_role
    USING (true);

-- Policy: credential_rotation_audit - Users can view their workspace's rotation history
CREATE POLICY "Users can view their workspace rotation audit"
    ON genesis.credential_rotation_audit
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: credential_rotation_audit - Service role full access
CREATE POLICY "Service role full access to credential_rotation_audit"
    ON genesis.credential_rotation_audit
    FOR ALL
    TO service_role
    USING (true);

-- ============================================
-- 8. TRIGGERS (Auto-update timestamps)
-- ============================================

-- Trigger: Update updated_at on webhook_secrets
CREATE OR REPLACE FUNCTION genesis.update_webhook_secrets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_secrets_update_timestamp
    BEFORE UPDATE ON genesis.webhook_secrets
    FOR EACH ROW
    EXECUTE FUNCTION genesis.update_webhook_secrets_updated_at();

-- Trigger: Update updated_at on webhook_dlq
CREATE OR REPLACE FUNCTION genesis.update_webhook_dlq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-set resolved_at when status changes to 'resolved'
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = NOW();
    END IF;
    
    -- Auto-set abandoned_at when status changes to 'abandoned'
    IF NEW.status = 'abandoned' AND OLD.status != 'abandoned' THEN
        NEW.abandoned_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_dlq_update_timestamp
    BEFORE UPDATE ON genesis.webhook_dlq
    FOR EACH ROW
    EXECUTE FUNCTION genesis.update_webhook_dlq_updated_at();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify all tables exist
DO $$
DECLARE
    missing_tables TEXT[];
BEGIN
    SELECT ARRAY_AGG(table_name) INTO missing_tables
    FROM (
        VALUES 
            ('webhook_request_ids'),
            ('webhook_secrets'),
            ('webhook_dlq'),
            ('credential_rotation_audit')
    ) AS expected(table_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'genesis' 
        AND table_name = expected.table_name
    );
    
    IF ARRAY_LENGTH(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Phase 69 migration incomplete. Missing tables: %', ARRAY_TO_STRING(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'Phase 69 migration complete. All tables created successfully.';
END $$;
