/**
 * ADMIN: DigitalOcean Connectivity Test (Day 4)
 *
 * POST /api/admin/droplet-test    — Test DO API connectivity (NO droplet creation)
 * GET  /api/admin/droplet-test    — Check fleet status
 * DELETE /api/admin/droplet-test  — Tear down a droplet (for emergencies)
 *
 * Runs connectivity verification ONLY — zero credit spend:
 *   1. Verify env vars are configured
 *   2. Verify DO account exists in genesis.do_accounts
 *   3. Decrypt and validate token format
 *   4. Test DO API connectivity (/v2/account)
 *   5. Verify account limits and available regions
 *   6. Validate DropletFactory can select an account
 *
 * Auth: Super Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireSuperAdmin(): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: API_HEADERS }),
    };
  }
  if (!SUPER_ADMIN_IDS.includes(userId)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Super Admin access required' }, { status: 403, headers: API_HEADERS }),
    };
  }
  return { authorized: true, userId };
}

// ============================================
// POST — Provision a test droplet
// ============================================

interface TestDropletPayload {
  region?: string;            // Default: first available from do_accounts
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (!authResult.authorized) return authResult.response;

  const startTime = Date.now();
  const results: Record<string, any> = {
    steps: [],
    timings: {},
  };

  function logStep(name: string, status: 'pass' | 'fail' | 'skip', detail?: any) {
    results.steps.push({ step: name, status, detail, elapsed_ms: Date.now() - startTime });
  }

  try {
    const body: TestDropletPayload = await req.json().catch(() => ({}));
    const supabase = getSupabase();

    // ── Step 1: Pre-flight checks ─────────────────────────
    const envChecks = {
      INTERNAL_ENCRYPTION_KEY: !!process.env.INTERNAL_ENCRYPTION_KEY,
      GENESIS_JWT_PRIVATE_KEY: !!process.env.GENESIS_JWT_PRIVATE_KEY,
      CREDENTIAL_MASTER_KEY: !!process.env.CREDENTIAL_MASTER_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    };

    const missingEnvVars = Object.entries(envChecks)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missingEnvVars.length > 0) {
      logStep('env_check', 'fail', { missing: missingEnvVars });
      return NextResponse.json(
        { error: 'Missing required env vars', results },
        { status: 503, headers: API_HEADERS },
      );
    }
    logStep('env_check', 'pass', envChecks);

    // ── Step 2: Verify DO accounts exist in database ──────
    await (supabase as any).rpc('set_config', {
      setting_name: 'app.encryption_key',
      setting_value: process.env.INTERNAL_ENCRYPTION_KEY!,
    });

    const { data: accounts, error: accountErr } = await (supabase.schema('genesis') as any)
      .from('do_accounts')
      .select('account_id, region, max_droplets, current_droplets, status')
      .eq('status', 'active');

    if (accountErr) {
      logStep('do_accounts_check', 'fail', { error: accountErr.message });
      return NextResponse.json(
        { error: 'Failed to query DO accounts', results },
        { status: 500, headers: API_HEADERS },
      );
    }

    if (!accounts || accounts.length === 0) {
      logStep('do_accounts_check', 'fail', {
        error: 'No active DO accounts registered.',
        hint: 'Run: npx tsx scripts/seed-do-account.ts',
      });
      return NextResponse.json(
        {
          error: 'No DO accounts registered in genesis.do_accounts. ' +
            'Run scripts/seed-do-account.ts to seed one first.',
          results,
        },
        { status: 422, headers: API_HEADERS },
      );
    }

    const targetRegion = body.region || accounts[0].region;
    const matchedAccount = accounts.find((a: any) => a.region === targetRegion);

    if (!matchedAccount) {
      logStep('do_accounts_check', 'fail', {
        error: `No active account for region "${targetRegion}"`,
        available_regions: accounts.map((a: any) => a.region),
      });
      return NextResponse.json(
        { error: `No DO account for region "${targetRegion}"`, results },
        { status: 422, headers: API_HEADERS },
      );
    }

    logStep('do_accounts_check', 'pass', {
      account_id: matchedAccount.account_id,
      region: matchedAccount.region,
      capacity: `${matchedAccount.current_droplets}/${matchedAccount.max_droplets}`,
      all_accounts: accounts.map((a: any) => ({
        account_id: a.account_id,
        region: a.region,
        capacity: `${a.current_droplets}/${a.max_droplets}`,
      })),
    });

    // ── Step 3: Verify token decryption works ─────────────
    let decryptedToken: string;
    try {
      const { data: token, error: decryptErr } = await (supabase.schema('genesis') as any)
        .rpc('decrypt_do_token', { p_account_id: matchedAccount.account_id });

      if (decryptErr || !token) {
        throw new Error(decryptErr?.message || 'decrypt_do_token returned null');
      }

      if (!token.startsWith('dop_v1_')) {
        throw new Error('Decrypted token has unexpected format (not dop_v1_...)');
      }

      decryptedToken = token;
      logStep('token_decrypt', 'pass', {
        token_format: 'dop_v1_***',
        token_length: token.length,
      });
    } catch (err: any) {
      logStep('token_decrypt', 'fail', { error: err.message });
      return NextResponse.json(
        { error: 'Token decryption failed', results },
        { status: 500, headers: API_HEADERS },
      );
    }

    // ── Step 4: Validate DO API connectivity ──────────────
    let doAccountInfo: any;
    try {
      const resp = await fetch('https://api.digitalocean.com/v2/account', {
        headers: { Authorization: `Bearer ${decryptedToken}` },
      });

      if (!resp.ok) {
        throw new Error(`DO API returned ${resp.status}`);
      }

      doAccountInfo = await resp.json();
      logStep('do_api_connectivity', 'pass', {
        email: doAccountInfo.account?.email,
        droplet_limit: doAccountInfo.account?.droplet_limit,
        status: doAccountInfo.account?.status,
        uuid: doAccountInfo.account?.uuid,
      });
    } catch (err: any) {
      logStep('do_api_connectivity', 'fail', { error: err.message });
      return NextResponse.json(
        { error: 'DigitalOcean API connectivity failed', results },
        { status: 502, headers: API_HEADERS },
      );
    }

    // ── Step 5: Check available regions and sizes ─────────
    // This is a READ-ONLY call — no credits spent
    try {
      const [regionsResp, sizesResp] = await Promise.all([
        fetch('https://api.digitalocean.com/v2/regions', {
          headers: { Authorization: `Bearer ${decryptedToken}` },
        }),
        fetch('https://api.digitalocean.com/v2/sizes?per_page=5', {
          headers: { Authorization: `Bearer ${decryptedToken}` },
        }),
      ]);

      const regionsData = regionsResp.ok ? await regionsResp.json() : null;
      const sizesData = sizesResp.ok ? await sizesResp.json() : null;

      const availableRegions = regionsData?.regions
        ?.filter((r: any) => r.available)
        ?.map((r: any) => ({ slug: r.slug, name: r.name })) || [];

      const targetRegionAvailable = availableRegions.some(
        (r: any) => r.slug === targetRegion,
      );

      const availableSizes = sizesData?.sizes
        ?.filter((s: any) => s.available && s.regions?.includes(targetRegion))
        ?.slice(0, 5)
        ?.map((s: any) => ({
          slug: s.slug,
          vcpus: s.vcpus,
          memory_mb: s.memory,
          price_monthly: s.price_monthly,
        })) || [];

      logStep('region_and_sizing', targetRegionAvailable ? 'pass' : 'fail', {
        target_region: targetRegion,
        target_region_available: targetRegionAvailable,
        total_available_regions: availableRegions.length,
        matching_sizes: availableSizes,
      });
    } catch (err: any) {
      logStep('region_and_sizing', 'fail', { error: err.message });
    }

    // ── Step 6: Verify account capacity and limits ────────
    try {
      const currentDroplets = matchedAccount.current_droplets || 0;
      const maxDroplets = matchedAccount.max_droplets || 25;
      const doLimit = doAccountInfo?.account?.droplet_limit || 25;

      // Check DO's actual limit vs our configured limit
      const effectiveLimit = Math.min(maxDroplets, doLimit);
      const remainingCapacity = effectiveLimit - currentDroplets;

      logStep('capacity_check', remainingCapacity > 0 ? 'pass' : 'fail', {
        current_droplets: currentDroplets,
        configured_limit: maxDroplets,
        do_account_limit: doLimit,
        effective_limit: effectiveLimit,
        remaining_capacity: remainingCapacity,
        can_provision: remainingCapacity > 0,
      });
    } catch (err: any) {
      logStep('capacity_check', 'fail', { error: err.message });
    }

    // ── Step 7: Verify existing droplets (read-only) ──────
    try {
      const resp = await fetch('https://api.digitalocean.com/v2/droplets?per_page=1', {
        headers: { Authorization: `Bearer ${decryptedToken}` },
      });

      if (resp.ok) {
        const { meta } = await resp.json();
        logStep('existing_droplets_check', 'pass', {
          total_existing_droplets: meta?.total || 0,
          note: 'Read-only check — no droplets created or modified',
        });
      } else {
        logStep('existing_droplets_check', 'fail', {
          error: `DO API returned ${resp.status}`,
        });
      }
    } catch (err: any) {
      logStep('existing_droplets_check', 'fail', { error: err.message });
    }

    // ── Summary ───────────────────────────────────────────
    results.timings.total_ms = Date.now() - startTime;

    const allPassed = results.steps.every((s: any) => s.status !== 'fail');
    const passCount = results.steps.filter((s: any) => s.status === 'pass').length;
    const totalSteps = results.steps.length;

    return NextResponse.json(
      {
        success: allPassed,
        message: allPassed
          ? `All ${passCount}/${totalSteps} connectivity checks passed. ` +
            'DO API is reachable and account is healthy. ' +
            'No droplets were created — zero credits spent.'
          : 'Some connectivity checks failed — see results for details.',
        results,
        note: 'This endpoint tests connectivity ONLY. ' +
          'Droplets are created when beta users click "Start Engine" during onboarding.',
      },
      { status: allPassed ? 200 : 207, headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[DropletTest] Error:', err);
    results.timings = { total_ms: Date.now() - startTime };
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error', results },
      { status: 500, headers: API_HEADERS },
    );
  }
}

// ============================================
// GET — Check status of fleet / specific droplet
// ============================================

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(req.url);
    const dropletId = searchParams.get('droplet_id');
    const supabase = getSupabase();

    if (dropletId) {
      // Check specific droplet
      const { data: droplet, error } = await (supabase.schema('genesis') as any)
        .from('fleet_status')
        .select('*')
        .eq('droplet_id', parseInt(dropletId, 10))
        .single();

      if (error || !droplet) {
        return NextResponse.json(
          { error: `Droplet ${dropletId} not found in fleet_status` },
          { status: 404, headers: API_HEADERS },
        );
      }

      // Also check sidecar health if droplet has an IP
      let sidecarHealth = null;
      if (droplet.ip_address) {
        try {
          const resp = await fetch(`http://${droplet.ip_address}:3100/health`, {
            signal: AbortSignal.timeout(5000),
          });
          sidecarHealth = resp.ok ? await resp.json() : { status: resp.status };
        } catch {
          sidecarHealth = { status: 'unreachable' };
        }
      }

      return NextResponse.json(
        { droplet, sidecar_health: sidecarHealth },
        { headers: API_HEADERS },
      );
    }

    // List all test/fleet droplets
    const { data: fleet, error: fleetErr } = await (supabase.schema('genesis') as any)
      .from('fleet_status')
      .select('droplet_id, workspace_id, account_id, region, ip_address, status, sslip_domain, created_at, last_heartbeat_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (fleetErr) {
      return NextResponse.json(
        { error: 'Failed to query fleet', details: fleetErr.message },
        { status: 500, headers: API_HEADERS },
      );
    }

    return NextResponse.json(
      { fleet: fleet || [], count: fleet?.length || 0 },
      { headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[DropletTest] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}

// ============================================
// DELETE — Tear down a test droplet
// ============================================

export async function DELETE(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(req.url);
    const dropletId = searchParams.get('droplet_id');

    if (!dropletId) {
      return NextResponse.json(
        { error: 'droplet_id query parameter is required' },
        { status: 400, headers: API_HEADERS },
      );
    }

    const { DropletFactory } = await import('@/lib/genesis/droplet-factory');
    const factory = new DropletFactory();

    await factory.destroyDroplet(parseInt(dropletId, 10));

    return NextResponse.json(
      { success: true, message: `Droplet ${dropletId} destroyed`, droplet_id: dropletId },
      { headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[DropletTest] DELETE error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to destroy droplet' },
      { status: 500, headers: API_HEADERS },
    );
  }
}
