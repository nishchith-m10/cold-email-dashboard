/**
 * ADMIN: DigitalOcean Account Pool Management
 *
 * GET  /api/admin/do-accounts          — List all accounts with capacity info
 * POST /api/admin/do-accounts          — Register a new DO account (encrypts token, stores in DB)
 * PATCH /api/admin/do-accounts         — Update account settings (region, limits, status)
 * DELETE /api/admin/do-accounts        — Deactivate an account
 *
 * Auth: Super Admin only (Clerk + SUPER_ADMIN_IDS)
 *
 * The DropletFactory reads DO API tokens from genesis.do_accounts where
 * they are encrypted via pgcrypto (AES-256-GCM) using INTERNAL_ENCRYPTION_KEY.
 * This is the ONLY supported way to register DO accounts — the factory does
 * NOT read from a DO_API_TOKEN env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG
// ============================================

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const VALID_STATUSES = ['active', 'full', 'suspended', 'maintenance'] as const;
type AccountStatus = (typeof VALID_STATUSES)[number];

const VALID_REGIONS = [
  'nyc1', 'nyc3', 'sfo3', 'tor1',      // North America
  'lon1', 'ams3', 'fra1',               // Europe
  'sgp1', 'blr1', 'syd1',               // Asia-Pacific
] as const;

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

// ============================================
// HELPERS
// ============================================

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
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS },
      ),
    };
  }

  if (!SUPER_ADMIN_IDS.includes(userId)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS },
      ),
    };
  }

  return { authorized: true, userId };
}

/**
 * Set the pgcrypto encryption key in the current Supabase session
 * so genesis.encrypt_do_token() / genesis.decrypt_do_token() work.
 */
async function setEncryptionKey(supabase: any) {
  const key = process.env.INTERNAL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('INTERNAL_ENCRYPTION_KEY is not configured');
  }
  await (supabase as any).rpc('set_config', {
    setting_name: 'app.encryption_key',
    setting_value: key,
  });
}

// ============================================
// GET — List all DO accounts
// ============================================

