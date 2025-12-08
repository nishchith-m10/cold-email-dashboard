-- ============================================
-- PHASE 10: WEBHOOK QUEUE & IDEMPOTENCY
-- Migration: Robust Data Ingestion
-- Date: 2025-12-07
-- ============================================

-- Enable UUID extensions (required for uuid_generate_v5)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE WEBHOOK QUEUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Idempotency & Deduplication
  idempotency_key TEXT NOT NULL UNIQUE,
  event_source TEXT NOT NULL DEFAULT 'n8n' CHECK (event_source IN ('n8n', 'api', 'manual')),
  
  -- Webhook Metadata
  event_type TEXT NOT NULL CHECK (event_type IN ('email_event', 'cost_event')),
  raw_payload JSONB NOT NULL,
  
  -- Processing Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhook_queue_status ON webhook_queue(status) WHERE status = 'pending';
CREATE INDEX idx_webhook_queue_received ON webhook_queue(received_at);
CREATE INDEX idx_webhook_queue_idempotency ON webhook_queue(idempotency_key);
CREATE INDEX idx_webhook_queue_event_type ON webhook_queue(event_type);

-- ============================================
-- STEP 2: ADD IDEMPOTENCY TO EMAIL_EVENTS
-- ============================================

-- Add idempotency columns
ALTER TABLE email_events 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS n8n_execution_id TEXT;

