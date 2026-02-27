-- Domain 7: Add is_test flag to email_events and llm_usage
-- Prevents sandbox test events from polluting production metrics
-- Default false ensures all existing production events remain visible

-- 1. email_events: is_test column
ALTER TABLE email_events
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- Partial index: only index test rows (very few expected)
CREATE INDEX IF NOT EXISTS idx_email_events_is_test
  ON email_events (is_test)
  WHERE is_test = true;

-- 2. llm_usage: is_test column
ALTER TABLE llm_usage
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_llm_usage_is_test
  ON llm_usage (is_test)
  WHERE is_test = true;
