/**
 * PHASE 41: IGNITION ORCHESTRATOR - DATABASE SCHEMA
 * 
 * Stores ignition state, credential vault, and rollback tracking.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 41
 */

-- ============================================
-- IGNITION STATE TABLE
-- ============================================

/**
 * Tracks the state of workspace provisioning operations.
 * Enables atomic rollback on failure.
 */
CREATE TABLE IF NOT EXISTS genesis.ignition_state (
  workspace_id UUID PRIMARY KEY,
  
  -- State machine
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'partition_creating',
    'droplet_provisioning',
    'handshake_pending',
    'credentials_injecting',
    'workflows_deploying',
    'activating',
    'active',
    'rollback_in_progress',
    'failed'
  )),
  
  -- Progress tracking
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 6,
  
  -- Resources created
  partition_name TEXT,
  droplet_id TEXT,
  droplet_ip TEXT,
  webhook_url TEXT,
  workflow_ids TEXT[] DEFAULT '{}',
  credential_ids UUID[] DEFAULT '{}',
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  error_step TEXT,
  
  -- Rollback tracking
  rollback_started_at TIMESTAMPTZ,
  rollback_completed_at TIMESTAMPTZ,
  rollback_success BOOLEAN,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  requested_by TEXT NOT NULL,
  region TEXT NOT NULL,
  droplet_size TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ignition_state_status 
  ON genesis.ignition_state(status);

CREATE INDEX IF NOT EXISTS idx_ignition_state_started 
  ON genesis.ignition_state(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ignition_state_droplet 
  ON genesis.ignition_state(droplet_id) 
  WHERE droplet_id IS NOT NULL;

-- ============================================
-- CREDENTIAL VAULT TABLE
-- ============================================

/**
 * Stores encrypted workspace credentials with AES-256-GCM.
 * Used by Ignition Orchestrator to inject credentials into Sidecar.
 */
CREATE TABLE IF NOT EXISTS genesis.workspace_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  
  -- Credential identification
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'google_oauth2',
    'openai_api',
    'smtp',
    'supabase',
    'postgres',
    'http_header_auth',
    'http_basic_auth'
  )),
  credential_name TEXT NOT NULL,
  
  -- n8n integration
  n8n_credential_id TEXT,
  template_credential_id TEXT,
  
  -- Encrypted data (AES-256-GCM)
  encrypted_data TEXT NOT NULL,  -- Base64-encoded encrypted blob
  encryption_version INTEGER NOT NULL DEFAULT 1,
  data_fingerprint TEXT NOT NULL,
  
  -- Sync status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'synced',
    'sync_failed',
    'revoked'
  )),
  last_synced_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  
  -- Constraints
  CONSTRAINT workspace_credentials_unique 
    UNIQUE (workspace_id, credential_type, credential_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_workspace 
  ON genesis.workspace_credentials(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_type 
  ON genesis.workspace_credentials(credential_type);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_status 
  ON genesis.workspace_credentials(status);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_n8n_id 
  ON genesis.workspace_credentials(n8n_credential_id) 
  WHERE n8n_credential_id IS NOT NULL;

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.workspace_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_credentials_select" 
  ON genesis.workspace_credentials 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id::text = genesis.get_workspace_context());

CREATE POLICY "workspace_credentials_insert" 
  ON genesis.workspace_credentials 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (workspace_id::text = genesis.get_workspace_context());

CREATE POLICY "workspace_credentials_update" 
  ON genesis.workspace_credentials 
  FOR UPDATE 
  TO authenticated 
  USING (workspace_id::text = genesis.get_workspace_context());

-- ============================================
-- CREDENTIAL AUDIT LOG TABLE
-- ============================================

/**
 * Audit trail for all credential operations.
 */
CREATE TABLE IF NOT EXISTS genesis.credential_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  credential_id UUID NOT NULL,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'updated',
    'synced',
    'verified',
    'revoked',
    'accessed',
    'decrypted'
  )),
  
  -- Actor information
  actor_id TEXT,
  actor_type TEXT CHECK (actor_type IN ('user', 'system', 'sidecar')),
  
  -- Context
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credential_audit_workspace 
  ON genesis.credential_audit_log(workspace_id);

