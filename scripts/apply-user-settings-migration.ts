/**
 * Migration Runner: User Settings Table
 * 
 * Applies the user_settings table migration.
 * Run with: npx ts-node scripts/apply-user-settings-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🚀 Applying User Settings Migration\n');

  const migrationFile = '20260126_create_user_settings.sql';
  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`📝 Running: ${migrationFile}\n`);

  try {
    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ user_settings table already exists!');
      console.log('   Migration not needed.\n');
      return;
    }

    if (checkError && checkError.code !== 'PGRST205') {
      console.error('❌ Error checking table:', checkError);
      throw checkError;
    }

    console.log('⚠️  MANUAL MIGRATION REQUIRED\n');
    console.log('The user_settings table does not exist in your database.');
    console.log('Please apply this migration manually:\n');
    console.log('1. Go to Supabase Dashboard: ' + supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/'));
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Copy and paste the following SQL:\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('\n4. Click "Run" to execute the migration\n');
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
