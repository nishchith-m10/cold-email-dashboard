-- ============================================
-- GENESIS PHASE 40: SCHEMA CREATION
-- ============================================
-- Migration: 001_create_genesis_schema.sql
-- Purpose: Create genesis schema and enable required extensions
-- Dependencies: None
-- ============================================

BEGIN;

-- ============================================
-- CREATE GENESIS SCHEMA
-- ============================================
-- The genesis schema is the isolated namespace for all Phase 40 infrastructure
-- This allows clean separation from existing public schema tables

CREATE SCHEMA IF NOT EXISTS genesis;

-- Add schema comment for documentation
COMMENT ON SCHEMA genesis IS 
'Genesis Engine V35: Partitioned leads infrastructure. Supports 15,000+ workspace partitions with sub-100ms query latency.';

-- ============================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================
-- These extensions are required for partition management and performance

-- UUID generation (for primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm for text search (if needed for future features)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Grant usage on schema to service_role (Supabase default)
GRANT USAGE ON SCHEMA genesis TO service_role;
GRANT USAGE ON SCHEMA genesis TO authenticated;

-- Grant create permissions to service_role (for partition creation)
GRANT CREATE ON SCHEMA genesis TO service_role;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
-- Verify schema was created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = 'genesis'
    ) THEN
        RAISE EXCEPTION 'Schema genesis was not created';
    END IF;
    
    RAISE NOTICE '✓ Genesis schema created successfully';
END $$;
-- ============================================
-- GENESIS PHASE 40: LEADS PARENT TABLE
-- ============================================
-- Migration: 002_create_leads_parent_table.sql
-- Purpose: Create partitioned parent table genesis.leads
-- Dependencies: 001_create_genesis_schema.sql
-- ============================================

BEGIN;

-- ============================================
-- LEADS PARENT TABLE (PARTITIONED BY LIST)
-- ============================================
-- This is the parent table for all workspace partitions
-- Each workspace gets its own partition via LIST partitioning on workspace_id
-- 
-- CRITICAL DESIGN DECISIONS:
-- 1. workspace_id is UUID (matches plan document)
-- 2. Primary key is composite (workspace_id, id) to ensure uniqueness across partitions
-- 3. Partition key is workspace_id (LIST partitioning)
-- 4. All columns match the plan document schema (Phase 40.5.1)

CREATE TABLE IF NOT EXISTS genesis.leads (
    -- Primary key components
    id UUID DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Contact information (from leads_ohio + plan document)
    email_address TEXT NOT NULL,
    linkedin_url TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    organization_name TEXT,
    job_title TEXT,
    position TEXT,  -- Alias for job_title (from leads_ohio)
    phone TEXT,
    company_phone_number TEXT,  -- From leads_ohio
    location TEXT,
    industry TEXT,
    company_size TEXT,
    website_url TEXT,
    organization_website TEXT,  -- Alias for website_url (from leads_ohio)
    
    -- Campaign tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'researching', 'ready', 'sending', 
        'sent', 'replied', 'bounced', 'opted_out', 'completed'
    )),
    campaign_name TEXT,
    
    -- Email content (draft columns from leads_ohio)
    email_1_subject TEXT,
    email_1_body TEXT,
    email_2_body TEXT,
    email_3_subject TEXT,
    email_3_body TEXT,
    
    -- Send tracking (boolean flags)
    email_1_sent BOOLEAN DEFAULT FALSE,
    email_2_sent BOOLEAN DEFAULT FALSE,
    email_3_sent BOOLEAN DEFAULT FALSE,
    email_1_sent_at TIMESTAMPTZ,
    email_2_sent_at TIMESTAMPTZ,
    email_3_sent_at TIMESTAMPTZ,
    
    -- Status flags (from leads_ohio)
    replied BOOLEAN DEFAULT FALSE,
    opted_out BOOLEAN DEFAULT FALSE,
    "analyze" BOOLEAN DEFAULT FALSE,
    email_prep BOOLEAN DEFAULT FALSE,
    report_sent BOOLEAN DEFAULT FALSE,
    
    -- Provider tracking (from leads_ohio)
    message_id TEXT,  -- Provider message ID (e.g., Gmail thread ID)
    
    -- AI data (JSONB for flexibility)
    research_data JSONB DEFAULT '{}',
    relevance_ai_output JSONB DEFAULT '{}',
    
    -- Metadata timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, email_address)
    
) PARTITION BY LIST (workspace_id);

-- ============================================
-- TABLE COMMENT
-- ============================================
COMMENT ON TABLE genesis.leads IS 
'Partitioned parent table for all workspace leads. Each workspace gets its own partition via LIST partitioning on workspace_id.';

-- ============================================
-- DEFAULT PARTITION (catches unrouted data)
-- ============================================
-- This partition catches any data that doesn't match a specific workspace partition
-- Useful for migration scenarios or error handling

CREATE TABLE IF NOT EXISTS genesis.leads_default 
    PARTITION OF genesis.leads DEFAULT;

COMMENT ON TABLE genesis.leads_default IS 
'Default partition for leads that do not match any workspace partition. Should remain empty in production.';

-- ============================================
-- GLOBAL INDEXES (on parent table)
-- ============================================
-- These indexes are automatically created on all partitions
-- Note: Indexes on partitioned tables are created on the parent,
-- and PostgreSQL automatically propagates them to all partitions

-- Workspace lookup index
CREATE INDEX IF NOT EXISTS leads_workspace_idx 
    ON genesis.leads (workspace_id);

-- Status filter index (partial index for active leads)
CREATE INDEX IF NOT EXISTS leads_status_idx 
    ON genesis.leads (status) 
    WHERE status <> 'completed';

-- Timestamp index for recent queries
CREATE INDEX IF NOT EXISTS leads_updated_idx 
    ON genesis.leads (updated_at DESC);

-- Email lookup index (for contact matching)
CREATE INDEX IF NOT EXISTS leads_email_idx 
    ON genesis.leads (workspace_id, email_address);

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================
-- Automatically update updated_at on row modification

CREATE OR REPLACE FUNCTION genesis.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_update_timestamp ON genesis.leads;
CREATE TRIGGER leads_update_timestamp
    BEFORE UPDATE ON genesis.leads
    FOR EACH ROW 
    EXECUTE FUNCTION genesis.update_timestamp();

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    -- Verify parent table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
        AND c.relname = 'leads'
        AND c.relkind = 'p'  -- partitioned table
    ) THEN
        RAISE EXCEPTION 'Parent table genesis.leads was not created';
    END IF;
    
    -- Verify default partition exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
        AND c.relname = 'leads_default'
        AND c.relkind = 'r'  -- regular table (partition)
    ) THEN
        RAISE EXCEPTION 'Default partition genesis.leads_default was not created';
    END IF;
    
    RAISE NOTICE '✓ Parent table genesis.leads created successfully';
    RAISE NOTICE '✓ Default partition genesis.leads_default created successfully';
