-- ============================================================
-- Section 3: Genesis Sidecar Registry
-- Applied via MCP Supabase (previous session, ~2026-02-16)
-- Creates genesis.sidecar_registry and genesis.sidecar_tokens tables
-- ============================================================

-- Table: genesis.sidecar_registry
-- Tracks active sidecar instances (one per workspace droplet)
CREATE TABLE IF NOT EXISTS genesis.sidecar_registry (
  workspace_id  uuid        NOT NULL,
  sidecar_url   text        NOT NULL,
  version       text,
  capabilities  text[]      NOT NULL DEFAULT '{}',
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id)
);

-- Table: genesis.sidecar_tokens
-- Short-lived tokens issued during handshake for sidecar authentication
CREATE TABLE IF NOT EXISTS genesis.sidecar_tokens (
  token         text        PRIMARY KEY,
  workspace_id  uuid        NOT NULL,
  droplet_id    text,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sidecar_tokens_workspace
  ON genesis.sidecar_tokens (workspace_id);
CREATE INDEX IF NOT EXISTS idx_sidecar_tokens_expires
  ON genesis.sidecar_tokens (expires_at);

COMMENT ON TABLE genesis.sidecar_registry IS
  'One row per active sidecar agent. Updated on each heartbeat.';
COMMENT ON TABLE genesis.sidecar_tokens IS
  'Short-lived JWT-style tokens issued during sidecar handshake.';
