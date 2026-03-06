/**
 * GENESIS PHASE 71: RESEND HEALTH CHECK
 * Used for platform transactional emails (invites, alerts, etc.)
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const resendHealthCheck: HealthCheck = {
  id: 'resend',
  name: 'Resend (Platform Email)',
  category: 'email',
  criticalLevel: 'high',
  fixPath: '/settings/api-keys#resend',
  enabled: true,
  timeoutMs: 10000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return {
        status: 'error',
        error: 'Resend API key not configured',
        message: 'Add RESEND_API_KEY to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // Lightweight list-domains call — doesn't send email, just validates key
      const response = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.status === 401 || response.status === 403) {
        return {
          status: 'error',
          latencyMs,
          error: 'Invalid API key',
          message: 'Resend API key is invalid or expired',
          checkedAt: new Date().toISOString(),
        };
      }

      if (!response.ok) {
        return {
          status: 'error',
          latencyMs,
          error: `HTTP ${response.status}`,
          message: `Resend API returned ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        message: 'Resend API reachable and key valid',
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Resend API did not respond within timeout',
          checkedAt: new Date().toISOString(),
        };
      }
      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Resend API',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
