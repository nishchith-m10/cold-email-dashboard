-- Ask AI provider keys (encrypted at rest)
CREATE TABLE IF NOT EXISTS ask_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai','openrouter')),
  key_ciphertext TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, workspace_id, provider)
);

-- RLS: only the owner user (sub) or service_role can access
ALTER TABLE ask_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY ask_api_keys_owner_policy ON ask_api_keys
  USING (
    user_id = current_setting('request.jwt.claim.sub', true)
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    user_id = current_setting('request.jwt.claim.sub', true)
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_updated_at_ask_api_keys ON ask_api_keys;
CREATE TRIGGER trg_touch_updated_at_ask_api_keys
BEFORE UPDATE ON ask_api_keys
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