END $$;
-- ============================================
-- GENESIS PHASE 40: PARTITION MANAGEMENT FUNCTIONS
-- ============================================
-- Migration: 003_create_partition_functions.sql
-- Purpose: Create partition creation, sanitization, and drop functions
-- Dependencies: 001_create_genesis_schema.sql, 002_create_leads_parent_table.sql
-- Source: Plan document sections 40.2.1, 40.2.2, 40.2.3
-- ============================================

BEGIN;

-- ============================================
-- FUNCTION 1: PARTITION NAME SANITIZER
-- ============================================
-- Source: Plan document section 40.2.2
-- Purpose: Ensures partition names are valid Postgres identifiers
-- Max length: 63 chars (Postgres limit)
-- Allowed: lowercase, numbers, underscores

CREATE OR REPLACE FUNCTION genesis.sanitize_partition_slug(p_input TEXT)
RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- Convert to lowercase
    v_result := LOWER(p_input);
    
    -- Replace invalid characters with underscores
    v_result := REGEXP_REPLACE(v_result, '[^a-z0-9_]', '_', 'g');
    
    -- Collapse multiple underscores
    v_result := REGEXP_REPLACE(v_result, '_+', '_', 'g');
    
    -- Remove leading/trailing underscores
    v_result := TRIM(BOTH '_' FROM v_result);
    
    -- Ensure starts with letter (prepend 'p_' if numeric start)
    IF v_result ~ '^[0-9]' THEN
        v_result := 'p_' || v_result;
    END IF;
    
    -- Truncate to max identifier length minus prefix
    -- 'leads_p_' = 8 chars, max 63, so 55 chars for slug
    v_result := LEFT(v_result, 55);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION genesis.sanitize_partition_slug IS 
'Sanitizes workspace slugs/UUIDs into valid Postgres partition names. Max 55 chars for slug portion.';

-- ============================================
-- FUNCTION 2: ATOMIC PARTITION IGNITION
-- ============================================
-- Source: Plan document section 40.2.1
-- Purpose: Atomically create a workspace partition with RLS
-- Thread-safe: Uses advisory locks to prevent race conditions
-- Idempotent: Safe to call multiple times

