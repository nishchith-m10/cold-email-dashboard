/**
 * ADMIN: Droplet Provisioning Test (Day 4)
 *
 * POST /api/admin/droplet-test    — Provision a test droplet and run verification
 * GET  /api/admin/droplet-test    — Check status of a provisioned test droplet
 * DELETE /api/admin/droplet-test  — Tear down a test droplet
 *
 * Runs the full provisioning pipeline:
 *   1. Verify DO account exists in genesis.do_accounts
 *   2. Provision droplet via DropletFactory
 *   3. Wait for cloud-init completion (poll droplet status)
 *   4. Verify sidecar health check responds
 *   5. Report back all results
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
  workspace_slug?: string;    // Default: "beta-test-{timestamp}"
  skip_sidecar_check?: boolean; // Skip waiting for sidecar (cloud-init takes ~3-5 min)
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
        hint: 'POST /api/admin/do-accounts to register one first.',
      });
      return NextResponse.json(
        {
          error: 'No DO accounts registered in genesis.do_accounts. ' +
            'Register one via POST /api/admin/do-accounts first.',
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
    });

    // ── Step 3: Verify token decryption works ─────────────
    try {
      const { data: decryptedToken, error: decryptErr } = await (supabase.schema('genesis') as any)
        .rpc('decrypt_do_token', { p_account_id: matchedAccount.account_id });

      if (decryptErr || !decryptedToken) {
        throw new Error(decryptErr?.message || 'decrypt_do_token returned null');
      }

      // Validate token format without logging it
      if (!decryptedToken.startsWith('dop_v1_')) {
        throw new Error('Decrypted token has unexpected format (not dop_v1_...)');
      }

      logStep('token_decrypt', 'pass', {
        token_format: 'dop_v1_***',
        token_length: decryptedToken.length,
      });
    } catch (err: any) {
      logStep('token_decrypt', 'fail', { error: err.message });
      return NextResponse.json(
        { error: 'Token decryption failed', results },
        { status: 500, headers: API_HEADERS },
      );
    }

    // ── Step 4: Validate DO API connectivity ──────────────
    try {
      const { data: decryptedToken } = await (supabase.schema('genesis') as any)
        .rpc('decrypt_do_token', { p_account_id: matchedAccount.account_id });

      const resp = await fetch('https://api.digitalocean.com/v2/account', {
        headers: { Authorization: `Bearer ${decryptedToken}` },
      });

      if (!resp.ok) {
        throw new Error(`DO API returned ${resp.status}`);
      }

      const doAccount = await resp.json();
      logStep('do_api_connectivity', 'pass', {
        email: doAccount.account?.email,
        droplet_limit: doAccount.account?.droplet_limit,
        status: doAccount.account?.status,
      });
    } catch (err: any) {
      logStep('do_api_connectivity', 'fail', { error: err.message });
      return NextResponse.json(
        { error: 'DigitalOcean API connectivity failed', results },
        { status: 502, headers: API_HEADERS },
      );
    }

    // ── Step 5: Provision test droplet ────────────────────
    const testSlug = body.workspace_slug || `beta-test-${Date.now()}`;
    // Generate a deterministic workspace ID for testing
    const testWorkspaceId = crypto.randomUUID();

    let dropletResult: any;
    try {
      const { DropletFactory } = await import('@/lib/genesis/droplet-factory');
      const factory = new DropletFactory();

      dropletResult = await factory.provisionDroplet({
        workspaceId: testWorkspaceId,
        workspaceSlug: testSlug,
        region: targetRegion,
        sizeSlug: 's-1vcpu-1gb',
      });

      if (!dropletResult.success) {
        throw new Error(dropletResult.error || 'Provisioning returned success=false');
      }

      logStep('droplet_provision', 'pass', {
        droplet_id: dropletResult.dropletId,
        ip_address: dropletResult.ipAddress,
        sslip_domain: dropletResult.sslipDomain,
        account_used: dropletResult.accountUsed,
      });
    } catch (err: any) {
      logStep('droplet_provision', 'fail', { error: err.message });
      return NextResponse.json(
        { error: 'Droplet provisioning failed', results },
        { status: 500, headers: API_HEADERS },
      );
    }

    // ── Step 6: Poll droplet until active ─────────────────
    const dropletIp = dropletResult.ipAddress;
    const dropletId = dropletResult.dropletId;

    try {
      const { data: decryptedToken } = await (supabase.schema('genesis') as any)
        .rpc('decrypt_do_token', { p_account_id: matchedAccount.account_id });

      let attempts = 0;
      const maxAttempts = 30; // 30 × 10s = 5 minutes max
      let dropletActive = false;

      while (attempts < maxAttempts) {
        const resp = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
          headers: { Authorization: `Bearer ${decryptedToken}` },
        });

        if (resp.ok) {
          const { droplet } = await resp.json();
          if (droplet.status === 'active') {
            dropletActive = true;
            // Re-read IP in case it was assigned late
            const pubNet = droplet.networks?.v4?.find((n: any) => n.type === 'public');
            if (pubNet) {
              dropletResult.ipAddress = pubNet.ip_address;
            }
            break;
          }
        }

        attempts++;
        await new Promise(r => setTimeout(r, 10000));
      }

      if (!dropletActive) {
        logStep('droplet_active_wait', 'fail', {
          attempts,
          hint: 'Droplet did not reach "active" status within 5 minutes',
        });
      } else {
        logStep('droplet_active_wait', 'pass', {
          attempts,
          elapsed_s: attempts * 10,
          ip_address: dropletResult.ipAddress,
        });
      }
    } catch (err: any) {
      logStep('droplet_active_wait', 'fail', { error: err.message });
    }

    // ── Step 7: Wait for cloud-init + sidecar health ──────
    if (!body.skip_sidecar_check) {
      const sidecarUrl = `http://${dropletResult.ipAddress}:3100/health`;
      let sidecarUp = false;
      let sidecarAttempts = 0;
      const maxSidecarAttempts = 60; // 60 × 10s = 10 minutes (cloud-init takes time)

      while (sidecarAttempts < maxSidecarAttempts && !sidecarUp) {
        try {
          const resp = await fetch(sidecarUrl, {
            signal: AbortSignal.timeout(5000),
          });
          if (resp.ok) {
            sidecarUp = true;
            const health = await resp.json().catch(() => ({}));
            logStep('sidecar_health', 'pass', {
              url: sidecarUrl,
              attempts: sidecarAttempts,
              elapsed_s: sidecarAttempts * 10,
              response: health,
            });
          }
        } catch {
          // Expected: sidecar not ready yet
        }
        if (!sidecarUp) {
          sidecarAttempts++;
          await new Promise(r => setTimeout(r, 10000));
        }
      }

      if (!sidecarUp) {
        logStep('sidecar_health', 'fail', {
          url: sidecarUrl,
          attempts: sidecarAttempts,
          hint: 'Sidecar did not respond within 10 minutes. Check cloud-init via SSH.',
        });
      }

      // ── Step 8: Check n8n via HTTPS (Caddy) ──────────────
      if (sidecarUp) {
        const n8nDomain = `${dropletResult.ipAddress}.sslip.io`;
        try {
          const resp = await fetch(`https://${n8nDomain}/healthz`, {
            signal: AbortSignal.timeout(10000),
          });
          logStep('n8n_https', resp.ok ? 'pass' : 'fail', {
            url: `https://${n8nDomain}/healthz`,
            status: resp.status,
          });
        } catch (err: any) {
          logStep('n8n_https', 'fail', {
            url: `https://${n8nDomain}/healthz`,
            error: err.message,
            hint: 'Caddy may still be obtaining SSL cert. Try again in a minute.',
          });
        }
      }
    } else {
      logStep('sidecar_health', 'skip', {
        reason: 'skip_sidecar_check=true — cloud-init takes 3-5 min. ' +
          'Use GET /api/admin/droplet-test?droplet_id=X to check later.',
      });
    }

    // ── Summary ───────────────────────────────────────────
    results.timings.total_ms = Date.now() - startTime;
    results.droplet = {
      droplet_id: dropletId,
      ip_address: dropletResult.ipAddress,
      sslip_domain: dropletResult.sslipDomain || `${dropletResult.ipAddress}.sslip.io`,
      workspace_id: testWorkspaceId,
      workspace_slug: testSlug,
      region: targetRegion,
      account_id: matchedAccount.account_id,
    };

    const allPassed = results.steps.every((s: any) => s.status !== 'fail');

    return NextResponse.json(
      {
        success: allPassed,
        message: allPassed
          ? 'Test droplet provisioned successfully!'
          : 'Some verification steps failed — see results for details.',
        results,
      },
      { status: allPassed ? 201 : 207, headers: API_HEADERS },
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
