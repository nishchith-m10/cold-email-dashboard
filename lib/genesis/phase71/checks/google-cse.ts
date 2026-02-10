/**
 * GENESIS PHASE 71: GOOGLE CUSTOM SEARCH ENGINE HEALTH CHECK
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const googleCSEHealthCheck: HealthCheck = {
  id: 'google_cse',
  name: 'Google CSE',
  category: 'integration',
  criticalLevel: 'medium',
  fixPath: '/settings/api-keys#google-cse',
  enabled: true,
  timeoutMs: 10000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    if (!apiKey) {
      return {
        status: 'error',
        error: 'Google CSE API key not configured',
        message: 'Add GOOGLE_CSE_API_KEY to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    if (!cseId) {
      return {
        status: 'error',
        error: 'Google CSE ID not configured',
        message: 'Add GOOGLE_CSE_ID to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // Perform a lightweight search to validate credentials
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cseId);
      url.searchParams.set('q', 'health check test');
      url.searchParams.set('num', '1');

      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message || `HTTP ${response.status}`;

        if (response.status === 400 || response.status === 403) {
          return {
            status: 'error',
            latencyMs,
            error: errorMessage,
            message: 'Google CSE credentials invalid or API not enabled',
            checkedAt: new Date().toISOString(),
          };
        }

        if (response.status === 429) {
          return {
            status: 'degraded',
            latencyMs,
            error: 'Quota exceeded',
            message: 'Google CSE daily query limit reached',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'error',
          latencyMs,
          error: errorMessage,
          message: `Google CSE error: ${errorMessage}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const data = await response.json();
      const totalResults = parseInt(
        data.searchInformation?.totalResults || '0',
        10,
      );

      // Extract quota from response
      const queriesRemaining = data.queries?.request?.[0]?.totalResults;

      if (latencyMs > 5000) {
        return {
          status: 'degraded',
          latencyMs,
          message: `High latency (${latencyMs}ms)`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        message: `API key valid, search returned ${totalResults} results`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Google CSE did not respond within timeout',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Google CSE',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
