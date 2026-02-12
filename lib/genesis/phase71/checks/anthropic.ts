/**
 * GENESIS PHASE 71: ANTHROPIC/CLAUDE HEALTH CHECK
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const anthropicHealthCheck: HealthCheck = {
  id: 'anthropic',
  name: 'Claude (Anthropic)',
  category: 'ai',
  criticalLevel: 'high',
  fixPath: '/settings/api-keys#anthropic',
  enabled: true,
  timeoutMs: 10000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        status: 'error',
        error: 'Anthropic API key not configured',
        message: 'Add ANTHROPIC_API_KEY to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // Use a minimal messages request to verify auth without consuming significant tokens
      // We intentionally use max_tokens=1 to minimise cost
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message || `HTTP ${response.status}`;

        if (response.status === 401) {
          return {
            status: 'error',
            latencyMs,
            error: 'Invalid API key',
            message: 'Anthropic API key is invalid or expired',
            checkedAt: new Date().toISOString(),
          };
        }

        if (response.status === 429) {
          return {
            status: 'degraded',
            latencyMs,
            error: 'Rate limit exceeded',
            message: 'Anthropic rate limit hit — requests may be delayed',
            checkedAt: new Date().toISOString(),
          };
        }

        if (response.status === 529) {
          return {
            status: 'degraded',
            latencyMs,
            error: 'API overloaded',
            message: 'Anthropic API is temporarily overloaded',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'error',
          latencyMs,
          error: errorMessage,
          message: `Anthropic API error: ${errorMessage}`,
          checkedAt: new Date().toISOString(),
        };
      }

      // Extract rate-limit headers
      const rateLimitRemaining = response.headers.get(
        'anthropic-ratelimit-requests-remaining',
      );
      const rateLimitLimit = response.headers.get(
        'anthropic-ratelimit-requests-limit',
      );

      let quotaUsed: number | undefined;
      let quotaLimit: number | undefined;

      if (rateLimitRemaining && rateLimitLimit) {
        const remaining = parseInt(rateLimitRemaining, 10);
        const limit = parseInt(rateLimitLimit, 10);
        if (limit > 0) {
          quotaUsed = Math.round(((limit - remaining) / limit) * 100);
          quotaLimit = 100;
        }
      }

      if (latencyMs > 5000) {
        return {
          status: 'degraded',
          latencyMs,
          quotaUsed,
          quotaLimit,
          message: `High latency (${latencyMs}ms) — Anthropic may be slow`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        quotaUsed,
        quotaLimit,
        message: 'API key valid, Claude available',
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Anthropic API did not respond within timeout',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Anthropic API',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
