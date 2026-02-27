-- D8-005: Login Audit Table
-- Captures authentication events from Clerk webhooks for compliance audit trail.

CREATE TABLE IF NOT EXISTS login_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email TEXT,
  event_type TEXT NOT NULL,  -- 'session.created', 'user.created', 'user.deleted'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_login_audit_user_id ON login_audit (user_id);

-- Index for querying by time range
CREATE INDEX IF NOT EXISTS idx_login_audit_created_at ON login_audit (created_at DESC);

-- Index for querying by event type
CREATE INDEX IF NOT EXISTS idx_login_audit_event_type ON login_audit (event_type);

-- Enable RLS
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;

-- Only super admins (via service role) can SELECT; INSERT is service role only
-- No public access policies — all access is through service role
COMMENT ON TABLE login_audit IS 'D8-005: Clerk webhook login audit trail for compliance';
