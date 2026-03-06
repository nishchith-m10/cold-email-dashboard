/**
 * GENESIS PHASE 71: STRIPE HEALTH CHECK
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const stripeHealthCheck: HealthCheck = {
  id: 'stripe',
  name: 'Stripe',
  category: 'integration',
  criticalLevel: 'high',
  fixPath: 'https://dashboard.stripe.com/apikeys',
  enabled: true,
  timeoutMs: 10000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return {
        status: 'error',
        error: 'Stripe secret key not configured',
        message: 'Add STRIPE_SECRET_KEY to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${secretKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.status === 401) {
        return {
          status: 'error',
          latencyMs,
          error: 'Invalid API key',
          message: 'Stripe secret key is invalid or revoked',
          checkedAt: new Date().toISOString(),
        };
      }

      if (!response.ok) {
        return {
          status: 'error',
          latencyMs,
          error: `HTTP ${response.status}`,
          message: `Stripe API returned ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        message: 'Stripe API reachable and key valid',
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Stripe API did not respond within timeout',
          checkedAt: new Date().toISOString(),
        };
      }
      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Stripe API',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
