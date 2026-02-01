-- ============================================
-- PHASE 51: SIDECAR INFRASTRUCTURE
-- ============================================
-- Creates tables for Sidecar Agent communication,
-- health monitoring, and command auditing.
-- ============================================

-- ============================================
-- 1. SIDECAR COMMANDS TABLE
-- ============================================
-- Audit log for all commands sent to Sidecar agents

CREATE TABLE IF NOT EXISTS genesis.sidecar_commands (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti UUID NOT NULL UNIQUE, -- JWT ID for idempotency
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL,
  
  -- Command details
  action TEXT NOT NULL, -- DEPLOY_WORKFLOW, HEALTH_CHECK, etc.
  payload JSONB,
  
  -- JWT tracking
  jwt_hash TEXT NOT NULL, -- SHA-256 hash of JWT for security
  jwt_issued_at TIMESTAMPTZ NOT NULL,
  jwt_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Execution tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Results
  result JSONB,
  error TEXT,
  execution_time_ms INTEGER,
  
  -- Retry tracking
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_commands_workspace ON genesis.sidecar_commands(workspace_id);
CREATE INDEX idx_sidecar_commands_droplet ON genesis.sidecar_commands(droplet_id);
CREATE INDEX idx_sidecar_commands_status ON genesis.sidecar_commands(status);
CREATE INDEX idx_sidecar_commands_created_at ON genesis.sidecar_commands(created_at DESC);
CREATE INDEX idx_sidecar_commands_jti ON genesis.sidecar_commands(jti);

-- Index for cleanup queries
CREATE INDEX idx_sidecar_commands_expired ON genesis.sidecar_commands(jwt_expires_at) 
  WHERE status IN ('pending', 'processing');

COMMENT ON TABLE genesis.sidecar_commands IS 
  'Audit log for all commands sent to Sidecar agents. Tracks JWT usage and prevents replay attacks.';

COMMENT ON COLUMN genesis.sidecar_commands.jti IS 
  'JWT ID from token payload. Enforces one-time use (replay prevention).';

COMMENT ON COLUMN genesis.sidecar_commands.jwt_hash IS 
  'SHA-256 hash of JWT token. Stored for audit without exposing actual token.';

-- ============================================
-- 2. SIDECAR HEALTH TABLE
-- ============================================
-- Stores health reports from Sidecar agents (sent every 60 seconds)

CREATE TABLE IF NOT EXISTS genesis.sidecar_health (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL,
  
  -- Timestamp
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- n8n health
  n8n_status TEXT NOT NULL CHECK (n8n_status IN ('healthy', 'degraded', 'down')),
  n8n_version TEXT,
  
  -- Container health
  container_status TEXT, -- running, stopped, restarting, etc.
  container_health TEXT, -- healthy, unhealthy, starting
  
  -- Resource usage
  cpu_percent NUMERIC(5, 2),
  memory_usage_mb INTEGER,
  memory_limit_mb INTEGER,
  disk_usage_percent NUMERIC(5, 2),
  
  -- Execution stats (from n8n)
  executions_running INTEGER,
  executions_waiting INTEGER,
  
  -- Uptime
  uptime_seconds INTEGER,
  
  -- Network
  network_rx_mb NUMERIC(10, 2),
  network_tx_mb NUMERIC(10, 2),
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_health_workspace ON genesis.sidecar_health(workspace_id);
CREATE INDEX idx_sidecar_health_droplet ON genesis.sidecar_health(droplet_id);
CREATE INDEX idx_sidecar_health_reported_at ON genesis.sidecar_health(reported_at DESC);
CREATE INDEX idx_sidecar_health_status ON genesis.sidecar_health(n8n_status);

-- Index for latest health query (most common query)
CREATE INDEX idx_sidecar_health_latest ON genesis.sidecar_health(droplet_id, reported_at DESC);

COMMENT ON TABLE genesis.sidecar_health IS 
  'Health reports from Sidecar agents. Received every 60 seconds via heartbeat endpoint.';

COMMENT ON COLUMN genesis.sidecar_health.n8n_status IS 
  'Overall n8n health: healthy (normal), degraded (slow/stuck), down (unreachable).';

-- ============================================
-- 3. SIDECAR METRICS TABLE
-- ============================================
-- Aggregated execution metrics from n8n (collected every 15 minutes)

CREATE TABLE IF NOT EXISTS genesis.sidecar_metrics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL,
  
  -- Time window
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  
  -- Execution metrics
  executions_total INTEGER NOT NULL DEFAULT 0,
  executions_success INTEGER NOT NULL DEFAULT 0,
  executions_failed INTEGER NOT NULL DEFAULT 0,
  executions_canceled INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_duration_ms INTEGER,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  p50_duration_ms INTEGER,
  p95_duration_ms INTEGER,
  p99_duration_ms INTEGER,
  
  -- Workflow breakdown (top 5 workflows by execution count)
  top_workflows JSONB,
  
  -- Error analysis
  top_errors JSONB,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_metrics_workspace ON genesis.sidecar_metrics(workspace_id);
CREATE INDEX idx_sidecar_metrics_droplet ON genesis.sidecar_metrics(droplet_id);
CREATE INDEX idx_sidecar_metrics_collected_at ON genesis.sidecar_metrics(collected_at DESC);
CREATE INDEX idx_sidecar_metrics_window ON genesis.sidecar_metrics(window_start, window_end);

COMMENT ON TABLE genesis.sidecar_metrics IS 
  'Aggregated execution metrics from n8n. Collected every 15 minutes by Metric Aggregator.';

COMMENT ON COLUMN genesis.sidecar_metrics.top_workflows IS 
  'Array of {workflow_id, workflow_name, execution_count} for top 5 workflows by volume.';

COMMENT ON COLUMN genesis.sidecar_metrics.top_errors IS 
  'Array of {error_type, count, example_message} for most common errors.';

-- ============================================
-- 4. SIDECAR TOKENS TABLE
-- ============================================
-- Stores long-lived tokens for Sidecar → Dashboard communication

CREATE TABLE IF NOT EXISTS genesis.sidecar_tokens (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Routing
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  droplet_id TEXT NOT NULL UNIQUE,
  
  -- Token
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of token
  token_prefix TEXT NOT NULL, -- First 8 chars for identification
  
  -- Lifecycle
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_sidecar_tokens_workspace ON genesis.sidecar_tokens(workspace_id);
CREATE INDEX idx_sidecar_tokens_droplet ON genesis.sidecar_tokens(droplet_id);
CREATE INDEX idx_sidecar_tokens_hash ON genesis.sidecar_tokens(token_hash);
CREATE INDEX idx_sidecar_tokens_active ON genesis.sidecar_tokens(droplet_id) 
  WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());

COMMENT ON TABLE genesis.sidecar_tokens IS 
  'Long-lived authentication tokens for Sidecar agents to report health/metrics to Dashboard.';

COMMENT ON COLUMN genesis.sidecar_tokens.token_hash IS 
  'SHA-256 hash of token. Actual token only exists on droplet.';

COMMENT ON COLUMN genesis.sidecar_tokens.token_prefix IS 
  'First 8 characters of token for identification in logs (e.g., "sc_AbcD1234").';

-- ============================================
-- 5. JWT KEY PAIRS TABLE
-- ============================================
-- Stores RSA key pairs for JWT signing/verification

CREATE TABLE IF NOT EXISTS genesis.jwt_keypairs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key metadata
  key_id TEXT NOT NULL UNIQUE, -- kid (Key ID) for JWT header
  algorithm TEXT NOT NULL DEFAULT 'RS256',
  
  -- Keys (PEM format)
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL, -- Encrypted with master key
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ, -- When replaced by new key
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'rotating', 'retired')),
  
  -- Usage tracking
  jwt_issued_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_jwt_keypairs_key_id ON genesis.jwt_keypairs(key_id);
