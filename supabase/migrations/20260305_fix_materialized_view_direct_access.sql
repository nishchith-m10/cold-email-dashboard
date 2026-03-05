-- ============================================================
-- Fix materialized_view_in_api direct access (SEC-MV-001)
-- Date: 2026-03-05
--
-- mv_llm_cost and mv_daily_stats were directly queryable by any
-- authenticated user, exposing ALL workspaces' data.
--
-- Fix:
-- 1. Revoke direct SELECT on the MVs from anon + authenticated.
-- 2. Revert secure views to SECURITY DEFINER (security_invoker=off)
--    so they read the MV as the view owner while returning only
--    the calling user's workspace rows via JWT claims filter.
-- ============================================================

REVOKE SELECT ON public.mv_llm_cost    FROM anon, authenticated;
REVOKE SELECT ON public.mv_daily_stats FROM anon, authenticated;

CREATE OR REPLACE VIEW public.v_llm_cost_secure
  WITH (security_invoker = off)
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
  WITH (security_invoker = off)
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

ALTER VIEW public.v_llm_cost_secure    OWNER TO postgres;
ALTER VIEW public.v_daily_stats_secure OWNER TO postgres;
