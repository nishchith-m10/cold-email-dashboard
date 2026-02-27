-- ============================================
-- Domain 5: RLS Hardening & Multi-Tenant Security Posture
-- ============================================
-- This migration:
--   1. Creates set_tenant_context() RPC function
--   2. Hardens existing RLS policies (removes insecure NULL fallback)
--   3. Adds RLS + policies to tables that were missing coverage
--   4. Adds service_role full-access policies so admin operations continue
-- ============================================

-- ============================================
-- 1. Tenant context RPC function
-- ============================================
-- Called by createTenantSupabaseClient() before tenant-scoped queries.
-- Sets a session variable that RLS policies reference.
CREATE OR REPLACE FUNCTION public.set_tenant_context(workspace_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_workspace_id', workspace_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all roles so both anon and authenticated can call it.
GRANT EXECUTE ON FUNCTION public.set_tenant_context(TEXT) TO anon, authenticated, service_role;

-- ============================================
-- 2. Fix existing RLS policies (remove insecure NULL fallback)
-- ============================================
-- Current policies have: OR current_setting('app.workspace_id', true) IS NULL
-- That means when no context is set, ALL rows are visible — defeating the purpose.
-- Replace with strict policies that require the context to be set.
-- NOTE: We transition from 'app.workspace_id' to 'app.current_workspace_id' to match
-- the new set_tenant_context() function.

-- 2a. contacts
DROP POLICY IF EXISTS contacts_workspace_isolation ON contacts;
CREATE POLICY contacts_tenant_isolation ON contacts
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- Service role bypass (supabaseAdmin continues to work)
CREATE POLICY contacts_service_role_access ON contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2b. email_events
DROP POLICY IF EXISTS email_events_workspace_isolation ON email_events;
CREATE POLICY email_events_tenant_isolation ON email_events
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY email_events_service_role_access ON email_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2c. llm_usage
DROP POLICY IF EXISTS llm_usage_workspace_isolation ON llm_usage;
CREATE POLICY llm_usage_tenant_isolation ON llm_usage
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY llm_usage_service_role_access ON llm_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2d. daily_stats
DROP POLICY IF EXISTS daily_stats_workspace_isolation ON daily_stats;
CREATE POLICY daily_stats_tenant_isolation ON daily_stats
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY daily_stats_service_role_access ON daily_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. Add RLS to tables that were missing coverage
-- ============================================

-- 3a. workspaces — RLS enabled, filter by id = current_workspace_id
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspaces_tenant_isolation ON workspaces
  FOR ALL
  USING (id = current_setting('app.current_workspace_id', true))
  WITH CHECK (id = current_setting('app.current_workspace_id', true));

CREATE POLICY workspaces_service_role_access ON workspaces
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3b. user_workspaces — filter by workspace_id
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_workspaces_tenant_isolation ON user_workspaces
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY user_workspaces_service_role_access ON user_workspaces
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3c. campaigns — drop old broken policy, create proper tenant isolation
DROP POLICY IF EXISTS campaigns_workspace_isolation ON campaigns;
-- campaigns already has RLS enabled from 20251210 migration

CREATE POLICY campaigns_tenant_isolation ON campaigns
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY campaigns_service_role_access ON campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3d. notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_tenant_isolation ON notifications
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY notifications_service_role_access ON notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. Governance audit log table (if not exists)
-- ============================================
-- Used by Domain 5 for super admin access logging and existing freeze-workspace route.
CREATE TABLE IF NOT EXISTS governance_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT,
  workspace_name TEXT,
  actor_id TEXT NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_audit_workspace ON governance_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_governance_audit_actor ON governance_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_governance_audit_action ON governance_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_governance_audit_created ON governance_audit_log(created_at DESC);

-- RLS on audit log: service role only for writes, authenticated can read own workspace
ALTER TABLE governance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY governance_audit_service_role_access ON governance_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY governance_audit_tenant_read ON governance_audit_log
  FOR SELECT
  USING (workspace_id = current_setting('app.current_workspace_id', true));

-- ============================================
-- DONE
-- ============================================