-- Create unique index on idempotency_key (partial index for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_idempotency 
  ON email_events(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Index for n8n execution tracking
CREATE INDEX IF NOT EXISTS idx_email_events_n8n_execution 
  ON email_events(n8n_execution_id) 
  WHERE n8n_execution_id IS NOT NULL;

-- ============================================
-- STEP 3: ADD IDEMPOTENCY TO LLM_USAGE
-- ============================================

-- Add idempotency columns
ALTER TABLE llm_usage
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS n8n_execution_id TEXT;

-- Create unique index on idempotency_key (partial index for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_usage_idempotency 
  ON llm_usage(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Index for n8n execution tracking
CREATE INDEX IF NOT EXISTS idx_llm_usage_n8n_execution 
  ON llm_usage(n8n_execution_id) 
  WHERE n8n_execution_id IS NOT NULL;

-- ============================================
-- STEP 4: WEBHOOK QUEUE PROCESSOR FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION process_webhook_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_workspace_id TEXT;
  v_event_data JSONB;
  v_cost_data JSONB;
  v_event_ts TIMESTAMP WITH TIME ZONE;
  v_step INTEGER;
  v_cost_usd DECIMAL(10, 6);
  v_tokens_in INTEGER;
  v_tokens_out INTEGER;
BEGIN
  -- Skip if already processing/completed/failed
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Update status to processing (for monitoring)
  UPDATE webhook_queue 
  SET status = 'processing' 
  WHERE id = NEW.id;

  BEGIN
    -- ==========================================
    -- PROCESS EMAIL EVENTS
    -- ==========================================
    IF NEW.event_type = 'email_event' THEN
      v_event_data := NEW.raw_payload;
      v_workspace_id := COALESCE(v_event_data->>'workspace_id', '00000000-0000-0000-0000-000000000001');
      
      -- Parse event_ts (handle both string and already-parsed timestamps)
      v_event_ts := COALESCE(
        (v_event_data->>'event_ts')::TIMESTAMP WITH TIME ZONE,
        NOW()
      );

      -- Parse step (handle null gracefully)
      v_step := COALESCE((v_event_data->>'step')::INTEGER, (v_event_data->>'sequence_step')::INTEGER);

      -- Generate contact_id from email (deterministic UUID v5)
      -- Using a namespace UUID for email addresses
      v_contact_id := uuid_generate_v5(
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
        CONCAT(v_workspace_id, ':', v_event_data->>'contact_email')
      );

      -- ==========================================
      -- INSERT EMAIL EVENT (IDEMPOTENT - contacts/emails tables removed)
      -- ==========================================
      INSERT INTO email_events (
        workspace_id,
        contact_id,
        contact_email,
        campaign_name,
        step,
        event_type,
        provider,
        provider_message_id,
        event_ts,
        email_number,
        metadata,
        event_key,
        idempotency_key,
        n8n_execution_id
      )
      VALUES (
        v_workspace_id,
        v_contact_id,
        v_event_data->>'contact_email',
        COALESCE(v_event_data->>'campaign', v_event_data->>'campaign_name', 'Default Campaign'),
        v_step::TEXT,
        v_event_data->>'event_type',
        COALESCE(v_event_data->>'provider', 'gmail'),
        v_event_data->>'provider_message_id',
        v_event_ts,
        COALESCE((v_event_data->>'email_number')::INTEGER, v_step),
        COALESCE(v_event_data->'metadata', '{}'::JSONB),
        COALESCE(
          v_event_data->>'event_key',
          CONCAT(
            COALESCE(v_event_data->>'provider', 'gmail'), ':',
            COALESCE(v_event_data->>'provider_message_id', v_event_data->>'contact_email'), ':',
            v_event_data->>'event_type', ':',
            COALESCE(v_step::TEXT, '0')
          )
        ),
        NEW.idempotency_key,
        v_event_data->>'n8n_execution_id'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

    -- ==========================================
    -- PROCESS COST EVENTS
    -- ==========================================
    ELSIF NEW.event_type = 'cost_event' THEN
      v_cost_data := NEW.raw_payload;
      v_workspace_id := COALESCE(v_cost_data->>'workspace_id', '00000000-0000-0000-0000-000000000001');

      -- Parse numeric values with defaults
      v_tokens_in := COALESCE((v_cost_data->>'tokens_in')::INTEGER, 0);
      v_tokens_out := COALESCE((v_cost_data->>'tokens_out')::INTEGER, 0);
      v_cost_usd := COALESCE((v_cost_data->>'cost_usd')::DECIMAL, 0);

      -- ==========================================
      -- INSERT LLM USAGE (IDEMPOTENT - workflow_id/run_id in metadata)
      -- ==========================================
      INSERT INTO llm_usage (
        workspace_id,
        provider,
        model,
        tokens_in,
        tokens_out,
        cost_usd,
        campaign_name,
        contact_email,
        purpose,
        metadata,
        idempotency_key,
        n8n_execution_id
      )
      VALUES (
        v_workspace_id,
        v_cost_data->>'provider',
        v_cost_data->>'model',
        v_tokens_in,
        v_tokens_out,
        v_cost_usd,
        v_cost_data->>'campaign_name',
        v_cost_data->>'contact_email',
        v_cost_data->>'purpose',
        jsonb_build_object(
          'workflow_id', v_cost_data->>'workflow_id',
          'run_id', v_cost_data->>'run_id'
        ) || COALESCE(v_cost_data->'metadata', '{}'::JSONB),
        NEW.idempotency_key,
        v_cost_data->>'n8n_execution_id'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

    END IF;

    -- ==========================================
    -- MARK AS COMPLETED
    -- ==========================================
    UPDATE webhook_queue 
    SET 
      status = 'completed', 
      processed_at = NOW() 
    WHERE id = NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- ==========================================
    -- ERROR HANDLING
    -- ==========================================
    UPDATE webhook_queue 
    SET 
      status = 'failed',
      error_message = SQLERRM,
      retry_count = retry_count + 1,
      processed_at = NOW()
    WHERE id = NEW.id;
    
    -- Log error for debugging (appears in Supabase logs)
    RAISE WARNING 'Webhook processing failed for queue ID %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: CREATE TRIGGER ON WEBHOOK QUEUE
-- ============================================

-- Drop trigger if exists (for migration idempotency)
DROP TRIGGER IF EXISTS trg_process_webhook_queue ON webhook_queue;

-- Create trigger to process webhooks immediately after insert
CREATE TRIGGER trg_process_webhook_queue
  AFTER INSERT ON webhook_queue
  FOR EACH ROW
  EXECUTE FUNCTION process_webhook_queue();

-- ============================================
-- STEP 6: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on webhook_queue
ALTER TABLE webhook_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for webhook_queue
-- (Webhooks are server-side only, authenticated by X-Webhook-Token)
CREATE POLICY webhook_queue_allow_all ON webhook_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STEP 7: HELPER VIEWS FOR MONITORING
-- ============================================

-- View: Failed webhooks (for monitoring/alerting)
CREATE OR REPLACE VIEW webhook_failures AS
SELECT 
  id,
  idempotency_key,
  event_type,
  event_source,
  error_message,
  retry_count,
  received_at,
  processed_at,
  raw_payload
FROM webhook_queue
WHERE status = 'failed'
ORDER BY received_at DESC;

-- View: Queue health metrics
CREATE OR REPLACE VIEW webhook_queue_health AS
SELECT 
  status,
  COUNT(*) as count,
  MIN(received_at) as oldest_event,
  MAX(received_at) as newest_event,
  AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) as avg_processing_seconds
FROM webhook_queue
GROUP BY status;

-- ============================================
-- STEP 8: COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE webhook_queue IS 'Phase 10: Webhook ingestion queue for idempotent, burst-resistant data ingestion';
COMMENT ON COLUMN webhook_queue.idempotency_key IS 'Unique key to prevent duplicate processing (from n8n execution_id or client-generated)';
COMMENT ON COLUMN webhook_queue.raw_payload IS 'Original webhook payload in JSON format for audit/retry';
COMMENT ON COLUMN webhook_queue.status IS 'Processing status: pending → processing → completed/failed';
COMMENT ON COLUMN webhook_queue.retry_count IS 'Number of processing attempts (incremented on failure)';

COMMENT ON FUNCTION process_webhook_queue() IS 'Trigger function to process webhook queue entries into email_events/llm_usage tables';

COMMENT ON VIEW webhook_failures IS 'Monitoring view for failed webhook processing events';
COMMENT ON VIEW webhook_queue_health IS 'Real-time queue health metrics for monitoring';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify migration success
DO $$
BEGIN
  RAISE NOTICE 'Phase 10 Migration Complete: Webhook Queue & Idempotency';
  RAISE NOTICE 'Tables: webhook_queue created';
  RAISE NOTICE 'Columns: idempotency_key added to email_events and llm_usage';
  RAISE NOTICE 'Trigger: trg_process_webhook_queue activated';
  RAISE NOTICE 'Views: webhook_failures, webhook_queue_health created';
END $$;
