-- ============================================================
-- Section 5: LLM Cost Hardening
-- Objective 3, Fix 2+3 from genesis_architectural_analysis.md
-- Applied: 2026-02-20
-- ============================================================

-- Fix 2: Enforce NOT NULL on workspace_id
-- Pre-check confirmed 0 null rows before applying
ALTER TABLE llm_usage ALTER COLUMN workspace_id SET NOT NULL;

-- Fix 3: Add campaign_group_id FK for proper cost attribution
-- Allows LLM costs to be reliably joined to campaigns
-- without relying on free-text campaign_name which can change
ALTER TABLE llm_usage
  ADD COLUMN IF NOT EXISTS campaign_group_id uuid
    REFERENCES campaign_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_llm_usage_campaign_group
  ON llm_usage (campaign_group_id, created_at DESC)
  WHERE campaign_group_id IS NOT NULL;

COMMENT ON COLUMN llm_usage.campaign_group_id IS
  'FK to campaign_groups.id for reliable cost attribution. '
  'Populated by n8n workflows that include YOUR_CAMPAIGN_GROUP_ID variable.';
COMMENT ON COLUMN llm_usage.workspace_id IS
  'Set to NOT NULL in section5 migration. Was already 0 nulls in production.';
