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
