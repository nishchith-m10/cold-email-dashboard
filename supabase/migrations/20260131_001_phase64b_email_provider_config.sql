-- ============================================
-- PHASE 64.B: EMAIL PROVIDER ABSTRACTION
-- ============================================
-- Database schema for multi-provider email configuration
-- Supports Gmail, SMTP, SendGrid, Mailgun, SES, Postmark
-- ============================================

-- Create email provider configuration table
CREATE TABLE IF NOT EXISTS genesis.email_provider_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Provider selection
    provider TEXT NOT NULL DEFAULT 'gmail' 
        CHECK (provider IN ('gmail', 'smtp', 'sendgrid', 'mailgun', 'ses', 'postmark')),
    
    -- Gmail OAuth (if provider = 'gmail')
    gmail_credential_id TEXT,
    gmail_refresh_token_encrypted BYTEA,
    gmail_email TEXT,
    
    -- SMTP Configuration (if provider = 'smtp')
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_username TEXT,
    smtp_password_encrypted BYTEA,
    smtp_encryption TEXT DEFAULT 'starttls' CHECK (smtp_encryption IN ('none', 'ssl', 'starttls')),
    smtp_from_name TEXT,
    smtp_from_email TEXT,
    
    -- SendGrid (if provider = 'sendgrid')
    sendgrid_api_key_encrypted BYTEA,
    sendgrid_from_email TEXT,
    sendgrid_from_name TEXT,
    
    -- Mailgun (if provider = 'mailgun')
    mailgun_api_key_encrypted BYTEA,
    mailgun_domain TEXT,
    mailgun_from_email TEXT,
    mailgun_from_name TEXT,
    
    -- Amazon SES (if provider = 'ses')
    ses_access_key_encrypted BYTEA,
    ses_secret_key_encrypted BYTEA,
    ses_region TEXT,
    ses_from_email TEXT,
    ses_from_name TEXT,
    
    -- Postmark (if provider = 'postmark')
    postmark_server_token_encrypted BYTEA,
    postmark_from_email TEXT,
    postmark_from_name TEXT,
    
    -- Connection health
    last_test_at TIMESTAMPTZ,
    last_test_success BOOLEAN,
    last_test_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One config per workspace
    UNIQUE(workspace_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_provider_workspace 
    ON genesis.email_provider_config(workspace_id);

-- Index for provider type queries
CREATE INDEX IF NOT EXISTS idx_email_provider_type 
    ON genesis.email_provider_config(provider);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION genesis.update_email_provider_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_provider_config_timestamp
    BEFORE UPDATE ON genesis.email_provider_config
    FOR EACH ROW
    EXECUTE FUNCTION genesis.update_email_provider_config_timestamp();

-- Enable Row Level Security
ALTER TABLE genesis.email_provider_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their workspace's config
CREATE POLICY email_provider_isolation ON genesis.email_provider_config
    FOR ALL
    USING (workspace_id = current_setting('app.workspace_id', true));

-- Comments for documentation
COMMENT ON TABLE genesis.email_provider_config IS 'Phase 64.B: Email provider configuration for multi-provider email sending abstraction';
COMMENT ON COLUMN genesis.email_provider_config.provider IS 'Email provider type: gmail, smtp, sendgrid, mailgun, ses, postmark';
COMMENT ON COLUMN genesis.email_provider_config.smtp_encryption IS 'SMTP encryption method: none, ssl, starttls';
COMMENT ON COLUMN genesis.email_provider_config.last_test_at IS 'Last time connection was tested';
COMMENT ON COLUMN genesis.email_provider_config.last_test_success IS 'Whether last test was successful';
COMMENT ON COLUMN genesis.email_provider_config.last_test_error IS 'Error message from last failed test';
