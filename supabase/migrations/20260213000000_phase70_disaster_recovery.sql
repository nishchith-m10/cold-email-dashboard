-- ============================================
-- GENESIS PHASE 70: DISASTER RECOVERY DATABASE SCHEMA
-- ============================================
-- Migration: Create disaster recovery tracking tables
-- Author: Worker 1
-- Date: 2026-02-13
-- LAW #5 Compliance: 16-nines quality with indexes, RLS, and constraints

-- Create genesis schema if not exists
CREATE SCHEMA IF NOT EXISTS genesis;

-- ============================================
-- TABLE: disaster_recovery_snapshots
-- ============================================
-- Tracks all snapshots across regions with cost estimation
CREATE TABLE IF NOT EXISTS genesis.disaster_recovery_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  droplet_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  snapshot_name TEXT NOT NULL,
  region TEXT NOT NULL,
  backup_region TEXT,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental')),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed', 'expired')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cost_estimate NUMERIC(10, 4) DEFAULT 0.00,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_dry_run BOOLEAN NOT NULL DEFAULT false,

  -- Constraints
  CONSTRAINT unique_workspace_region_created UNIQUE (workspace_id, region, created_at),
  CONSTRAINT valid_regions CHECK (
    region IN ('nyc1', 'sfo1', 'fra1', 'lon1', 'sgp1')
  ),
  CONSTRAINT valid_backup_region CHECK (
    backup_region IS NULL OR backup_region IN ('nyc1', 'sfo1', 'fra1', 'lon1', 'sgp1')
  )
);

-- Indexes for disaster_recovery_snapshots
CREATE INDEX IF NOT EXISTS idx_dr_snapshots_workspace_id 
  ON genesis.disaster_recovery_snapshots (workspace_id);

CREATE INDEX IF NOT EXISTS idx_dr_snapshots_region 
  ON genesis.disaster_recovery_snapshots (region);

CREATE INDEX IF NOT EXISTS idx_dr_snapshots_status 
  ON genesis.disaster_recovery_snapshots (status);

CREATE INDEX IF NOT EXISTS idx_dr_snapshots_created_at 
  ON genesis.disaster_recovery_snapshots (created_at DESC);

-- Partial index for active snapshots
CREATE INDEX IF NOT EXISTS idx_dr_snapshots_active 
  ON genesis.disaster_recovery_snapshots (workspace_id, region, created_at DESC) 
  WHERE status = 'completed';

-- Partial index for expiring snapshots (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_dr_snapshots_expiring 
  ON genesis.disaster_recovery_snapshots (expires_at) 
  WHERE status = 'completed';

-- JSONB GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_dr_snapshots_metadata_gin 
  ON genesis.disaster_recovery_snapshots USING GIN (metadata);

-- RLS: Service role only (admin operations)
ALTER TABLE genesis.disaster_recovery_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on disaster_recovery_snapshots"
  ON genesis.disaster_recovery_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABLE: regional_health_status
-- ============================================
-- Tracks real-time health status of each DO region
CREATE TABLE IF NOT EXISTS genesis.regional_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL UNIQUE CHECK (
    region IN ('nyc1', 'sfo1', 'fra1', 'lon1', 'sgp1')
  ),
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (
    status IN ('healthy', 'degraded', 'outage')
  ),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INTEGER,
  error_message TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for regional_health_status
CREATE INDEX IF NOT EXISTS idx_regional_health_status 
  ON genesis.regional_health_status (status);

CREATE INDEX IF NOT EXISTS idx_regional_health_updated_at 
  ON genesis.regional_health_status (updated_at DESC);

-- RLS: Service role only (admin operations)
ALTER TABLE genesis.regional_health_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on regional_health_status"
  ON genesis.regional_health_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE genesis.disaster_recovery_snapshots IS 
  'Tracks all disaster recovery snapshots with cost estimation and dry-run support';

COMMENT ON TABLE genesis.regional_health_status IS 
  'Real-time health monitoring for DigitalOcean regions';

COMMENT ON COLUMN genesis.disaster_recovery_snapshots.is_dry_run IS 
  'True if snapshot was created in mock mode without actual DO API calls';

COMMENT ON COLUMN genesis.regional_health_status.consecutive_failures IS 
  'Counter for consecutive heartbeat failures, resets to 0 on success';
