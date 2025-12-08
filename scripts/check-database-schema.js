/**
 * Database Schema Inspector
 * Checks what columns actually exist in the email_events table
 * 
 * Usage: node scripts/check-database-schema.js
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
} else {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  console.log('🔍 Inspecting Database Schema...\n');

  // 1. Check email_events table columns - use sample row method
  console.log('📊 EMAIL_EVENTS TABLE COLUMNS:');
  console.log('================================');
  
  const { data: sampleRow, error: sampleError } = await supabase
    .from('email_events')
    .select('*')
    .limit(1)
    .single();

  if (sampleError) {
    console.error('❌ Error fetching sample row:', sampleError.message);
  } else if (sampleRow) {
    console.log('Columns found in email_events table:');
    Object.keys(sampleRow).sort().forEach((col, idx) => {
      const value = sampleRow[col];
      const type = value === null ? 'null' : typeof value;
      const preview = value === null ? 'NULL' : 
                     typeof value === 'object' ? JSON.stringify(value).substring(0, 50) :
                     String(value).substring(0, 50);
      console.log(`  ${(idx + 1).toString().padStart(2)}. ${col.padEnd(25)} (${type.padEnd(8)}) = ${preview}`);
    });
  }

  // 2. Check if email_number column exists
  console.log('\n🎯 CRITICAL CHECK: email_number column');
  console.log('=========================================');
  
  const { data: testData, error: testError } = await supabase
    .from('email_events')
    .select('email_number')
    .limit(1);

  if (testError) {
    if (testError.message.includes('column') && testError.message.includes('does not exist')) {
      console.log('❌ email_number column DOES NOT EXIST');
      console.log('   → This is the root cause of your issues!');
    } else {
      console.log('❌ Error checking column:', testError.message);
    }
  } else {
    console.log('✅ email_number column EXISTS');
    
    // Check if it has data
    const { data: withData, error: dataError } = await supabase
      .from('email_events')
      .select('email_number')
      .not('email_number', 'is', null)
      .limit(5);

    if (withData && withData.length > 0) {
      console.log(`   → Has data: ${withData.length} rows with values`);
      console.log('   → Sample values:', withData.map(r => r.email_number).join(', '));
    } else {
      console.log('   → Column exists but ALL VALUES ARE NULL');
      console.log('   → Need to backfill from metadata');
    }
  }

  // 3. Check metadata field
  console.log('\n📦 METADATA FIELD CHECK:');
  console.log('=========================');
  
  const { data: metadataCheck, error: metaError } = await supabase
    .from('email_events')
    .select('metadata')
    .not('metadata', 'is', null)
    .limit(5);

  if (metaError) {
    console.log('❌ Error:', metaError.message);
  } else if (metadataCheck && metadataCheck.length > 0) {
    console.log('Sample metadata fields:');
    metadataCheck.forEach((row, idx) => {
      const emailNum = row.metadata?.email_number;
      console.log(`  ${idx + 1}. email_number in metadata: ${emailNum || 'MISSING'}`);
    });
  } else {
    console.log('⚠️  No rows with metadata found');
  }

  // 4. Check materialized view
  console.log('\n📈 MATERIALIZED VIEW CHECK:');
  console.log('============================');
  
  const { data: viewCheck, error: viewError } = await supabase
    .from('mv_daily_stats')
    .select('campaign_name, email_1_sends, email_2_sends, email_3_sends')
    .limit(5);

  if (viewError) {
    console.log('❌ Error:', viewError.message);
  } else if (viewCheck && viewCheck.length > 0) {
    console.log('Sample data from mv_daily_stats:');
    viewCheck.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.campaign_name}: Email1=${row.email_1_sends}, Email2=${row.email_2_sends}, Email3=${row.email_3_sends}`);
    });
  } else {
    console.log('⚠️  No data in materialized view');
  }

  // 5. Summary
  console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
  console.log('===============================');
  
  const hasColumn = !testError || !testError.message?.includes('does not exist');
  
  if (!hasColumn) {
    console.log('❌ CRITICAL: email_number column missing');
    console.log('   → Run migration: 20251207000003_add_email_number_column.sql');
    console.log('   → Then run: 20251207000004_fix_materialized_view_columns.sql');
  } else {
    console.log('✅ email_number column exists');
    console.log('   → Check if values are populated (see above)');
    console.log('   → If NULL, run backfill migration');
  }
}

inspectDatabase()
  .then(() => {
    console.log('\n✅ Inspection complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
