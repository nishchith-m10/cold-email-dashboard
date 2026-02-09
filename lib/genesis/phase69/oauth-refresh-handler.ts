/**
 * PHASE 69: OAUTH REFRESH HANDLER
 * 
 * Handles OAuth token refresh for Gmail and Google Sheets credentials.
 * Communicates with Google OAuth 2.0 API to exchange refresh tokens for new access tokens.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.1
 */

import type {
  OAuthRefreshResponse,
  OAuthFailureType,
  CredentialRotationResult,
} from './types';

// ============================================
// GOOGLE OAUTH CONFIGURATION
// ============================================

/**
 * Google OAuth 2.0 token endpoint
 */
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * OAuth client credentials from environment
 * These should be from a Google Cloud Project with Gmail and Sheets APIs enabled
 */
function getOAuthClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in environment');
  }

  return { clientId, clientSecret };
}

// ============================================
// OAUTH TOKEN REFRESH
// ============================================

/**
 * Refresh an OAuth access token using a refresh token.
 * 
 * Exchanges the refresh token with Google OAuth 2.0 API to get a new access token.
 * Sometimes Google returns a new refresh token as well.
 * 
 * @param refreshToken - OAuth refresh token (decrypted)
 * @returns OAuth refresh response with new tokens
 * @throws Error with specific failure type for proper error handling
 * 
 * @example
 * try {
 *   const newTokens = await refreshOAuthToken(credential.refreshToken);
 *   // Save newTokens.access_token and calculate new expiry
 * } catch (error: any) {
 *   if (error.failureType === 'revoked_consent') {
 *     // User revoked OAuth access - notify them to reconnect
 *   }
 * }
 */
export async function refreshOAuthToken(refreshToken: string): Promise<OAuthRefreshResponse> {
  const startTime = Date.now();

  try {
    const { clientId, clientSecret } = getOAuthClientCredentials();

    // Prepare request body
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    // Call Google OAuth API
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseText = await response.text();
    const executionTimeMs = Date.now() - startTime;

    // Parse response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      throw createRefreshError(
        'unknown',
        `Invalid JSON response from Google: ${responseText}`,
        executionTimeMs
      );
    }

    // Handle successful response (200 OK)
    if (response.ok) {
      return {
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token, // May be undefined
        expires_in: responseData.expires_in,
        scope: responseData.scope,
        token_type: responseData.token_type,
      };
    }

    // Handle error responses
    const errorType = classifyOAuthError(response.status, responseData);
    const errorMessage = responseData.error_description || responseData.error || 'Unknown OAuth error';

    throw createRefreshError(errorType, errorMessage, executionTimeMs);

  } catch (error: any) {
    // If already a RefreshError, rethrow
    if (error.failureType) {
      throw error;
    }

    // Network errors, timeouts, etc.
    const executionTimeMs = Date.now() - startTime;

    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      throw createRefreshError('network_error', 'Request timeout', executionTimeMs);
    }

    throw createRefreshError('network_error', error.message, executionTimeMs);
  }
}

/**
 * Classify OAuth error based on HTTP status and error response.
 * 
 * @param status - HTTP status code
 * @param responseData - Parsed JSON response
 * @returns Failure type classification
 */
function classifyOAuthError(status: number, responseData: any): OAuthFailureType {
  const errorCode = responseData.error;

  // Revoked consent or invalid refresh token
  if (status === 400) {
    if (errorCode === 'invalid_grant') {
      // Could be expired refresh token or revoked consent
      return 'revoked_consent'; // Treat as revoked (user must re-auth)
    }
    if (errorCode === 'invalid_client') {
      return 'unknown'; // Configuration issue
    }
  }

  // Rate limiting
  if (status === 429) {
    return 'rate_limit';
  }

  // Server errors (5xx)
  if (status >= 500) {
    return 'network_error'; // Retryable
  }

  // Unknown 4xx errors
  if (status >= 400 && status < 500) {
    return 'revoked_consent'; // Assume user action needed
  }

  return 'unknown';
}

/**
 * Create a typed refresh error.
 */
function createRefreshError(
  failureType: OAuthFailureType,
  message: string,
  executionTimeMs: number
): Error & { failureType: OAuthFailureType; executionTimeMs: number } {
  const error = new Error(message) as any;
  error.failureType = failureType;
  error.executionTimeMs = executionTimeMs;
  return error;
}

