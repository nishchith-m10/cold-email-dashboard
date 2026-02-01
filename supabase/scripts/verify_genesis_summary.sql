-- ============================================
-- GENESIS SCHEMA VERIFICATION SUMMARY
-- ============================================
-- Single query that shows all verification results
-- ============================================

SELECT 
  check_name,
  status,
  description
FROM (
  -- Schema check
  SELECT 
    'Genesis Schema Exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'genesis') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Schema genesis should exist' as description,
    1 as sort_order
  
  UNION ALL
  
  -- Table checks
  SELECT 
    'Table: leads' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'leads') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Partitioned parent table' as description,
    2 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: partition_registry' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'partition_registry') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Partition tracking table' as description,
    3 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: do_accounts' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'do_accounts') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'DigitalOcean account pool' as description,
    4 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: fleet_status' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'fleet_status') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Droplet fleet tracking' as description,
    5 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: droplet_lifecycle_log' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'droplet_lifecycle_log') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Droplet state transition log' as description,
    6 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: sidecar_commands' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_commands') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Sidecar command audit log' as description,
    7 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: sidecar_health' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_health') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Sidecar health reports' as description,
    8 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: sidecar_metrics' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_metrics') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Sidecar execution metrics' as description,
    9 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: sidecar_tokens' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'sidecar_tokens') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Sidecar authentication tokens' as description,
    10 as sort_order
  
  UNION ALL
  
  SELECT 
    'Table: jwt_keypairs' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'genesis' AND tablename = 'jwt_keypairs') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'JWT signing key pairs' as description,
    11 as sort_order
  
  UNION ALL
  
  -- Function checks
  SELECT 
    'Function: fn_ignite_workspace_partition' as check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'genesis' AND p.proname = 'fn_ignite_workspace_partition'
    ) THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Partition creation function' as description,
    12 as sort_order
  
  UNION ALL
  
  SELECT 
    'Function: get_workspace_context' as check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'genesis' AND p.proname = 'get_workspace_context'
    ) THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'RLS context helper function' as description,
    13 as sort_order
  
  UNION ALL
  
  SELECT 
    'Function: sanitize_partition_slug' as check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'genesis' AND p.proname = 'sanitize_partition_slug'
    ) THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Partition name sanitizer' as description,
    14 as sort_order
  
  UNION ALL
  
  -- Extension checks
  SELECT 
    'Extension: uuid-ossp' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'UUID generation extension' as description,
    15 as sort_order
  
  UNION ALL
  
  SELECT 
    'Extension: pg_trgm' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Text search extension' as description,
    16 as sort_order
  
  UNION ALL
  
  SELECT 
    'Extension: pgcrypto' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    'Encryption extension' as description,
    17 as sort_order
  
  UNION ALL
  
  -- RLS check
  SELECT 
    'RLS Policies' as check_name,
    COUNT(*)::TEXT || ' policies found' as status,
    'Total RLS policies in genesis schema' as description,
    18 as sort_order
  FROM pg_policies
  WHERE schemaname = 'genesis'
  
  UNION ALL
  
  -- Partition check
  SELECT 
    'Partition Infrastructure' as check_name,
    'Partitioned Tables: ' || COUNT(*) FILTER (WHERE relkind = 'p')::TEXT || 
    ', Partition Tables: ' || COUNT(*) FILTER (WHERE relkind = 'r' AND relname LIKE 'leads_%')::TEXT as status,
    'Partition infrastructure status' as description,
    19 as sort_order
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'genesis'
) verification_results
ORDER BY sort_order;
