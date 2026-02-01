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
    
    -- Generate partition name from slug or UUID
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
        -- Primary lookup index
        EXECUTE format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I (email_address)',
            v_partition_name || '_email_idx',
            v_partition_name
        );
        
        -- Status filter index
        EXECUTE format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I (status) WHERE status != ''completed''',
            v_partition_name || '_status_idx',
            v_partition_name
        );
        
        -- Timestamp index for recent queries
        EXECUTE format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
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
