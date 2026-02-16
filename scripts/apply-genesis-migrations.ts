-- Apply Phase 70, 71, 72 migrations
-- Run this with: npx tsx scripts/apply-genesis-migrations.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '@/lib/supabase';

async function applyMigrations() {
  if (!supabaseAdmin) {
    console.error('❌ supabaseAdmin not initialized');
    process.exit(1);
  }

  const migrations = [
    {
      name: 'Phase 71 - API Health Monitor',
      file: 'supabase/migrations/20260212181306_phase71_api_health.sql',
    },
    {
      name: 'Phase 70 - Disaster Recovery',
      file: 'supabase/migrations/20260213000000_phase70_disaster_recovery.sql',
    },
    {
      name: 'Phase 72 - Fleet Update Protocol',
      file: 'supabase/migrations/20260213100000_phase72_fleet_update_protocol.sql',
    },
  ];

  console.log('📦 Applying Genesis Phase 70/71/72 migrations...\n');

  for (const migration of migrations) {
    console.log(`⏳ ${migration.name}...`);
    
    try {
      const sql = readFileSync(migration.file, 'utf-8');
      
      // Execute the SQL
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql }).single();
      
      if (error) {
        // Try direct execution if rpc fails
        const lines = sql.split(';').filter(line => line.trim());
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const { error: execError } = await (supabaseAdmin as any).from('_').select('*').limit(0);
          // This won't work - need raw SQL execution
          
          console.error(`   ❌ Failed: ${error.message}`);
          console.log(`   ℹ️  Please apply this migration manually in Supabase SQL Editor`);
          console.log(`   📄 File: ${migration.file}\n`);
          break;
        }
      } else {
        console.log(`   ✅ Applied successfully\n`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  console.log('\n✨ Migration process complete');
  console.log('\n📋 Manual Steps:');
  console.log('1. Go to https://supabase.com/dashboard/project/vfdmdqqtuxbkkxhcwris/sql/new');
  console.log('2. Copy and run each migration file:');
  migrations.forEach(m => console.log(`   - ${m.file}`));
}

applyMigrations().catch(console.error);
