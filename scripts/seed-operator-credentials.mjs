#!/usr/bin/env node
/**
 * OPERATOR CREDENTIAL VAULT SEEDER
 *
 * Reads OPERATOR_SEED_* values from .env.local, encrypts them with the same
 * AES-256-GCM scheme as lib/genesis/credential-vault.ts (key = SHA-256 of
 * CREDENTIAL_MASTER_KEY + "operator"), and upserts into
 * genesis.operator_credentials via the Supabase REST API.
 *
 * Usage:
 *   node scripts/seed-operator-credentials.mjs
 *
 * After a successful run, DELETE all OPERATOR_SEED_* lines from .env.local
 * and from any Vercel / Railway environment variable settings.
 *
 * The keys stored here are read at ignition time by
 * lib/genesis/operator-credential-store.ts — they are NEVER read from env
 * in production.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.local manually (avoid dotenv dep for portability) ──────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env.local');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const env = { ...loadEnvFile(ENV_PATH), ...process.env };

// ── Encryption (mirrors credential-vault.ts) ─────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive AES key: SHA-256(masterKey + scopeId)
 * Uses "operator" as the scope instead of a workspace UUID.
 */
function deriveKey(masterKeyHex, scopeId) {
  return crypto
    .createHash('sha256')
    .update(masterKeyHex + scopeId)
    .digest();
}

function encryptValue(plaintext, masterKeyHex) {
  const key = deriveKey(masterKeyHex, 'operator');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  // Wrap as { value } so credential-vault.ts's decryptCredential() can decode
  // this with JSON.parse() — both sides stay in sync with the same format.
  const encoded = JSON.stringify({ value: plaintext });
  const encrypted = Buffer.concat([
    cipher.update(encoded, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv[16] + authTag[16] + ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

// ── Supabase upsert ───────────────────────────────────────────────────────────

async function upsertCredential(supabaseUrl, serviceRoleKey, keyName, encryptedValue, description) {
  const url = `${supabaseUrl}/rest/v1/operator_credentials?on_conflict=key_name`;
  const body = JSON.stringify({
    key_name: keyName,
    encrypted_value: encryptedValue,
    description,
    updated_at: new Date().toISOString(),
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed for ${keyName}: HTTP ${res.status} — ${text}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Required infrastructure vars
  const masterKey = env.CREDENTIAL_MASTER_KEY;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!masterKey) {
    console.error('❌  CREDENTIAL_MASTER_KEY is not set in .env.local');
    process.exit(1);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
    process.exit(1);
  }

  // Map: OPERATOR_SEED_<ENV_KEY> → { key_name, description }
  const SEED_MAP = {
    OPERATOR_SEED_OPENAI_API_KEY: {
      keyName: 'openai_api_key',
      description: 'OpenAI API key — used by n8n AI nodes in all workspaces',
    },
    OPERATOR_SEED_ANTHROPIC_API_KEY: {
      keyName: 'anthropic_api_key',
      description: 'Anthropic Claude API key — used by n8n AI nodes in all workspaces',
    },
    OPERATOR_SEED_APIFY_API_KEY: {
      keyName: 'apify_api_key',
      description: 'Apify API key — used for Google Maps Reviews scraper (compass~google-maps-reviews-scraper)',
    },
    OPERATOR_SEED_GOOGLE_CSE_API_KEY: {
      keyName: 'google_cse_api_key',
      description: 'Google Custom Search Engine API key',
    },
    OPERATOR_SEED_GOOGLE_CSE_CX: {
      keyName: 'google_cse_cx',
      description: 'Google Custom Search Engine CX (search engine ID)',
    },
    OPERATOR_SEED_RELEVANCE_AI_API_KEY: {
      keyName: 'relevance_ai_api_key',
      description: 'Relevance AI API key',
    },
    OPERATOR_SEED_RELEVANCE_AI_AUTH_TOKEN: {
      keyName: 'relevance_ai_auth_token',
      description: 'Relevance AI auth token — format: region:project_id:api_key',
    },
    OPERATOR_SEED_RELEVANCE_AI_PROJECT_ID: {
      keyName: 'relevance_ai_project_id',
      description: 'Relevance AI project UUID',
    },
    OPERATOR_SEED_RELEVANCE_AI_STUDIO_ID: {
      keyName: 'relevance_ai_studio_id',
      description: 'Relevance AI studio UUID',
    },
    OPERATOR_SEED_RELEVANCE_AI_BASE_URL: {
      keyName: 'relevance_ai_base_url',
      description: 'Relevance AI webhook trigger URL (includes project + studio IDs)',
    },
  };

  console.log('\n🔐  Operator Credential Vault Seeder');
  console.log(`    Supabase: ${supabaseUrl}`);
  console.log(`    Schema:   genesis.operator_credentials\n`);

  let seeded = 0;
  let skipped = 0;
  const toRemove = [];

  for (const [envKey, { keyName, description }] of Object.entries(SEED_MAP)) {
    const rawValue = env[envKey];

    if (!rawValue || rawValue.includes('YOUR_') || rawValue === '') {
      console.log(`  ⬜  ${keyName.padEnd(30)} — skipped (placeholder or missing)`);
      skipped++;
      continue;
    }

    try {
      const encrypted = encryptValue(rawValue, masterKey);
      await upsertCredential(supabaseUrl, serviceRoleKey, keyName, encrypted, description);
      console.log(`  ✅  ${keyName.padEnd(30)} — seeded`);
      toRemove.push(envKey);
      seeded++;
    } catch (err) {
      console.error(`  ❌  ${keyName.padEnd(30)} — FAILED: ${err.message}`);
    }
  }

  console.log(`\n  Seeded: ${seeded}  |  Skipped (placeholder): ${skipped}\n`);

  if (toRemove.length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  ⚠️   ACTION REQUIRED — remove these from .env.local now:    │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    for (const k of toRemove) console.log(`  ${k}`);
    console.log('\n  Also remove them from Vercel and Railway env settings.');
    console.log('  They are now encrypted in genesis.operator_credentials.\n');
  }

  if (skipped > 0) {
    console.log(`  📝  Fill in the ${skipped} skipped OPERATOR_SEED_* var(s) and re-run to seed them.\n`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
