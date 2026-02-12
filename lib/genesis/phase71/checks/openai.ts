/**
 * GENESIS PHASE 71: OPENAI HEALTH CHECK
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const openAIHealthCheck: HealthCheck = {
  id: 'openai',
  name: 'OpenAI',
  category: 'ai',
  criticalLevel: 'critical',
  fixPath: '/settings/api-keys#openai',
  enabled: true,
  timeoutMs: 10000,
  
  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        status: 'error',
        error: 'OpenAI API key not configured',
        message: 'Add OPENAI_API_KEY to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      // Test with models endpoint (lightweight, doesn't consume quota)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

        if (response.status === 401) {
          return {
            status: 'error',
            latencyMs,
            error: 'Invalid API key',
            message: 'OpenAI API key is invalid or expired',
            checkedAt: new Date().toISOString(),
          };
        }

        if (response.status === 429) {
          return {
            status: 'degraded',
            latencyMs,
            error: 'Rate limit exceeded',
            message: 'OpenAI rate limit hit - requests may be delayed',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'error',
          latencyMs,
          error: errorMessage,
          message: `OpenAI API error: ${errorMessage}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const data = await response.json();

      // Check if GPT-4 is available (critical model)
      const hasGPT4 = data.data?.some((model: any) => 
        model.id.includes('gpt-4') || model.id.includes('gpt-4-turbo')
      );

      if (!hasGPT4) {
        return {
          status: 'degraded',
          latencyMs,
          message: 'GPT-4 models not available (using fallback models)',
          checkedAt: new Date().toISOString(),
        };
      }

      // Extract rate limit info from headers
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining-requests');
      const rateLimitLimit = response.headers.get('x-ratelimit-limit-requests');

      let quotaUsed: number | undefined;
      let quotaLimit: number | undefined;

      if (rateLimitRemaining && rateLimitLimit) {
        const remaining = parseInt(rateLimitRemaining, 10);
        const limit = parseInt(rateLimitLimit, 10);
        quotaUsed = ((limit - remaining) / limit) * 100;
        quotaLimit = 100;
      }

      // Warn if latency is high
      if (latencyMs > 5000) {
        return {
          status: 'degraded',
          latencyMs,
          quotaUsed,
          quotaLimit,
          message: `High latency (${latencyMs}ms) - OpenAI may be experiencing issues`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        quotaUsed,
        quotaLimit,
        message: `API key valid, ${data.data?.length || 0} models available`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'OpenAI API did not respond within timeout',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to OpenAI API',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
