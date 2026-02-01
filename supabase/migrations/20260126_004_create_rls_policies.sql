-- ============================================
-- GENESIS PHASE 40: RLS POLICIES & SECURITY
-- ============================================
-- Migration: 004_create_rls_policies.sql
-- Purpose: Enable RLS and create fail-closed security policies
-- Dependencies: 001_create_genesis_schema.sql, 002_create_leads_parent_table.sql
-- Source: Plan document section 40.4
-- ============================================

BEGIN;

-- ============================================
-- HELPER FUNCTION: SET WORKSPACE CONTEXT
-- ============================================
-- Source: Plan document section 40.4.2
-- Purpose: Set session-level workspace context for RLS enforcement

CREATE OR REPLACE FUNCTION genesis.set_workspace_context(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Validate UUID format
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Workspace ID cannot be NULL';
    END IF;
    
    -- Set session parameter (transaction-scoped via SET LOCAL)
    -- The TRUE parameter makes it local to the transaction
    PERFORM set_config('app.workspace_id', p_workspace_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION genesis.set_workspace_context IS 
'Sets workspace context for RLS enforcement. Must be called before querying partitioned data.';

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION genesis.set_workspace_context TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.set_workspace_context TO service_role;

-- ============================================
-- HELPER FUNCTION: GET WORKSPACE CONTEXT
-- ============================================
-- Source: Plan document section 40.4.2
-- Purpose: Get current workspace context with fail-closed default

CREATE OR REPLACE FUNCTION genesis.get_workspace_context()
RETURNS UUID AS $$
DECLARE
    v_ws_id TEXT;
BEGIN
    -- Get current setting (TRUE = return NULL if not set, don't error)
    v_ws_id := current_setting('app.workspace_id', TRUE);
    
    -- Fail-closed: NULL or empty returns sentinel that matches nothing
    IF v_ws_id IS NULL OR v_ws_id = '' THEN
        -- Return impossible UUID that exists in no partition
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    -- Validate UUID format
    BEGIN
        RETURN v_ws_id::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Invalid UUID format - return sentinel
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION genesis.get_workspace_context IS 
'Returns current workspace context UUID. Returns sentinel UUID if context not set (fail-closed).';

-- ============================================
-- ENABLE RLS ON PARENT TABLE
-- ============================================
-- RLS must be enabled on the parent table
-- It will automatically apply to all partitions

ALTER TABLE genesis.leads ENABLE ROW LEVEL SECURITY;

-- Force RLS (prevents bypassing RLS even for table owners)
ALTER TABLE genesis.leads FORCE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS leads_workspace_isolation ON genesis.leads;

-- ============================================
-- CREATE FAIL-CLOSED RLS POLICY
-- ============================================
-- Source: Plan document section 40.4.2
-- 
-- CRITICAL: Fail-closed COALESCE pattern
-- - If app.workspace_id is NULL → COALESCE returns '' → no match → DENY
-- - If app.workspace_id is empty → COALESCE returns '' → no match → DENY
-- - If app.workspace_id is invalid UUID → get_workspace_context() returns sentinel → DENY
-- - Only valid workspace_id that matches partition key → ALLOW
--
-- This is MORE secure than:
--   USING (workspace_id = current_setting('app.workspace_id'))
-- Because that would allow access if context is not set (NULL comparison)

CREATE POLICY leads_workspace_isolation ON genesis.leads
    FOR ALL  -- Applies to SELECT, INSERT, UPDATE, DELETE
    USING (
        -- WHERE clause for SELECT/UPDATE/DELETE
        -- Uses fail-closed helper function
        workspace_id = genesis.get_workspace_context()
    )
    WITH CHECK (
        -- Constraint for INSERT/UPDATE
        -- Ensures inserted/updated rows match current workspace context
        workspace_id = genesis.get_workspace_context()
    );

COMMENT ON POLICY leads_workspace_isolation ON genesis.leads IS 
'Fail-closed RLS policy. Denies all access if workspace context is not set or invalid.';

-- ============================================
-- VERIFICATION FUNCTION
-- ============================================
-- Source: Plan document section 40.4.2
-- Purpose: Verify RLS is properly enabled and configured

CREATE OR REPLACE FUNCTION genesis.verify_rls_active()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    rls_forced BOOLEAN,
    policy_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT,
        c.relrowsecurity,
        c.relforcerowsecurity,
        (SELECT COUNT(*)::INTEGER FROM pg_policies WHERE schemaname = 'genesis' AND tablename = c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis'
    AND c.relname = 'leads'
    AND c.relkind = 'p';  -- partitioned table
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION genesis.verify_rls_active IS 
'Verifies RLS is enabled and policies exist on genesis.leads table.';

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
    v_rls_forced BOOLEAN;
    v_policy_count INTEGER;
BEGIN
    -- Check RLS status
    SELECT 
        c.relrowsecurity,
        c.relforcerowsecurity,
        (SELECT COUNT(*)::INTEGER FROM pg_policies WHERE schemaname = 'genesis' AND tablename = 'leads')
    INTO v_rls_enabled, v_rls_forced, v_policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis'
    AND c.relname = 'leads';
    
    IF NOT v_rls_enabled THEN
        RAISE EXCEPTION 'RLS is not enabled on genesis.leads';
    END IF;
    
    IF NOT v_rls_forced THEN
        RAISE EXCEPTION 'RLS is not forced on genesis.leads';
    END IF;
    
    IF v_policy_count = 0 THEN
        RAISE EXCEPTION 'No RLS policies found on genesis.leads';
    END IF;
    
    RAISE NOTICE '✓ RLS enabled and forced on genesis.leads';
    RAISE NOTICE '✓ % policies created', v_policy_count;
END $$;
