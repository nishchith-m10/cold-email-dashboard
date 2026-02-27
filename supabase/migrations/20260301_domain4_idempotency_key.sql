-- Domain 4 Task 4.3.4: Add persistent idempotency_key column to email_events
--
-- Previously, idempotency_key was stored inside the JSONB `metadata` column.
-- The dedup check used `metadata->>'idempotency_key'` which scans every row
-- matching workspace_id — O(n) per insert with no index support.
--
-- This migration promotes idempotency_key to a first-class indexed column.

-- 1. Add nullable column (no default — we'll backfill)
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Backfill from metadata JSONB
UPDATE email_events
SET idempotency_key = metadata->>'idempotency_key'
WHERE idempotency_key IS NULL
  AND metadata->>'idempotency_key' IS NOT NULL;

-- 3. Partial unique index — covers non-null keys only (allows NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_idemp
  ON email_events (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
