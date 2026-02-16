-- ============================================
-- GENESIS PHASE 71: API HEALTH SNAPSHOTS TABLE
-- ============================================
-- Migration: Create api_health_snapshots table for storing health check results
-- Author: Worker Agent 1
-- Date: 2026-02-12
-- LAW #5 Compliance: 16-nines quality with indexes, RLS, and constraints

-- Create genesis schema if not exists
CREATE SCHEMA IF NOT EXISTS genesis;

-- ============================================
-- TABLE: api_health_snapshots
-- ============================================
-- Stores historical snapshots of API health checks for trending and debugging
CREATE TABLE IF NOT EXISTS genesis.api_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Health report data (full JSON from HealthReport type)
  report JSONB NOT NULL,
  
  -- Denormalized fields for fast querying
  overall_status TEXT NOT NULL CHECK (overall_status IN ('ok', 'degraded', 'error')),
  check_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  degraded_count INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  total_latency_ms INTEGER,
  slowest_service TEXT,
  
  -- Metadata
  triggered_by TEXT, -- 'manual', 'scheduled', 'cron'
  triggered_by_user_id TEXT
);

-- ============================================
-- INDEXES
-- ============================================
-- Index for historical queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_api_health_snapshots_created_at 
  ON genesis.api_health_snapshots (created_at DESC);

-- Index for status filtering and alerting queries
CREATE INDEX IF NOT EXISTS idx_api_health_snapshots_status 
  ON genesis.api_health_snapshots (overall_status, created_at DESC);

-- Composite index for error tracking
CREATE INDEX IF NOT EXISTS idx_api_health_snapshots_errors 
  ON genesis.api_health_snapshots (error_count, created_at DESC) 
  WHERE error_count > 0;

-- JSONB GIN index for JSON queries on report field
CREATE INDEX IF NOT EXISTS idx_api_health_snapshots_report_gin 
  ON genesis.api_health_snapshots USING GIN (report);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on the table
ALTER TABLE genesis.api_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin read access
-- Note: SUPER_ADMIN_IDS checked in application layer, this allows service role
CREATE POLICY api_health_snapshots_read_policy 
  ON genesis.api_health_snapshots
  FOR SELECT
  USING (true); -- Application layer enforces super admin check

-- Policy: Super Admin write access (via service role)
CREATE POLICY api_health_snapshots_write_policy 
  ON genesis.api_health_snapshots
  FOR INSERT
  WITH CHECK (true); -- Application layer enforces super admin check

-- ============================================
-- DATA RETENTION
-- ============================================
-- Comment with retention policy (enforced in application or pg_cron)
COMMENT ON TABLE genesis.api_health_snapshots IS 
  'API health check snapshots. Retention: 365 days (cleanup via pg_cron or app logic).';

-- ============================================
-- GRANTS
-- ============================================
-- Grant access to service role (used by supabaseAdmin)
GRANT ALL ON genesis.api_health_snapshots TO service_role;
GRANT USAGE ON SCHEMA genesis TO service_role;

-- ============================================
-- COMPLETION
-- ============================================
-- Migration complete
-- Table: genesis.api_health_snapshots
-- Indexes: 4 (created_at, status, errors, report_gin)
-- RLS: Enabled with read/write policies
-- Ready for Phase 71 API endpoints
