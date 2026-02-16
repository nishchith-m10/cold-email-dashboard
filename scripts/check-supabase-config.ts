/**
 * Diagnostic script to verify Supabase configuration
 * Run: npx tsx scripts/check-supabase-config.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '@/lib/supabase';

async function checkSupabaseConfig() {
  console.log('='.repeat(60));
  console.log('SUPABASE CONFIGURATION CHECK');
  console.log('='.repeat(60));

  // Check environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('\n1. Environment Variables:');
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${url ? '✓ Set' : '✗ Missing'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${key ? '✓ Set' : '✗ Missing'}`);
  
  if (url) {
    console.log(`   URL Value: ${url}`);
  }
  if (key) {
    console.log(`   Key Value: ${key.slice(0, 20)}...${key.slice(-10)}`);
  }

  // Check supabaseAdmin initialization
  console.log('\n2. Supabase Admin Client:');
  if (supabaseAdmin) {
    console.log('   ✓ supabaseAdmin initialized');
  } else {
    console.log('   ✗ supabaseAdmin is null');
    console.log('\n   This will cause HTTP 500 errors in admin API routes!');
    console.log('   Please ensure both env vars are set in .env.local');
    process.exit(1);
  }

  // Test database connection
  console.log('\n3. Database Connection Test:');
  try {
    const { data, error } = await supabaseAdmin
      .from('genesis.api_health_snapshots')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('   ⚠ Table genesis.api_health_snapshots does not exist');
        console.log('   → Run: npx supabase db push --linked');
      } else {
        console.log(`   ✗ Query error: ${error.message}`);
      }
    } else {
      console.log('   ✓ Successfully queried genesis.api_health_snapshots');
      console.log(`   Found ${data?.length || 0} records`);
    }
  } catch (err) {
    console.log(`   ✗ Connection failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Check other Phase 70/71/72 tables
  console.log('\n4. Genesis Schema Tables:');
  const tables = [
    'genesis.disaster_recovery_snapshots',
    'genesis.disaster_recovery_regional_health',
    'genesis.fleet_rollouts',
    'genesis.tenant_versions',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`   ✗ ${table} does not exist`);
        } else {
          console.log(`   ⚠ ${table}: ${error.message}`);
        }
      } else {
        console.log(`   ✓ ${table} exists`);
      }
    } catch (err) {
      console.log(`   ✗ ${table}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ Configuration check complete');
  console.log('='.repeat(60) + '\n');
}

checkSupabaseConfig().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
