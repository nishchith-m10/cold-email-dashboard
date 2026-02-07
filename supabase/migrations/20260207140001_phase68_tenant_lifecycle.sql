-- ============================================
-- PHASE 68: TENANT LIFECYCLE MANAGEMENT
-- ============================================
-- Tables for workspace deletion, data export, and lifecycle operations
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WORKSPACE LOCKS (Concurrent Operation Protection)
-- ============================================
-- Prevents concurrent lifecycle operations (deletion, export, migration)

CREATE TABLE IF NOT EXISTS genesis.workspace_locks (
    workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    lock_type TEXT NOT NULL CHECK (lock_type IN ('deletion', 'export', 'migration', 'restoration')),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_by TEXT NOT NULL,  -- User ID or 'system'
    expires_at TIMESTAMPTZ NOT NULL,  -- Auto-release after timeout
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_expiry CHECK (expires_at > locked_at)
);

CREATE INDEX idx_workspace_locks_expiry ON genesis.workspace_locks(expires_at) 
    WHERE expires_at > NOW();

COMMENT ON TABLE genesis.workspace_locks IS 'Workspace-level locks for lifecycle operations';
COMMENT ON COLUMN genesis.workspace_locks.lock_type IS 'Type of operation holding the lock';
COMMENT ON COLUMN genesis.workspace_locks.expires_at IS 'Lock auto-released after this time';

-- ============================================
-- DATA EXPORT JOBS (Background Export Processing)
-- ============================================
-- Tracks data export requests and progress

CREATE TABLE IF NOT EXISTS genesis.data_export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Job status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_step TEXT,  -- 'querying_leads', 'querying_campaigns', 'packaging_zip', 'uploading', 'generating_url'
    
    -- Export details
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    export_size_bytes BIGINT DEFAULT 0,
    
    -- Export contents breakdown
    export_manifest JSONB DEFAULT '{}',  -- { leads: 1000, campaigns: 5, events: 5000, ... }
    
    -- Download
    download_url TEXT,
    download_expires_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,  -- User ID who requested export
    
    CONSTRAINT valid_progress CHECK (
        (status = 'completed' AND progress_percentage = 100) OR
        (status != 'completed' AND progress_percentage < 100)
    )
);

CREATE INDEX idx_export_jobs_workspace ON genesis.data_export_jobs(workspace_id, created_at DESC);
CREATE INDEX idx_export_jobs_status ON genesis.data_export_jobs(status, created_at DESC) 
    WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_export_jobs_download ON genesis.data_export_jobs(download_expires_at) 
    WHERE status = 'completed' AND download_expires_at > NOW();

COMMENT ON TABLE genesis.data_export_jobs IS 'Background jobs for GDPR data portability';
COMMENT ON COLUMN genesis.data_export_jobs.export_manifest IS 'Breakdown of exported data by category';
COMMENT ON COLUMN genesis.data_export_jobs.download_url IS 'Signed URL for downloading export (expires after 48h)';

-- ============================================
-- DELETION JOBS (Grace Period Management)
-- ============================================
-- Tracks workspace deletion requests and grace period

CREATE TABLE IF NOT EXISTS genesis.deletion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Deletion status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_grace_period', 'in_progress', 'completed', 'cancelled')),
    
    -- Trigger info
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('user_request', 'subscription_cancelled', 'non_payment', 'tos_violation', 'fraud')),
    trigger_reason TEXT,
    
    -- Grace period
    grace_period_days INTEGER NOT NULL DEFAULT 7,
    deletion_scheduled_at TIMESTAMPTZ NOT NULL,  -- When hard deletion will execute
    can_restore BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Pre-deletion snapshot
    deletion_impact_report JSONB NOT NULL,  -- Full resource count before deletion
    
    -- Confirmation
    confirmation_code TEXT,  -- 6-digit PIN sent via email
    confirmation_code_expires_at TIMESTAMPTZ,
    confirmation_attempts INTEGER DEFAULT 0,
    confirmed_at TIMESTAMPTZ,
    confirmed_by TEXT,  -- User ID who confirmed
    
    -- Export offer
    export_offered BOOLEAN DEFAULT FALSE,
    export_job_id UUID REFERENCES genesis.data_export_jobs(id),
    
    -- Deletion execution
    deletion_started_at TIMESTAMPTZ,
    deletion_completed_at TIMESTAMPTZ,
    deletion_manifest JSONB,  -- What was actually deleted
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,  -- User ID who initiated
    
    CONSTRAINT valid_schedule CHECK (deletion_scheduled_at > created_at),
    CONSTRAINT unique_active_deletion UNIQUE (workspace_id, status) 
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_deletion_jobs_workspace ON genesis.deletion_jobs(workspace_id, created_at DESC);
CREATE INDEX idx_deletion_jobs_scheduled ON genesis.deletion_jobs(deletion_scheduled_at) 
    WHERE status = 'in_grace_period' AND deletion_scheduled_at <= NOW() + INTERVAL '1 day';
