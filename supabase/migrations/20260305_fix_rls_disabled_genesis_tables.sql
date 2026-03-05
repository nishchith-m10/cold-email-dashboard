-- ============================================================
-- Fix RLS-disabled genesis tables (SEC-RLS-001)
-- Date: 2026-03-05
-- 8 tables flagged by Supabase security advisor as rls_disabled_in_public.
-- 2 tables flagged as rls_enabled_no_policy.
--
-- genesis schema is backend-only; service_role bypasses RLS.
-- Authenticated/anon roles are locked out by default (deny-all unless
-- a matching workspace policy is satisfied).
-- ============================================================

-- 1. Enable RLS on all 8 previously-unprotected tables
ALTER TABLE genesis.fleet_status           ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.support_access_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.ignition_state         ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.ignition_operations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.partition_registry     ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.droplet_lifecycle_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.do_accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.leads_default          ENABLE ROW LEVEL SECURITY;

-- 2. Workspace-scoped policies for tables with workspace_id.
--    Mirrors the existing pattern used by public schema (contacts, email_events, etc.).
--    do_accounts has no workspace_id — intentionally no policy (deny-all for non-service-role).

CREATE POLICY fleet_status_workspace_isolation ON genesis.fleet_status
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY support_access_tokens_workspace_isolation ON genesis.support_access_tokens
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY ignition_state_workspace_isolation ON genesis.ignition_state
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY ignition_operations_workspace_isolation ON genesis.ignition_operations
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY partition_registry_workspace_isolation ON genesis.partition_registry
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY droplet_lifecycle_log_workspace_isolation ON genesis.droplet_lifecycle_log
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY leads_default_workspace_isolation ON genesis.leads_default
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

-- 3. Fix the two "RLS enabled but no policy" tables.
--    Explicit deny makes intent clear; service_role still bypasses RLS.
CREATE POLICY operator_credentials_service_only ON genesis.operator_credentials
  USING (false)
  WITH CHECK (false);

CREATE POLICY workspace_manifests_service_only ON genesis.workspace_manifests
  USING (false)
  WITH CHECK (false);
