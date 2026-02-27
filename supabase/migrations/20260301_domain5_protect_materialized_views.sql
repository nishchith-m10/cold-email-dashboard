-- ============================================
-- Domain 5: Protect Materialized Views from Direct PostgREST Access
-- ============================================
-- Materialized views CANNOT have RLS policies (PostgreSQL limitation).
-- Any authenticated Supabase client request to these views returns ALL
-- tenants' data.  We fix this by:
--   1. Revoking SELECT from anon/authenticated on materialized views
--   2. Creating secure wrapper views that filter by workspace context
-- ============================================

-- ============================================
-- 1. Revoke direct access to materialized views
-- ============================================
-- Only service_role (used by supabaseAdmin) should query these directly.
-- The application always goes through validated API routes anyway.

DO $$
BEGIN
  -- mv_daily_stats
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_daily_stats' AND schemaname = 'public') THEN
    EXECUTE 'REVOKE SELECT ON mv_daily_stats FROM anon, authenticated';
  END IF;

  -- mv_llm_cost
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_llm_cost' AND schemaname = 'public') THEN
    EXECUTE 'REVOKE SELECT ON mv_llm_cost FROM anon, authenticated';
  END IF;
END $$;

-- Also revoke on the secure cost view if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_llm_cost_secure' AND schemaname = 'public') THEN
    EXECUTE 'REVOKE SELECT ON v_llm_cost_secure FROM anon, authenticated';
  END IF;
END $$;

-- ============================================
-- 2. Create secure wrapper views
-- ============================================
-- These views filter by the session workspace context, providing
-- defense-in-depth.  They can be used as drop-in replacements for
-- the materialized views when queries are made through tenant-scoped clients.

CREATE OR REPLACE VIEW daily_stats_secure AS
SELECT *
FROM mv_daily_stats
WHERE workspace_id = current_setting('app.current_workspace_id', true);

COMMENT ON VIEW daily_stats_secure IS 'Tenant-scoped wrapper over mv_daily_stats. Requires set_tenant_context() to be called first.';

CREATE OR REPLACE VIEW llm_cost_secure AS
SELECT *
FROM mv_llm_cost
WHERE workspace_id = current_setting('app.current_workspace_id', true);

COMMENT ON VIEW llm_cost_secure IS 'Tenant-scoped wrapper over mv_llm_cost. Requires set_tenant_context() to be called first.';

-- Grant access to the secure views for authenticated role
GRANT SELECT ON daily_stats_secure TO authenticated, service_role;
GRANT SELECT ON llm_cost_secure TO authenticated, service_role;

-- ============================================
-- DONE
-- ============================================
