-- ============================================
-- Domain 3 / D3-002: Add campaign_group_id to email_events
-- ============================================
-- GAP 3.2.3: The aggregate route filters email_events by
-- campaign_group_id, but the column does not exist.
-- This migration adds the nullable UUID column with a partial
-- index for efficient group-scoped dashboard queries.
-- ============================================

-- 1. Add the column (nullable — existing rows remain NULL)
ALTER TABLE email_events
  ADD COLUMN IF NOT EXISTS campaign_group_id UUID;

-- 2. Partial index — only indexes rows that have a group assigned
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_group
  ON email_events (campaign_group_id)
  WHERE campaign_group_id IS NOT NULL;
