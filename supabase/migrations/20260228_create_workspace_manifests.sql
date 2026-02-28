-- ============================================
-- GENESIS: WORKSPACE MANIFESTS TABLE
-- Phase 41 / Flaw-3 fix (Ralph Loop evaluation)
--
-- A WorkspaceManifest is a fully-validated, immutable snapshot of every field
-- the IgnitionOrchestrator needs to provision a workspace.  It is written once
-- at onboarding completion, before ignition is allowed to start, eliminating
-- the `|| ''` fallback problem.
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.workspace_manifests (
  -- Primary: one manifest per workspace (upsert on conflict)
  workspace_id      UUID        PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Surrogate: the UUID embedded in the manifest itself
  manifest_id       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Schema version for forward-compatibility
  manifest_version  INT         NOT NULL DEFAULT 1,

  -- Full manifest JSONB (includes all provisioning data)
  manifest          JSONB       NOT NULL,

  -- Timestamps
  locked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),  -- immutable after this
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only service_role can read/write manifests (never exposed to browser)
ALTER TABLE genesis.workspace_manifests ENABLE ROW LEVEL SECURITY;
-- No public policies → service_role only

-- Index for manifest_id lookups (referenced by IgnitionConfig)
CREATE INDEX IF NOT EXISTS idx_workspace_manifests_manifest_id
  ON genesis.workspace_manifests (manifest_id);

-- Functional index — fast lookup by workspace
CREATE INDEX IF NOT EXISTS idx_workspace_manifests_workspace_id
  ON genesis.workspace_manifests (workspace_id);

COMMENT ON TABLE genesis.workspace_manifests IS
  'Immutable provisioning manifests. Written once at onboarding completion, '
  'before IgnitionOrchestrator.ignite() is allowed to start. '
  'See lib/genesis/workspace-manifest.ts for the TypeScript type.';
