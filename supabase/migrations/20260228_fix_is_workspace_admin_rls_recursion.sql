-- Migration: fix_is_workspace_admin_rls_recursion
-- Applied: 2026-02-28
-- Branch: infra/e2e-provisioning-setup
--
-- BLOCKER-001 FIX: RLS infinite recursion on user_workspaces (PostgreSQL 42P17)
--
-- Root cause:
--   is_workspace_admin() does SELECT FROM public.user_workspaces.
--   The policy user_workspaces_manage_by_admin (cmd=ALL) calls is_workspace_admin(),
--   which queries user_workspaces, which re-evaluates all SELECT policies including
--   user_workspaces_manage_by_admin again → infinite recursion → HTTP 500.
--
-- Fix:
--   Add SECURITY DEFINER + SET search_path = public to is_workspace_admin().
--   The function executes as its owner (postgres) and bypasses RLS on the inner
--   query. Security is preserved: the function still explicitly checks
--   user_id = jwt.sub AND role IN ('owner','admin').
--
-- Also hardened clerk_user_id() with the same SECURITY DEFINER pattern for
-- consistency with auth helper best practices.

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_workspaces
    WHERE workspace_id = p_workspace_id
      AND user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
      AND role = ANY(ARRAY['owner', 'admin'])
  );
$$;

CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('app.user_id', true)
  );
$$;
