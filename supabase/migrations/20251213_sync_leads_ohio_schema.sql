-- supabase/migrations/20251213_sync_leads_ohio_schema.sql
-- Description: Ensures leads_ohio has all 5 draft columns for the Sequence Viewer
-- Note: Uses IF NOT EXISTS to be idempotent (safe to run multiple times)

-- 1. Add email_1_subject
ALTER TABLE leads_ohio 
ADD COLUMN IF NOT EXISTS email_1_subject TEXT;

-- 2. Add email_1_body
ALTER TABLE leads_ohio 
ADD COLUMN IF NOT EXISTS email_1_body TEXT;

-- 3. Add email_2_body (email_2 usually threads, so no subject needed, but body is required)
ALTER TABLE leads_ohio 
ADD COLUMN IF NOT EXISTS email_2_body TEXT;

-- 4. Add email_3_subject (sometimes threads break, so subject might be needed)
ALTER TABLE leads_ohio 
ADD COLUMN IF NOT EXISTS email_3_subject TEXT;

-- 5. Add email_3_body
ALTER TABLE leads_ohio 
ADD COLUMN IF NOT EXISTS email_3_body TEXT;

-- 6. Add composite index for efficient list retrieval in the sidebar
-- We order by created_at DESC to show newest leads first
CREATE INDEX IF NOT EXISTS idx_leads_ohio_workspace_created 
ON leads_ohio (workspace_id, created_at DESC);

-- 7. Add comment for documentation clarity
COMMENT ON TABLE leads_ohio IS 'Lead records with email sequence drafts from n8n. Includes draft content columns.';
