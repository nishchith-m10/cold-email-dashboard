-- ============================================================
-- Fix rls_policy_always_true (SEC-RLS-002)
-- Date: 2026-03-05
--
-- Tables that had USING(true)/WITH CHECK(true) effectively granted
-- any authenticated user unrestricted access.
-- service_role already bypasses RLS, so:
--   - Backend-only tables: USING(false) locks out authenticated/anon
--   - Workspace tables: scope SELECT to workspace_id, deny INSERT
-- ============================================================

-- 1. genesis.api_health_snapshots — backend-only, no workspace_id
DROP POLICY IF EXISTS api_health_snapshots_read_policy  ON genesis.api_health_snapshots;
DROP POLICY IF EXISTS api_health_snapshots_write_policy ON genesis.api_health_snapshots;

CREATE POLICY api_health_snapshots_service_only ON genesis.api_health_snapshots
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

-- 2. genesis.workspace_locks — INSERT/DELETE had true
DROP POLICY IF EXISTS workspace_locks_insert ON genesis.workspace_locks;
DROP POLICY IF EXISTS workspace_locks_delete ON genesis.workspace_locks;

CREATE POLICY workspace_locks_insert ON genesis.workspace_locks
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY workspace_locks_delete ON genesis.workspace_locks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = workspace_locks.workspace_id
        AND uw.user_id = (auth.uid())::text
    )
  );

-- 3. genesis.audit_log — INSERT had WITH CHECK(true)
DROP POLICY IF EXISTS audit_log_system_write ON genesis.audit_log;

CREATE POLICY audit_log_system_write ON genesis.audit_log
  FOR INSERT
  WITH CHECK (false);

-- 4. public.email_provider_config — ALL: true → workspace-scoped
DROP POLICY IF EXISTS email_provider_service_role_access ON public.email_provider_config;

CREATE POLICY email_provider_config_workspace_isolation ON public.email_provider_config
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));

-- 5. public.governance_audit_log — INSERT had WITH CHECK(true)
DROP POLICY IF EXISTS governance_audit_insert ON public.governance_audit_log;

CREATE POLICY governance_audit_insert ON public.governance_audit_log
  FOR INSERT
  WITH CHECK (false);

-- 6. public.provisioning_status — ALL: true, no workspace_id, backend-only
DROP POLICY IF EXISTS "Service role full access" ON public.provisioning_status;

CREATE POLICY provisioning_status_service_only ON public.provisioning_status
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

-- 7. public.role_audit_log — SELECT: true, INSERT: true → workspace-scope + deny writes
DROP POLICY IF EXISTS "Service role can read all audit logs" ON public.role_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs"   ON public.role_audit_log;

CREATE POLICY role_audit_log_workspace_read ON public.role_audit_log
  FOR SELECT
  USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY role_audit_log_service_insert ON public.role_audit_log
  FOR INSERT
  WITH CHECK (false);

-- 8. public.webhook_queue — ALL: true, no workspace_id, backend-only
DROP POLICY IF EXISTS webhook_queue_allow_all ON public.webhook_queue;

CREATE POLICY webhook_queue_service_only ON public.webhook_queue
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

-- 9. public.workflow_templates — ALL: true (keep public SELECT, deny manage)
DROP POLICY IF EXISTS "Service role manage" ON public.workflow_templates;

CREATE POLICY workflow_templates_service_manage ON public.workflow_templates
  FOR ALL
  USING (false)
  WITH CHECK (false);
