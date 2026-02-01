-- ============================================
-- GENESIS SCHEMA VERIFICATION QUERY
-- ============================================
-- Run this after migration to verify all tables and functions were created
-- ============================================

-- 1. Verify Genesis Schema Exists
SELECT 
  'CHECK_1' as check_id,
  'Genesis Schema Exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'genesis')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Schema genesis should exist' as description;

-- 2. List All Genesis Tables (returns multiple rows)
SELECT 
  'CHECK_2' as check_id,
  'Genesis Tables' as check_name,
  tablename as status,
  'Table in genesis schema' as description
FROM pg_tables
WHERE schemaname = 'genesis'
ORDER BY tablename;

-- 3. Verify Key Tables Exist (individual checks)
SELECT 
  'CHECK_3' as check_id,
  'Table: leads' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'leads')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Partitioned parent table' as description
UNION ALL
SELECT 
  'CHECK_4' as check_id,
  'Table: partition_registry' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'partition_registry')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Partition tracking table' as description
UNION ALL
SELECT 
  'CHECK_5' as check_id,
  'Table: do_accounts' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'do_accounts')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'DigitalOcean account pool' as description
UNION ALL
SELECT 
  'CHECK_6' as check_id,
  'Table: fleet_status' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'fleet_status')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Droplet fleet tracking' as description
UNION ALL
SELECT 
  'CHECK_7' as check_id,
  'Table: sidecar_commands' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_commands')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Sidecar command audit log' as description
UNION ALL
SELECT 
  'CHECK_8' as check_id,
  'Table: sidecar_health' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_health')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Sidecar health reports' as description
UNION ALL
SELECT 
  'CHECK_9' as check_id,
  'Table: sidecar_metrics' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_metrics')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Sidecar execution metrics' as description
UNION ALL
SELECT 
  'CHECK_10' as check_id,
  'Table: sidecar_tokens' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_tokens')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Sidecar authentication tokens' as description
UNION ALL
SELECT 
  'CHECK_11' as check_id,
  'Table: jwt_keypairs' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'jwt_keypairs')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'JWT signing key pairs' as description
UNION ALL
SELECT 
  'CHECK_12' as check_id,
  'Table: droplet_lifecycle_log' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'droplet_lifecycle_log')
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Droplet state transition log' as description;

-- 4. Verify Key Functions Exist
SELECT 
  'CHECK_13' as check_id,
  'Function: fn_ignite_workspace_partition' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'genesis' AND p.proname = 'fn_ignite_workspace_partition'
    )
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Partition creation function' as description
UNION ALL
SELECT 
  'CHECK_14' as check_id,
  'Function: get_workspace_context' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'genesis' AND p.proname = 'get_workspace_context'
    )
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'RLS context helper function' as description
UNION ALL
SELECT 
  'CHECK_15' as check_id,
  'Function: sanitize_partition_slug' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'genesis' AND p.proname = 'sanitize_partition_slug'
    )
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'Partition name sanitizer' as description;

-- 5. Check RLS Policies Count
SELECT 
  'CHECK_16' as check_id,
  'RLS Policies Count' as check_name,
  COUNT(*)::TEXT as status,
  'Total RLS policies in genesis schema' as description
FROM pg_policies
WHERE schemaname = 'genesis';

-- 6. List All Genesis Functions (returns multiple rows)
SELECT 
  'CHECK_17' as check_id,
  'Genesis Functions' as check_name,
  p.proname || '(' || COALESCE(pg_get_function_identity_arguments(p.oid), '') || ')' as status,
  'Function in genesis schema' as description
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'genesis'
ORDER BY p.proname;

-- 7. Verify Extensions
SELECT 
  'CHECK_18' as check_id,
  'Extension: uuid-ossp' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN 'PASS' ELSE 'FAIL' END as status,
  'UUID generation extension' as description
UNION ALL
SELECT 
  'CHECK_19' as check_id,
  'Extension: pg_trgm' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN 'PASS' ELSE 'FAIL' END as status,
  'Text search extension' as description
UNION ALL
SELECT 
  'CHECK_20' as check_id,
  'Extension: pgcrypto' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN 'PASS' ELSE 'FAIL' END as status,
  'Encryption extension' as description;

-- 8. Check Partition Status
SELECT 
  'CHECK_21' as check_id,
  'Partition Status' as check_name,
  'Partitioned Tables: ' || COUNT(*) FILTER (WHERE relkind = 'p')::TEXT || 
  ', Partition Tables: ' || COUNT(*) FILTER (WHERE relkind = 'r' AND relname LIKE 'leads_%')::TEXT as status,
  'Partition infrastructure status' as description
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'genesis';
