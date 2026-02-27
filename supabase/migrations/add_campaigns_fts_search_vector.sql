-- INFRA-005: Add tsvector generated column to campaigns for full-text search
-- Applied via Supabase MCP tool

-- Add tsvector generated column to campaigns for full-text search
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED;

-- Create GIN index on the search_vector column for fast FTS
CREATE INDEX IF NOT EXISTS idx_campaigns_search_vector
  ON campaigns USING GIN (search_vector);

-- NOTE: The 'contacts' table does not exist in the current schema.
-- When a contacts table is created in the future, add a similar
-- search_vector column and GIN index for the email column.
