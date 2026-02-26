-- ============================================================
-- Section 2: Campaign Groups Schema
-- Applied via MCP Supabase (previous session, ~2026-02-16)
-- Implements Objective 1 Phase 1 from genesis_architectural_analysis.md
-- ============================================================

-- Table: campaign_groups
-- Groups Email 1/2/3 campaigns under a parent "Cold Outreach" entity
-- Enables per-group cost attribution and multi-campaign analytics
CREATE TABLE IF NOT EXISTS campaign_groups (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  name         text NOT NULL,
  description  text,
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE campaign_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "campaign_groups_read_access" ON campaign_groups
  FOR SELECT
  USING (
    current_setting('app.super_admin_id', true) =
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    OR workspace_id IN (
      SELECT workspace_id FROM user_workspaces
      WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY IF NOT EXISTS "campaign_groups_write_access" ON campaign_groups
  FOR ALL
  USING (
    current_setting('app.super_admin_id', true) =
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    OR workspace_id IN (
      SELECT workspace_id FROM user_workspaces
      WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
        AND role = ANY (ARRAY['owner', 'admin', 'member'])
    )
  )
  WITH CHECK (
    current_setting('app.super_admin_id', true) =
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    OR workspace_id IN (
      SELECT workspace_id FROM user_workspaces
      WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
        AND role = ANY (ARRAY['owner', 'admin', 'member'])
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_groups_workspace ON campaign_groups (workspace_id);

-- Add campaign_group_id FK to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_group_id uuid REFERENCES campaign_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_group ON campaigns (campaign_group_id)
  WHERE campaign_group_id IS NOT NULL;

-- Add campaign_group_id FK to email_events
ALTER TABLE email_events
  ADD COLUMN IF NOT EXISTS campaign_group_id uuid REFERENCES campaign_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_events_group ON email_events (campaign_group_id)
  WHERE campaign_group_id IS NOT NULL;

-- Add campaign_group_id FK to daily_stats
ALTER TABLE daily_stats
  ADD COLUMN IF NOT EXISTS campaign_group_id uuid REFERENCES campaign_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_daily_stats_group ON daily_stats (campaign_group_id)
  WHERE campaign_group_id IS NOT NULL;

-- Add campaign_group_id FK to llm_usage (also in section5, idempotent IF NOT EXISTS)
ALTER TABLE llm_usage
  ADD COLUMN IF NOT EXISTS campaign_group_id uuid REFERENCES campaign_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_llm_usage_group ON llm_usage (campaign_group_id)
  WHERE campaign_group_id IS NOT NULL;
