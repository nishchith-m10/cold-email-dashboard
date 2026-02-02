-- ============================================
-- Notifications Table (Fixed Schema)
-- workspace_id uses TEXT to match workspaces.id
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL DEFAULT 'default' REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT,
    -- Clerk user ID (NULL = broadcast to all workspace users)
    
    -- Content
    type TEXT NOT NULL CHECK (
        type IN (
            'reply',
            'opt_out',
            'budget_alert',
            'campaign_complete',
            'system',
            'info',
            'warning',
            'error'
        )
    ),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Linking
    related_email_event_id UUID REFERENCES email_events(id) ON DELETE SET NULL,
    related_campaign TEXT,
    
    -- Status
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Metadata
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user ON notifications(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(workspace_id)
WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);

-- ============================================
-- AUTO-NOTIFICATION TRIGGERS
-- ============================================

-- Trigger: Create notification on reply
CREATE OR REPLACE FUNCTION notify_on_reply() 
RETURNS TRIGGER AS $$ 
BEGIN 
  IF NEW.event_type = 'replied' THEN
    INSERT INTO notifications (
      workspace_id,
      type,
      title,
      message,
      related_email_event_id,
      related_campaign,
      payload
    )
    VALUES (
      NEW.workspace_id,
      'reply',
      'New Reply Received',
      format('Reply from %s in campaign "%s"', NEW.contact_email, NEW.campaign_name),
      NEW.id,
      NEW.campaign_name,
      jsonb_build_object(
        'contact_email', NEW.contact_email,
        'event_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_on_reply ON email_events;

-- Create trigger
CREATE TRIGGER trigger_notify_on_reply
AFTER INSERT ON email_events
FOR EACH ROW
EXECUTE FUNCTION notify_on_reply();

-- Trigger: Create notification on opt-out
CREATE OR REPLACE FUNCTION notify_on_opt_out() 
RETURNS TRIGGER AS $$ 
BEGIN 
  IF NEW.event_type = 'opt_out' THEN
    INSERT INTO notifications (
      workspace_id,
      type,
      title,
      message,
      related_email_event_id,
      related_campaign,
      payload
    )
    VALUES (
      NEW.workspace_id,
      'opt_out',
      'Contact Opted Out',
      format('%s opted out from campaign "%s"', NEW.contact_email, NEW.campaign_name),
      NEW.id,
      NEW.campaign_name,
      jsonb_build_object(
        'contact_email', NEW.contact_email,
        'event_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_on_opt_out ON email_events;

-- Create trigger
CREATE TRIGGER trigger_notify_on_opt_out
AFTER INSERT ON email_events
FOR EACH ROW
EXECUTE FUNCTION notify_on_opt_out();
