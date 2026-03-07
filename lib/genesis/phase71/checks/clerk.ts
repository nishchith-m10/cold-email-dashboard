/**
 * GENESIS PHASE 71: CLERK HEALTH CHECK
 *
 * Validates that Clerk authentication service is reachable and configured.
 * CRITICAL — Clerk down means no user can sign in.
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const clerkHealthCheck: HealthCheck = {
  id: 'clerk',
  name: 'Clerk Auth',
  category: 'infrastructure',
  criticalLevel: 'critical',
  fixPath: '/admin/api-health/fix/clerk',
  enabled: true,
  timeoutMs: 10000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      return {
        status: 'error',
        error: 'Clerk secret key not configured',
        message: 'Add CLERK_SECRET_KEY to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://api.clerk.com/v1/clients', {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.status === 401 || response.status === 403) {
        return {
          status: 'error',
          latencyMs,
          error: 'Authentication failed',
          message: 'Clerk secret key is invalid or expired',
          checkedAt: new Date().toISOString(),
        };
      }

      if (!response.ok && response.status !== 400) {
        return {
          status: 'error',
          latencyMs,
          error: `HTTP ${response.status}`,
          message: `Clerk API returned ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      if (latencyMs > 3000) {
        return {
          status: 'degraded',
          latencyMs,
          message: `Clerk slow (${latencyMs}ms) — possible latency issue`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        message: `Clerk responsive (${latencyMs}ms)`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Clerk did not respond — possible outage',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Clerk',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
