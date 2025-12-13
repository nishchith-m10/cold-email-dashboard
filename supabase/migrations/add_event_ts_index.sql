-- Fix performance for Sequence Breakdown and Daily Sends queries
-- This index dramatically improves query performance on the event_ts column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_event_ts 
ON email_events (event_ts);
