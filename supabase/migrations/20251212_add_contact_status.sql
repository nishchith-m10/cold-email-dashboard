-- Add contact_status enum (create if missing, then ensure values exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status') THEN
    CREATE TYPE contact_status AS ENUM ('new', 'contacted', 'replied', 'bounced', 'opt_out');
  END IF;
END $$;

-- Backfill enum values in case the type already existed without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'new' AND enumtypid = 'contact_status'::regtype) THEN
    ALTER TYPE contact_status ADD VALUE 'new';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'contacted' AND enumtypid = 'contact_status'::regtype) THEN
    ALTER TYPE contact_status ADD VALUE 'contacted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'replied' AND enumtypid = 'contact_status'::regtype) THEN
    ALTER TYPE contact_status ADD VALUE 'replied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bounced' AND enumtypid = 'contact_status'::regtype) THEN
    ALTER TYPE contact_status ADD VALUE 'bounced';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'opt_out' AND enumtypid = 'contact_status'::regtype) THEN
    ALTER TYPE contact_status ADD VALUE 'opt_out';
  END IF;
END $$;

-- Extend contacts table with status + last_contacted_at and basic lead fields
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS status contact_status NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Performance indexes for contacts lookup and sorting
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_status ON contacts(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_email_lower ON contacts(workspace_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_last_contacted ON contacts(workspace_id, last_contacted_at DESC);

-- Index for fast event timeline lookups per contact
CREATE INDEX IF NOT EXISTS idx_email_events_contact_event_ts ON email_events(contact_id, event_ts DESC);

-- Trigger: project email_events into contacts.status / last_contacted_at
CREATE OR REPLACE FUNCTION fn_sync_contact_status()
RETURNS trigger AS $$
DECLARE
  next_status contact_status;
  effective_ts TIMESTAMPTZ;
BEGIN
  -- Map event_type to contact_status
  CASE NEW.event_type
    WHEN 'replied' THEN next_status := 'replied';
    WHEN 'bounced' THEN next_status := 'bounced';
    WHEN 'opt_out' THEN next_status := 'opt_out';
    WHEN 'sent' THEN next_status := 'contacted';
    WHEN 'delivered' THEN next_status := 'contacted';
    WHEN 'opened' THEN next_status := 'contacted';
    WHEN 'clicked' THEN next_status := 'contacted';
    ELSE
      next_status := NULL;
  END CASE;

  IF next_status IS NOT NULL THEN
    effective_ts := COALESCE(NEW.event_ts, NEW.created_at, NOW());

    UPDATE contacts c
      SET status = next_status,
          last_contacted_at = COALESCE(effective_ts, c.last_contacted_at)
    WHERE c.id = NEW.contact_id
      AND c.workspace_id = NEW.workspace_id
      AND (
        c.last_contacted_at IS NULL
        OR effective_ts >= c.last_contacted_at
      );
  END IF;

  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_contact_status ON email_events;
CREATE TRIGGER trg_sync_contact_status
AFTER INSERT ON email_events
FOR EACH ROW EXECUTE FUNCTION fn_sync_contact_status();

