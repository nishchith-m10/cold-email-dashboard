-- ============================================================
-- Section 1: Database Security Hardening
-- Applied via MCP Supabase (previous session, ~2026-02-16)
-- ============================================================
-- This migration was applied directly via MCP and is recorded
-- here as a local reference. Key changes:
--
-- 1. Fixed RLS policies on `campaigns` table:
--    - Dropped buggy policy that compared workspace_id to app_clerk_user_id()
--    - Created proper policies joining user_workspaces (same pattern as email_events)
--
-- 2. Hardened `email_events` INSERT policy:
--    - Updated WITH CHECK to enforce workspace_id membership in user_workspaces
--
-- 3. Hardened `llm_usage` INSERT policy:
--    - Updated WITH CHECK to enforce workspace_id membership in user_workspaces
--
-- NOTE: The campaigns policies were subsequently updated again in
-- section6_campaigns_workspace_id_type_fix.sql when workspace_id
-- was converted from text to uuid.
-- ============================================================

-- This file is a documentation record; all SQL already applied live.
-- Idempotent verification query:
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('campaigns', 'email_events', 'llm_usage')
ORDER BY tablename, policyname;
