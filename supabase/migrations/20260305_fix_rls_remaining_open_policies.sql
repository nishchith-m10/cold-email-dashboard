-- ============================================================
-- Fix remaining open RLS policies (SEC-RLS-003)
-- Date: 2026-03-05
-- Covers 18 tables with USING(true)/WITH CHECK(true) policies.
-- service_role bypasses RLS — dropping an ALL policy does NOT
-- affect any backend/sidecar writes.
-- ============================================================

-- GROUP A: Backend-only tables (no workspace_id) → RESTRICTIVE USING(false)
DROP POLICY IF EXISTS service_role_alert_history ON genesis.alert_history;
CREATE POLICY alert_history_service_only ON genesis.alert_history AS RESTRICTIVE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS service_role_alert_preferences ON genesis.alert_preferences;
CREATE POLICY alert_preferences_service_only ON genesis.alert_preferences AS RESTRICTIVE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service role full access on regional_health_status" ON genesis.regional_health_status;
CREATE POLICY regional_health_status_service_only ON genesis.regional_health_status AS RESTRICTIVE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS service_role_scale_metrics ON genesis.scale_metrics;
CREATE POLICY scale_metrics_service_only ON genesis.scale_metrics AS RESTRICTIVE USING (false) WITH CHECK (false);

-- GROUP B: Has workspace_id + existing workspace SELECT — drop open ALL policies
DROP POLICY IF EXISTS droplet_health_service      ON genesis.droplet_health;
DROP POLICY IF EXISTS handshake_attempts_service  ON genesis.handshake_attempts;
DROP POLICY IF EXISTS provisioning_tokens_service ON genesis.provisioning_tokens;
DROP POLICY IF EXISTS sidecar_tokens_service      ON genesis.sidecar_tokens;
DROP POLICY IF EXISTS workspace_webhooks_service  ON genesis.workspace_webhooks;

-- GROUP C: Has workspace_id, no existing SELECT → drop ALL + add workspace SELECT
DROP POLICY IF EXISTS "Service role full access on disaster_recovery_snapshots" ON genesis.disaster_recovery_snapshots;
CREATE POLICY disaster_recovery_snapshots_workspace_read ON genesis.disaster_recovery_snapshots
  FOR SELECT USING (workspace_id::text = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS "Service role full access on migration_events" ON genesis.migration_events;
CREATE POLICY migration_events_workspace_read ON genesis.migration_events
  FOR SELECT USING (workspace_id::text = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS "Service role full access on migration_state" ON genesis.migration_state;
CREATE POLICY migration_state_workspace_read ON genesis.migration_state
  FOR SELECT USING (workspace_id::text = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS sandbox_runs_service_role ON genesis.sandbox_test_runs;
CREATE POLICY sandbox_test_runs_workspace_read ON genesis.sandbox_test_runs
  FOR SELECT USING (workspace_id::text = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS service_role_scale_alerts ON genesis.scale_alerts;
CREATE POLICY scale_alerts_workspace_read ON genesis.scale_alerts
  FOR SELECT USING (workspace_id::text = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS execution_events_service_role ON genesis.workflow_execution_events;
CREATE POLICY workflow_execution_events_workspace_read ON genesis.workflow_execution_events
  FOR SELECT USING (workspace_id::text = current_setting('app.workspace_id', true));

-- GROUP D: Template tables — restrict SELECT to authenticated users only
DROP POLICY IF EXISTS template_credential_map_select ON genesis.template_credential_map;
CREATE POLICY template_credential_map_authenticated_read ON genesis.template_credential_map
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS template_variable_map_select ON genesis.template_variable_map;
CREATE POLICY template_variable_map_authenticated_read ON genesis.template_variable_map
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- GROUP E: public.users — scope reads to own record + same-workspace members
DROP POLICY IF EXISTS users_read_all ON public.users;
CREATE POLICY users_read_own_or_workspace ON public.users
  FOR SELECT
  USING (
    id = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.user_workspaces AS my_ws
      JOIN public.user_workspaces AS their_ws ON my_ws.workspace_id = their_ws.workspace_id
      WHERE my_ws.user_id = (auth.uid())::text AND their_ws.user_id = users.id
    )
  );
