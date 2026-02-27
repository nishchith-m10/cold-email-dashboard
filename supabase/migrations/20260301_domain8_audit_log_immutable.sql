-- D8-004: Audit Log Append-Only Enforcement
-- Prevents UPDATE and DELETE on governance_audit_log at the database level.
-- This ensures audit trail immutability regardless of which role or client issues the query.

-- Create the trigger function that blocks modifications
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (idempotent: drop if exists first)
DROP TRIGGER IF EXISTS audit_log_immutable ON governance_audit_log;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON governance_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Add a comment documenting the purpose
COMMENT ON TRIGGER audit_log_immutable ON governance_audit_log IS
  'D8-004: Prevents modification or deletion of audit log entries for compliance immutability';
