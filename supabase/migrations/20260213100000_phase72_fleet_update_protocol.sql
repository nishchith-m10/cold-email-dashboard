-- ============================================
-- GENESIS PHASE 72: ZERO-DOWNTIME FLEET UPDATE PROTOCOL
-- Database Migration
--
-- Tables:
--   1. genesis.tenant_versions - Per-tenant version tracking
--   2. genesis.workflow_templates - Golden template repository
--   3. genesis.update_history - Audit trail for all updates
--
-- @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Section 68.3
-- ============================================

-- Ensure genesis schema exists
CREATE SCHEMA IF NOT EXISTS genesis;

-- ============================================
-- TABLE 1: genesis.tenant_versions
-- Tracks what version each tenant is currently running.
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.tenant_versions (
  workspace_id       UUID PRIMARY KEY,
  dashboard_version  TEXT NOT NULL DEFAULT '1.0.0',
  workflow_email_1   TEXT NOT NULL DEFAULT '1.0.0',
  workflow_email_2   TEXT NOT NULL DEFAULT '1.0.0',
  workflow_email_3   TEXT NOT NULL DEFAULT '1.0.0',
  workflow_research  TEXT NOT NULL DEFAULT '1.0.0',
  workflow_opt_out   TEXT NOT NULL DEFAULT '1.0.0',
  sidecar_version    TEXT NOT NULL DEFAULT '1.0.0',
  last_update_at     TIMESTAMPTZ,
  update_status      TEXT NOT NULL DEFAULT 'current'
                     CHECK (update_status IN ('current', 'updating', 'failed', 'rollback')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE 2: genesis.workflow_templates
-- Golden template repository with versioned JSON storage.
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.workflow_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name    TEXT NOT NULL,
  version          TEXT NOT NULL,
  workflow_json    JSONB NOT NULL,
  changelog        TEXT,
  is_current       BOOLEAN NOT NULL DEFAULT FALSE,
  is_canary        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT,
  UNIQUE(workflow_name, version)
);

-- ============================================
-- TABLE 3: genesis.update_history
-- Audit trail for all fleet updates.
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.update_history (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID,                        -- NULL for fleet-wide
  component          TEXT NOT NULL,                -- workflow_email_1, sidecar, etc.
  from_version       TEXT NOT NULL,
  to_version         TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'rolled_back')),
  error_message      TEXT,
  executed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_by        TEXT,
  rollout_strategy   TEXT NOT NULL DEFAULT 'staged'
                     CHECK (rollout_strategy IN ('canary', 'staged', 'immediate')),
  affected_tenants   INTEGER DEFAULT 0,
  rollout_id         UUID,                        -- Links to a specific rollout session
  wave_number        INTEGER,                     -- Which wave this update belongs to
  metadata           JSONB DEFAULT '{}'::JSONB
);

-- ============================================
-- TABLE 4: genesis.fleet_rollouts
-- Tracks active and historical rollout sessions.
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.fleet_rollouts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component          TEXT NOT NULL,                -- workflow_email_1, sidecar, etc.
  from_version       TEXT NOT NULL,
  to_version         TEXT NOT NULL,
  strategy           TEXT NOT NULL DEFAULT 'staged'
                     CHECK (strategy IN ('canary', 'staged', 'immediate')),
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'canary', 'wave_1', 'wave_2', 'wave_3', 'wave_4', 'completed', 'paused', 'aborted', 'rolled_back')),
  total_tenants      INTEGER NOT NULL DEFAULT 0,
  updated_tenants    INTEGER NOT NULL DEFAULT 0,
  failed_tenants     INTEGER NOT NULL DEFAULT 0,
  error_threshold    REAL NOT NULL DEFAULT 0.005,  -- 0.5% default
  canary_percentage  REAL NOT NULL DEFAULT 0.01,   -- 1% default
  initiated_by       TEXT NOT NULL,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  paused_at          TIMESTAMPTZ,
  abort_reason       TEXT,
  metadata           JSONB DEFAULT '{}'::JSONB
);

-- ============================================
-- TABLE 5: genesis.fleet_update_queue
-- Supabase-backed job queue for update commands.
-- Replaces BullMQ for Vercel-compatible operation.
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.fleet_update_queue (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rollout_id         UUID NOT NULL REFERENCES genesis.fleet_rollouts(id),
  workspace_id       UUID NOT NULL,
  component          TEXT NOT NULL,
  from_version       TEXT NOT NULL,
  to_version         TEXT NOT NULL,
  priority           INTEGER NOT NULL DEFAULT 0,   -- Higher = processed first
  status             TEXT NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'rolled_back')),
  attempt_count      INTEGER NOT NULL DEFAULT 0,
  max_attempts       INTEGER NOT NULL DEFAULT 3,
  error_message      TEXT,
  wave_number        INTEGER NOT NULL DEFAULT 0,
  queued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  metadata           JSONB DEFAULT '{}'::JSONB
);

-- ============================================
-- INDEXES
-- ============================================

-- tenant_versions: lookup by update_status
CREATE INDEX IF NOT EXISTS idx_tenant_versions_status
  ON genesis.tenant_versions (update_status);

-- workflow_templates: lookup current template by name
CREATE INDEX IF NOT EXISTS idx_workflow_templates_current
  ON genesis.workflow_templates (workflow_name, is_current)
  WHERE is_current = TRUE;

-- workflow_templates: lookup canary template
CREATE INDEX IF NOT EXISTS idx_workflow_templates_canary
  ON genesis.workflow_templates (workflow_name, is_canary)
  WHERE is_canary = TRUE;

-- update_history: lookup by rollout
CREATE INDEX IF NOT EXISTS idx_update_history_rollout
  ON genesis.update_history (rollout_id);

-- update_history: lookup by workspace
CREATE INDEX IF NOT EXISTS idx_update_history_workspace
  ON genesis.update_history (workspace_id)
  WHERE workspace_id IS NOT NULL;

-- update_history: lookup by timestamp
CREATE INDEX IF NOT EXISTS idx_update_history_executed_at
  ON genesis.update_history (executed_at DESC);

-- fleet_rollouts: active rollouts
CREATE INDEX IF NOT EXISTS idx_fleet_rollouts_status
  ON genesis.fleet_rollouts (status)
  WHERE status NOT IN ('completed', 'aborted', 'rolled_back');

-- fleet_update_queue: pending jobs for processing
CREATE INDEX IF NOT EXISTS idx_fleet_update_queue_pending
  ON genesis.fleet_update_queue (priority DESC, queued_at ASC)
  WHERE status = 'queued';

-- fleet_update_queue: jobs by rollout
CREATE INDEX IF NOT EXISTS idx_fleet_update_queue_rollout
  ON genesis.fleet_update_queue (rollout_id, status);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE genesis.tenant_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.update_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.fleet_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.fleet_update_queue ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin operations only)
CREATE POLICY "service_role_tenant_versions" ON genesis.tenant_versions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_workflow_templates" ON genesis.workflow_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_update_history" ON genesis.update_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_fleet_rollouts" ON genesis.fleet_rollouts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_fleet_update_queue" ON genesis.fleet_update_queue
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION genesis.update_tenant_versions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_versions_updated_at
  BEFORE UPDATE ON genesis.tenant_versions
  FOR EACH ROW
  EXECUTE FUNCTION genesis.update_tenant_versions_timestamp();
