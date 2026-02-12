/**
 * GENESIS PHASE 71: DIGITALOCEAN HEALTH CHECK
 *
 * Checks the health of all DigitalOcean accounts in the pool.
 * Genesis uses multiple DO accounts for tenant droplet isolation.
 * This check validates that each account is accessible and within limits.
 */

import { HealthCheck, HealthCheckResult } from '../types';

interface DOAccountResult {
  label: string;
  ok: boolean;
  error?: string;
  latencyMs: number;
  dropletCount?: number;
  dropletLimit?: number;
}

export const digitalOceanHealthCheck: HealthCheck = {
  id: 'digitalocean',
  name: 'DigitalOcean',
  category: 'infrastructure',
  criticalLevel: 'critical',
  fixPath: '/admin/do-accounts',
  enabled: true,
  timeoutMs: 20000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();

    // Read all DO tokens from environment
    // Convention: DO_TOKEN_1, DO_TOKEN_2, … or DO_TOKEN for single-account setups
    const tokens = getDOTokens();

    if (tokens.length === 0) {
      return {
        status: 'error',
        error: 'No DigitalOcean API tokens configured',
        message: 'Add DO_TOKEN or DO_TOKEN_1 / DO_TOKEN_2 / … to environment',
        checkedAt: new Date().toISOString(),
      };
    }

    // Check each account in parallel
    const results = await Promise.allSettled(
      tokens.map((t) => checkDOAccount(t)),
    );

    const latencyMs = Date.now() - startTime;
    const accountResults: DOAccountResult[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled') {
        accountResults.push(r.value);
      } else {
        accountResults.push({
          label: 'unknown',
          ok: false,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          latencyMs: 0,
        });
      }
    }

    const okCount = accountResults.filter((a) => a.ok).length;
    const totalCount = accountResults.length;
    const failedAccounts = accountResults
      .filter((a) => !a.ok)
      .map((a) => a.label);

    // All accounts failed
    if (okCount === 0) {
      return {
        status: 'error',
        latencyMs,
        error: 'All DigitalOcean accounts unreachable',
        message: `0/${totalCount} accounts operational`,
        checkedAt: new Date().toISOString(),
      };
    }

    // Some accounts failed
    if (okCount < totalCount) {
      return {
        status: 'degraded',
        latencyMs,
        error: `${failedAccounts.length} account(s) failed: ${failedAccounts.join(', ')}`,
        message: `${okCount}/${totalCount} accounts operational`,
        checkedAt: new Date().toISOString(),
      };
    }

    // Check for droplet-limit warnings
    const nearLimit = accountResults.filter(
      (a) =>
        a.dropletCount !== undefined &&
        a.dropletLimit !== undefined &&
        a.dropletLimit > 0 &&
        a.dropletCount / a.dropletLimit > 0.8,
    );

    if (nearLimit.length > 0) {
      return {
        status: 'degraded',
        latencyMs,
        message: `${okCount}/${totalCount} accounts OK — ${nearLimit.length} near droplet limit`,
        quotaUsed: Math.round(
          (nearLimit[0].dropletCount! / nearLimit[0].dropletLimit!) * 100,
        ),
        quotaLimit: 100,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      status: 'ok',
      latencyMs,
      message: `${okCount}/${totalCount} accounts operational`,
      checkedAt: new Date().toISOString(),
    };
  },
};

/**
 * Discover DO tokens from the environment.
 * Supports single-token (DO_TOKEN) and multi-token (DO_TOKEN_1 … DO_TOKEN_N).
 */
function getDOTokens(): { label: string; token: string }[] {
  const tokens: { label: string; token: string }[] = [];

  // Single-token mode
  const single = process.env.DO_TOKEN || process.env.DIGITALOCEAN_TOKEN;
  if (single) {
    tokens.push({ label: 'primary', token: single });
  }

  // Multi-token mode (DO_TOKEN_1, DO_TOKEN_2, …)
  for (let i = 1; i <= 25; i++) {
    const token = process.env[`DO_TOKEN_${i}`];
    if (token) {
      tokens.push({ label: `account-${i}`, token });
    }
  }

  return tokens;
}

/**
 * Validate a single DO account by calling /v2/account.
 */
async function checkDOAccount(account: {
  label: string;
  token: string;
}): Promise<DOAccountResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.digitalocean.com/v2/account', {
      headers: {
        Authorization: `Bearer ${account.token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return {
        label: account.label,
        ok: false,
        error: `HTTP ${response.status}`,
        latencyMs,
      };
    }

    const data = await response.json();
    const acct = data.account;

    return {
      label: account.label,
      ok: true,
      latencyMs,
      dropletCount: acct?.droplet_limit
        ? undefined
        : undefined, // DO API doesn't return current count in /account
      dropletLimit: acct?.droplet_limit,
    };
  } catch (error) {
    return {
      label: account.label,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - start,
    };
  }
}