// ============================================
// CREDENTIAL ROTATION WITH RETRY
// ============================================

/**
 * Rotate a credential with automatic retry logic.
 * 
 * Attempts to refresh the OAuth token with exponential backoff on retryable errors.
 * 
 * @param credentialId - Credential UUID
 * @param refreshToken - Current refresh token (decrypted)
 * @param maxRetries - Maximum retry attempts for retryable errors (default 3)
 * @returns Rotation result
 * 
 * @example
 * const result = await rotateCredentialWithRetry(
 *   'credential-uuid',
 *   decryptedRefreshToken,
 *   3
 * );
 * 
 * if (!result.success) {
 *   console.error('Rotation failed:', result.error);
 *   if (!result.error.retryable) {
 *     // Notify user to reconnect
 *   }
 * }
 */
export async function rotateCredentialWithRetry(
  credentialId: string,
  refreshToken: string,
  maxRetries: number = 3
): Promise<CredentialRotationResult> {
  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Attempt refresh
      const tokens = await refreshOAuthToken(refreshToken);

      // Success!
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      return {
        success: true,
        credentialId,
        newExpiresAt: expiresAt,
        executionTimeMs: Date.now() - startTime,
      };

    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = error.failureType === 'network_error' || error.failureType === 'rate_limit';

      if (!isRetryable) {
        // Non-retryable error - fail immediately
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted - return failure
  return {
    success: false,
    credentialId,
    error: {
      type: lastError?.failureType || 'unknown',
      message: lastError?.message || 'Unknown error',
      retryable: lastError?.failureType === 'network_error' || lastError?.failureType === 'rate_limit',
    },
    executionTimeMs: Date.now() - startTime,
  };
}

// ============================================
// CREDENTIAL EXTRACTION
// ============================================

/**
 * Extract refresh token from encrypted credential value.
 * 
 * Assumes credential value is JSON: { access_token, refresh_token, ... }
 * 
 * @param decryptedValue - Decrypted credential value
 * @returns Refresh token
 * @throws Error if refresh token not found
 */
export function extractRefreshToken(decryptedValue: string): string {
  try {
    const parsed = JSON.parse(decryptedValue);
    
    if (!parsed.refresh_token) {
      throw new Error('No refresh_token found in credential value');
    }

    return parsed.refresh_token;
  } catch (error: any) {
    throw new Error(`Failed to extract refresh token: ${error.message}`);
  }
}

/**
 * Build updated credential value with new tokens.
 * 
 * Preserves existing fields and updates access_token/refresh_token/expires_in.
 * 
 * @param oldValue - Old decrypted credential value (JSON string)
 * @param newTokens - New tokens from OAuth refresh
 * @returns Updated credential value (JSON string)
 */
export function buildUpdatedCredentialValue(
  oldValue: string,
  newTokens: OAuthRefreshResponse
): string {
  try {
    const parsed = JSON.parse(oldValue);

    // Update with new tokens
    parsed.access_token = newTokens.access_token;
    
    // Only update refresh_token if Google provided a new one
    if (newTokens.refresh_token) {
      parsed.refresh_token = newTokens.refresh_token;
    }

    parsed.expires_in = newTokens.expires_in;
    parsed.updated_at = new Date().toISOString();

    return JSON.stringify(parsed);
  } catch (error: any) {
    throw new Error(`Failed to build updated credential value: ${error.message}`);
  }
}

// ============================================
// TOKEN EXPIRY CALCULATION
// ============================================

/**
 * Calculate when a token should be rotated (14 days before expiry).
 * 
 * @param expiresAt - Token expiry date
 * @returns Date when rotation should occur
 */
export function calculateRotationDate(expiresAt: Date): Date {
  const ROTATION_THRESHOLD_DAYS = 14;
  return new Date(expiresAt.getTime() - ROTATION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Check if a credential is expiring soon (within 14 days).
 * 
 * @param expiresAt - Token expiry date
 * @returns True if expiring within 14 days
 */
export function isExpiringSoon(expiresAt: Date): boolean {
  const rotationDate = calculateRotationDate(expiresAt);
  return new Date() >= rotationDate;
}

/**
 * Check if a credential has already expired.
 * 
 * @param expiresAt - Token expiry date
 * @returns True if expired
 */
export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
