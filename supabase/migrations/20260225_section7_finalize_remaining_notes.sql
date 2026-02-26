-- ============================================================
-- Section 7: Finalize Remaining Notes
-- Applied: 2026-02-25
-- 1. Insert orphaned workspace + add FK constraint to campaigns
-- 2. CC.4: Add campaign_name to leads_ohio
-- 3. CC.5: Add is_test to campaign_groups
-- ============================================================

-- ── 1. Orphaned workspace 44f22a12 ──────────────────────────
-- Three test/dev campaigns referenced this workspace_id which
-- didn't exist in the workspaces table. Insert it so the FK
-- constraint can be added safely.
-- Status constraint allows: active | suspended | frozen
INSERT INTO workspaces (id, name, slug, status)
VALUES (
  '44f22a12-f1a9-423f-b870-01b6c6d80b43',
  'Test Workspace (Archived)',
  'test-workspace-archived',
  'suspended'
)
ON CONFLICT (id) DO NOTHING;

-- Add the referential integrity FK deferred from section6
ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ── 2. CC.4: leads_ohio ↔ genesis.leads schema alignment ─────
-- genesis.leads has campaign_name; leads_ohio didn't.
-- toLeadRow() writes campaign_name to both tables — leads_ohio
-- needed this column to avoid a column-not-found error on import.
ALTER TABLE leads_ohio
  ADD COLUMN IF NOT EXISTS campaign_name text;

CREATE INDEX IF NOT EXISTS idx_leads_ohio_campaign_name
  ON leads_ohio (campaign_name)
  WHERE campaign_name IS NOT NULL;

COMMENT ON COLUMN leads_ohio.campaign_name IS
  'Added in section7 for toLeadRow() compatibility with genesis.leads schema.';

-- ── 3. CC.5: Structured is_test flag on campaign_groups ──────
-- Replaces the hard-coded EXCLUDED_CAMPAIGNS string list for new campaigns.
-- Old string-based exclusion kept for backward compat with existing data.
ALTER TABLE campaign_groups
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_campaign_groups_is_test
  ON campaign_groups (is_test)
  WHERE is_test = true;

COMMENT ON COLUMN campaign_groups.is_test IS
  'When true, all campaigns in this group are excluded from metrics dashboards. '
  'Preferred structured replacement for the EXCLUDED_CAMPAIGNS string list.';

-- Create test campaign group and tag suspended test campaigns
INSERT INTO campaign_groups (id, workspace_id, name, description, status, is_test)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '44f22a12-f1a9-423f-b870-01b6c6d80b43',
  'Test Campaigns (Archived)',
  'Paused test campaigns created during development. Excluded from all metrics.',
  'archived',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Link the 3 test campaigns to their group
UPDATE campaigns
SET campaign_group_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE workspace_id = '44f22a12-f1a9-423f-b870-01b6c6d80b43'
  AND campaign_group_id IS NULL;
