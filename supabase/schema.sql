
-- Performance index for event_ts queries (Sequence Breakdown and Daily Sends)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_event_ts 
ON email_events (event_ts);
