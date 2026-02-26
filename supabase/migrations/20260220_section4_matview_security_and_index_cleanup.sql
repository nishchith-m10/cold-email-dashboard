-- ============================================================
-- Section 4: Materialized View Security + Duplicate Index Cleanup
-- CC.3, CC.6 from genesis_architectural_analysis.md
-- Applied: 2026-02-20
-- ============================================================

-- CC.3: Create secure RLS-aware wrapper views
-- PostgreSQL does not support RLS on materialized views directly.
-- These views apply JWT-based workspace filtering so frontend SDK
-- queries are always workspace-scoped.

CREATE OR REPLACE VIEW v_daily_stats_secure AS
SELECT * FROM mv_daily_stats
WHERE workspace_id IN (
  SELECT workspace_id FROM user_workspaces
  WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
);

CREATE OR REPLACE VIEW v_llm_cost_secure AS
SELECT * FROM mv_llm_cost
WHERE workspace_id IN (
  SELECT workspace_id FROM user_workspaces
  WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
);

-- Revoke direct SELECT on raw materialized views from authenticated role
-- All API queries use supabaseAdmin with explicit workspace_id filter;
-- no legitimate frontend code should query materialized views directly.
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON mv_daily_stats FROM authenticated';
  EXECUTE 'REVOKE SELECT ON mv_llm_cost FROM authenticated';
EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
  NULL;
END;
$$;

-- CC.6: Drop near-duplicate index
-- idx_email_events_event_ts_ws (workspace_id, event_ts ASC) is redundant:
-- idx_email_events_workspace_event_ts (workspace_id, event_ts DESC) is preferred
-- for time-series queries (most-recent-first ordering).
DROP INDEX IF EXISTS idx_email_events_event_ts_ws;

COMMENT ON VIEW v_daily_stats_secure IS
  'RLS-safe wrapper for mv_daily_stats. Use from frontend SDK queries.';
COMMENT ON VIEW v_llm_cost_secure IS
  'RLS-safe wrapper for mv_llm_cost. Use from frontend SDK queries.';
