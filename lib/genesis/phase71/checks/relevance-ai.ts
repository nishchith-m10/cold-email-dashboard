/**
 * GENESIS PHASE 71: RELEVANCE AI HEALTH CHECK
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const relevanceAIHealthCheck: HealthCheck = {
  id: 'relevance_ai',
  name: 'Relevance AI',
  category: 'ai',
  criticalLevel: 'high',
  fixPath: '/settings/api-keys#relevance',
  enabled: true,
  timeoutMs: 10000,
  
  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const apiKey = process.env.RELEVANCE_API_KEY;
    const region = process.env.RELEVANCE_API_REGION || 'api-bcbe5c';

    if (!apiKey) {
      return {
        status: 'error',
        error: 'Relevance AI API key not configured',
        message: 'Add RELEVANCE_API_KEY to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // Test with agents list endpoint
      const response = await fetch(`https://${region}.relevanceai.com/v1/agents`, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
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
            message: 'Relevance AI API key is invalid',
            checkedAt: new Date().toISOString(),
          };
        }

        if (response.status === 403) {
          return {
            status: 'error',
            latencyMs,
            error: 'API key lacks permissions',
            message: 'Relevance AI API key does not have required permissions',
            checkedAt: new Date().toISOString(),
          };
        }

        if (response.status === 429) {
          return {
            status: 'degraded',
            latencyMs,
            error: 'Rate limit exceeded',
            message: 'Relevance AI rate limit hit',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'degraded',
          latencyMs,
          error: `HTTP ${response.status}`,
          message: `Relevance AI API returned ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const data = await response.json();
      const agentsCount = Array.isArray(data) ? data.length : 0;

      if (latencyMs > 5000) {
        return {
          status: 'degraded',
          latencyMs,
          message: `High latency (${latencyMs}ms), ${agentsCount} agent(s) available`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        message: `API key valid, ${agentsCount} agent(s) configured`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Relevance AI did not respond within timeout',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to Relevance AI',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