CREATE INDEX idx_jwt_keypairs_status ON genesis.jwt_keypairs(status);
CREATE UNIQUE INDEX idx_jwt_keypairs_active ON genesis.jwt_keypairs(status) 
  WHERE status = 'active';

COMMENT ON TABLE genesis.jwt_keypairs IS 
  'RSA key pairs for signing/verifying JWT tokens sent to Sidecar agents. Supports key rotation.';

COMMENT ON COLUMN genesis.jwt_keypairs.private_key_encrypted IS 
  'Private key encrypted with Dashboard master key. NEVER exposed via API.';

COMMENT ON COLUMN genesis.jwt_keypairs.status IS 
  'active (current signing key), rotating (being replaced), retired (no longer used for signing).';

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function: Get latest health for droplet
CREATE OR REPLACE FUNCTION genesis.get_latest_droplet_health(p_droplet_id TEXT)
RETURNS SETOF genesis.sidecar_health
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM genesis.sidecar_health
  WHERE droplet_id = p_droplet_id
  ORDER BY reported_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION genesis.get_latest_droplet_health IS 
  'Returns the most recent health report for a specific droplet.';

-- Function: Get fleet health summary
CREATE OR REPLACE FUNCTION genesis.get_fleet_health_summary()
RETURNS TABLE (
  total_droplets BIGINT,
  healthy_droplets BIGINT,
  degraded_droplets BIGINT,
  down_droplets BIGINT,
  last_updated TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  WITH latest_health AS (
    SELECT DISTINCT ON (droplet_id)
      droplet_id,
      n8n_status,
      reported_at
    FROM genesis.sidecar_health
    ORDER BY droplet_id, reported_at DESC
  )
  SELECT
    COUNT(*)::BIGINT AS total_droplets,
    COUNT(*) FILTER (WHERE n8n_status = 'healthy')::BIGINT AS healthy_droplets,
    COUNT(*) FILTER (WHERE n8n_status = 'degraded')::BIGINT AS degraded_droplets,
    COUNT(*) FILTER (WHERE n8n_status = 'down')::BIGINT AS down_droplets,
    MAX(reported_at) AS last_updated
  FROM latest_health;
$$;

COMMENT ON FUNCTION genesis.get_fleet_health_summary IS 
  'Returns aggregated health statistics for the entire droplet fleet.';

-- Function: Cleanup expired commands
CREATE OR REPLACE FUNCTION genesis.cleanup_expired_commands()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete commands older than 24 hours
  DELETE FROM genesis.sidecar_commands
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION genesis.cleanup_expired_commands IS 
  'Deletes command records older than 24 hours. Should be run daily via cron.';

-- Function: Cleanup old health reports
CREATE OR REPLACE FUNCTION genesis.cleanup_old_health_reports()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep only last 7 days of health reports
  DELETE FROM genesis.sidecar_health
  WHERE reported_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION genesis.cleanup_old_health_reports IS 
  'Deletes health reports older than 7 days. Should be run daily via cron.';

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE genesis.sidecar_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sidecar_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sidecar_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.sidecar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.jwt_keypairs ENABLE ROW LEVEL SECURITY;

-- Sidecar Commands: Users can only see commands for their workspace
CREATE POLICY sidecar_commands_workspace_isolation
  ON genesis.sidecar_commands
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid()
    )
  );

