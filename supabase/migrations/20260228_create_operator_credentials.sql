-- ============================================================
-- OPERATOR CREDENTIAL VAULT
-- Stores encrypted operator-level API keys (OpenAI, Apify, etc.)
-- These are injected into every workspace at ignition time.
-- Encrypted with CREDENTIAL_MASTER_KEY via AES-256-GCM (same
-- scheme as genesis.credentials — Phase 41 credential-vault.ts).
--
-- Access model:
--   - Only service_role can read/write (RLS enabled)
--   - No row is readable by anon or authenticated JWT
--   - key_name is the stable lookup key used by IgnitionOrchestrator
-- ============================================================

CREATE TABLE IF NOT EXISTS genesis.operator_credentials (
  key_name        TEXT PRIMARY KEY,          -- e.g. 'openai_api_key', 'apify_api_key'
  encrypted_value TEXT NOT NULL,             -- AES-256-GCM: base64(iv[16] + authTag[16] + ciphertext)
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Row-level security: only service_role can access
ALTER TABLE genesis.operator_credentials ENABLE ROW LEVEL SECURITY;

-- No policies = accessible only by service_role (bypasses RLS)
-- This is intentional — operator credentials are never exposed to client JWTs.

COMMENT ON TABLE genesis.operator_credentials IS
  'Operator-owned API keys encrypted with CREDENTIAL_MASTER_KEY. '
  'Injected into all workspace n8n instances at ignition time. '
  'Never stored as env vars in production.';

COMMENT ON COLUMN genesis.operator_credentials.key_name IS
  'Stable key identifier. Standard names: openai_api_key, anthropic_api_key, '
  'apify_api_key, google_cse_api_key, google_cse_cx, relevance_ai_api_key, '
  'relevance_ai_auth_token, relevance_ai_project_id, relevance_ai_studio_id, '
  'relevance_ai_base_url';

COMMENT ON COLUMN genesis.operator_credentials.encrypted_value IS
  'AES-256-GCM encrypted. Key derived via SHA-256(CREDENTIAL_MASTER_KEY + "operator"). '
  'Format: base64(iv[16] || authTag[16] || ciphertext). '
  'Mirrors the scheme in lib/genesis/credential-vault.ts and sidecar/crypto-utils.ts.';
