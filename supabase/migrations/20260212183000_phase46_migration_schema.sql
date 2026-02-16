-- GENESIS PHASE 46: MIGRATION DATABASE SCHEMA
-- 
-- Purpose: State persistence for zero-downtime data migrations
-- Tables:
--   - genesis.migration_state: Current migration state per workspace
--   - genesis.migration_events: Audit log of migration operations
--
-- Security: RLS enabled, service role only (admin operations)

-- ============================================
-- MIGRATION STATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.migration_state (
  workspace_id TEXT PRIMARY KEY,
  source_table TEXT NOT NULL,
  target_table TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  dual_write_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Backfill tracking
  backfill_progress REAL NOT NULL DEFAULT 0.0,
  backfill_last_id TEXT,
  backfill_batch_size INTEGER NOT NULL DEFAULT 500,
  backfill_total_rows BIGINT NOT NULL DEFAULT 0,
  backfill_processed_rows BIGINT NOT NULL DEFAULT 0,
  
  -- Parity checking
  parity_score REAL NOT NULL DEFAULT 0.0,
  last_verified_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT migration_state_status_check CHECK (
    status IN ('idle', 'dual-write', 'backfilling', 'verifying', 'ready', 'cutover', 'completed', 'failed', 'rolled-back')
  ),
  CONSTRAINT migration_state_progress_check CHECK (backfill_progress >= 0 AND backfill_progress <= 100),
  CONSTRAINT migration_state_parity_check CHECK (parity_score >= 0 AND parity_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_migration_state_status ON genesis.migration_state (status);
CREATE INDEX IF NOT EXISTS idx_migration_state_updated ON genesis.migration_state (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_state_dual_write ON genesis.migration_state (dual_write_enabled) WHERE dual_write_enabled = true;

-- RLS: Service role only (admin operations)
ALTER TABLE genesis.migration_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on migration_state"
  ON genesis.migration_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- MIGRATION EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.migration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_migration_events_workspace 
    FOREIGN KEY (workspace_id) 
    REFERENCES genesis.migration_state (workspace_id) 
    ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT migration_events_type_check CHECK (
    event_type IN ('init', 'dual-write-enable', 'dual-write-disable', 'backfill-start', 'backfill-batch', 'backfill-complete', 'parity-check', 'cutover', 'rollback', 'error')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_migration_events_workspace ON genesis.migration_events (workspace_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_migration_events_type ON genesis.migration_events (event_type);
CREATE INDEX IF NOT EXISTS idx_migration_events_timestamp ON genesis.migration_events (timestamp DESC);

-- RLS: Service role only
ALTER TABLE genesis.migration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on migration_events"
  ON genesis.migration_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION genesis.update_migration_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_migration_state_updated_at
  BEFORE UPDATE ON genesis.migration_state
  FOR EACH ROW
  EXECUTE FUNCTION genesis.update_migration_state_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON genesis.migration_state TO service_role;
GRANT ALL ON genesis.migration_events TO service_role;
