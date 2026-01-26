-- ============================================
-- WEBHOOK SYSTEM MIGRATION
-- Creates tables for workspace webhook management and delivery tracking
-- Date: 2026-01-26
-- ============================================

-- ============================================
-- STEP 1: CREATE WORKSPACE_WEBHOOKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure URL is valid format (basic check)
  CONSTRAINT valid_url CHECK (url ~* '^https?://'),
  
  -- Ensure event_types is an array
  CONSTRAINT valid_event_types CHECK (jsonb_typeof(event_types) = 'array')
);

-- ============================================
-- STEP 2: CREATE WEBHOOK_DELIVERIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES workspace_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'retrying')),
  attempts INTEGER NOT NULL DEFAULT 0,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

-- ============================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for workspace_webhooks
CREATE INDEX IF NOT EXISTS idx_workspace_webhooks_workspace_id ON workspace_webhooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_webhooks_enabled ON workspace_webhooks(workspace_id, enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_workspace_webhooks_event_types ON workspace_webhooks USING GIN(event_types);

-- Indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending', 'processing', 'retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_workspace ON webhook_deliveries(webhook_id, created_at DESC);

-- Composite index for efficient workspace filtering with status
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_status ON webhook_deliveries(webhook_id, status, created_at DESC);

-- ============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workspace_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS POLICIES FOR WORKSPACE ISOLATION
-- ============================================

-- Policy: Users can view webhooks for workspaces they belong to
CREATE POLICY "Users can view workspace webhooks"
  ON workspace_webhooks
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Policy: Workspace owners/admins can manage webhooks
CREATE POLICY "Workspace owners can manage webhooks"
  ON workspace_webhooks
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Users can view webhook deliveries for workspaces they belong to
-- Note: INSERT/UPDATE operations are handled by API routes using service role key (bypasses RLS)
CREATE POLICY "Users can view webhook deliveries"
  ON webhook_deliveries
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM workspace_webhooks
      WHERE workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- ============================================
-- STEP 6: TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================

CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspace_webhooks_updated_at
  BEFORE UPDATE ON workspace_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_updated_at();

-- ============================================
-- STEP 7: COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE workspace_webhooks IS 'Stores webhook configurations for each workspace, including URL, event types, and authentication secret';
COMMENT ON TABLE webhook_deliveries IS 'Tracks webhook delivery attempts, status, and responses for audit and retry purposes';

COMMENT ON COLUMN workspace_webhooks.url IS 'The webhook endpoint URL (must be HTTPS)';
COMMENT ON COLUMN workspace_webhooks.enabled IS 'Whether this webhook is currently active';
COMMENT ON COLUMN workspace_webhooks.event_types IS 'JSONB array of event types this webhook subscribes to (e.g., ["email.sent", "email.opened"])';
COMMENT ON COLUMN workspace_webhooks.secret IS 'Secret key for webhook signature verification';

COMMENT ON COLUMN webhook_deliveries.event_type IS 'The type of event that triggered this delivery';
COMMENT ON COLUMN webhook_deliveries.payload IS 'The JSON payload sent to the webhook';
COMMENT ON COLUMN webhook_deliveries.status IS 'Delivery status: pending, processing, delivered, failed, retrying';
COMMENT ON COLUMN webhook_deliveries.attempts IS 'Number of delivery attempts made';
COMMENT ON COLUMN webhook_deliveries.response IS 'JSON response from the webhook endpoint (status code, headers, body)';
COMMENT ON COLUMN webhook_deliveries.delivered_at IS 'Timestamp when delivery was successfully completed';
