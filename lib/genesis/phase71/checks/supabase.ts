/**
 * GENESIS PHASE 71: SUPABASE HEALTH CHECK
 *
 * Validates that Supabase is reachable and the database is responsive.
 * This is CRITICAL — Supabase down means total system failure.
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const supabaseHealthCheck: HealthCheck = {
  id: 'supabase',
  name: 'Supabase',
  category: 'infrastructure',
  criticalLevel: 'critical',
  fixPath: '/admin/database',
  enabled: true,
  timeoutMs: 10000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return {
        status: 'error',
        error: 'Supabase URL not configured',
        message: 'Add NEXT_PUBLIC_SUPABASE_URL to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    if (!supabaseKey) {
      return {
        status: 'error',
        error: 'Supabase API key not configured',
        message: 'Add SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // Supabase REST endpoint — lightweight query
      const response = await fetch(
        `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`,
        {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return {
            status: 'error',
            latencyMs,
            error: 'Authentication failed',
            message: 'Supabase API key is invalid or expired',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'error',
          latencyMs,
          error: `HTTP ${response.status}`,
          message: `Supabase returned ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      // Database is reachable — check latency health
      if (latencyMs > 2000) {
        return {
          status: 'degraded',
          latencyMs,
          message: `Database slow (${latencyMs}ms) — possible performance issue`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        message: `Database responsive (${latencyMs}ms)`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Supabase did not respond — possible outage',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Supabase',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
