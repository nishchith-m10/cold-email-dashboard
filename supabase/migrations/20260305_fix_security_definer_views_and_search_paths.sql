-- ============================================================
-- Fix security_definer_views (SEC-VIEW-001)
-- Fix function_search_path_mutable (SEC-FUNC-001)
-- Date: 2026-03-05
-- ============================================================

-- VIEWS: Recreate 4 SECURITY DEFINER views as SECURITY INVOKER.
-- Workspace-filtering WHERE clauses preserved exactly.

CREATE OR REPLACE VIEW public.v_llm_cost_secure
  WITH (security_invoker = on)
AS
SELECT
  workspace_id, provider, model, day,
  total_cost, total_tokens_in, total_tokens_out,
  call_count, avg_cost_per_call, campaigns_used, refreshed_at
FROM public.mv_llm_cost
WHERE workspace_id IN (
  SELECT user_workspaces.workspace_id
  FROM public.user_workspaces
  WHERE user_workspaces.user_id = (
    (current_setting('request.jwt.claims', true))::json ->> 'sub'
  )
);

CREATE OR REPLACE VIEW public.v_daily_stats_secure
  WITH (security_invoker = on)
AS
SELECT
  workspace_id, campaign_name, day,
  sends, delivered, opens, clicks, replies, bounces, opt_outs,
  unique_contacts, email_1_sends, email_2_sends, email_3_sends, refreshed_at
FROM public.mv_daily_stats
WHERE workspace_id IN (
  SELECT user_workspaces.workspace_id
  FROM public.user_workspaces
  WHERE user_workspaces.user_id = (
    (current_setting('request.jwt.claims', true))::json ->> 'sub'
  )
);

CREATE OR REPLACE VIEW genesis.account_pool_health
  WITH (security_invoker = on)
AS
SELECT
  account_id, region, status,
  current_droplets, max_droplets,
  ROUND(
    (current_droplets::numeric / max_droplets::numeric) * 100, 2
  ) AS utilization_pct,
  (max_droplets - current_droplets) AS available_capacity,
  last_provisioned_at, billing_email, notes
FROM genesis.do_accounts
ORDER BY region, account_id;

CREATE OR REPLACE VIEW genesis.fleet_health_summary
  WITH (security_invoker = on)
AS
SELECT
  status,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE last_heartbeat_at > now() - INTERVAL '5 minutes') AS healthy_count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM genesis.fleet_status
GROUP BY status
ORDER BY status;

-- FUNCTIONS: Lock search_path for all postgres-owned functions (82 functions).
-- Uses per-schema fixed path rather than empty string since function bodies
-- reference objects without schema prefix.

DO $$
DECLARE
  r RECORD;
  search_path_val TEXT;
BEGIN
  FOR r IN
    SELECT
      n.nspname                                        AS schema,
      p.proname                                        AS name,
      pg_get_function_identity_arguments(p.oid)        AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles ro ON ro.oid = p.proowner
    WHERE n.nspname IN ('public', 'genesis', 'kb_schema')
      AND (p.proconfig IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) cfg
             WHERE cfg LIKE 'search_path%'
           ))
      AND p.prokind IN ('f', 'p')
      AND ro.rolname = 'postgres'
  LOOP
    CASE r.schema
      WHEN 'genesis'   THEN search_path_val := 'genesis, public, extensions, auth';
      WHEN 'kb_schema' THEN search_path_val := 'kb_schema, public, extensions, auth';
      ELSE                  search_path_val := 'public, extensions, auth';
    END CASE;

    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %s.%I(%s) SET search_path = %s',
        r.schema, r.name, r.args, search_path_val
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %.%(%): %', r.schema, r.name, r.args, SQLERRM;
    END;
  END LOOP;
END;
$$;