CREATE INDEX IF NOT EXISTS idx_credential_audit_credential 
  ON genesis.credential_audit_log(credential_id);

CREATE INDEX IF NOT EXISTS idx_credential_audit_created 
  ON genesis.credential_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credential_audit_action 
  ON genesis.credential_audit_log(action);

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.credential_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credential_audit_log_select" 
  ON genesis.credential_audit_log 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id::text = genesis.get_workspace_context());

-- ============================================
-- IGNITION OPERATIONS TABLE
-- ============================================

/**
 * Tracks individual ignition operation steps for detailed auditing.
 */
CREATE TABLE IF NOT EXISTS genesis.ignition_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES genesis.ignition_state(workspace_id),
  
  -- Operation details
  operation TEXT NOT NULL, -- 'create_partition', 'provision_droplet', etc.
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  
  -- Execution details
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Result
  result JSONB,
  error_message TEXT,
  
  -- Rollback info
  rollback_action TEXT,
  rolled_back_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ignition_operations_workspace 
  ON genesis.ignition_operations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_ignition_operations_status 
  ON genesis.ignition_operations(status);

CREATE INDEX IF NOT EXISTS idx_ignition_operations_started 
  ON genesis.ignition_operations(started_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

/**
 * Get current ignition state for a workspace.
 */
CREATE OR REPLACE FUNCTION genesis.fn_get_ignition_state(
  p_workspace_id UUID
)
RETURNS TABLE (
  workspace_id UUID,
  status TEXT,
  current_step INTEGER,
  total_steps INTEGER,
  partition_name TEXT,
  droplet_id TEXT,
  droplet_ip TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ist.workspace_id,
    ist.status,
    ist.current_step,
    ist.total_steps,
    ist.partition_name,
    ist.droplet_id,
    ist.droplet_ip,
    ist.error_message,
    ist.started_at,
    ist.updated_at
  FROM genesis.ignition_state ist
  WHERE ist.workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Update ignition state.
 */
CREATE OR REPLACE FUNCTION genesis.fn_update_ignition_state(
  p_workspace_id UUID,
  p_status TEXT,
  p_current_step INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_partition_name TEXT DEFAULT NULL,
  p_droplet_id TEXT DEFAULT NULL,
  p_droplet_ip TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE genesis.ignition_state
  SET 
    status = p_status,
    current_step = COALESCE(p_current_step, current_step),
    error_message = p_error_message,
    partition_name = COALESCE(p_partition_name, partition_name),
    droplet_id = COALESCE(p_droplet_id, droplet_id),
    droplet_ip = COALESCE(p_droplet_ip, droplet_ip),
    updated_at = now()
  WHERE workspace_id = p_workspace_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Log credential action.
 */
CREATE OR REPLACE FUNCTION genesis.fn_log_credential_action(
  p_workspace_id UUID,
  p_credential_id UUID,
  p_action TEXT,
  p_actor_id TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO genesis.credential_audit_log (
    workspace_id,
    credential_id,
    action,
    actor_id,
    actor_type,
    details
  ) VALUES (
    p_workspace_id,
    p_credential_id,
    p_action,
    p_actor_id,
    p_actor_type,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Clean up old ignition states (completed or failed > 30 days).
 */
CREATE OR REPLACE FUNCTION genesis.fn_cleanup_old_ignition_states()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM genesis.ignition_state
    WHERE status IN ('active', 'failed')
      AND updated_at < now() - INTERVAL '30 days'
    RETURNING workspace_id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE genesis.ignition_state IS 'Phase 41: Tracks workspace provisioning state with atomic rollback';
COMMENT ON TABLE genesis.workspace_credentials IS 'Phase 41: AES-256-GCM encrypted credential vault';
COMMENT ON TABLE genesis.credential_audit_log IS 'Phase 41: Audit trail for credential operations';
COMMENT ON TABLE genesis.ignition_operations IS 'Phase 41: Detailed step-by-step operation log';
