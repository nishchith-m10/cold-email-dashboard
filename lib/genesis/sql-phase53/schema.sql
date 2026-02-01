/**
 * PHASE 53: DYNAMIC UUID MAPPER - DATABASE SCHEMA
 * 
 * Stores template credential mappings and workflow templates.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 53
 */

-- ============================================
-- TEMPLATE CREDENTIAL MAP TABLE
-- ============================================

/**
 * Stores placeholder UUIDs used in Golden Templates.
 * 
 * When deploying a workflow, the Dashboard looks up these placeholders
 * and maps them to the tenant's actual credential UUIDs.
 */
CREATE TABLE IF NOT EXISTS genesis.template_credential_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  template_name TEXT NOT NULL,
  template_version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Placeholder details
  placeholder_uuid TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  description TEXT,
  
  -- Metadata
  is_required BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT template_credential_map_unique_placeholder 
    UNIQUE (template_name, template_version, placeholder_uuid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_credential_map_template 
  ON genesis.template_credential_map(template_name, template_version);

CREATE INDEX IF NOT EXISTS idx_template_credential_map_type 
  ON genesis.template_credential_map(credential_type);

-- RLS Policies (readable by all authenticated users, writable by admins only)
ALTER TABLE genesis.template_credential_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_credential_map_select" 
  ON genesis.template_credential_map 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "template_credential_map_admin_all" 
  ON genesis.template_credential_map 
  FOR ALL 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- VARIABLE PLACEHOLDERS TABLE
-- ============================================

/**
 * Stores non-credential placeholders used in templates.
 * 
 * Examples: YOUR_DASHBOARD_URL, YOUR_WORKSPACE_ID, YOUR_NAME, etc.
 */
CREATE TABLE IF NOT EXISTS genesis.template_variable_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  template_name TEXT NOT NULL,
  template_version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Placeholder details
  placeholder_key TEXT NOT NULL,
  variable_type TEXT NOT NULL, -- 'workspace', 'user', 'system', 'custom'
  source_field TEXT NOT NULL, -- Where to get the value (e.g., 'workspace.name')
  description TEXT,
  default_value TEXT,
  
  -- Validation
  is_required BOOLEAN NOT NULL DEFAULT true,
  validation_regex TEXT,
  
  -- Metadata
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT template_variable_map_unique_placeholder 
    UNIQUE (template_name, template_version, placeholder_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_variable_map_template 
  ON genesis.template_variable_map(template_name, template_version);

CREATE INDEX IF NOT EXISTS idx_template_variable_map_type 
  ON genesis.template_variable_map(variable_type);

-- RLS Policies
ALTER TABLE genesis.template_variable_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_variable_map_select" 
  ON genesis.template_variable_map 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "template_variable_map_admin_all" 
  ON genesis.template_variable_map 
  FOR ALL 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- GOLDEN TEMPLATES TABLE
-- ============================================

/**
 * Stores the Golden Template workflows with their validation rules.
 */
CREATE TABLE IF NOT EXISTS genesis.golden_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'email', -- 'email', 'research', 'scraping', etc.
  
  -- Workflow JSON
  workflow_json JSONB NOT NULL,
  
  -- Validation rules
  required_node_types TEXT[] NOT NULL DEFAULT '{}',
  required_credential_types TEXT[] NOT NULL DEFAULT '{}',
  forbidden_node_types TEXT[] NOT NULL DEFAULT '{}',
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT golden_templates_unique_name_version 
    UNIQUE (name, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_golden_templates_name 
  ON genesis.golden_templates(name);

CREATE INDEX IF NOT EXISTS idx_golden_templates_category 
  ON genesis.golden_templates(category);

CREATE INDEX IF NOT EXISTS idx_golden_templates_active 
  ON genesis.golden_templates(is_active) 
  WHERE is_active = true;

-- RLS Policies
ALTER TABLE genesis.golden_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "golden_templates_select" 
  ON genesis.golden_templates 
  FOR SELECT 
  TO authenticated 
  USING (is_active = true);

CREATE POLICY "golden_templates_admin_all" 
  ON genesis.golden_templates 
  FOR ALL 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- WORKSPACE CREDENTIAL MAPPINGS TABLE
-- ============================================

/**
 * Stores the actual credential UUIDs for each workspace.
 * Maps template placeholders to tenant-specific credentials.
 */
CREATE TABLE IF NOT EXISTS genesis.workspace_credential_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace reference
  workspace_id UUID NOT NULL,
  
  -- Credential details
  credential_type TEXT NOT NULL,
  credential_uuid TEXT NOT NULL, -- The actual UUID in the tenant's n8n
  credential_name TEXT NOT NULL,
  
  -- Droplet reference
  droplet_id TEXT NOT NULL,
  
  -- Status
  is_valid BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workspace_credential_mappings_unique 
    UNIQUE (workspace_id, credential_type, droplet_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_credential_mappings_workspace 
  ON genesis.workspace_credential_mappings(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_credential_mappings_droplet 
  ON genesis.workspace_credential_mappings(droplet_id);

CREATE INDEX IF NOT EXISTS idx_workspace_credential_mappings_type 
  ON genesis.workspace_credential_mappings(credential_type);

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.workspace_credential_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_credential_mappings_select" 
  ON genesis.workspace_credential_mappings 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id::text = genesis.get_workspace_context());

CREATE POLICY "workspace_credential_mappings_insert" 
  ON genesis.workspace_credential_mappings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (workspace_id::text = genesis.get_workspace_context());

CREATE POLICY "workspace_credential_mappings_update" 
  ON genesis.workspace_credential_mappings 
  FOR UPDATE 
  TO authenticated 
  USING (workspace_id::text = genesis.get_workspace_context());

-- ============================================
-- WORKFLOW DEPLOYMENT LOG TABLE
-- ============================================

/**
 * Logs all workflow deployments for audit and rollback.
 */
CREATE TABLE IF NOT EXISTS genesis.workflow_deployment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace & Droplet
  workspace_id UUID NOT NULL,
  droplet_id TEXT NOT NULL,
  
  -- Template info
  template_name TEXT NOT NULL,
  template_version TEXT NOT NULL,
  
  -- Deployment details
  workflow_id TEXT, -- n8n workflow ID after deployment
  workflow_json JSONB NOT NULL, -- The actual JSON sent (after mapping)
  credential_map JSONB NOT NULL, -- The mapping used
  variable_map JSONB NOT NULL, -- The variable replacements used
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  
  -- Metadata
  deployed_by TEXT NOT NULL,
  deployment_duration_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_workspace 
  ON genesis.workflow_deployment_log(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_droplet 
  ON genesis.workflow_deployment_log(droplet_id);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_template 
  ON genesis.workflow_deployment_log(template_name, template_version);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_status 
  ON genesis.workflow_deployment_log(status);

CREATE INDEX IF NOT EXISTS idx_workflow_deployment_log_created 
  ON genesis.workflow_deployment_log(created_at DESC);

-- RLS Policies (workspace-scoped)
ALTER TABLE genesis.workflow_deployment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_deployment_log_select" 
  ON genesis.workflow_deployment_log 
  FOR SELECT 
  TO authenticated 
  USING (workspace_id::text = genesis.get_workspace_context());

CREATE POLICY "workflow_deployment_log_insert" 
  ON genesis.workflow_deployment_log 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (workspace_id::text = genesis.get_workspace_context());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

/**
 * Get template credential map for a specific template.
 */
CREATE OR REPLACE FUNCTION genesis.fn_get_template_credential_map(
  p_template_name TEXT,
  p_template_version TEXT DEFAULT '1.0.0'
)
RETURNS TABLE (
  placeholder_uuid TEXT,
  credential_type TEXT,
  description TEXT,
  is_required BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tcm.placeholder_uuid,
    tcm.credential_type,
    tcm.description,
    tcm.is_required
  FROM genesis.template_credential_map tcm
  WHERE tcm.template_name = p_template_name
    AND tcm.template_version = p_template_version
  ORDER BY tcm.display_order, tcm.credential_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Get workspace credential mappings for a workspace.
 */
CREATE OR REPLACE FUNCTION genesis.fn_get_workspace_credential_map(
  p_workspace_id UUID,
  p_droplet_id TEXT
)
RETURNS TABLE (
  credential_type TEXT,
  credential_uuid TEXT,
  credential_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wcm.credential_type,
    wcm.credential_uuid,
    wcm.credential_name
  FROM genesis.workspace_credential_mappings wcm
  WHERE wcm.workspace_id = p_workspace_id
    AND wcm.droplet_id = p_droplet_id
    AND wcm.is_valid = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Record a workflow deployment.
 */
CREATE OR REPLACE FUNCTION genesis.fn_record_workflow_deployment(
  p_workspace_id UUID,
  p_droplet_id TEXT,
  p_template_name TEXT,
  p_template_version TEXT,
  p_workflow_json JSONB,
  p_credential_map JSONB,
  p_variable_map JSONB,
  p_deployed_by TEXT
)
RETURNS UUID AS $$
DECLARE
  v_deployment_id UUID;
BEGIN
  INSERT INTO genesis.workflow_deployment_log (
    workspace_id,
    droplet_id,
    template_name,
    template_version,
    workflow_json,
    credential_map,
    variable_map,
    deployed_by,
    status
  ) VALUES (
    p_workspace_id,
    p_droplet_id,
    p_template_name,
    p_template_version,
    p_workflow_json,
    p_credential_map,
    p_variable_map,
    p_deployed_by,
    'pending'
  ) RETURNING id INTO v_deployment_id;
  
  RETURN v_deployment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Update deployment status.
 */
CREATE OR REPLACE FUNCTION genesis.fn_update_deployment_status(
  p_deployment_id UUID,
  p_status TEXT,
  p_workflow_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE genesis.workflow_deployment_log
  SET 
    status = p_status,
    workflow_id = COALESCE(p_workflow_id, workflow_id),
    error_message = p_error_message,
    deployment_duration_ms = p_duration_ms,
    completed_at = now()
  WHERE id = p_deployment_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Example Templates)
-- ============================================

-- Insert example template credential mappings
INSERT INTO genesis.template_credential_map (template_name, template_version, placeholder_uuid, credential_type, description, display_order)
VALUES 
  ('email_1', '1.0.0', 'TEMPLATE_GMAIL_UUID', 'gmailOAuth2', 'Gmail OAuth2 credentials for sending emails', 1),
  ('email_1', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2),
  ('email_2', '1.0.0', 'TEMPLATE_GMAIL_UUID', 'gmailOAuth2', 'Gmail OAuth2 credentials for sending emails', 1),
  ('email_2', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2),
  ('email_3', '1.0.0', 'TEMPLATE_GMAIL_UUID', 'gmailOAuth2', 'Gmail OAuth2 credentials for sending emails', 1),
  ('email_3', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2),
  ('research_report', '1.0.0', 'TEMPLATE_OPENAI_UUID', 'openAiApi', 'OpenAI API key for content generation', 1),
  ('research_report', '1.0.0', 'TEMPLATE_POSTGRES_UUID', 'postgres', 'Postgres connection for leads table', 2)
ON CONFLICT (template_name, template_version, placeholder_uuid) DO NOTHING;

-- Insert example variable mappings
INSERT INTO genesis.template_variable_map (template_name, template_version, placeholder_key, variable_type, source_field, description, display_order)
VALUES 
  ('email_1', '1.0.0', 'YOUR_DASHBOARD_URL', 'system', 'system.dashboard_url', 'Dashboard URL for webhook callbacks', 1),
  ('email_1', '1.0.0', 'YOUR_WORKSPACE_ID', 'workspace', 'workspace.id', 'Workspace UUID', 2),
  ('email_1', '1.0.0', 'YOUR_LEADS_TABLE', 'workspace', 'workspace.partition_name', 'Partition table name', 3),
  ('email_1', '1.0.0', 'YOUR_NAME', 'user', 'user.name', 'User display name', 4),
  ('email_1', '1.0.0', 'YOUR_SENDER_EMAIL', 'user', 'user.email', 'Email sender address', 5)
ON CONFLICT (template_name, template_version, placeholder_key) DO NOTHING;

-- Comments
COMMENT ON TABLE genesis.template_credential_map IS 'Phase 53: Stores placeholder UUIDs for Golden Templates';
COMMENT ON TABLE genesis.template_variable_map IS 'Phase 53: Stores variable placeholders for templates';
COMMENT ON TABLE genesis.golden_templates IS 'Phase 53: Stores Golden Template workflows with validation rules';
COMMENT ON TABLE genesis.workspace_credential_mappings IS 'Phase 53: Maps template placeholders to tenant credentials';
COMMENT ON TABLE genesis.workflow_deployment_log IS 'Phase 53: Audit log for workflow deployments';
