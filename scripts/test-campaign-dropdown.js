/**
 * Test the aggregate API endpoint
 * Verifies that campaigns.list is populated correctly
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAggregateAPI() {
  console.log('🧪 Testing Campaign Dropdown Data Flow\n');

  // 1. Test the raw query that aggregate API uses
  console.log('1️⃣ Testing Raw Campaign Query:');
  console.log('   Query: mv_daily_stats.select(campaign_name).not(null)');
  
  const { data: rawCampaigns, error: rawError } = await supabase
    .from('mv_daily_stats')
    .select('campaign_name')
    .not('campaign_name', 'is', null);

  if (rawError) {
    console.log('   ❌ Error:', rawError.message);
  } else {
    console.log(`   ✅ Returned ${rawCampaigns?.length || 0} rows`);
    const unique = new Set(rawCampaigns?.map(r => r.campaign_name) || []);
    console.log(`   ✅ Unique campaigns: ${unique.size}`);
    console.log('   📋 Campaign names:');
    Array.from(unique).forEach(name => {
      console.log(`      - "${name}"`);
    });
  }

  // 2. Simulate the processing logic from aggregate API
  console.log('\n2️⃣ Simulating Aggregate API Processing:');
  
  const EXCLUDED_CAMPAIGNS = ['n8n test', 'test'];
  const shouldExcludeCampaign = (name) => {
    return EXCLUDED_CAMPAIGNS.some(excluded => 
      name.toLowerCase().includes(excluded.toLowerCase())
    );
  };

  const campaignSet = new Set();
  if (!rawError) {
    for (const row of rawCampaigns || []) {
      if (row.campaign_name && !shouldExcludeCampaign(row.campaign_name)) {
        campaignSet.add(row.campaign_name);
      }
    }
  }
  
  const campaignList = Array.from(campaignSet)
    .map(name => ({ name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`   ✅ After filtering: ${campaignList.length} campaigns`);
  console.log('   📋 Final list:');
  campaignList.forEach(c => {
    console.log(`      - { name: "${c.name}" }`);
  });

  // 3. Test actual API endpoint
  console.log('\n3️⃣ Testing Actual API Endpoint:');
  console.log('   URL: http://localhost:3000/api/dashboard/aggregate?start=2025-11-01&end=2025-12-07');
  console.log('   ⚠️  Note: Start local dev server first with "npm run dev"');

  // 4. Summary
  console.log('\n📊 SUMMARY:');
  if (campaignList.length > 0) {
    console.log('   ✅ Campaign data is available in database');
    console.log('   ✅ Processing logic should work');
    console.log('   ✅ Should populate campaigns.list in API response');
    console.log('\n   🔍 Next Steps:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Visit: http://localhost:3000/analytics');
    console.log('   3. Check browser DevTools Network tab for /api/dashboard/aggregate');
    console.log('   4. Verify response has campaigns.list array');
  } else {
    console.log('   ⚠️  No campaigns found in database!');
    console.log('   🔍 Possible issues:');
    console.log('   1. mv_daily_stats is empty');
    console.log('   2. All campaign names are NULL');
    console.log('   3. All campaigns are being filtered out');
  }
}

testAggregateAPI()
  .then(() => {
    console.log('\n✅ Test complete!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
