/**
 * Comprehensive Database Data Verification
 * This script checks:
 * 1. What columns exist
 * 2. What data is actually in those columns
 * 3. Sample rows to verify real data
 * 4. RLS status for each table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  });
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// SERVICE ROLE KEY bypasses RLS!
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyData() {
  console.log('🔍 COMPREHENSIVE DATABASE VERIFICATION');
  console.log('=====================================\n');

  // 1. RLS status note
  console.log('🔒 ROW LEVEL SECURITY (RLS) STATUS:');
  console.log('====================================');
  console.log('ℹ️  Using SERVICE_ROLE_KEY which BYPASSES all RLS!');
  console.log('   This means we can read ALL data regardless of RLS policies.\n');

  // 2. Get actual row counts
  console.log('📊 TABLE ROW COUNTS:');
  console.log('=====================');
  
  const tables = ['email_events', 'contacts', 'leads_ohio', 'mv_daily_stats', 'mv_llm_cost'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ❌ ${table}: Error - ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: ${count} rows`);
    }
  }

  // 3. Deep dive into email_events
  console.log('\n📧 EMAIL_EVENTS TABLE DEEP DIVE:');
  console.log('=================================');
  
  // Get 5 random recent rows
  const { data: sampleRows, error: sampleError } = await supabase
    .from('email_events')
    .select('*')
    .order('event_ts', { ascending: false })
    .limit(5);

  if (sampleError) {
    console.log('❌ Error:', sampleError.message);
  } else if (sampleRows && sampleRows.length > 0) {
    console.log(`\nFound ${sampleRows.length} sample rows. Columns in each row:`);
    
    // Get all unique column names
    const allColumns = new Set();
    sampleRows.forEach(row => {
      Object.keys(row).forEach(col => allColumns.add(col));
    });
    
    console.log('\n📋 All Columns Found:');
    Array.from(allColumns).sort().forEach((col, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2)}. ${col}`);
    });

    // Show sample data
    console.log('\n📄 Sample Data (First 3 Rows):');
    sampleRows.slice(0, 3).forEach((row, idx) => {
      console.log(`\n  Row ${idx + 1}:`);
      console.log(`    Campaign:     ${row.campaign_name}`);
      console.log(`    Contact:      ${row.contact_email}`);
      console.log(`    Event Type:   ${row.event_type}`);
      console.log(`    Event Time:   ${row.event_ts}`);
      console.log(`    Step:         ${row.step !== undefined ? row.step : 'N/A'}`);
      console.log(`    Email Number: ${row.email_number !== undefined ? row.email_number : 'N/A'}`);
      console.log(`    Metadata:     ${JSON.stringify(row.metadata || {})}`);
    });
  }

  // 4. Check step column distribution
  console.log('\n🔢 STEP COLUMN ANALYSIS:');
  console.log('=========================');
  
  const { data: stepDistribution, error: stepError } = await supabase
    .from('email_events')
    .select('step, event_type')
    .eq('event_type', 'sent')
    .limit(1000);

  if (!stepError && stepDistribution) {
    const stepCounts = {};
    stepDistribution.forEach(row => {
      const step = row.step !== null ? row.step : 'NULL';
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });
    
    console.log('Step distribution (sent events, up to 1000 rows):');
    Object.keys(stepCounts).sort().forEach(step => {
      const bar = '█'.repeat(Math.min(50, stepCounts[step] / 2));
      console.log(`  Step ${step}: ${stepCounts[step].toString().padStart(4)} ${bar}`);
    });
  }

  // 5. Check if email_number column exists
  console.log('\n🔍 CHECKING FOR email_number COLUMN:');
  console.log('=====================================');
  
  const { data: emailNumTest, error: emailNumError } = await supabase
    .from('email_events')
    .select('email_number')
    .limit(1);

  if (emailNumError) {
    if (emailNumError.message.includes('column') && emailNumError.message.includes('does not exist')) {
      console.log('❌ email_number column DOES NOT EXIST in production');
      console.log('   Database uses "step" column instead');
    } else {
      console.log('❌ Error:', emailNumError.message);
    }
  } else {
    console.log('✅ email_number column EXISTS');
    
    // Check distribution
    const { data: emailNumDist } = await supabase
      .from('email_events')
      .select('email_number')
      .not('email_number', 'is', null)
      .limit(100);
    
    if (emailNumDist && emailNumDist.length > 0) {
      console.log(`   Has data in ${emailNumDist.length} rows (sample of 100)`);
    } else {
      console.log('   Column exists but ALL values are NULL');
    }
  }

  // 6. Check metadata structure
  console.log('\n📦 METADATA FIELD ANALYSIS:');
  console.log('============================');
  
  const { data: metadataRows } = await supabase
    .from('email_events')
    .select('metadata')
    .limit(10);

  if (metadataRows) {
    console.log('Sample metadata values (first 10 rows):');
    metadataRows.forEach((row, idx) => {
      const meta = row.metadata || {};
      const keys = Object.keys(meta);
      if (keys.length === 0) {
        console.log(`  ${idx + 1}. Empty: {}`);
      } else {
        console.log(`  ${idx + 1}. Keys: ${keys.join(', ')}`);
        console.log(`      Values: ${JSON.stringify(meta).substring(0, 100)}`);
      }
    });
  }

  // 7. Verify materialized view data
  console.log('\n📈 MATERIALIZED VIEW DATA:');
  console.log('===========================');
  
  const { data: mvData, error: mvError } = await supabase
    .from('mv_daily_stats')
    .select('*')
    .order('day', { ascending: false })
    .limit(3);

  if (mvError) {
    console.log('❌ Error:', mvError.message);
  } else if (mvData) {
    console.log('Recent data from mv_daily_stats:');
    mvData.forEach((row, idx) => {
      console.log(`\n  ${idx + 1}. ${row.day} - ${row.campaign_name}`);
      console.log(`     Sends:        ${row.sends}`);
      console.log(`     Email 1:      ${row.email_1_sends}`);
      console.log(`     Email 2:      ${row.email_2_sends}`);
      console.log(`     Email 3:      ${row.email_3_sends}`);
      console.log(`     Unique:       ${row.unique_contacts}`);
      console.log(`     Refreshed:    ${row.refreshed_at}`);
    });
  }

  // 8. Direct SQL query to double-check
  console.log('\n🔬 RAW SQL VERIFICATION:');
  console.log('=========================');
  
  const { data: rawCount } = await supabase
    .from('email_events')
    .select('step, event_type')
    .eq('event_type', 'sent');

  if (rawCount) {
    const step1 = rawCount.filter(r => r.step === 1).length;
    const step2 = rawCount.filter(r => r.step === 2).length;
    const step3 = rawCount.filter(r => r.step === 3).length;
    const stepNull = rawCount.filter(r => r.step === null).length;
    
    console.log('Direct count from email_events (sent events):');
    console.log(`  Step 1: ${step1}`);
    console.log(`  Step 2: ${step2}`);
    console.log(`  Step 3: ${step3}`);
    console.log(`  Step NULL: ${stepNull}`);
    console.log(`  TOTAL: ${rawCount.length}`);
  }

  // 9. Summary
  console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
  console.log('==============================');
  console.log('✅ Using SERVICE_ROLE_KEY - bypasses ALL RLS restrictions');
  console.log('✅ Can read all tables without authentication');
  
  const hasStep = sampleRows && sampleRows.length > 0 && sampleRows[0].step !== undefined;
  const hasEmailNumber = !emailNumError && emailNumTest;
  
  if (hasStep && !hasEmailNumber) {
    console.log('\n✅ CONFIRMED: Your database uses "step" column (not "email_number")');
    console.log('   → Materialized view should use "step" in the WHERE clause');
    console.log('   → Migration 20251207000005_fix_mv_use_step_column.sql is CORRECT');
  } else if (hasEmailNumber && !hasStep) {
    console.log('\n✅ CONFIRMED: Your database uses "email_number" column (not "step")');
    console.log('   → Materialized view should use "email_number" in the WHERE clause');
  } else if (hasStep && hasEmailNumber) {
    console.log('\n⚠️  BOTH columns exist! Need to check which one has data');
  } else {
    console.log('\n❌ NEITHER column found - this is a problem!');
  }
}

verifyData()
  .then(() => {
    console.log('\n✅ Verification complete!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
