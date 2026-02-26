-- ============================================================
-- Section 6: Fix campaigns.workspace_id TYPE text → uuid
-- Objective 1 Phase 2 from genesis_architectural_analysis.md
-- Applied: 2026-02-20
-- ============================================================
-- Pre-checks:
--   - All 7 campaign rows had valid UUID workspace_id values ✓
--   - No FK references to campaigns.workspace_id from other tables ✓
--   - Column had DEFAULT 'default'::text — dropped before cast ✓
--   - workspace 44f22a12 exists in campaigns but NOT in workspaces table
--     (orphaned record) → FK to workspaces skipped pending cleanup
-- ============================================================

-- Step 1: Drop existing text-based RLS policies
DROP POLICY IF EXISTS campaigns_read_access ON campaigns;
DROP POLICY IF EXISTS campaigns_write_access ON campaigns;

-- Step 2: Drop the invalid text default ('default'::text)
ALTER TABLE campaigns ALTER COLUMN workspace_id DROP DEFAULT;

-- Step 3: Convert column type
ALTER TABLE campaigns
  ALTER COLUMN workspace_id TYPE uuid USING workspace_id::uuid;

-- Step 4: Recreate RLS policies using proper uuid comparison
-- (No explicit casts needed once both sides are uuid)
CREATE POLICY "campaigns_read_access" ON campaigns
  FOR SELECT
  USING (
    current_setting('app.super_admin_id', true) =
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    OR EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = campaigns.workspace_id
        AND uw.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "campaigns_write_access" ON campaigns
  FOR ALL
  USING (
    current_setting('app.super_admin_id', true) =
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    OR EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = campaigns.workspace_id
        AND uw.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
        AND uw.role = ANY (ARRAY['owner', 'admin', 'member'])
    )
  )
  WITH CHECK (
    current_setting('app.super_admin_id', true) =
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    OR EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = campaigns.workspace_id
        AND uw.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
        AND uw.role = ANY (ARRAY['owner', 'admin', 'member'])
    )
  );

-- Step 5: Add workspace join index
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id ON campaigns (workspace_id);

-- TODO: Once orphaned workspace 44f22a12-f1a9-423f-b870-01b6c6d80b43 is
-- either created in workspaces or cleaned up, add:
-- ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_workspace
--   FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

COMMENT ON COLUMN campaigns.workspace_id IS
  'Converted from text to uuid in section6 migration. '
  'FK to workspaces pending orphan workspace 44f22a12 resolution.';
