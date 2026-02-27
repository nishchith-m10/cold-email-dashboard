-- ============================================
-- Domain 4 Task 4.3.1: Per-workspace webhook tokens
-- ============================================
-- Adds a unique webhook_token column to workspaces so each
-- tenant has its own secret for n8n → dashboard event ingestion.
-- Server-side token lookup derives workspace_id, eliminating
-- the client-supplied workspace_id trust problem.
-- ============================================

-- 1. Add column (nullable first for backfill)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS webhook_token TEXT;

-- 2. Backfill existing workspaces with random 64-char hex tokens
UPDATE workspaces
SET webhook_token = encode(gen_random_bytes(32), 'hex')
WHERE webhook_token IS NULL;

-- 3. Make NOT NULL + set default for future inserts
ALTER TABLE workspaces
  ALTER COLUMN webhook_token SET NOT NULL;

ALTER TABLE workspaces
  ALTER COLUMN webhook_token SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- 4. Unique constraint (also serves as the lookup index)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_webhook_token_key'
  ) THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_webhook_token_key UNIQUE (webhook_token);
  END IF;
END $$;
