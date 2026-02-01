-- ============================================
-- PHASE 64: GENESIS GATEWAY OAUTH PROXY
-- SQL Schema for Credential Vault and Onboarding
-- ============================================

-- ============================================
-- TABLE: workspace_credentials
-- Stores encrypted OAuth tokens and API keys
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.workspace_credentials (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Credential metadata
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'gmail_oauth',
    'google_sheets_oauth',
    'entri_oauth',
    'openai_api_key',
    'anthropic_api_key',
    'google_cse_api_key',
    'relevance_api_key',
    'apify_api_token',
    'calendly_url'
  )),
  status TEXT NOT NULL DEFAULT 'pending_validation' CHECK (status IN (
    'valid',
    'invalid',
    'expired',
    'pending_validation'
  )),
  
  -- OAuth fields (for gmail_oauth, google_sheets_oauth, entri_oauth)
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_type TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  
  -- API key fields (for openai, anthropic, etc.)
  api_key TEXT, -- Encrypted
  
  -- Calendly field
  booking_url TEXT, -- Plain text
  
  -- Metadata (e.g., Google CSE engine ID, organization)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Validation tracking
  validated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(workspace_id, credential_type)
);

-- Index for lookups
CREATE INDEX idx_workspace_credentials_workspace ON genesis.workspace_credentials(workspace_id);
CREATE INDEX idx_workspace_credentials_type ON genesis.workspace_credentials(credential_type);
CREATE INDEX idx_workspace_credentials_status ON genesis.workspace_credentials(status);
CREATE INDEX idx_workspace_credentials_expires ON genesis.workspace_credentials(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE genesis.workspace_credentials IS 'Encrypted storage for OAuth tokens and API keys';
COMMENT ON COLUMN genesis.workspace_credentials.access_token IS 'AES-256-GCM encrypted OAuth access token';
COMMENT ON COLUMN genesis.workspace_credentials.refresh_token IS 'AES-256-GCM encrypted OAuth refresh token';
COMMENT ON COLUMN genesis.workspace_credentials.api_key IS 'AES-256-GCM encrypted API key';

-- ============================================
-- TABLE: workspace_infrastructure
-- Stores droplet region and size preferences
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.workspace_infrastructure (
  -- Identity
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Infrastructure configuration
  region TEXT NOT NULL CHECK (region IN ('us-east', 'us-west', 'eu-west', 'eu-north', 'apac')),
  size TEXT NOT NULL CHECK (size IN ('starter', 'professional', 'scale', 'enterprise')),
  
  -- Timestamps
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provisioned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspace_infrastructure_region ON genesis.workspace_infrastructure(region);
CREATE INDEX idx_workspace_infrastructure_size ON genesis.workspace_infrastructure(size);

COMMENT ON TABLE genesis.workspace_infrastructure IS 'Droplet region and size configuration per workspace';
COMMENT ON COLUMN genesis.workspace_infrastructure.region IS 'DigitalOcean region for droplet provisioning';
COMMENT ON COLUMN genesis.workspace_infrastructure.size IS 'Droplet tier (maps to DigitalOcean size slug)';

-- ============================================
-- TABLE: brand_vault
-- Stores company brand information
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.brand_vault (
  -- Identity
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Basic info
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  description TEXT,
  logo_url TEXT,
  
  -- Personalization
  target_audience TEXT,
  products TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Auto-scrape metadata
  auto_scraped BOOLEAN DEFAULT FALSE,
  scraped_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_vault_auto_scraped ON genesis.brand_vault(auto_scraped);

COMMENT ON TABLE genesis.brand_vault IS 'Company brand information for email personalization';
COMMENT ON COLUMN genesis.brand_vault.auto_scraped IS 'Whether data was extracted via website scraping';

-- ============================================
-- TABLE: onboarding_progress
-- Tracks user progress through Genesis Gateway
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.onboarding_progress (
  -- Identity
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Progress state
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'region_selection',
    'brand_info',
    'gmail_oauth',
    'openai_key',
    'anthropic_key',
    'google_cse_key',
    'relevance_key',
    'apify_selection',
    'calendly_url',
    'dns_setup',
    'ignition'
  )),
  completed_stages TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_onboarding_progress_stage ON genesis.onboarding_progress(current_stage);
CREATE INDEX idx_onboarding_progress_completed ON genesis.onboarding_progress(completed_at) WHERE completed_at IS NOT NULL;

COMMENT ON TABLE genesis.onboarding_progress IS 'Tracks user progress through 11-stage onboarding flow';
COMMENT ON COLUMN genesis.onboarding_progress.completed_stages IS 'Array of stage names that have been completed';

-- ============================================
-- TABLE: apify_selections
-- Stores BYO vs Managed service selection
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.apify_selections (
  -- Identity
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Selection
  mode TEXT NOT NULL CHECK (mode IN ('byo', 'managed')),
  validated BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apify_selections_mode ON genesis.apify_selections(mode);

COMMENT ON TABLE genesis.apify_selections IS 'Apify BYO vs Managed service selection';
COMMENT ON COLUMN genesis.apify_selections.mode IS 'byo = Bring Your Own token, managed = Use Genesis pool';

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION genesis.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_workspace_credentials_updated_at
  BEFORE UPDATE ON genesis.workspace_credentials
  FOR EACH ROW
  EXECUTE FUNCTION genesis.update_updated_at_column();

CREATE TRIGGER update_workspace_infrastructure_updated_at
  BEFORE UPDATE ON genesis.workspace_infrastructure
  FOR EACH ROW
  EXECUTE FUNCTION genesis.update_updated_at_column();

CREATE TRIGGER update_brand_vault_updated_at
  BEFORE UPDATE ON genesis.brand_vault
  FOR EACH ROW
  EXECUTE FUNCTION genesis.update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON genesis.onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION genesis.update_updated_at_column();

CREATE TRIGGER update_apify_selections_updated_at
  BEFORE UPDATE ON genesis.apify_selections
  FOR EACH ROW
  EXECUTE FUNCTION genesis.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE genesis.workspace_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.workspace_infrastructure ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.brand_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.apify_selections ENABLE ROW LEVEL SECURITY;

-- workspace_credentials policies
CREATE POLICY "Users can view credentials for their workspaces"
  ON genesis.workspace_credentials
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert credentials for their workspaces"
  ON genesis.workspace_credentials
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access 
      WHERE user_id = auth.uid() AND can_write = TRUE
    )
  );

CREATE POLICY "Users can update credentials for their workspaces"
  ON genesis.workspace_credentials
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access 
      WHERE user_id = auth.uid() AND can_write = TRUE
    )
  );