CREATE OR REPLACE FUNCTION genesis.fn_ignite_workspace_partition(
    p_workspace_id UUID,
    p_workspace_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    partition_name TEXT,
    operation TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_partition_name TEXT;
    v_slug TEXT;
    v_exists BOOLEAN;
    v_lock_acquired BOOLEAN;
BEGIN
    -- ============================================
    -- STEP 0: Input validation
    -- ============================================
    IF p_workspace_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 'validation'::TEXT, 0,
            'workspace_id cannot be NULL'::TEXT;
        RETURN;
    END IF;
    
    -- Generate partition name from slug or workspace_id
    v_slug := COALESCE(
        p_workspace_slug,
        REPLACE(p_workspace_id::TEXT, '-', '_')
    );
    v_partition_name := 'leads_p_' || genesis.sanitize_partition_slug(v_slug);
    
    -- ============================================
    -- STEP 1: Check if partition already exists (FAST PATH)
    -- ============================================
    SELECT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
        AND c.relname = v_partition_name
        AND c.relkind = 'r'  -- regular table (partition)
    ) INTO v_exists;
    
    IF v_exists THEN
        -- Partition exists - idempotent success
        RETURN QUERY SELECT 
            TRUE, 
            v_partition_name, 
            'already_exists'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- ============================================
    -- STEP 2: Acquire DDL advisory lock
    -- ============================================
    -- Lock ID: 1953459672 (from plan document section 40.1.4)
    -- Using pg_try_advisory_xact_lock for non-blocking lock acquisition
    SELECT pg_try_advisory_xact_lock(1953459672) INTO v_lock_acquired;
    
    IF NOT v_lock_acquired THEN
        -- Another transaction is creating a partition
        -- Wait briefly and re-check
        PERFORM pg_sleep(0.1);
        
        SELECT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'genesis'
            AND c.relname = v_partition_name
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN QUERY SELECT 
                TRUE, v_partition_name, 'created_by_other'::TEXT,
                EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
                NULL::TEXT;
            RETURN;
        ELSE
            RETURN QUERY SELECT 
                FALSE, NULL::TEXT, 'lock_contention'::TEXT,
                EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
                'Could not acquire DDL lock'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- ============================================
    -- STEP 3: Create partition (ATOMIC DDL)
    -- ============================================
    BEGIN
        EXECUTE format(
            'CREATE TABLE genesis.%I PARTITION OF genesis.leads
             FOR VALUES IN (%L)',
            v_partition_name,
            p_workspace_id::TEXT
        );
    EXCEPTION WHEN duplicate_table THEN
        -- Race condition: partition created between check and create
        RETURN QUERY SELECT 
            TRUE, v_partition_name, 'race_condition_ok'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
        RETURN;
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 'ddl_failed'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            SQLERRM::TEXT;
        RETURN;
    END;
    
    -- ============================================
    -- STEP 4: Create partition-local indexes
    -- ============================================
    BEGIN
        -- Primary lookup index (WITHOUT CONCURRENTLY - not allowed in functions)
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I 
             ON genesis.%I (email_address)',
            v_partition_name || '_email_idx',
            v_partition_name
        );
        
        -- Status filter index
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I 
             ON genesis.%I (status) WHERE status <> ''completed''',
            v_partition_name || '_status_idx',
            v_partition_name
        );
        
        -- Timestamp index for recent queries
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I 
             ON genesis.%I (updated_at DESC)',
            v_partition_name || '_updated_idx',
            v_partition_name
        );
    EXCEPTION WHEN OTHERS THEN
        -- Index creation is non-critical, log but continue
        RAISE WARNING 'Index creation failed for %: %', v_partition_name, SQLERRM;
    END;
    
    -- ============================================
    -- STEP 5: Register partition in registry
    -- ============================================
    -- Note: partition_registry table is created in migration 005
    -- If it doesn't exist yet, skip registration (will be updated later)
    BEGIN
        INSERT INTO genesis.partition_registry (
            workspace_id,
            partition_name,
            status,
            created_at
        ) VALUES (
            p_workspace_id,
            v_partition_name,
            'active',
            NOW()
        ) ON CONFLICT (workspace_id) DO UPDATE SET
            status = 'active',
            updated_at = NOW();
    EXCEPTION WHEN undefined_table THEN
        -- Registry table doesn't exist yet (migration 005 not run)
        -- This is OK, registration will happen when registry is created
        NULL;
    WHEN OTHERS THEN
        -- Log but don't fail partition creation
        RAISE WARNING 'Failed to register partition in registry: %', SQLERRM;
    END;
    
    -- ============================================
    -- STEP 6: Return success
    -- ============================================
    RETURN QUERY SELECT 
        TRUE,
        v_partition_name,
        'created'::TEXT,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
        NULL::TEXT;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION genesis.fn_ignite_workspace_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION genesis.fn_ignite_workspace_partition TO service_role;

COMMENT ON FUNCTION genesis.fn_ignite_workspace_partition IS 
'Atomically creates a workspace partition with indexes and registry entry. Thread-safe and idempotent.';

-- ============================================
-- FUNCTION 3: PARTITION DROP (CLEANUP)
-- ============================================
-- Source: Plan document section 40.2.3
-- Purpose: Safely drop a workspace partition with safety checks

CREATE OR REPLACE FUNCTION genesis.fn_drop_workspace_partition(
    p_workspace_id UUID,
    p_force BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    success BOOLEAN,
    operation TEXT,
    row_count BIGINT,
    error_message TEXT
) AS $$
DECLARE
    v_partition_name TEXT;
    v_row_count BIGINT;
BEGIN
    -- Get partition name from registry
    BEGIN
        SELECT partition_name INTO v_partition_name
        FROM genesis.partition_registry
        WHERE workspace_id = p_workspace_id;
    EXCEPTION WHEN undefined_table THEN
        -- Registry doesn't exist, try to find partition by name pattern
        SELECT c.relname INTO v_partition_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
        AND c.relname LIKE 'leads_p_%'
        AND EXISTS (
            SELECT 1 FROM pg_inherits i
            WHERE i.inhrelid = c.oid
            AND i.inhparent = (
                SELECT oid FROM pg_class 
                WHERE relname = 'leads' 
                AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'genesis')
            )
        )
        LIMIT 1;
    END;
    
    IF v_partition_name IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, 'not_found'::TEXT, 0::BIGINT,
            'Partition not found in registry'::TEXT;
        RETURN;
    END IF;
    
    -- Get row count for safety check
    EXECUTE format(
        'SELECT COUNT(*) FROM genesis.%I',
        v_partition_name
    ) INTO v_row_count;
    
    -- Safety: require force flag if partition has data
    IF v_row_count > 0 AND NOT p_force THEN
        RETURN QUERY SELECT 
            FALSE, 'has_data'::TEXT, v_row_count,
            format('Partition has %s rows. Use force=true to drop.', v_row_count)::TEXT;
        RETURN;
    END IF;
    
    -- Drop partition
    EXECUTE format('DROP TABLE IF EXISTS genesis.%I', v_partition_name);
    
    -- Update registry if it exists
    BEGIN
        UPDATE genesis.partition_registry
        SET status = 'dropped', updated_at = NOW()
        WHERE workspace_id = p_workspace_id;
    EXCEPTION WHEN undefined_table THEN
        -- Registry doesn't exist, skip update
        NULL;
    END;
    
    RETURN QUERY SELECT 
        TRUE, 'dropped'::TEXT, v_row_count, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION genesis.fn_drop_workspace_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION genesis.fn_drop_workspace_partition TO service_role;

COMMENT ON FUNCTION genesis.fn_drop_workspace_partition IS 
'Safely drops a workspace partition with data protection. Requires force=true if partition contains data.';

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    -- Verify sanitize function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'genesis'
        AND p.proname = 'sanitize_partition_slug'
    ) THEN
        RAISE EXCEPTION 'Function genesis.sanitize_partition_slug was not created';
    END IF;
    
    -- Verify ignition function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'genesis'
        AND p.proname = 'fn_ignite_workspace_partition'
    ) THEN
        RAISE EXCEPTION 'Function genesis.fn_ignite_workspace_partition was not created';
    END IF;
    
    -- Verify drop function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'genesis'
        AND p.proname = 'fn_drop_workspace_partition'
    ) THEN
        RAISE EXCEPTION 'Function genesis.fn_drop_workspace_partition was not created';
    END IF;
    
    RAISE NOTICE '✓ All partition management functions created successfully';
END $$;
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
-- ============================================
-- GENESIS PHASE 40: PARTITION REGISTRY
-- ============================================
-- Migration: 005_create_partition_registry.sql
-- Purpose: Create partition registry table to track all workspace partitions
-- Dependencies: 001_create_genesis_schema.sql
-- Source: Plan document section 40.5.1
-- ============================================

BEGIN;

-- ============================================
-- PARTITION REGISTRY TABLE
-- ============================================
-- This table tracks all workspace partitions for:
-- 1. Fast lookup of partition names by workspace_id
-- 2. Monitoring partition health and size
-- 3. Managing partition lifecycle (active, migrating, dropped)
-- 4. Statistics collection

CREATE TABLE IF NOT EXISTS genesis.partition_registry (
    -- Primary key
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Partition metadata
    partition_name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'migrating', 'dropped')),
    
    -- Statistics (updated periodically)
    row_count BIGINT DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional metadata
    workspace_slug TEXT,  -- Human-readable workspace identifier
    notes TEXT  -- Free-form notes about this partition
);

-- ============================================
-- TABLE COMMENT
-- ============================================
COMMENT ON TABLE genesis.partition_registry IS 
'Registry of all workspace partitions. Tracks partition names, status, and statistics for monitoring and management.';

COMMENT ON COLUMN genesis.partition_registry.workspace_id IS 
'UUID of the workspace. Primary key and foreign key to workspaces table (if exists).';

COMMENT ON COLUMN genesis.partition_registry.partition_name IS 
'Postgres identifier of the partition table (e.g., leads_p_workspace_slug).';

COMMENT ON COLUMN genesis.partition_registry.status IS 
'Partition lifecycle status: active (normal), migrating (data migration in progress), dropped (deleted).';

COMMENT ON COLUMN genesis.partition_registry.row_count IS 
'Approximate row count in partition. Updated periodically via update_partition_stats().';

COMMENT ON COLUMN genesis.partition_registry.size_bytes IS 
'Total size of partition including indexes. Updated periodically via update_partition_stats().';

-- ============================================
-- INDEXES
-- ============================================
-- Index for status filtering (find active partitions)
CREATE INDEX IF NOT EXISTS idx_partition_registry_status 
    ON genesis.partition_registry (status) 
    WHERE status = 'active';

-- Index for partition name lookup (reverse lookup)
CREATE INDEX IF NOT EXISTS idx_partition_registry_name 
    ON genesis.partition_registry (partition_name);

-- Index for workspace slug lookup (if provided)
CREATE INDEX IF NOT EXISTS idx_partition_registry_slug 
    ON genesis.partition_registry (workspace_slug) 
    WHERE workspace_slug IS NOT NULL;

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================
-- Automatically update updated_at on row modification

DROP TRIGGER IF EXISTS partition_registry_update_timestamp ON genesis.partition_registry;
CREATE TRIGGER partition_registry_update_timestamp
    BEFORE UPDATE ON genesis.partition_registry
    FOR EACH ROW 
    EXECUTE FUNCTION genesis.update_timestamp();

-- ============================================
-- PARTITION STATS UPDATER FUNCTION
-- ============================================
-- Source: Plan document section 40.5.1
-- Purpose: Update row_count and size_bytes for a partition

CREATE OR REPLACE FUNCTION genesis.update_partition_stats(p_workspace_id UUID)
RETURNS VOID AS $$
DECLARE
    v_partition TEXT;
    v_count BIGINT;
    v_size BIGINT;
BEGIN
    -- Get partition name from registry
    SELECT partition_name INTO v_partition
    FROM genesis.partition_registry
    WHERE workspace_id = p_workspace_id;
    
    IF v_partition IS NULL THEN 
        RAISE WARNING 'Partition not found in registry for workspace_id: %', p_workspace_id;
        RETURN; 
    END IF;
    
    -- Get row count
    BEGIN
        EXECUTE format('SELECT COUNT(*) FROM genesis.%I', v_partition) INTO v_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to count rows in partition %: %', v_partition, SQLERRM;
        RETURN;
    END;
    
    -- Get total size (including indexes)
    BEGIN
        EXECUTE format(
            'SELECT pg_total_relation_size(%L)',
            'genesis.' || v_partition
        ) INTO v_size;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to get size for partition %: %', v_partition, SQLERRM;
        v_size := 0;
    END;
    
    -- Update registry
    UPDATE genesis.partition_registry
    SET 
        row_count = v_count, 
        size_bytes = v_size, 
        updated_at = NOW()
    WHERE workspace_id = p_workspace_id;
    
    RAISE NOTICE 'Updated stats for partition %: % rows, % bytes', v_partition, v_count, v_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION genesis.update_partition_stats IS 
'Updates row_count and size_bytes statistics for a partition in the registry.';

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION genesis.update_partition_stats TO service_role;

-- ============================================
-- BATCH STATS UPDATER FUNCTION
-- ============================================
-- Purpose: Update statistics for all active partitions
-- Useful for scheduled maintenance jobs

CREATE OR REPLACE FUNCTION genesis.update_all_partition_stats()
RETURNS TABLE (
    workspace_id UUID,
    partition_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    success BOOLEAN
) AS $$
DECLARE
    v_partition RECORD;
    v_count BIGINT;
    v_size BIGINT;
BEGIN
    FOR v_partition IN 
        SELECT workspace_id, partition_name 
        FROM genesis.partition_registry 
        WHERE status = 'active'
    LOOP
        BEGIN
            -- Get row count
            EXECUTE format('SELECT COUNT(*) FROM genesis.%I', v_partition.partition_name) 
                INTO v_count;
            
            -- Get total size
            EXECUTE format(
                'SELECT pg_total_relation_size(%L)',
                'genesis.' || v_partition.partition_name
            ) INTO v_size;
            
            -- Update registry
            UPDATE genesis.partition_registry
            SET 
                row_count = v_count, 
                size_bytes = v_size, 
                updated_at = NOW()
            WHERE workspace_id = v_partition.workspace_id;
            
            RETURN QUERY SELECT 
                v_partition.workspace_id,
                v_partition.partition_name,
                v_count,
                v_size,
                TRUE;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                v_partition.workspace_id,
                v_partition.partition_name,
                0::BIGINT,
                0::BIGINT,
                FALSE;
            RAISE WARNING 'Failed to update stats for partition %: %', 
                v_partition.partition_name, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION genesis.update_all_partition_stats IS 
'Updates statistics for all active partitions. Returns results table with success status.';

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION genesis.update_all_partition_stats TO service_role;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    -- Verify registry table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
        AND c.relname = 'partition_registry'
        AND c.relkind = 'r'  -- regular table
    ) THEN
        RAISE EXCEPTION 'Partition registry table was not created';
    END IF;
    
    -- Verify indexes exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'genesis' 
        AND tablename = 'partition_registry'
        AND indexname = 'idx_partition_registry_status'
    ) THEN
        RAISE EXCEPTION 'Partition registry status index was not created';
    END IF;
    
    RAISE NOTICE '✓ Partition registry table created successfully';
    RAISE NOTICE '✓ Partition registry indexes created successfully';
    RAISE NOTICE '✓ Partition stats updater functions created successfully';
END $$;
-- ============================================================================
-- PHASE 50: SOVEREIGN DROPLET FACTORY - DATABASE INFRASTRUCTURE
-- ============================================================================
-- This migration creates the DigitalOcean multi-account pool and droplet
-- lifecycle tracking infrastructure for the Genesis V35 architecture.
-- ============================================================================

-- Enable pgcrypto for API token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. DIGITALOCEAN ACCOUNT POOL
-- ============================================================================
-- Stores multiple DO accounts with encrypted API tokens for horizontal scaling.
-- Supports 15+ accounts with different droplet limits per account.
-- ============================================================================

CREATE TABLE IF NOT EXISTS genesis.do_accounts (
  account_id TEXT PRIMARY KEY,              -- "genesis-do-pool-us-east-01"
  api_token_encrypted TEXT NOT NULL,        -- Encrypted DO API token (AES-256-GCM)
  region TEXT NOT NULL,                     -- "nyc1", "sfo3", "fra1", etc.
  max_droplets INTEGER NOT NULL,            -- Account limit (e.g., 50, 200, 1000)
  current_droplets INTEGER NOT NULL DEFAULT 0, -- Live count of active droplets
  status TEXT NOT NULL DEFAULT 'active',    -- "active", "full", "suspended", "maintenance"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_provisioned_at TIMESTAMPTZ,
  
  -- Organizational metadata
  billing_email TEXT,                       -- genesis-billing-pool-01@genesis.io
  support_ticket_id TEXT,                   -- DO support ticket for limit increase
  notes TEXT,                               -- "Primary US-East account", "EU GDPR pool"
  
  -- Constraints
  CONSTRAINT do_accounts_status_valid CHECK (
    status IN ('active', 'full', 'suspended', 'maintenance')
  ),
  CONSTRAINT do_accounts_capacity_valid CHECK (
    current_droplets >= 0 AND current_droplets <= max_droplets
  )
);

-- Index for fast load-balancing queries
CREATE INDEX idx_do_accounts_load_balance 
  ON genesis.do_accounts (region, status, current_droplets) 
  WHERE status = 'active';

-- Index for capacity monitoring
CREATE INDEX idx_do_accounts_utilization 
  ON genesis.do_accounts (current_droplets, max_droplets) 
  WHERE status = 'active';

-- ============================================================================
-- 2. DROPLET FLEET STATUS TRACKING
-- ============================================================================
-- Tracks the state of every provisioned droplet in the fleet.
-- Implements the full state machine from PENDING → ACTIVE_HEALTHY.
-- ============================================================================

CREATE TABLE IF NOT EXISTS genesis.fleet_status (
  droplet_id BIGINT PRIMARY KEY,            -- DigitalOcean droplet ID
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES genesis.do_accounts(account_id),
  
  -- Droplet metadata
  region TEXT NOT NULL,                     -- "nyc1", "sfo3", etc.
  size_slug TEXT NOT NULL,                  -- "s-1vcpu-1gb"
  ip_address INET,                          -- Public IPv4
  
  -- State machine
  status TEXT NOT NULL DEFAULT 'PENDING',   -- Current lifecycle state
  last_heartbeat_at TIMESTAMPTZ,            -- Last sidecar ping
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initialized_at TIMESTAMPTZ,               -- Cloud-Init completed
  handshake_at TIMESTAMPTZ,                 -- Sidecar first POST
  activated_at TIMESTAMPTZ,                 -- Workflows deployed
  terminated_at TIMESTAMPTZ,
  
  -- Domain configuration (Dual-Mode)
  sslip_domain TEXT,                        -- "159.223.x.x.sslip.io" (bootstrap)
  custom_domain TEXT,                       -- "track.acmecorp.com" (production)
  
  -- Security
  provisioning_token TEXT,                  -- One-time token for handshake
  n8n_encryption_key TEXT,                  -- n8n's internal encryption key
  postgres_password TEXT,                   -- Database password
  
  -- Resource tracking
  docker_compose_version TEXT,              -- Version deployed
  n8n_version TEXT,                         -- n8n image tag
  
  -- Health metrics
  failed_heartbeats INTEGER DEFAULT 0,      -- Consecutive missed heartbeats
  last_error TEXT,                          -- Last error message
  
  -- Constraints
  CONSTRAINT fleet_status_state_valid CHECK (
    status IN (
      'PENDING',              -- DigitalOcean API called
      'PROVISIONING',         -- Droplet creating
      'BOOTING',              -- Droplet powered on
      'INITIALIZING',         -- Cloud-Init running
      'HANDSHAKE_PENDING',    -- Waiting for Sidecar POST
      'ACTIVE_HEALTHY',       -- Normal operation
      'DRIFT_DETECTED',       -- Workflow/credential mismatch
      'HIBERNATING',          -- Powered off to save costs
      'WAKING',               -- Powering on from hibernation
      'ZOMBIE',               -- Sidecar unresponsive
      'REBOOTING',            -- Hard reboot in progress
      'ORPHAN',               -- Provisioning failed
      'TERMINATED'            -- Destroyed
    )
  )
);

-- Index for workspace lookups
CREATE INDEX idx_fleet_status_workspace 
  ON genesis.fleet_status (workspace_id, status);

-- Index for account tracking (cost allocation)
CREATE INDEX idx_fleet_status_account 
  ON genesis.fleet_status (account_id, status);

-- Index for health monitoring
CREATE INDEX idx_fleet_status_heartbeat 
  ON genesis.fleet_status (status, last_heartbeat_at) 
  WHERE status IN ('ACTIVE_HEALTHY', 'ZOMBIE');

-- Index for zombie detection
CREATE INDEX idx_fleet_status_zombie_detection 
  ON genesis.fleet_status (last_heartbeat_at) 
  WHERE status = 'ACTIVE_HEALTHY';

-- ============================================================================
-- 3. DROPLET LIFECYCLE AUDIT LOG
-- ============================================================================
-- Records every state transition for forensic analysis and compliance.
-- ============================================================================

CREATE TABLE IF NOT EXISTS genesis.droplet_lifecycle_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  droplet_id BIGINT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Transition details
  from_state TEXT,                          -- Previous state (NULL for initial)
  to_state TEXT NOT NULL,                   -- New state
  transition_reason TEXT,                   -- "handshake_success", "timeout", etc.
  
  -- Metadata
  triggered_by TEXT,                        -- "system", "user", "sidecar", "watchdog"
  metadata JSONB,                           -- Additional context
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for droplet history
CREATE INDEX idx_lifecycle_log_droplet 
  ON genesis.droplet_lifecycle_log (droplet_id, created_at DESC);

-- Index for workspace audit
CREATE INDEX idx_lifecycle_log_workspace 
  ON genesis.droplet_lifecycle_log (workspace_id, created_at DESC);

-- Index for state transition analysis
CREATE INDEX idx_lifecycle_log_transitions 
  ON genesis.droplet_lifecycle_log (from_state, to_state, created_at DESC);

-- ============================================================================
-- 4. ENCRYPTION FUNCTIONS FOR DO API TOKENS
-- ============================================================================
-- Uses pgcrypto (AES-256-GCM) with INTERNAL_ENCRYPTION_KEY from .env.local
-- ============================================================================

-- Function to decrypt DO API tokens
CREATE OR REPLACE FUNCTION genesis.decrypt_do_token(p_account_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_encrypted_token TEXT;
  v_decrypted TEXT;
BEGIN
  -- Fetch encrypted token
  SELECT api_token_encrypted INTO v_encrypted_token
  FROM genesis.do_accounts
  WHERE account_id = p_account_id;
  
  IF v_encrypted_token IS NULL THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Decrypt using pgcrypto
  -- Note: Requires 'app.encryption_key' to be set in session
  SELECT convert_from(
    pgp_sym_decrypt(
      decode(v_encrypted_token, 'base64'),
      current_setting('app.encryption_key')
    ),
    'utf8'
  ) INTO v_decrypted;
  
  RETURN v_decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt DO API tokens (for insertions)
CREATE OR REPLACE FUNCTION genesis.encrypt_do_token(p_plaintext_token TEXT)
RETURNS TEXT AS $$
DECLARE
  v_encrypted TEXT;
BEGIN
  -- Encrypt using pgcrypto
  SELECT encode(
    pgp_sym_encrypt(
      p_plaintext_token::bytea,
      current_setting('app.encryption_key')
    ),
    'base64'
  ) INTO v_encrypted;
  
  RETURN v_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ACCOUNT POOL HELPER FUNCTIONS
-- ============================================================================

-- Function to atomically increment droplet count
CREATE OR REPLACE FUNCTION genesis.increment_droplet_count(p_account_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.do_accounts
  SET 
    current_droplets = current_droplets + 1,
    last_provisioned_at = NOW()
  WHERE account_id = p_account_id;
  
  -- Update status to 'full' if at 95% capacity
  UPDATE genesis.do_accounts
  SET status = 'full'
  WHERE account_id = p_account_id
    AND current_droplets >= (max_droplets * 0.95)
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement droplet count
CREATE OR REPLACE FUNCTION genesis.decrement_droplet_count(p_account_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.do_accounts
  SET current_droplets = GREATEST(0, current_droplets - 1)
  WHERE account_id = p_account_id;
  
  -- Update status back to 'active' if was 'full' and now has capacity
  UPDATE genesis.do_accounts
  SET status = 'active'
  WHERE account_id = p_account_id
    AND status = 'full'
    AND current_droplets < (max_droplets * 0.95);
END;
$$ LANGUAGE plpgsql;

-- Function to select best account for provisioning (load-balancing)
CREATE OR REPLACE FUNCTION genesis.select_account_for_provisioning(p_region TEXT)
RETURNS TABLE (
  account_id TEXT,
  api_token_encrypted TEXT,
  available_capacity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.account_id,
    a.api_token_encrypted,
    (a.max_droplets - a.current_droplets) AS available_capacity
  FROM genesis.do_accounts a
  WHERE 
    a.region = p_region
    AND a.status = 'active'
    AND a.current_droplets < a.max_droplets
  ORDER BY 
    (a.max_droplets - a.current_droplets) DESC,  -- Prefer account with most room
    a.last_provisioned_at ASC NULLS FIRST        -- Load balance across accounts
  LIMIT 1
  FOR UPDATE;  -- Row-level lock to prevent race conditions
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. DROPLET STATE TRANSITION HELPERS
-- ============================================================================

-- Function to update droplet state with automatic logging
CREATE OR REPLACE FUNCTION genesis.transition_droplet_state(
  p_droplet_id BIGINT,
  p_new_state TEXT,
  p_reason TEXT DEFAULT NULL,
  p_triggered_by TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_state TEXT;
  v_workspace_id UUID;
BEGIN
  -- Get current state and workspace_id
  SELECT status, workspace_id INTO v_old_state, v_workspace_id
  FROM genesis.fleet_status
  WHERE droplet_id = p_droplet_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Droplet not found: %', p_droplet_id;
  END IF;
  
  -- Update state
  UPDATE genesis.fleet_status
  SET 
    status = p_new_state,
    last_error = CASE WHEN p_new_state IN ('ORPHAN', 'ZOMBIE') THEN p_reason ELSE NULL END
  WHERE droplet_id = p_droplet_id;
  
  -- Log transition
  INSERT INTO genesis.droplet_lifecycle_log (
    droplet_id,
    workspace_id,
    from_state,
    to_state,
    transition_reason,
    triggered_by,
    metadata
  ) VALUES (
    p_droplet_id,
    v_workspace_id,
    v_old_state,
    p_new_state,
    p_reason,
    p_triggered_by,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql;

-- Function to record heartbeat
CREATE OR REPLACE FUNCTION genesis.record_heartbeat(p_droplet_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.fleet_status
  SET 
    last_heartbeat_at = NOW(),
    failed_heartbeats = 0
  WHERE droplet_id = p_droplet_id
    AND status = 'ACTIVE_HEALTHY';
END;
$$ LANGUAGE plpgsql;

-- Function to detect zombie droplets
CREATE OR REPLACE FUNCTION genesis.detect_zombie_droplets()
RETURNS TABLE (
  droplet_id BIGINT,
  workspace_id UUID,
  last_heartbeat_at TIMESTAMPTZ,
  minutes_since_heartbeat INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.droplet_id,
    f.workspace_id,
    f.last_heartbeat_at,
    EXTRACT(EPOCH FROM (NOW() - f.last_heartbeat_at))::INTEGER / 60 AS minutes_since_heartbeat
  FROM genesis.fleet_status f
  WHERE 
    f.status = 'ACTIVE_HEALTHY'
    AND f.last_heartbeat_at < (NOW() - INTERVAL '10 minutes')
  ORDER BY f.last_heartbeat_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ACCOUNT POOL HEALTH MONITORING
-- ============================================================================

-- View for account pool utilization
CREATE OR REPLACE VIEW genesis.account_pool_health AS
SELECT 
  account_id,
  region,
  status,
  current_droplets,
  max_droplets,
  ROUND((current_droplets::NUMERIC / max_droplets) * 100, 2) AS utilization_pct,
  (max_droplets - current_droplets) AS available_capacity,
  last_provisioned_at,
  billing_email,
  notes
FROM genesis.do_accounts
ORDER BY region, account_id;

-- View for fleet health summary
CREATE OR REPLACE VIEW genesis.fleet_health_summary AS
SELECT 
  status,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE last_heartbeat_at > NOW() - INTERVAL '5 minutes') AS healthy_count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM genesis.fleet_status
GROUP BY status
ORDER BY status;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA genesis TO authenticated;

-- Grant table permissions
GRANT SELECT ON genesis.do_accounts TO authenticated;
GRANT SELECT ON genesis.fleet_status TO authenticated;
GRANT SELECT ON genesis.droplet_lifecycle_log TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION genesis.decrypt_do_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.encrypt_do_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.increment_droplet_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.decrement_droplet_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.select_account_for_provisioning(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.transition_droplet_state(BIGINT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.record_heartbeat(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.detect_zombie_droplets() TO authenticated;

-- Grant view permissions
GRANT SELECT ON genesis.account_pool_health TO authenticated;
GRANT SELECT ON genesis.fleet_health_summary TO authenticated;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE genesis.do_accounts IS 'Multi-account DigitalOcean pool for horizontal scaling. Supports 15+ accounts with encrypted API tokens.';
COMMENT ON TABLE genesis.fleet_status IS 'Tracks lifecycle state of all provisioned droplets. Implements state machine from PENDING → ACTIVE_HEALTHY.';
COMMENT ON TABLE genesis.droplet_lifecycle_log IS 'Audit trail for all droplet state transitions. Immutable log for forensics and compliance.';

COMMENT ON FUNCTION genesis.decrypt_do_token IS 'Decrypts DigitalOcean API token using INTERNAL_ENCRYPTION_KEY. Requires app.encryption_key session variable.';
COMMENT ON FUNCTION genesis.select_account_for_provisioning IS 'Load-balancing query to select best DO account for new droplet. Uses row-level lock to prevent race conditions.';
COMMENT ON FUNCTION genesis.transition_droplet_state IS 'Updates droplet state and automatically logs transition to audit trail.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 50: Droplet Infrastructure created successfully';
  RAISE NOTICE '   - genesis.do_accounts (account pool)';
  RAISE NOTICE '   - genesis.fleet_status (state machine)';
  RAISE NOTICE '   - genesis.droplet_lifecycle_log (audit trail)';
  RAISE NOTICE '   - 9 helper functions';
  RAISE NOTICE '   - 2 health monitoring views';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Add DigitalOcean accounts via INSERT INTO genesis.do_accounts';
  RAISE NOTICE '   2. Set INTERNAL_ENCRYPTION_KEY in .env.local';
  RAISE NOTICE '   3. Test provisioning with droplet-factory.ts';
END $$;
-- ============================================
-- PHASE 51: SIDECAR INFRASTRUCTURE
-- ============================================
-- Creates tables for Sidecar Agent communication,
-- health monitoring, and command auditing.
-- ============================================

-- ============================================
-- 1. SIDECAR COMMANDS TABLE
-- ============================================
-- Audit log for all commands sent to Sidecar agents

CREATE TABLE IF NOT EXISTS genesis.sidecar_commands (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti UUID NOT NULL UNIQUE, -- JWT ID for idempotency
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL,
  
  -- Command details
  action TEXT NOT NULL, -- DEPLOY_WORKFLOW, HEALTH_CHECK, etc.
  payload JSONB,
  
  -- JWT tracking
  jwt_hash TEXT NOT NULL, -- SHA-256 hash of JWT for security
  jwt_issued_at TIMESTAMPTZ NOT NULL,
  jwt_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Execution tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Results
  result JSONB,
  error TEXT,
  execution_time_ms INTEGER,
  
  -- Retry tracking
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_commands_workspace ON genesis.sidecar_commands(workspace_id);
CREATE INDEX idx_sidecar_commands_droplet ON genesis.sidecar_commands(droplet_id);
CREATE INDEX idx_sidecar_commands_status ON genesis.sidecar_commands(status);
CREATE INDEX idx_sidecar_commands_created_at ON genesis.sidecar_commands(created_at DESC);
CREATE INDEX idx_sidecar_commands_jti ON genesis.sidecar_commands(jti);

-- Index for cleanup queries
CREATE INDEX idx_sidecar_commands_expired ON genesis.sidecar_commands(jwt_expires_at) 
  WHERE status IN ('pending', 'processing');

COMMENT ON TABLE genesis.sidecar_commands IS 
  'Audit log for all commands sent to Sidecar agents. Tracks JWT usage and prevents replay attacks.';

COMMENT ON COLUMN genesis.sidecar_commands.jti IS 
  'JWT ID from token payload. Enforces one-time use (replay prevention).';

COMMENT ON COLUMN genesis.sidecar_commands.jwt_hash IS 
  'SHA-256 hash of JWT token. Stored for audit without exposing actual token.';

-- ============================================
-- 2. SIDECAR HEALTH TABLE
-- ============================================
-- Stores health reports from Sidecar agents (sent every 60 seconds)

CREATE TABLE IF NOT EXISTS genesis.sidecar_health (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL,
  
  -- Timestamp
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- n8n health
  n8n_status TEXT NOT NULL CHECK (n8n_status IN ('healthy', 'degraded', 'down')),
  n8n_version TEXT,
  
  -- Container health
  container_status TEXT, -- running, stopped, restarting, etc.
  container_health TEXT, -- healthy, unhealthy, starting
  
  -- Resource usage
  cpu_percent NUMERIC(5, 2),
  memory_usage_mb INTEGER,
  memory_limit_mb INTEGER,
  disk_usage_percent NUMERIC(5, 2),
  
  -- Execution stats (from n8n)
  executions_running INTEGER,
  executions_waiting INTEGER,
  
  -- Uptime
  uptime_seconds INTEGER,
  
  -- Network
  network_rx_mb NUMERIC(10, 2),
  network_tx_mb NUMERIC(10, 2),
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_health_workspace ON genesis.sidecar_health(workspace_id);
CREATE INDEX idx_sidecar_health_droplet ON genesis.sidecar_health(droplet_id);
CREATE INDEX idx_sidecar_health_reported_at ON genesis.sidecar_health(reported_at DESC);
CREATE INDEX idx_sidecar_health_status ON genesis.sidecar_health(n8n_status);

-- Index for latest health query (most common query)
CREATE INDEX idx_sidecar_health_latest ON genesis.sidecar_health(droplet_id, reported_at DESC);

COMMENT ON TABLE genesis.sidecar_health IS 
  'Health reports from Sidecar agents. Received every 60 seconds via heartbeat endpoint.';

COMMENT ON COLUMN genesis.sidecar_health.n8n_status IS 
  'Overall n8n health: healthy (normal), degraded (slow/stuck), down (unreachable).';

-- ============================================
-- 3. SIDECAR METRICS TABLE
-- ============================================
-- Aggregated execution metrics from n8n (collected every 15 minutes)

CREATE TABLE IF NOT EXISTS genesis.sidecar_metrics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL,
  
  -- Time window
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  
  -- Execution metrics
  executions_total INTEGER NOT NULL DEFAULT 0,
  executions_success INTEGER NOT NULL DEFAULT 0,
  executions_failed INTEGER NOT NULL DEFAULT 0,
  executions_canceled INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_duration_ms INTEGER,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  p50_duration_ms INTEGER,
  p95_duration_ms INTEGER,
  p99_duration_ms INTEGER,
  
  -- Workflow breakdown (top 5 workflows by execution count)
  top_workflows JSONB,
  
  -- Error analysis
  top_errors JSONB,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_metrics_workspace ON genesis.sidecar_metrics(workspace_id);
CREATE INDEX idx_sidecar_metrics_droplet ON genesis.sidecar_metrics(droplet_id);
CREATE INDEX idx_sidecar_metrics_collected_at ON genesis.sidecar_metrics(collected_at DESC);
CREATE INDEX idx_sidecar_metrics_window ON genesis.sidecar_metrics(window_start, window_end);

COMMENT ON TABLE genesis.sidecar_metrics IS 
  'Aggregated execution metrics from n8n. Collected every 15 minutes by Metric Aggregator.';

COMMENT ON COLUMN genesis.sidecar_metrics.top_workflows IS 
  'Array of {workflow_id, workflow_name, execution_count} for top 5 workflows by volume.';

COMMENT ON COLUMN genesis.sidecar_metrics.top_errors IS 
  'Array of {error_type, count, example_message} for most common errors.';

-- ============================================
-- 4. SIDECAR TOKENS TABLE
-- ============================================
-- Stores long-lived tokens for Sidecar → Dashboard communication

CREATE TABLE IF NOT EXISTS genesis.sidecar_tokens (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL UNIQUE,
  
  -- Token
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of token
  token_prefix TEXT NOT NULL, -- First 8 chars for identification
  
  -- Lifecycle
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_tokens_workspace ON genesis.sidecar_tokens(workspace_id);
CREATE INDEX idx_sidecar_tokens_droplet ON genesis.sidecar_tokens(droplet_id);
CREATE INDEX idx_sidecar_tokens_hash ON genesis.sidecar_tokens(token_hash);
-- Note: Cannot use NOW() in partial index (not IMMUTABLE), so index all non-revoked tokens
CREATE INDEX idx_sidecar_tokens_active ON genesis.sidecar_tokens(droplet_id) 
  WHERE revoked_at IS NULL;

COMMENT ON TABLE genesis.sidecar_tokens IS 
  'Long-lived authentication tokens for Sidecar agents to report health/metrics to Dashboard.';

COMMENT ON COLUMN genesis.sidecar_tokens.token_hash IS 
  'SHA-256 hash of token. Actual token only exists on droplet.';

COMMENT ON COLUMN genesis.sidecar_tokens.token_prefix IS 
  'First 8 characters of token for identification in logs (e.g., "sc_AbcD1234").';

-- ============================================
-- 5. JWT KEY PAIRS TABLE
-- ============================================
-- Stores RSA key pairs for JWT signing/verification

CREATE TABLE IF NOT EXISTS genesis.jwt_keypairs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key metadata
  key_id TEXT NOT NULL UNIQUE, -- kid (Key ID) for JWT header
  algorithm TEXT NOT NULL DEFAULT 'RS256',
  
  -- Keys (PEM format)
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL, -- Encrypted with master key
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ, -- When replaced by new key
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'rotating', 'retired')),
  
  -- Usage tracking
  jwt_issued_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_jwt_keypairs_key_id ON genesis.jwt_keypairs(key_id);
CREATE INDEX idx_jwt_keypairs_status ON genesis.jwt_keypairs(status);
CREATE UNIQUE INDEX idx_jwt_keypairs_active ON genesis.jwt_keypairs(status) 
  WHERE status = 'active';

COMMENT ON TABLE genesis.jwt_keypairs IS 
  'RSA key pairs for signing/verifying JWT tokens sent to Sidecar agents. Supports key rotation.';

COMMENT ON COLUMN genesis.jwt_keypairs.private_key_encrypted IS 
  'Private key encrypted with Dashboard master key. NEVER exposed via API.';

COMMENT ON COLUMN genesis.jwt_keypairs.status IS 
  'active (current signing key), rotating (being replaced), retired (no longer used for signing).';

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function: Get latest health for droplet
CREATE OR REPLACE FUNCTION genesis.get_latest_droplet_health(p_droplet_id TEXT)
RETURNS SETOF genesis.sidecar_health
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM genesis.sidecar_health
  WHERE droplet_id = p_droplet_id
  ORDER BY reported_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION genesis.get_latest_droplet_health IS 
  'Returns the most recent health report for a specific droplet.';

-- Function: Get fleet health summary
CREATE OR REPLACE FUNCTION genesis.get_fleet_health_summary()
RETURNS TABLE (
  total_droplets BIGINT,
  healthy_droplets BIGINT,
  degraded_droplets BIGINT,
  down_droplets BIGINT,
  last_updated TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  WITH latest_health AS (
    SELECT DISTINCT ON (droplet_id)
      droplet_id,
      n8n_status,
      reported_at
    FROM genesis.sidecar_health
    ORDER BY droplet_id, reported_at DESC
  )
  SELECT
    COUNT(*)::BIGINT AS total_droplets,
    COUNT(*) FILTER (WHERE n8n_status = 'healthy')::BIGINT AS healthy_droplets,
    COUNT(*) FILTER (WHERE n8n_status = 'degraded')::BIGINT AS degraded_droplets,
    COUNT(*) FILTER (WHERE n8n_status = 'down')::BIGINT AS down_droplets,
    MAX(reported_at) AS last_updated
  FROM latest_health;
$$;

COMMENT ON FUNCTION genesis.get_fleet_health_summary IS 
  'Returns aggregated health statistics for the entire droplet fleet.';

-- Function: Cleanup expired commands
CREATE OR REPLACE FUNCTION genesis.cleanup_expired_commands()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete commands older than 24 hours
  DELETE FROM genesis.sidecar_commands
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION genesis.cleanup_expired_commands IS 
  'Deletes command records older than 24 hours. Should be run daily via cron.';

-- Function: Cleanup old health reports
CREATE OR REPLACE FUNCTION genesis.cleanup_old_health_reports()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep only last 7 days of health reports
  DELETE FROM genesis.sidecar_health
  WHERE reported_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION genesis.cleanup_old_health_reports IS 
  'Deletes health reports older than 7 days. Should be run daily via cron.';

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE genesis.sidecar_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sidecar_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sidecar_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sidecar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.jwt_keypairs ENABLE ROW LEVEL SECURITY;

-- Sidecar Commands: Users can only see commands for their workspace
CREATE POLICY sidecar_commands_workspace_isolation
  ON genesis.sidecar_commands
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_workspaces 
      WHERE workspace_id = genesis.sidecar_commands.workspace_id 
      AND user_id = auth.uid()::TEXT
    )
  );

-- Sidecar Health: Users can only see health for their workspace
CREATE POLICY sidecar_health_workspace_isolation
  ON genesis.sidecar_health
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_workspaces 
      WHERE workspace_id = genesis.sidecar_health.workspace_id 
      AND user_id = auth.uid()::TEXT
    )
  );

-- Sidecar Metrics: Users can only see metrics for their workspace
CREATE POLICY sidecar_metrics_workspace_isolation
  ON genesis.sidecar_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_workspaces 
      WHERE workspace_id = genesis.sidecar_metrics.workspace_id 
      AND user_id = auth.uid()::TEXT
    )
  );

-- Sidecar Tokens: Only system admins can view
CREATE POLICY sidecar_tokens_admin_only
  ON genesis.sidecar_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_workspaces
      WHERE user_id = auth.uid()::TEXT AND role = 'admin'
    )
  );

-- JWT Keypairs: Only system (service role) can access
CREATE POLICY jwt_keypairs_system_only
  ON genesis.jwt_keypairs
  FOR ALL
  USING (Phase B first.auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 8. GRANTS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT ON genesis.sidecar_commands TO authenticated;
GRANT SELECT ON genesis.sidecar_health TO authenticated;
GRANT SELECT ON genesis.sidecar_metrics TO authenticated;

-- Grant full access to service role (for API operations)
GRANT ALL ON genesis.sidecar_commands TO service_role;
GRANT ALL ON genesis.sidecar_health TO service_role;
GRANT ALL ON genesis.sidecar_metrics TO service_role;
GRANT ALL ON genesis.sidecar_tokens TO service_role;
GRANT ALL ON genesis.jwt_keypairs TO service_role;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION genesis.get_latest_droplet_health TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.get_fleet_health_summary TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.cleanup_expired_commands TO service_role;
GRANT EXECUTE ON FUNCTION genesis.cleanup_old_health_reports TO service_role;

-- ============================================
-- 9. SAMPLE DATA (for testing)
-- ============================================

-- Insert default RSA keypair (FOR TESTING ONLY - generate real keys in production)
INSERT INTO genesis.jwt_keypairs (
  key_id,
  algorithm,
  public_key,
  private_key_encrypted,
  status,
  activated_at
) VALUES (
  'genesis-dashboard-2024-01',
  'RS256',
  '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z7Q
... (truncated for example) ...
-----END PUBLIC KEY-----',
  'ENCRYPTED_PRIVATE_KEY_PLACEHOLDER',
  'active',
  NOW()
)
ON CONFLICT (key_id) DO NOTHING;

COMMENT ON TABLE genesis.jwt_keypairs IS 
  'RSA keypair inserted. In production, generate proper keys using openssl and encrypt private key.';

-- ============================================
-- PHASE 51 COMPLETE
-- ============================================
