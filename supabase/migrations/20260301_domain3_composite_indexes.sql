-- ============================================
-- Domain 3 / D3-003: Composite indexes for campaign query performance
-- ============================================
-- GAP 3.2.4: The aggregate dashboard runs parallel count queries on
-- email_events filtered by (workspace_id, event_type, event_ts) and
-- (workspace_id, campaign_name). Without composite indexes these
-- default to sequential scans on high-volume tables.
--
-- This migration adds the four composite indexes recommended in
-- POST_GENESIS_EXECUTION_PLAN.md TASK 3.3.3.
-- ============================================

-- 1. email_events: covers the per-event-type count queries in buildEventFilters()
CREATE INDEX IF NOT EXISTS idx_email_events_ws_type_ts
  ON email_events (workspace_id, event_type, event_ts);

-- 2. email_events: covers campaign-name filtered queries
CREATE INDEX IF NOT EXISTS idx_email_events_ws_campaign
  ON email_events (workspace_id, campaign_name);

-- 3. daily_stats: covers timeseries queries (.eq workspace_id, .gte/.lte day)
CREATE INDEX IF NOT EXISTS idx_daily_stats_ws_day
  ON daily_stats (workspace_id, day);

-- 4. llm_usage: covers cost-breakdown queries (.eq workspace_id, .gte/.lte created_at)
CREATE INDEX IF NOT EXISTS idx_llm_usage_ws_created
  ON llm_usage (workspace_id, created_at);