export async function GET(_req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = getSupabase();

    // Use the account_pool_health view for a rich summary
    const { data, error } = await (supabase.schema('genesis') as any)
      .from('account_pool_health')
      .select('*');

    if (error) {
      console.error('[DO Accounts] List failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: error.message },
        { status: 500, headers: API_HEADERS },
      );
    }

    // Also compute fleet-wide totals
    const totals = (data || []).reduce(
      (acc: any, row: any) => {
        acc.total_accounts += 1;
        acc.total_droplets += row.current_droplets || 0;
        acc.total_capacity += row.max_droplets || 0;
        acc.active_accounts += row.status === 'active' ? 1 : 0;
        return acc;
      },
      { total_accounts: 0, total_droplets: 0, total_capacity: 0, active_accounts: 0 },
    );

    return NextResponse.json(
      {
        accounts: data || [],
        totals,
      },
      { headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[DO Accounts] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}

// ============================================
// POST — Register a new DO account
// ============================================

interface RegisterAccountPayload {
  account_id: string;          // e.g. "genesis-do-pool-us-east-01"
  api_token: string;           // Plaintext dop_v1_... (encrypted before storage)
  region: string;              // e.g. "nyc1"
  max_droplets: number;        // Account limit, e.g. 25
  billing_email?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (!authResult.authorized) return authResult.response;

  try {
    const body: RegisterAccountPayload = await req.json();

    // ── Validate ──────────────────────────────────────────
    const errors: string[] = [];

    if (!body.account_id || typeof body.account_id !== 'string') {
      errors.push('account_id is required (e.g. "genesis-do-pool-us-east-01")');
    }
    if (!body.api_token || typeof body.api_token !== 'string') {
      errors.push('api_token is required');
    } else if (!body.api_token.startsWith('dop_v1_')) {
      errors.push('api_token must start with "dop_v1_" (DigitalOcean personal access token format)');
    }
    if (!body.region || !VALID_REGIONS.includes(body.region as any)) {
      errors.push(`region must be one of: ${VALID_REGIONS.join(', ')}`);
    }
    if (!body.max_droplets || body.max_droplets < 1 || body.max_droplets > 10000) {
      errors.push('max_droplets must be between 1 and 10000');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400, headers: API_HEADERS },
      );
    }

    // ── Validate token against DO API ─────────────────────
    // Quick sanity check: call /v2/account to verify the token works
    let doAccountInfo: any = null;
    try {
      const resp = await fetch('https://api.digitalocean.com/v2/account', {
        headers: { Authorization: `Bearer ${body.api_token}` },
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: 'DigitalOcean API token validation failed',
            details: errBody.message || `HTTP ${resp.status}`,
          },
          { status: 422, headers: API_HEADERS },
        );
      }
      doAccountInfo = await resp.json();
    } catch (fetchErr) {
      return NextResponse.json(
        { error: 'Could not reach DigitalOcean API to validate token' },
        { status: 502, headers: API_HEADERS },
      );
    }

    // ── Encrypt token and insert ──────────────────────────
    const supabase = getSupabase();
    await setEncryptionKey(supabase);

    // Use the genesis.encrypt_do_token() function
    const { data: encryptedToken, error: encryptErr } = await (supabase.schema('genesis') as any)
      .rpc('encrypt_do_token', { p_plaintext_token: body.api_token });

    if (encryptErr || !encryptedToken) {
      console.error('[DO Accounts] Encryption failed:', encryptErr);
      return NextResponse.json(
        { error: 'Failed to encrypt API token', details: encryptErr?.message },
        { status: 500, headers: API_HEADERS },
      );
    }

    // Insert into genesis.do_accounts
    const { data: inserted, error: insertErr } = await (supabase.schema('genesis') as any)
      .from('do_accounts')
      .insert({
        account_id: body.account_id,
        api_token_encrypted: encryptedToken,
        region: body.region,
        max_droplets: body.max_droplets,
        current_droplets: 0,
        status: 'active',
        billing_email: body.billing_email || null,
        notes: body.notes || null,
      })
      .select('account_id, region, max_droplets, status, created_at')
      .single();

    if (insertErr) {
      // Check for duplicate
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: `Account "${body.account_id}" already exists` },
          { status: 409, headers: API_HEADERS },
        );
      }
      console.error('[DO Accounts] Insert failed:', insertErr);
      return NextResponse.json(
        { error: 'Failed to register account', details: insertErr.message },
        { status: 500, headers: API_HEADERS },
      );
    }

    console.log(
      `[DO Accounts] Registered account "${body.account_id}" in region ${body.region} ` +
      `(max: ${body.max_droplets}, DO email: ${doAccountInfo?.account?.email || 'unknown'})`,
    );

    return NextResponse.json(
      {
        success: true,
        account: inserted,
        do_account_email: doAccountInfo?.account?.email,
        droplet_limit: doAccountInfo?.account?.droplet_limit,
      },
      { status: 201, headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[DO Accounts] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}

// ============================================
// PATCH — Update account settings
// ============================================

interface UpdateAccountPayload {
  account_id: string;
  max_droplets?: number;
  status?: AccountStatus;
  region?: string;
  billing_email?: string;
  notes?: string;
  api_token?: string;           // Optional: rotate token
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (!authResult.authorized) return authResult.response;

  try {
    const body: UpdateAccountPayload = await req.json();

    if (!body.account_id) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400, headers: API_HEADERS },
      );
    }

    // Build update object
    const updates: Record<string, any> = {};

    if (body.max_droplets !== undefined) {
      if (body.max_droplets < 1 || body.max_droplets > 10000) {
        return NextResponse.json(
          { error: 'max_droplets must be between 1 and 10000' },
          { status: 400, headers: API_HEADERS },
        );
      }
      updates.max_droplets = body.max_droplets;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400, headers: API_HEADERS },
        );
      }
      updates.status = body.status;
    }

    if (body.region !== undefined) {
      if (!VALID_REGIONS.includes(body.region as any)) {
        return NextResponse.json(
          { error: `region must be one of: ${VALID_REGIONS.join(', ')}` },
          { status: 400, headers: API_HEADERS },
        );
      }
      updates.region = body.region;
    }

    if (body.billing_email !== undefined) updates.billing_email = body.billing_email;
    if (body.notes !== undefined) updates.notes = body.notes;

    // Handle API token rotation
    if (body.api_token) {
      if (!body.api_token.startsWith('dop_v1_')) {
        return NextResponse.json(
          { error: 'api_token must start with "dop_v1_"' },
          { status: 400, headers: API_HEADERS },
        );
      }

      // Validate new token against DO API
      const resp = await fetch('https://api.digitalocean.com/v2/account', {
        headers: { Authorization: `Bearer ${body.api_token}` },
      });
      if (!resp.ok) {
        return NextResponse.json(
          { error: 'New API token validation failed against DigitalOcean API' },
          { status: 422, headers: API_HEADERS },
        );
      }

      const supabase = getSupabase();
      await setEncryptionKey(supabase);

      const { data: encryptedToken, error: encryptErr } = await (supabase.schema('genesis') as any)
        .rpc('encrypt_do_token', { p_plaintext_token: body.api_token });

      if (encryptErr || !encryptedToken) {
        return NextResponse.json(
          { error: 'Failed to encrypt new API token' },
          { status: 500, headers: API_HEADERS },
        );
      }

      updates.api_token_encrypted = encryptedToken;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400, headers: API_HEADERS },
      );
    }

    const supabase = getSupabase();

    const { data, error } = await (supabase.schema('genesis') as any)
      .from('do_accounts')
      .update(updates)
      .eq('account_id', body.account_id)
      .select('account_id, region, max_droplets, current_droplets, status, notes')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: `Account "${body.account_id}" not found` },
          { status: 404, headers: API_HEADERS },
        );
      }
      console.error('[DO Accounts] Update failed:', error);
      return NextResponse.json(
        { error: 'Failed to update account', details: error.message },
        { status: 500, headers: API_HEADERS },
      );
    }

    console.log(`[DO Accounts] Updated account "${body.account_id}":`, updates);

    return NextResponse.json(
      { success: true, account: data },
      { headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[DO Accounts] PATCH error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}

// ============================================
// DELETE — Deactivate an account
// ============================================

export async function DELETE(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json(
        { error: 'account_id query parameter is required' },
        { status: 400, headers: API_HEADERS },
      );
    }

    const supabase = getSupabase();

    // Check if account has active droplets
    const { data: account, error: fetchErr } = await (supabase.schema('genesis') as any)
      .from('do_accounts')
      .select('account_id, current_droplets, status')
      .eq('account_id', accountId)
      .single();

    if (fetchErr || !account) {
      return NextResponse.json(
        { error: `Account "${accountId}" not found` },
        { status: 404, headers: API_HEADERS },
      );
    }

    if (account.current_droplets > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate account with ${account.current_droplets} active droplet(s). ` +
            'Terminate or migrate droplets first.',
        },
        { status: 409, headers: API_HEADERS },
      );
    }

    // Set status to suspended (soft-delete, preserves audit trail)
    const { error: updateErr } = await (supabase.schema('genesis') as any)
      .from('do_accounts')
      .update({ status: 'suspended' })
      .eq('account_id', accountId);

    if (updateErr) {
      console.error('[DO Accounts] Deactivate failed:', updateErr);
      return NextResponse.json(
        { error: 'Failed to deactivate account', details: updateErr.message },
        { status: 500, headers: API_HEADERS },
      );
    }

    console.log(`[DO Accounts] Deactivated account "${accountId}"`);

    return NextResponse.json(
      { success: true, account_id: accountId, status: 'suspended' },
      { headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[DO Accounts] DELETE error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}
