-- D8-006: Watchdog Persistence Tables
-- Stores watchdog run history and detected drifts for audit/analysis.

-- Ensure genesis schema exists
CREATE SCHEMA IF NOT EXISTS genesis;

-- Watchdog runs table
CREATE TABLE IF NOT EXISTS genesis.watchdog_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'drift_detection',  -- 'drift_detection' | 'healing' | 'infrastructure'
  trigger TEXT NOT NULL DEFAULT 'manual',             -- 'scheduled' | 'heartbeat' | 'manual' | 'post_deployment' | 'post_rotation'
  workspace_ids TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  workspaces_scanned INT DEFAULT 0,
  total_drifts_found INT DEFAULT 0,
  drifts_healed INT DEFAULT 0,
  drifts_failed INT DEFAULT 0,
  drifts_by_type JSONB DEFAULT '{}',
  drifts_by_severity JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  duration_ms INT,
  initiated_by TEXT,  -- User ID for manual triggers
  metadata JSONB DEFAULT '{}'
);

-- Watchdog drifts table
CREATE TABLE IF NOT EXISTS genesis.watchdog_drifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES genesis.watchdog_runs(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  drift_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  details JSONB DEFAULT '{}',
  auto_healable BOOLEAN NOT NULL DEFAULT false,
  healed BOOLEAN NOT NULL DEFAULT false,
  healed_at TIMESTAMPTZ,
  healing_attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_watchdog_runs_started_at ON genesis.watchdog_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchdog_runs_status ON genesis.watchdog_runs (status);
CREATE INDEX IF NOT EXISTS idx_watchdog_drifts_run_id ON genesis.watchdog_drifts (run_id);
CREATE INDEX IF NOT EXISTS idx_watchdog_drifts_workspace ON genesis.watchdog_drifts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_watchdog_drifts_type ON genesis.watchdog_drifts (drift_type);

COMMENT ON TABLE genesis.watchdog_runs IS 'D8-006: Persisted watchdog run history for audit and analysis';
COMMENT ON TABLE genesis.watchdog_drifts IS 'D8-006: Individual drift records detected during watchdog runs';
