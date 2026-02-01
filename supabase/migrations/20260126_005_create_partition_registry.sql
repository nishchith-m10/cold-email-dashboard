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
    workspace_id UUID PRIMARY KEY,
    
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
