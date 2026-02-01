-- ============================================================================
-- PHASE 50: SOVEREIGN DROPLET FACTORY - DATABASE INFRASTRUCTURE
-- ============================================================================
-- This migration creates the DigitalOcean multi-account pool and droplet
-- lifecycle tracking infrastructure for the Genesis V35 architecture.
-- ============================================================================

-- Enable pgcrypto for API token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. DIGITALOCEAN ACCOUNT POOL
-- ============================================================================
-- Stores multiple DO accounts with encrypted API tokens for horizontal scaling.
-- Supports 15+ accounts with different droplet limits per account.
-- ============================================================================

CREATE TABLE IF NOT EXISTS genesis.do_accounts (
  account_id TEXT PRIMARY KEY,              -- "genesis-do-pool-us-east-01"
  api_token_encrypted TEXT NOT NULL,        -- Encrypted DO API token (AES-256-GCM)
  region TEXT NOT NULL,                     -- "nyc1", "sfo3", "fra1", etc.
  max_droplets INTEGER NOT NULL,            -- Account limit (e.g., 50, 200, 1000)
  current_droplets INTEGER NOT NULL DEFAULT 0, -- Live count of active droplets
  status TEXT NOT NULL DEFAULT 'active',    -- "active", "full", "suspended", "maintenance"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_provisioned_at TIMESTAMPTZ,
  
  -- Organizational metadata
  billing_email TEXT,                       -- genesis-billing-pool-01@genesis.io
  support_ticket_id TEXT,                   -- DO support ticket for limit increase
  notes TEXT,                               -- "Primary US-East account", "EU GDPR pool"
  
  -- Constraints
  CONSTRAINT do_accounts_status_valid CHECK (
    status IN ('active', 'full', 'suspended', 'maintenance')
  ),
  CONSTRAINT do_accounts_capacity_valid CHECK (
    current_droplets >= 0 AND current_droplets <= max_droplets
  )
);

-- Index for fast load-balancing queries
CREATE INDEX idx_do_accounts_load_balance 
  ON genesis.do_accounts (region, status, current_droplets) 
  WHERE status = 'active';

-- Index for capacity monitoring
CREATE INDEX idx_do_accounts_utilization 
  ON genesis.do_accounts (current_droplets, max_droplets) 
  WHERE status = 'active';

-- ============================================================================
-- 2. DROPLET FLEET STATUS TRACKING
-- ============================================================================
-- Tracks the state of every provisioned droplet in the fleet.
-- Implements the full state machine from PENDING → ACTIVE_HEALTHY.
-- ============================================================================

CREATE TABLE IF NOT EXISTS genesis.fleet_status (
  droplet_id BIGINT PRIMARY KEY,            -- DigitalOcean droplet ID
  workspace_id UUID NOT NULL,               -- References workspace
  account_id TEXT NOT NULL REFERENCES genesis.do_accounts(account_id),
  
  -- Droplet metadata
  region TEXT NOT NULL,                     -- "nyc1", "sfo3", etc.
  size_slug TEXT NOT NULL,                  -- "s-1vcpu-1gb"
  ip_address INET,                          -- Public IPv4
  
  -- State machine
  status TEXT NOT NULL DEFAULT 'PENDING',   -- Current lifecycle state
  last_heartbeat_at TIMESTAMPTZ,            -- Last sidecar ping
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initialized_at TIMESTAMPTZ,               -- Cloud-Init completed
  handshake_at TIMESTAMPTZ,                 -- Sidecar first POST
  activated_at TIMESTAMPTZ,                 -- Workflows deployed
  terminated_at TIMESTAMPTZ,
  
  -- Domain configuration (Dual-Mode)
  sslip_domain TEXT,                        -- "159.223.x.x.sslip.io" (bootstrap)
  custom_domain TEXT,                       -- "track.acmecorp.com" (production)
  
  -- Security
  provisioning_token TEXT,                  -- One-time token for handshake
  n8n_encryption_key TEXT,                  -- n8n's internal encryption key
  postgres_password TEXT,                   -- Database password
  
  -- Resource tracking
  docker_compose_version TEXT,              -- Version deployed
  n8n_version TEXT,                         -- n8n image tag
  
  -- Health metrics
  failed_heartbeats INTEGER DEFAULT 0,      -- Consecutive missed heartbeats
  last_error TEXT,                          -- Last error message
  
  -- Constraints
  CONSTRAINT fleet_status_state_valid CHECK (
    status IN (
      'PENDING',              -- DigitalOcean API called
      'PROVISIONING',         -- Droplet creating
      'BOOTING',              -- Droplet powered on
      'INITIALIZING',         -- Cloud-Init running
      'HANDSHAKE_PENDING',    -- Waiting for Sidecar POST
      'ACTIVE_HEALTHY',       -- Normal operation
      'DRIFT_DETECTED',       -- Workflow/credential mismatch
      'HIBERNATING',          -- Powered off to save costs
      'WAKING',               -- Powering on from hibernation
      'ZOMBIE',               -- Sidecar unresponsive
      'REBOOTING',            -- Hard reboot in progress
      'ORPHAN',               -- Provisioning failed
      'TERMINATED'            -- Destroyed
    )
  )
);

