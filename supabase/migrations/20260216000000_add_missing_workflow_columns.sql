-- ============================================
-- Add Missing Workflow Version Columns
-- Adds tracking for SMTP variants, Email Preparation, and Reply Tracker
-- ============================================

ALTER TABLE genesis.tenant_versions
  ADD COLUMN IF NOT EXISTS workflow_email_1_smtp TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS workflow_email_2_smtp TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS workflow_email_3_smtp TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS workflow_email_preparation TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS workflow_reply_tracker TEXT NOT NULL DEFAULT '1.0.0';

-- Update comment
COMMENT ON TABLE genesis.tenant_versions IS 'Per-tenant version tracking for all workflow components including SMTP variants';
