-- ============================================
-- GENESIS: WORKSPACE HEALTH TABLE
-- Stores per-workspace per-credential health check results.
-- Run on-demand via POST /api/admin/workspace-health/run.
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.workspace_health (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID       NOT NULL,
  credential_id UUID,                  -- FK to workspace_credentials (null for n8n/sidecar)
  credential_type TEXT    NOT NULL,    -- 'openai_api', 'anthropic_api', 'smtp', 'n8n_sidecar', etc.
  service_name TEXT       NOT NULL,    -- human-readable display name
  status      TEXT        NOT NULL CHECK (status IN ('ok', 'degraded', 'error', 'unchecked')),
  error_message TEXT,
  latency_ms  INTEGER,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_health_workspace
  ON genesis.workspace_health(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_health_checked
  ON genesis.workspace_health(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_health_status
  ON genesis.workspace_health(status);

-- Service role only — admin routes use supabaseAdmin which bypasses RLS
ALTER TABLE genesis.workspace_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_health_service_only ON genesis.workspace_health
  USING (false)
  WITH CHECK (false);