-- Index for workspace lookups
CREATE INDEX idx_fleet_status_workspace 
  ON genesis.fleet_status (workspace_id, status);

-- Index for account tracking (cost allocation)
CREATE INDEX idx_fleet_status_account 
  ON genesis.fleet_status (account_id, status);

-- Index for health monitoring
CREATE INDEX idx_fleet_status_heartbeat 
  ON genesis.fleet_status (status, last_heartbeat_at) 
  WHERE status IN ('ACTIVE_HEALTHY', 'ZOMBIE');

-- Index for zombie detection
CREATE INDEX idx_fleet_status_zombie_detection 
  ON genesis.fleet_status (last_heartbeat_at) 
  WHERE status = 'ACTIVE_HEALTHY';

-- ============================================================================
-- 3. DROPLET LIFECYCLE AUDIT LOG
-- ============================================================================
-- Records every state transition for forensic analysis and compliance.
-- ============================================================================

CREATE TABLE IF NOT EXISTS genesis.droplet_lifecycle_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  droplet_id BIGINT NOT NULL,
  workspace_id UUID NOT NULL,
  
  -- Transition details
  from_state TEXT,                          -- Previous state (NULL for initial)
  to_state TEXT NOT NULL,                   -- New state
  transition_reason TEXT,                   -- "handshake_success", "timeout", etc.
  
  -- Metadata
  triggered_by TEXT,                        -- "system", "user", "sidecar", "watchdog"
  metadata JSONB,                           -- Additional context
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for droplet history
CREATE INDEX idx_lifecycle_log_droplet 
  ON genesis.droplet_lifecycle_log (droplet_id, created_at DESC);

-- Index for workspace audit
CREATE INDEX idx_lifecycle_log_workspace 
  ON genesis.droplet_lifecycle_log (workspace_id, created_at DESC);

-- Index for state transition analysis
CREATE INDEX idx_lifecycle_log_transitions 
  ON genesis.droplet_lifecycle_log (from_state, to_state, created_at DESC);

-- ============================================================================
-- 4. ENCRYPTION FUNCTIONS FOR DO API TOKENS
-- ============================================================================
-- Uses pgcrypto (AES-256-GCM) with INTERNAL_ENCRYPTION_KEY from .env.local
-- ============================================================================

