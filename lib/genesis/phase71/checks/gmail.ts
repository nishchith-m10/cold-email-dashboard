/**
 * GENESIS PHASE 71: GMAIL OAUTH HEALTH CHECK
 *
 * Validates that Gmail OAuth tokens are valid and not about to expire.
 * This is a critical check — if Gmail auth is broken, no emails can be sent.
 */

import { HealthCheck, HealthCheckResult } from '../types';

export const gmailHealthCheck: HealthCheck = {
  id: 'gmail',
  name: 'Gmail OAuth',
  category: 'email',
  criticalLevel: 'critical',
  fixPath: '/settings/email#gmail',
  enabled: true,
  timeoutMs: 10000,

  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    const clientId = process.env.GMAIL_CLIENT_ID;

    // Check if OAuth is configured at all
    if (!clientId) {
      return {
        status: 'error',
        error: 'Gmail OAuth not configured',
        message: 'Add GMAIL_CLIENT_ID to environment variables',
        checkedAt: new Date().toISOString(),
      };
    }

    if (!refreshToken && !accessToken) {
      return {
        status: 'error',
        error: 'Gmail OAuth tokens missing',
        message: 'Connect Gmail account in Settings > Email',
        checkedAt: new Date().toISOString(),
      };
    }

    // If we only have a refresh token, we can't test directly without
    // performing a token exchange — report as OK with advisory
    if (!accessToken && refreshToken) {
      return {
        status: 'ok',
        message: 'Refresh token present (access token will be exchanged on demand)',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // Validate token with Google tokeninfo endpoint
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
        { signal: controller.signal },
      );

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        // Token is invalid or expired
        if (refreshToken) {
          return {
            status: 'degraded',
            latencyMs,
            error: 'Access token expired',
            message:
              'Access token expired but refresh token exists — will auto-refresh',
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          status: 'error',
          latencyMs,
          error: 'OAuth token invalid',
          message: 'Gmail OAuth token is invalid — reconnect in Settings',
          checkedAt: new Date().toISOString(),
        };
      }

      const tokenInfo = await response.json();

      // Check token expiry
      const expiresInSeconds = parseInt(tokenInfo.expires_in || '0', 10);
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      const daysUntilExpiry = Math.floor(expiresInSeconds / (60 * 60 * 24));

      // Check if the required scopes are present
      const scopes = (tokenInfo.scope || '').split(' ');
      const hasGmailSend = scopes.some(
        (s: string) =>
          s.includes('gmail.send') || s.includes('gmail.compose') || s.includes('mail.google.com'),
      );

      if (!hasGmailSend) {
        return {
          status: 'degraded',
          latencyMs,
          error: 'Missing Gmail send scope',
          message: 'OAuth token lacks gmail.send scope — reconnect with correct permissions',
          expiresAt,
          checkedAt: new Date().toISOString(),
        };
      }

      // Warn if token expires within 7 days (and no refresh token)
      if (daysUntilExpiry < 7 && !refreshToken) {
        return {
          status: 'degraded',
          latencyMs,
          message: `Token expires in ${daysUntilExpiry} day(s) — no refresh token available`,
          expiresAt,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        latencyMs,
        message: `Token valid${expiresInSeconds > 0 ? `, expires in ${daysUntilExpiry}d` : ''}`,
        expiresAt,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          latencyMs,
          error: 'Request timeout',
          message: 'Google token validation did not respond in time',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to validate Gmail OAuth token',
        checkedAt: new Date().toISOString(),
      };
    }
  },
};
