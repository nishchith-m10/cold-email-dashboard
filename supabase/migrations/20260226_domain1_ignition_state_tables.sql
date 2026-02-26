-- ============================================================
-- DOMAIN 1: IGNITION STATE PERSISTENCE TABLES
-- ============================================================
-- Migration: 20260226_domain1_ignition_state_tables.sql
-- Purpose: Create genesis.ignition_state and genesis.ignition_operations
--          tables for production ignition orchestrator state persistence.
-- Dependencies: 20260126_001_create_genesis_schema.sql (genesis schema)
-- Source: POST_GENESIS_EXECUTION_PLAN.md — Task 1.3.1
-- ============================================================

BEGIN;

-- ============================================================
-- TABLE 1: genesis.ignition_state
-- ============================================================
-- Primary state persistence for the ignition orchestrator.
-- One row per workspace. Tracks current step, resources created,
-- errors, rollback status, and timestamps.
-- Maps directly to IgnitionState interface in ignition-types.ts.

CREATE TABLE IF NOT EXISTS genesis.ignition_state (
    -- Primary key: one ignition per workspace
    workspace_id       UUID PRIMARY KEY,

    -- State machine
    status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN (
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
    current_step       INTEGER NOT NULL DEFAULT 0,
    total_steps        INTEGER NOT NULL DEFAULT 6,

    -- Resources created during ignition
    partition_name     TEXT,
    droplet_id         TEXT,
    droplet_ip         TEXT,
    webhook_url        TEXT,
    workflow_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
    credential_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Error tracking
    error_message      TEXT,
    error_stack        TEXT,
    error_step         TEXT,

    -- Rollback tracking
    rollback_started_at   TIMESTAMPTZ,
    rollback_completed_at TIMESTAMPTZ,
    rollback_success      BOOLEAN,

    -- Timestamps
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at       TIMESTAMPTZ,

    -- Metadata
    requested_by       TEXT NOT NULL,
    region             TEXT NOT NULL DEFAULT 'nyc3',
    droplet_size       TEXT NOT NULL DEFAULT 'starter'
);

-- Table comment
COMMENT ON TABLE genesis.ignition_state IS
    'Primary state persistence for the ignition orchestrator. One row per workspace. '
    'Maps to IgnitionState interface in lib/genesis/ignition-types.ts.';

-- ============================================================
-- TABLE 2: genesis.ignition_operations
-- ============================================================
-- Audit trail of individual operations within an ignition.
-- Used by IgnitionStateDB.logOperation() for debugging and audit.

CREATE TABLE IF NOT EXISTS genesis.ignition_operations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL,
    operation          TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
    result             JSONB,
    error              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table comment
COMMENT ON TABLE genesis.ignition_operations IS
    'Audit trail of individual operations within an ignition process. '
    'One row per operation (e.g., partition_create, credential_inject, workflow_deploy).';

-- ============================================================
-- INDEXES
-- ============================================================

-- Fast lookup of operations by workspace, ordered by time
CREATE INDEX IF NOT EXISTS idx_ignition_operations_ws_created
    ON genesis.ignition_operations (workspace_id, created_at);

-- Fast status-based queries (find all in-progress ignitions)
CREATE INDEX IF NOT EXISTS idx_ignition_state_status
    ON genesis.ignition_state (status)
    WHERE status NOT IN ('active', 'failed');

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE genesis.ignition_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.ignition_operations ENABLE ROW LEVEL SECURITY;

-- Service role gets full access (used by the orchestrator)
CREATE POLICY IF NOT EXISTS "ignition_state_service_role_all"
    ON genesis.ignition_state
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "ignition_operations_service_role_all"
    ON genesis.ignition_operations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read their own workspace's ignition state
-- (for progress display in the onboarding wizard)
CREATE POLICY IF NOT EXISTS "ignition_state_workspace_read"
    ON genesis.ignition_state
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT uw.workspace_id FROM user_workspaces uw
            WHERE uw.user_id = (
                current_setting('request.jwt.claims', true)::json ->> 'sub'
            )
        )
    );

CREATE POLICY IF NOT EXISTS "ignition_operations_workspace_read"
    ON genesis.ignition_operations
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT uw.workspace_id FROM user_workspaces uw
            WHERE uw.user_id = (
                current_setting('request.jwt.claims', true)::json ->> 'sub'
            )
        )
    );

-- ============================================================
-- TRIGGER: auto-update updated_at on ignition_state
-- ============================================================

CREATE OR REPLACE FUNCTION genesis.fn_update_ignition_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ignition_state_updated_at ON genesis.ignition_state;
CREATE TRIGGER trg_ignition_state_updated_at
    BEFORE UPDATE ON genesis.ignition_state
    FOR EACH ROW
    EXECUTE FUNCTION genesis.fn_update_ignition_state_timestamp();

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
    -- Verify tables exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'genesis' AND tablename = 'ignition_state'
    ) THEN
        RAISE EXCEPTION 'genesis.ignition_state table was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'genesis' AND tablename = 'ignition_operations'
    ) THEN
        RAISE EXCEPTION 'genesis.ignition_operations table was not created';
    END IF;

    RAISE NOTICE 'DOMAIN 1 MIGRATION VERIFIED: genesis.ignition_state and genesis.ignition_operations created successfully';
END;
$$;
