#!/usr/bin/env npx tsx
/**
 * Seed DigitalOcean Account into genesis.do_accounts (Encrypted)
 *
 * Reads DO_API_TOKEN from .env.local, validates it against the DO API,
 * encrypts via genesis.encrypt_do_token (pgcrypto AES-256-GCM),
 * and inserts into genesis.do_accounts.
 *
 * Usage:
 *   npx tsx scripts/seed-do-account.ts
 *   npx tsx scripts/seed-do-account.ts --account-id my-beta-pool --region nyc1 --max-droplets 25
 *   npx tsx scripts/seed-do-account.ts --dry-run
 *
 * Required env vars (from .env.local):
 *   DO_API_TOKEN            — dop_v1_... plaintext token
 *   INTERNAL_ENCRYPTION_KEY — pgcrypto symmetric key
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// ── Load .env.local ──────────────────────────────────────────
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✓ Loaded env from ${envPath}`);
} else {
  dotenv.config(); // fallback to .env
  console.log("⚠ .env.local not found, using default .env");
}

// ── Parse CLI args ───────────────────────────────────────────
function parseArgs(): {
  accountId: string;
  region: string;
  maxDroplets: number;
  dryRun: boolean;
  force: boolean;
} {
  const args = process.argv.slice(2);
  let accountId = "genesis-beta-pool-01";
  let region = "blr1"; // Default: Bangalore (closest to user)
  let maxDroplets = 25;
  let dryRun = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--account-id":
        accountId = args[++i];
        break;
      case "--region":
        region = args[++i];
        break;
      case "--max-droplets":
        maxDroplets = parseInt(args[++i], 10);
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--force":
        force = true;
        break;
      case "--help":
        console.log(`
Usage: npx tsx scripts/seed-do-account.ts [options]

Options:
  --account-id <id>        Account identifier (default: genesis-beta-pool-01)
  --region <region>         DO region slug (default: blr1)
  --max-droplets <n>        Max droplets for this account (default: 25)
  --dry-run                 Validate only — don't insert into DB
  --force                   Overwrite if account already exists
  --help                    Show this help
`);
        process.exit(0);
    }
  }

  return { accountId, region, maxDroplets, dryRun, force };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  console.log("\n══════════════════════════════════════════════════");
  console.log("  GENESIS — Seed DigitalOcean Account (Encrypted)");
  console.log("══════════════════════════════════════════════════\n");

  // ── 1. Validate env vars ─────────────────────────────────
  const doToken = process.env.DO_API_TOKEN || process.env.DIGITALOCEAN_API_TOKEN || process.env.DO_TOKEN;
  const encryptionKey = process.env.INTERNAL_ENCRYPTION_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!doToken) missing.push("DO_API_TOKEN (or DIGITALOCEAN_API_TOKEN / DO_TOKEN)");
  if (!encryptionKey) missing.push("INTERNAL_ENCRYPTION_KEY");
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    console.error(`✗ Missing env vars: ${missing.join(", ")}`);
    console.error("  Ensure these are set in .env.local");
    process.exit(1);
  }

  // Validate token format
  if (!doToken!.startsWith("dop_v1_")) {
    console.error("✗ DO_API_TOKEN must start with 'dop_v1_'");
    console.error("  Get one from https://cloud.digitalocean.com/account/api/tokens");
    process.exit(1);
  }

  console.log(`  Account ID:   ${opts.accountId}`);
  console.log(`  Region:       ${opts.region}`);
  console.log(`  Max Droplets: ${opts.maxDroplets}`);
  console.log(`  Token:        ${doToken!.substring(0, 10)}...[${doToken!.length} chars]`);
  console.log(`  Dry Run:      ${opts.dryRun}`);
  console.log("");

  // ── 2. Validate token against DO API ─────────────────────
  console.log("Step 1/4 — Validating token against DigitalOcean API...");
  let doAccountInfo: any;
  try {
    const resp = await fetch("https://api.digitalocean.com/v2/account", {
      headers: { Authorization: `Bearer ${doToken}` },
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`✗ DO API returned ${resp.status}: ${body}`);
      process.exit(1);
    }

    doAccountInfo = await resp.json();
    const acct = doAccountInfo.account;
    console.log(`  ✓ Token valid`);
    console.log(`    Email:         ${acct.email}`);
    console.log(`    Status:        ${acct.status}`);
    console.log(`    Droplet Limit: ${acct.droplet_limit}`);
    console.log(`    Floating IPs:  ${acct.floating_ip_limit}`);

    if (acct.status !== "active") {
      console.error(`  ⚠ Account status is "${acct.status}", not "active".`);
      if (!opts.force) {
        console.error("  Use --force to proceed anyway.");
        process.exit(1);
      }
    }
  } catch (err: any) {
    console.error(`✗ Could not reach DigitalOcean API: ${err.message}`);
    process.exit(1);
  }

  // ── 3. Check available regions ───────────────────────────
  console.log("\nStep 2/4 — Verifying region availability...");
  try {
    const resp = await fetch("https://api.digitalocean.com/v2/regions", {
      headers: { Authorization: `Bearer ${doToken}` },
    });
    if (resp.ok) {
      const { regions } = await resp.json();
      const regionInfo = regions.find((r: any) => r.slug === opts.region);
      if (regionInfo) {
        console.log(`  ✓ Region "${opts.region}" is available: ${regionInfo.name}`);
      } else {
        const available = regions
          .filter((r: any) => r.available)
          .map((r: any) => `${r.slug} (${r.name})`)
          .join("\n    ");
        console.error(`  ✗ Region "${opts.region}" not found. Available regions:\n    ${available}`);
        process.exit(1);
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠ Could not verify region: ${err.message} (continuing)`);
  }

  if (opts.dryRun) {
    console.log("\n✓ Dry run complete — token is valid, region exists. No DB changes made.");
    process.exit(0);
  }

  // ── 4. Connect to Supabase and encrypt/insert ────────────
  console.log("\nStep 3/4 — Encrypting token via pgcrypto...");
  const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Set encryption key in session
  const { error: configErr } = await (supabase as any).rpc("set_config", {
    setting_name: "app.encryption_key",
    setting_value: encryptionKey!,
  });

  if (configErr) {
    console.error(`  ✗ Failed to set encryption key: ${configErr.message}`);
    console.error("  Ensure 'set_config' RPC exists in your Supabase instance.");
    process.exit(1);
  }

  // Encrypt the token
  const { data: encryptedToken, error: encryptErr } = await (
    supabase.schema("genesis") as any
  ).rpc("encrypt_do_token", { p_plaintext_token: doToken! });

  if (encryptErr || !encryptedToken) {
    console.error(`  ✗ Encryption failed: ${encryptErr?.message || "returned null"}`);
    console.error(
      "  Ensure genesis.encrypt_do_token() function exists and pgcrypto extension is enabled."
    );
    process.exit(1);
  }
  console.log(
    `  ✓ Token encrypted (${encryptedToken.length} chars base64)`
  );

  // ── 5. Insert into genesis.do_accounts ───────────────────
  console.log("\nStep 4/4 — Inserting into genesis.do_accounts...");

  // Check if already exists
  const { data: existing } = await (supabase.schema("genesis") as any)
    .from("do_accounts")
    .select("account_id, status")
    .eq("account_id", opts.accountId)
    .maybeSingle();

  if (existing) {
    if (opts.force) {
      console.log(`  ⚠ Account "${opts.accountId}" exists — updating (--force)`);
      const { error: updateErr } = await (supabase.schema("genesis") as any)
        .from("do_accounts")
        .update({
          api_token_encrypted: encryptedToken,
          region: opts.region,
          max_droplets: opts.maxDroplets,
          status: "active",
          billing_email: doAccountInfo?.account?.email || null,
        })
        .eq("account_id", opts.accountId);

      if (updateErr) {
        console.error(`  ✗ Update failed: ${updateErr.message}`);
        process.exit(1);
      }
      console.log(`  ✓ Account "${opts.accountId}" updated successfully`);
    } else {
      console.error(`  ✗ Account "${opts.accountId}" already exists.`);
      console.error("  Use --force to overwrite.");
      process.exit(1);
    }
  } else {
    const { error: insertErr } = await (supabase.schema("genesis") as any)
      .from("do_accounts")
      .insert({
        account_id: opts.accountId,
        api_token_encrypted: encryptedToken,
        region: opts.region,
        max_droplets: opts.maxDroplets,
        current_droplets: 0,
        status: "active",
        billing_email: doAccountInfo?.account?.email || null,
        notes: `Seeded from .env.local on ${new Date().toISOString()}`,
      });

    if (insertErr) {
      console.error(`  ✗ Insert failed: ${insertErr.message}`);
      process.exit(1);
    }
    console.log(`  ✓ Account "${opts.accountId}" inserted successfully`);
  }

  // ── 6. Verify round-trip ─────────────────────────────────
  console.log("\nStep 5/5 — Verifying decryption round-trip...");
  const { data: decrypted, error: decryptErr } = await (
    supabase.schema("genesis") as any
  ).rpc("decrypt_do_token", { p_account_id: opts.accountId });

  if (decryptErr || !decrypted) {
    console.error(
      `  ✗ Round-trip verification failed: ${decryptErr?.message || "null"}`
    );
    process.exit(1);
  }

  if (decrypted === doToken) {
    console.log("  ✓ Round-trip verification passed — encrypt→store→decrypt matches original");
  } else {
    console.error("  ✗ CRITICAL: Decrypted token does not match original!");
    process.exit(1);
  }

  console.log("\n══════════════════════════════════════════════════");
  console.log("  ✅ DO account seeded and verified!");
  console.log("══════════════════════════════════════════════════");
  console.log(`\n  Account:  ${opts.accountId}`);
  console.log(`  Region:   ${opts.region}`);
  console.log(`  Capacity: 0/${opts.maxDroplets} droplets`);
  console.log(`  DO Email: ${doAccountInfo?.account?.email}`);
  console.log("\n  The DropletFactory will now use this account when");
  console.log("  beta users click 'Start Engine'.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
