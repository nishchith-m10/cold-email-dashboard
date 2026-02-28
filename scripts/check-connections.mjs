import https from 'https';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local values at runtime (avoids hardcoding secrets in source)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
const envVars = {};
try {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?/);
    if (m) envVars[m[1]] = m[2];
  });
} catch (e) {
  console.error('Could not read .env.local:', e.message);
}

const DO_TOKEN = envVars.DIGITALOCEAN_API_TOKEN || process.env.DIGITALOCEAN_API_TOKEN || '';
const SUPABASE_ANON = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const N8N_KEY = envVars.N8N_API_KEY || process.env.N8N_API_KEY || '';
const N8N_BASE = (envVars.N8N_BASE_URL || process.env.N8N_BASE_URL || 'https://n8n.example.com/api/v1').replace(/\/api\/v1.*$/, '/api/v1');

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function get(url, headers = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, headers },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    req.end();
  });
}

const checks = [
  {
    name: 'Supabase REST API',
    url: `${SUPABASE_URL}/rest/v1/workspace_config?limit=1`,
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  },
  {
    name: 'n8n Workflow API (DO App)',
    url: `${N8N_BASE}/workflows?limit=1`,
    headers: { 'X-N8N-API-KEY': N8N_KEY },
  },
  {
    name: 'DigitalOcean Account',
    url: 'https://api.digitalocean.com/v2/account',
    headers: { Authorization: `Bearer ${DO_TOKEN}` },
  },
  {
    name: 'DigitalOcean Droplets',
    url: 'https://api.digitalocean.com/v2/droplets?per_page=20',
    headers: { Authorization: `Bearer ${DO_TOKEN}` },
    parse: (body) => {
      const d = JSON.parse(body);
      if (!d.droplets?.length) return 'No droplets provisioned yet';
      return d.droplets.map((x) => `\n    → ${x.name} [${x.status}] @ ${x.networks?.v4?.[0]?.ip_address ?? 'no-ip'} (region: ${x.region?.slug})`).join('');
    },
  },
  {
    name: 'DigitalOcean Apps (n8n)',
    url: 'https://api.digitalocean.com/v2/apps?per_page=10',
    headers: { Authorization: `Bearer ${DO_TOKEN}` },
    parse: (body) => {
      const d = JSON.parse(body);
      if (!d.apps?.length) return 'No apps found';
      return d.apps.map((x) => `\n    → ${x.spec?.name} [${x.last_deployment_active_updated_at ?? 'no-deploy'}]`).join('');
    },
  },
];

console.log('\n🔍 UpShot Connection Audit — ' + new Date().toISOString() + '\n');

for (const c of checks) {
  const { status, body } = await get(c.url, c.headers);
  const ok = status >= 200 && status < 300;
  const icon = ok ? '✅' : '❌';
  let extra = '';
  if (ok && c.parse) {
    try { extra = ' ' + c.parse(body); } catch(e) { extra = ' (parse error)'; }
  }
  if (!ok && body) extra = ` — ${body.slice(0, 120)}`;
  console.log(`${icon} ${c.name}: HTTP ${status}${extra}`);
}

console.log('\n--- Missing / Placeholder ENV vars ---');
const placeholders = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_URL (localhost — not Upstash)',
  'RELEVANCE_AI_API_KEY',
  'RELEVANCE_AI_PROJECT_ID',
  'RELEVANCE_AI_STUDIO_ID',
  'APIFY_API_KEY',
  'GOOGLE_CSE_API_KEY',
  'GOOGLE_CSE_CX / GOOGLE_CSE_ID',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'ENTRI_API_KEY + ENTRI_APP_ID',
  'SIDECAR_AUTH_TOKEN',
  'CONTROL_PLANE_URL',
  'DIGITALOCEAN_TOKEN (alias — mirrors DIGITALOCEAN_API_TOKEN)',
  'NEXT_PUBLIC_OHIO_WORKSPACE_ID',
  'DATABASE_URL (password placeholder)',
  'NEXT_PUBLIC_SENTRY_DSN',
  'BLOB_READ_WRITE_TOKEN (Vercel Blob)',
  'OPENROUTER_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'SVIX_TOKEN + SVIX_SERVER_URL (Svix webhook delivery)',
  'TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (alerts)',
  'GMAIL_OAUTH_CLIENT_ID / CLIENT_SECRET (placeholder values)',
  'SIDECAR_HANDSHAKE_SECRET',
];
placeholders.forEach((p) => console.log(`  ⚠️  ${p}`));
console.log('');
