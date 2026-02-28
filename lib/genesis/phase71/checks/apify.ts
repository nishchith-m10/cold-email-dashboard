/**
 * GENESIS PHASE 71: APIFY HEALTH CHECK
 *
 * Apify is used exclusively for the Google Maps Reviews Scraper
 * (compass~google-maps-reviews-scraper actor) inside n8n workflows.
 * It fetches 1-3 star Google Maps reviews for target companies to
 * personalise outreach. This is NOT a B2B lead scraper.
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const apifyHealthCheck: HealthCheck = {
  id: 'apify',
  name: 'Apify (Google Maps Reviews)',
  category: 'integration',
  criticalLevel: 'high',
  fixPath: '/settings/api-keys#apify',
  enabled: true,
  timeoutMs: 15000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const apiKey = process.env.APIFY_API_KEY;

    if (!apiKey) {
      return {
        status: 'error',
        error: 'Apify API key not configured',
        message: 'Add APIFY_API_KEY to environment variables (used for Google Maps Reviews scraper in n8n)',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('https://api.apify.com/v2/users/me', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 401) {
          return {
            status: 'error',
            latencyMs,
            error: 'Invalid API key',
            message: 'Apify API key is invalid',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'error',
          latencyMs,
          error: `HTTP ${response.status}`,
          message: `Apify API returned ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const data = await response.json();
      const plan = data.data?.plan;
      const usage = data.data?.usage;

      // Calculate quota
      let quotaUsed: number | undefined;
      let quotaLimit: number | undefined;

      if (usage && plan) {
        const cuUsed = usage.computeUnitsUsed ?? 0;
        const cuLimit = plan.monthlyUsageCreditsUsd ?? plan.computeUnits ?? 100;
        if (cuLimit > 0) {
          quotaUsed = Math.round((cuUsed / cuLimit) * 100);
          quotaLimit = 100;
        }
      }

      // Warn if quota above 90%
      if (quotaUsed !== undefined && quotaUsed > 90) {
        return {
          status: 'degraded',
          latencyMs,
          quotaUsed,
          quotaLimit,
          message: `Quota nearly exhausted (${quotaUsed}% used)`,
          checkedAt: new Date().toISOString(),
        };
      }

      if (latencyMs > 5000) {
        return {
          status: 'degraded',
          latencyMs,
          quotaUsed,
          quotaLimit,
          message: `High latency (${latencyMs}ms)`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        quotaUsed,
        quotaLimit,
        message: `API key valid${quotaUsed !== undefined ? `, ${quotaUsed}% quota used` : ''}`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Apify API did not respond within timeout',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Apify API',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