CREATE POLICY "Users can delete credentials for their workspaces"
  ON genesis.workspace_credentials
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access 
      WHERE user_id = auth.uid() AND can_manage = TRUE
    )
  );

-- workspace_infrastructure policies
CREATE POLICY "Users can view infrastructure for their workspaces"
  ON genesis.workspace_infrastructure
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage infrastructure for their workspaces"
  ON genesis.workspace_infrastructure
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access 
      WHERE user_id = auth.uid() AND can_manage = TRUE
    )
  );

-- brand_vault policies
CREATE POLICY "Users can view brand info for their workspaces"
  ON genesis.brand_vault
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage brand info for their workspaces"
  ON genesis.brand_vault
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access 
      WHERE user_id = auth.uid() AND can_write = TRUE
    )
  );

-- onboarding_progress policies
CREATE POLICY "Users can view onboarding progress for their workspaces"
  ON genesis.onboarding_progress
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage onboarding progress for their workspaces"
  ON genesis.onboarding_progress
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access 
      WHERE user_id = auth.uid() AND can_write = TRUE
    )
  );

-- apify_selections policies
CREATE POLICY "Users can view apify selections for their workspaces"
  ON genesis.apify_selections
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage apify selections for their workspaces"
  ON genesis.apify_selections
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_access 
      WHERE user_id = auth.uid() AND can_write = TRUE
    )
  );