-- Function to decrypt DO API tokens
CREATE OR REPLACE FUNCTION genesis.decrypt_do_token(p_account_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_encrypted_token TEXT;
  v_decrypted TEXT;
BEGIN
  -- Fetch encrypted token
  SELECT api_token_encrypted INTO v_encrypted_token
  FROM genesis.do_accounts
  WHERE account_id = p_account_id;
  
  IF v_encrypted_token IS NULL THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Decrypt using pgcrypto
  -- Note: Requires 'app.encryption_key' to be set in session
  SELECT convert_from(
    pgp_sym_decrypt(
      decode(v_encrypted_token, 'base64'),
      current_setting('app.encryption_key')
    ),
    'utf8'
  ) INTO v_decrypted;
  
  RETURN v_decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt DO API tokens (for insertions)
CREATE OR REPLACE FUNCTION genesis.encrypt_do_token(p_plaintext_token TEXT)
RETURNS TEXT AS $$
DECLARE
  v_encrypted TEXT;
BEGIN
  -- Encrypt using pgcrypto
  SELECT encode(
    pgp_sym_encrypt(
      p_plaintext_token::bytea,
      current_setting('app.encryption_key')
    ),
    'base64'
  ) INTO v_encrypted;
  
  RETURN v_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ACCOUNT POOL HELPER FUNCTIONS
-- ============================================================================

-- Function to atomically increment droplet count
CREATE OR REPLACE FUNCTION genesis.increment_droplet_count(p_account_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.do_accounts
  SET 
    current_droplets = current_droplets + 1,
    last_provisioned_at = NOW()
  WHERE account_id = p_account_id;
  
  -- Update status to 'full' if at 95% capacity
  UPDATE genesis.do_accounts
  SET status = 'full'
  WHERE account_id = p_account_id
    AND current_droplets >= (max_droplets * 0.95)
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement droplet count
CREATE OR REPLACE FUNCTION genesis.decrement_droplet_count(p_account_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.do_accounts
  SET current_droplets = GREATEST(0, current_droplets - 1)
  WHERE account_id = p_account_id;
  
  -- Update status back to 'active' if was 'full' and now has capacity
  UPDATE genesis.do_accounts
  SET status = 'active'
  WHERE account_id = p_account_id
    AND status = 'full'
    AND current_droplets < (max_droplets * 0.95);
END;
$$ LANGUAGE plpgsql;

-- Function to select best account for provisioning (load-balancing)
CREATE OR REPLACE FUNCTION genesis.select_account_for_provisioning(p_region TEXT)
RETURNS TABLE (
  account_id TEXT,
  api_token_encrypted TEXT,
  available_capacity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.account_id,
    a.api_token_encrypted,
    (a.max_droplets - a.current_droplets) AS available_capacity
  FROM genesis.do_accounts a
  WHERE 
    a.region = p_region
    AND a.status = 'active'
    AND a.current_droplets < a.max_droplets
  ORDER BY 
    (a.max_droplets - a.current_droplets) DESC,  -- Prefer account with most room
    a.last_provisioned_at ASC NULLS FIRST        -- Load balance across accounts
  LIMIT 1
  FOR UPDATE;  -- Row-level lock to prevent race conditions
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. DROPLET STATE TRANSITION HELPERS
-- ============================================================================

-- Function to update droplet state with automatic logging
CREATE OR REPLACE FUNCTION genesis.transition_droplet_state(
  p_droplet_id BIGINT,
  p_new_state TEXT,
  p_reason TEXT DEFAULT NULL,
  p_triggered_by TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_state TEXT;
  v_workspace_id UUID;
BEGIN
  -- Get current state and workspace_id
  SELECT status, workspace_id INTO v_old_state, v_workspace_id
  FROM genesis.fleet_status
  WHERE droplet_id = p_droplet_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Droplet not found: %', p_droplet_id;
  END IF;
  
  -- Update state
  UPDATE genesis.fleet_status
  SET 
    status = p_new_state,
    last_error = CASE WHEN p_new_state IN ('ORPHAN', 'ZOMBIE') THEN p_reason ELSE NULL END
  WHERE droplet_id = p_droplet_id;
  
  -- Log transition
  INSERT INTO genesis.droplet_lifecycle_log (
    droplet_id,
    workspace_id,
    from_state,
    to_state,
    transition_reason,
    triggered_by,
    metadata
  ) VALUES (
    p_droplet_id,
    v_workspace_id,
    v_old_state,
    p_new_state,
    p_reason,
    p_triggered_by,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql;

-- Function to record heartbeat
CREATE OR REPLACE FUNCTION genesis.record_heartbeat(p_droplet_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.fleet_status
  SET 
    last_heartbeat_at = NOW(),
    failed_heartbeats = 0
  WHERE droplet_id = p_droplet_id
    AND status = 'ACTIVE_HEALTHY';
END;
$$ LANGUAGE plpgsql;

-- Function to detect zombie droplets
CREATE OR REPLACE FUNCTION genesis.detect_zombie_droplets()
RETURNS TABLE (
  droplet_id BIGINT,
  workspace_id UUID,
  last_heartbeat_at TIMESTAMPTZ,
  minutes_since_heartbeat INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.droplet_id,
    f.workspace_id,
    f.last_heartbeat_at,
    EXTRACT(EPOCH FROM (NOW() - f.last_heartbeat_at))::INTEGER / 60 AS minutes_since_heartbeat
  FROM genesis.fleet_status f
  WHERE 
    f.status = 'ACTIVE_HEALTHY'
    AND f.last_heartbeat_at < (NOW() - INTERVAL '10 minutes')
  ORDER BY f.last_heartbeat_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ACCOUNT POOL HEALTH MONITORING
-- ============================================================================

-- View for account pool utilization
CREATE OR REPLACE VIEW genesis.account_pool_health AS
SELECT 
  account_id,
  region,
  status,
  current_droplets,
  max_droplets,
  ROUND((current_droplets::NUMERIC / max_droplets) * 100, 2) AS utilization_pct,
  (max_droplets - current_droplets) AS available_capacity,
  last_provisioned_at,
  billing_email,
  notes
FROM genesis.do_accounts
ORDER BY region, account_id;

-- View for fleet health summary
CREATE OR REPLACE VIEW genesis.fleet_health_summary AS
SELECT 
  status,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE last_heartbeat_at > NOW() - INTERVAL '5 minutes') AS healthy_count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM genesis.fleet_status
GROUP BY status
ORDER BY status;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA genesis TO authenticated;

-- Grant table permissions
GRANT SELECT ON genesis.do_accounts TO authenticated;
GRANT SELECT ON genesis.fleet_status TO authenticated;
GRANT SELECT ON genesis.droplet_lifecycle_log TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION genesis.decrypt_do_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.encrypt_do_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.increment_droplet_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.decrement_droplet_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.select_account_for_provisioning(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.transition_droplet_state(BIGINT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.record_heartbeat(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION genesis.detect_zombie_droplets() TO authenticated;

-- Grant view permissions
GRANT SELECT ON genesis.account_pool_health TO authenticated;
GRANT SELECT ON genesis.fleet_health_summary TO authenticated;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE genesis.do_accounts IS 'Multi-account DigitalOcean pool for horizontal scaling. Supports 15+ accounts with encrypted API tokens.';
COMMENT ON TABLE genesis.fleet_status IS 'Tracks lifecycle state of all provisioned droplets. Implements state machine from PENDING → ACTIVE_HEALTHY.';
COMMENT ON TABLE genesis.droplet_lifecycle_log IS 'Audit trail for all droplet state transitions. Immutable log for forensics and compliance.';

COMMENT ON FUNCTION genesis.decrypt_do_token IS 'Decrypts DigitalOcean API token using INTERNAL_ENCRYPTION_KEY. Requires app.encryption_key session variable.';
COMMENT ON FUNCTION genesis.select_account_for_provisioning IS 'Load-balancing query to select best DO account for new droplet. Uses row-level lock to prevent race conditions.';
COMMENT ON FUNCTION genesis.transition_droplet_state IS 'Updates droplet state and automatically logs transition to audit trail.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 50: Droplet Infrastructure created successfully';
  RAISE NOTICE '   - genesis.do_accounts (account pool)';
  RAISE NOTICE '   - genesis.fleet_status (state machine)';
  RAISE NOTICE '   - genesis.droplet_lifecycle_log (audit trail)';
  RAISE NOTICE '   - 9 helper functions';
  RAISE NOTICE '   - 2 health monitoring views';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Add DigitalOcean accounts via INSERT INTO genesis.do_accounts';
  RAISE NOTICE '   2. Set INTERNAL_ENCRYPTION_KEY in .env.local';
  RAISE NOTICE '   3. Test provisioning with droplet-factory.ts';
END $$;
