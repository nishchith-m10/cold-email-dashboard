-- ============================================
-- PHASE 45: SANDBOX & SIMULATION ENGINE
-- Database schema for workflow execution monitoring
-- ============================================

-- Ensure genesis schema exists
CREATE SCHEMA IF NOT EXISTS genesis;

-- ============================================
-- 1. WORKFLOW EXECUTION EVENTS TABLE
-- Stores real-time execution events from n8n workflows
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.workflow_execution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Execution context
    execution_id TEXT NOT NULL,
    workspace_id UUID NOT NULL,
    campaign_id UUID,
    workflow_type TEXT, -- 'research' | 'email_1' | 'email_2' | 'email_3' | 'reply_tracker' | etc
    
    -- Node details
    node_id TEXT NOT NULL,
    node_name TEXT NOT NULL,
    node_type TEXT NOT NULL, -- 'n8n-nodes-base.openAi', 'n8n-nodes-base.gmail', etc
    
    -- Execution results
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped', 'waiting')),
    execution_time_ms INTEGER,
    
    -- Data (sanitized, size-limited to 10KB max per field)
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    
    -- Test mode flag
    test_mode BOOLEAN DEFAULT FALSE,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_execution_time CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0)
);

COMMENT ON TABLE genesis.workflow_execution_events IS 'Real-time n8n workflow execution events for monitoring and debugging';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exec_events_execution 
    ON genesis.workflow_execution_events(execution_id, created_at);

CREATE INDEX IF NOT EXISTS idx_exec_events_workspace 
    ON genesis.workflow_execution_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exec_events_campaign 
    ON genesis.workflow_execution_events(campaign_id, created_at DESC) 
    WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exec_events_test_mode 
    ON genesis.workflow_execution_events(workspace_id, test_mode, created_at DESC);

-- Composite index for SSE polling: execution_id + node_type for completion detection
CREATE INDEX IF NOT EXISTS idx_exec_events_completion 
    ON genesis.workflow_execution_events(execution_id, node_type) 
    WHERE node_type = '_execution_complete';

-- ============================================
-- 2. SANDBOX TEST RUNS TABLE
-- Tracks test runs per workspace for rate limiting and history
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.sandbox_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    execution_id TEXT,
    campaign_id UUID,
    test_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    node_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    total_duration_ms INTEGER
);

COMMENT ON TABLE genesis.sandbox_test_runs IS 'Tracks sandbox test runs for rate limiting and execution history';

-- Rate limiting index: count runs per workspace in the last hour
CREATE INDEX IF NOT EXISTS idx_sandbox_runs_rate_limit 
    ON genesis.sandbox_test_runs(workspace_id, started_at DESC);

-- History index: list test runs for a workspace
CREATE INDEX IF NOT EXISTS idx_sandbox_runs_workspace 
    ON genesis.sandbox_test_runs(workspace_id, started_at DESC);

-- ============================================
-- 3. RLS POLICIES
-- ============================================

ALTER TABLE genesis.workflow_execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sandbox_test_runs ENABLE ROW LEVEL SECURITY;

-- Service role (API routes) gets full access
CREATE POLICY execution_events_service_role 
    ON genesis.workflow_execution_events 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY sandbox_runs_service_role 
    ON genesis.sandbox_test_runs 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- ============================================
-- 4. CLEANUP FUNCTION
-- Auto-delete execution events older than 30 days
-- ============================================

CREATE OR REPLACE FUNCTION genesis.cleanup_old_execution_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM genesis.workflow_execution_events
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up old test runs
    DELETE FROM genesis.sandbox_test_runs
    WHERE started_at < NOW() - INTERVAL '90 days';
    
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION genesis.cleanup_old_execution_events() IS 'Removes execution events older than 30 days and test runs older than 90 days';

-- ============================================
-- 5. RATE LIMIT HELPER FUNCTION
-- Counts test runs in the last hour for a workspace
-- ============================================

CREATE OR REPLACE FUNCTION genesis.count_sandbox_runs_in_window(
    p_workspace_id UUID,
    p_window_seconds INTEGER DEFAULT 3600
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    run_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO run_count
    FROM genesis.sandbox_test_runs
    WHERE workspace_id = p_workspace_id
      AND started_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    
    RETURN run_count;
END;
$$;

COMMENT ON FUNCTION genesis.count_sandbox_runs_in_window(UUID, INTEGER) IS 'Counts sandbox test runs within a time window for rate limiting';

-- ============================================
-- 6. EXECUTION SUMMARY VIEW FUNCTION
-- Returns aggregated summary for an execution
-- ============================================

CREATE OR REPLACE FUNCTION genesis.get_execution_summary(p_execution_id TEXT)
RETURNS TABLE (
    execution_id TEXT,
    workspace_id UUID,
    campaign_id UUID,
    workflow_type TEXT,
    test_mode BOOLEAN,
    node_count BIGINT,
    success_count BIGINT,
    error_count BIGINT,
    total_duration_ms BIGINT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_complete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.execution_id,
        MIN(e.workspace_id) AS workspace_id,
        MIN(e.campaign_id) AS campaign_id,
        MIN(e.workflow_type) AS workflow_type,
        BOOL_OR(e.test_mode) AS test_mode,
        COUNT(*) FILTER (WHERE e.node_type != '_execution_complete') AS node_count,
        COUNT(*) FILTER (WHERE e.status = 'success') AS success_count,
        COUNT(*) FILTER (WHERE e.status = 'error') AS error_count,
        COALESCE(SUM(e.execution_time_ms) FILTER (WHERE e.node_type != '_execution_complete'), 0) AS total_duration_ms,
        MIN(e.created_at) AS started_at,
        MAX(e.created_at) FILTER (WHERE e.node_type = '_execution_complete') AS completed_at,
        EXISTS (
            SELECT 1 FROM genesis.workflow_execution_events sub
            WHERE sub.execution_id = e.execution_id
              AND sub.node_type = '_execution_complete'
        ) AS is_complete
    FROM genesis.workflow_execution_events e
    WHERE e.execution_id = p_execution_id
    GROUP BY e.execution_id;
END;
$$;

COMMENT ON FUNCTION genesis.get_execution_summary(TEXT) IS 'Returns aggregated execution summary for monitoring UI';
