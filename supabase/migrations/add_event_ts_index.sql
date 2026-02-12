-- Fix performance for Sequence Breakdown and Daily Sends queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_event_ts 
ON email_events (event_ts);