-- Sidecar Health: Users can only see health for their workspace
CREATE POLICY sidecar_health_workspace_isolation
  ON genesis.sidecar_health
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid()
    )
  );

-- Sidecar Metrics: Users can only see metrics for their workspace
CREATE POLICY sidecar_metrics_workspace_isolation
  ON genesis.sidecar_metrics
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid()
    )
  );

-- Sidecar Tokens: Only system admins can view
CREATE POLICY sidecar_tokens_admin_only
  ON genesis.sidecar_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_workspaces
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- JWT Keypairs: Only system (service role) can access
CREATE POLICY jwt_keypairs_system_only
  ON genesis.jwt_keypairs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 8. GRANTS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT ON genesis.sidecar_commands TO authenticated;
GRANT SELECT ON genesis.sidecar_health TO authenticated;
GRANT SELECT ON genesis.sidecar_metrics TO authenticated;

-- Grant full access to service role (for API operations)
GRANT ALL ON genesis.sidecar_commands TO service_role;
GRANT ALL ON genesis.sidecar_health TO service_role;
GRANT ALL ON genesis.sidecar_metrics TO service_role;
GRANT ALL ON genesis.sidecar_tokens TO service_role;
GRANT ALL ON genesis.jwt_keypairs TO service_role;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION genesis.get_latest_droplet_health TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.get_fleet_health_summary TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.cleanup_expired_commands TO service_role;
GRANT EXECUTE ON FUNCTION genesis.cleanup_old_health_reports TO service_role;

-- ============================================
-- 9. SAMPLE DATA (for testing)
-- ============================================

-- Insert default RSA keypair (FOR TESTING ONLY - generate real keys in production)
INSERT INTO genesis.jwt_keypairs (
  key_id,
  algorithm,
  public_key,
  private_key_encrypted,
  status,
  activated_at
) VALUES (
  'genesis-dashboard-2024-01',
  'RS256',
  '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z7Q
... (truncated for example) ...
-----END PUBLIC KEY-----',
  'ENCRYPTED_PRIVATE_KEY_PLACEHOLDER',
  'active',
  NOW()
)
ON CONFLICT (key_id) DO NOTHING;

COMMENT ON TABLE genesis.jwt_keypairs IS 
  'RSA keypair inserted. In production, generate proper keys using openssl and encrypt private key.';

-- ============================================
-- PHASE 51 COMPLETE
-- ============================================
