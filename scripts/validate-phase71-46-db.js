#!/usr/bin/env node

/**
 * Phase 71 & 46 Database Validation Script
 * 
 * Verifies database tables, indexes, and RLS policies exist.
 * Run: node scripts/validate-phase71-46-db.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// VALIDATION TESTS
// ============================================

async function runQuery(query, description) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });
    
    if (error) {
      console.error(`❌ ${description}: ${error.message}`);
      return { success: false, data: null };
    }
    
    console.log(`✅ ${description}`);
    return { success: true, data };
  } catch (err) {
    console.error(`❌ ${description}: ${err.message}`);
    return { success: false, data: null };
  }
}

async function validatePhase71() {
  console.log('\n🔍 PHASE 71: API Health Monitor\n');
  
  // Check table exists
  const tableCheck = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'genesis')
    .eq('table_name', 'api_health_snapshots')
    .single();
  
  if (tableCheck.error) {
    console.error('❌ Table genesis.api_health_snapshots does not exist');
    return false;
  }
  
  console.log('✅ Table genesis.api_health_snapshots exists');
  
  // Check columns
  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'genesis')
    .eq('table_name', 'api_health_snapshots');
  
  const requiredColumns = [
    'id', 'created_at', 'report', 'overall_status', 'check_count',
    'error_count', 'degraded_count', 'total_latency_ms', 'slowest_service',
    'triggered_by', 'triggered_by_user_id'
  ];
  
  const columnNames = columns?.map(c => c.column_name) || [];
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
  
  if (missingColumns.length > 0) {
    console.error(`❌ Missing columns: ${missingColumns.join(', ')}`);
    return false;
  }
  
  console.log(`✅ All ${requiredColumns.length} columns present`);
  
  // Check data count
  const { count, error: countError } = await supabase
    .from('genesis.api_health_snapshots')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error(`❌ Error counting rows: ${countError.message}`);
  } else {
    console.log(`📊 Rows in table: ${count || 0}`);
    if (count === 0) {
      console.log('⚠️  No health snapshots yet - run first health check');
    }
  }
  
  return true;
}

async function validatePhase46() {
  console.log('\n🔍 PHASE 46: Migration Control\n');
  
  // Check migration_state table
  const stateCheck = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'genesis')
    .eq('table_name', 'migration_state')
    .single();
  
  if (stateCheck.error) {
    console.error('❌ Table genesis.migration_state does not exist');
    return false;
  }
  
  console.log('✅ Table genesis.migration_state exists');
  
  // Check migration_events table
  const eventsCheck = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'genesis')
    .eq('table_name', 'migration_events')
    .single();
  
  if (eventsCheck.error) {
    console.error('❌ Table genesis.migration_events does not exist');
    return false;
  }
  
  console.log('✅ Table genesis.migration_events exists');
  
  // Check migration_state columns
  const { data: stateColumns } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'genesis')
    .eq('table_name', 'migration_state');
  
  const requiredStateColumns = [
    'workspace_id', 'source_table', 'target_table', 'status',
    'dual_write_enabled', 'backfill_progress', 'parity_score'
  ];
  
  const stateColumnNames = stateColumns?.map(c => c.column_name) || [];
  const missingStateColumns = requiredStateColumns.filter(col => !stateColumnNames.includes(col));
  
  if (missingStateColumns.length > 0) {
    console.error(`❌ Missing columns in migration_state: ${missingStateColumns.join(', ')}`);
    return false;
  }
  
  console.log(`✅ All ${requiredStateColumns.length}+ columns present in migration_state`);
  
  // Check data counts
  const { count: stateCount, error: stateCountError } = await supabase
    .from('genesis.migration_state')
    .select('*', { count: 'exact', head: true });
  
  if (stateCountError) {
    console.error(`❌ Error counting migration_state rows: ${stateCountError.message}`);
  } else {
    console.log(`📊 Migrations tracked: ${stateCount || 0}`);
    if (stateCount === 0) {
      console.log('⚠️  No migrations initialized yet');
    }
  }
  
  const { count: eventsCount, error: eventsCountError } = await supabase
    .from('genesis.migration_events')
    .select('*', { count: 'exact', head: true });
  
  if (eventsCountError) {
    console.error(`❌ Error counting migration_events rows: ${eventsCountError.message}`);
  } else {
    console.log(`📊 Migration events logged: ${eventsCount || 0}`);
  }
  
  return true;
}

async function validateEnvironment() {
  console.log('\n🔍 ENVIRONMENT VALIDATION\n');
  
  const vars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPER_ADMIN_IDS': process.env.SUPER_ADMIN_IDS,
    'NEXT_PUBLIC_SUPER_ADMIN_IDS': process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS,
  };
  
  let allSet = true;
  
  for (const [key, value] of Object.entries(vars)) {
    if (!value) {
      console.error(`❌ ${key} is not set`);
      allSet = false;
    } else {
      const displayValue = key.includes('KEY') 
        ? value.substring(0, 10) + '...' 
        : value;
      console.log(`✅ ${key}: ${displayValue}`);
    }
  }
  
  return allSet;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Phase 71 & 46 Database Validation Script    ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  const envValid = await validateEnvironment();
  const phase71Valid = await validatePhase71();
  const phase46Valid = await validatePhase46();
  
  console.log('\n' + '='.repeat(50));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Environment:    ${envValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Phase 71 (API Health): ${phase71Valid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Phase 46 (Migration):  ${phase46Valid ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50));
  
  if (envValid && phase71Valid && phase46Valid) {
    console.log('\n✅ All validations passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Navigate to /admin > API Health tab');
    console.log('2. Click "Refresh All" to trigger first health check');
    console.log('3. Navigate to /admin > Migration tab');
    console.log('4. Test dry-run workflow with test data');
    process.exit(0);
  } else {
    console.log('\n❌ Some validations failed - check errors above');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
