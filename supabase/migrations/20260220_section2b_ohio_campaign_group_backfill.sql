-- ============================================================
-- Section 2B: Ohio Campaign Group Backfill
-- Applied via MCP Supabase (previous session, ~2026-02-16)
-- ============================================================
-- Creates the default "Ohio Cold Outreach" campaign group and
-- links all Ohio workspace campaigns to it.
-- ============================================================

-- Insert the Ohio campaign group
INSERT INTO campaign_groups (id, workspace_id, name, description, status)
VALUES (
  '4454b7e4-c6ab-4d13-83f5-8137b0122f6f',
  '00000000-0000-0000-0000-000000000001',
  'Ohio Cold Outreach',
  'Default campaign group for original Ohio cold email sequence',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Link all Ohio workspace campaigns to this group
UPDATE campaigns
SET campaign_group_id = '4454b7e4-c6ab-4d13-83f5-8137b0122f6f'
WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
  AND campaign_group_id IS NULL;
