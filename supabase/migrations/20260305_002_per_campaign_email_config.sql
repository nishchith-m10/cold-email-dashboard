-- =============================================================================
-- Migration: Per-Campaign Email Provider Config
-- Date: 2026-03-05
-- Purpose: Allow each campaign to have its own email provider (Gmail/SMTP/etc.)
--          while keeping a workspace-level default.
-- =============================================================================

-- Step 1: Add nullable campaign_id column
ALTER TABLE genesis.email_provider_config
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- Step 2: Drop the old UNIQUE(workspace_id) and replace with a composite unique
--         NULL campaign_id = workspace default; non-NULL = campaign override.
ALTER TABLE genesis.email_provider_config
  DROP CONSTRAINT IF EXISTS email_provider_config_workspace_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_provider_workspace_campaign
  ON genesis.email_provider_config (workspace_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Step 3: Index for fast per-campaign lookups
CREATE INDEX IF NOT EXISTS idx_email_provider_campaign
  ON genesis.email_provider_config (campaign_id)
  WHERE campaign_id IS NOT NULL;

-- Step 4: Update RLS to still enforce workspace isolation
DROP POLICY IF EXISTS email_provider_isolation ON genesis.email_provider_config;
CREATE POLICY email_provider_workspace_isolation ON genesis.email_provider_config
  FOR ALL
  USING (workspace_id::text = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.workspace_id', true));
