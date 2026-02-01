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
    workspace_id UUID NOT NULL,
    
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
    analyze BOOLEAN DEFAULT FALSE,
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
    WHERE status != 'completed';

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