CREATE INDEX idx_deletion_jobs_grace ON genesis.deletion_jobs(status, deletion_scheduled_at) 
    WHERE status = 'in_grace_period';

COMMENT ON TABLE genesis.deletion_jobs IS 'Workspace deletion requests with grace period management';
COMMENT ON COLUMN genesis.deletion_jobs.deletion_impact_report IS 'Snapshot of all resources before deletion';
COMMENT ON COLUMN genesis.deletion_jobs.can_restore IS 'Whether workspace can be restored during grace period';

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE genesis.workspace_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.data_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.deletion_jobs ENABLE ROW LEVEL SECURITY;

-- Workspace locks: Read by workspace members, write by system
CREATE POLICY workspace_locks_read ON genesis.workspace_locks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_workspaces uw
            WHERE uw.workspace_id = workspace_locks.workspace_id
            AND uw.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY workspace_locks_insert ON genesis.workspace_locks
    FOR INSERT
    WITH CHECK (TRUE);  -- System can always insert

CREATE POLICY workspace_locks_delete ON genesis.workspace_locks
    FOR DELETE
    USING (TRUE);  -- System can always delete

-- Export jobs: Read/write by workspace members
CREATE POLICY export_jobs_read ON genesis.data_export_jobs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_workspaces uw
            WHERE uw.workspace_id = data_export_jobs.workspace_id
            AND uw.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY export_jobs_insert ON genesis.data_export_jobs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_workspaces uw
            WHERE uw.workspace_id = data_export_jobs.workspace_id
            AND uw.user_id::text = auth.uid()::text
        )
    );

-- Deletion jobs: Read/write by workspace owners only
CREATE POLICY deletion_jobs_read ON genesis.deletion_jobs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_workspaces uw
            WHERE uw.workspace_id = deletion_jobs.workspace_id
            AND uw.user_id::text = auth.uid()::text
            AND uw.role IN ('owner', 'admin')
        )
    );

CREATE POLICY deletion_jobs_insert ON genesis.deletion_jobs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_workspaces uw
            WHERE uw.workspace_id = deletion_jobs.workspace_id
            AND uw.user_id::text = auth.uid()::text
            AND uw.role = 'owner'
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Acquire workspace lock
CREATE OR REPLACE FUNCTION genesis.fn_acquire_workspace_lock(
    p_workspace_id TEXT,
    p_lock_type TEXT,
    p_locked_by TEXT,
    p_timeout_minutes INTEGER DEFAULT 60
) RETURNS JSONB AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
    v_existing_lock RECORD;
BEGIN
    v_expires_at := NOW() + (p_timeout_minutes || ' minutes')::INTERVAL;
    
    -- Check for existing lock
    SELECT * INTO v_existing_lock
    FROM genesis.workspace_locks
    WHERE workspace_id = p_workspace_id
    AND expires_at > NOW();
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Workspace is locked',
            'lock_type', v_existing_lock.lock_type,
            'locked_by', v_existing_lock.locked_by,
            'expires_at', v_existing_lock.expires_at
        );
    END IF;
    
    -- Acquire lock
    INSERT INTO genesis.workspace_locks (workspace_id, lock_type, locked_by, expires_at)
    VALUES (p_workspace_id, p_lock_type, p_locked_by, v_expires_at)
    ON CONFLICT (workspace_id) DO UPDATE
    SET lock_type = EXCLUDED.lock_type,
        locked_by = EXCLUDED.locked_by,
        locked_at = NOW(),
        expires_at = EXCLUDED.expires_at;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'lock_type', p_lock_type,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release workspace lock
CREATE OR REPLACE FUNCTION genesis.fn_release_workspace_lock(
    p_workspace_id TEXT,
    p_lock_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM genesis.workspace_locks
    WHERE workspace_id = p_workspace_id
    AND lock_type = p_lock_type;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired locks (called by cron)
CREATE OR REPLACE FUNCTION genesis.fn_cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM genesis.workspace_locks
    WHERE expires_at <= NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION genesis.fn_acquire_workspace_lock IS 'Acquire exclusive lock for workspace lifecycle operation';
COMMENT ON FUNCTION genesis.fn_release_workspace_lock IS 'Release workspace lock after operation completes';
COMMENT ON FUNCTION genesis.fn_cleanup_expired_locks IS 'Cron job to auto-release expired locks';
