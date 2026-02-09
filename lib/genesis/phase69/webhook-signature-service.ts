/**
 * PHASE 69: WEBHOOK SIGNATURE SERVICE
 * 
 * HMAC-SHA256 signature generation and verification for all Dashboard↔Sidecar webhooks.
 * Prevents replay attacks, tampering, and unauthorized webhook calls.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.2
 */

import { createHmac, timingSafeEqual } from 'crypto';
import {
  WebhookSignatureHeaders,
  WebhookVerificationResult,
  WebhookVerificationError,
} from './types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum age for webhook timestamps (5 minutes)
 * Prevents replay attacks with old signatures
 */
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Signature algorithm
 */
const SIGNATURE_ALGORITHM = 'sha256';

// ============================================
// SIGNATURE GENERATION
// ============================================

/**
 * Generate HMAC-SHA256 signature for a webhook payload.
 * 
 * Signature = HMAC-SHA256(secret, timestamp + "." + payload_json)
 * 
 * @param secret - Webhook shared secret
 * @param timestamp - Unix timestamp (milliseconds)
 * @param payload - Request body (will be JSON stringified)
 * @returns Hex-encoded signature
 * 
 * @example
 * const signature = generateWebhookSignature(
 *   'my-secret-key',
 *   1704067200000,
 *   { event: 'workflow_completed', executionId: '123' }
 * );
 */
export function generateWebhookSignature(
  secret: string,
  timestamp: number,
  payload: Record<string, unknown> | string
): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const message = `${timestamp}.${payloadString}`;
  
  const hmac = createHmac(SIGNATURE_ALGORITHM, secret);
  hmac.update(message);
  
  return hmac.digest('hex');
}

/**
 * Generate complete webhook signature headers.
 * 
 * @param secret - Webhook shared secret
 * @param payload - Request body
 * @param requestId - Unique request ID (UUID)
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Headers object with signature, timestamp, and request ID
 * 
 * @example
 * const headers = generateWebhookHeaders(
 *   'my-secret-key',
 *   { event: 'heartbeat' },
 *   'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 * );
 * 
 * // Returns:
 * // {
 * //   'x-genesis-signature': 'abc123...',
 * //   'x-genesis-timestamp': '1704067200000',
 * //   'x-genesis-request-id': 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 * // }
 */
export function generateWebhookHeaders(
  secret: string,
  payload: Record<string, unknown> | string,
  requestId: string,
  timestamp?: number
): WebhookSignatureHeaders {
  const ts = timestamp ?? Date.now();
  const signature = generateWebhookSignature(secret, ts, payload);
  
  return {
    'x-genesis-signature': signature,
    'x-genesis-timestamp': ts.toString(),
    'x-genesis-request-id': requestId,
  };
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================

/**
 * Verify webhook signature against one or two secrets (for dual-key rotation).
 * 
 * @param signature - Signature from X-Genesis-Signature header
 * @param timestamp - Timestamp from X-Genesis-Timestamp header
 * @param payload - Request body
 * @param secrets - Active secret (and optionally previous secret)
 * @returns Verification result with validity and error details
 * 
 * @example
 * const result = verifyWebhookSignature(
 *   headers['x-genesis-signature'],
 *   headers['x-genesis-timestamp'],
 *   req.body,
 *   { active: 'current-secret', previous: 'old-secret' }
 * );
 * 
 * if (!result.valid) {
 *   return res.status(401).json({ error: result.error });
 * }
 */
export function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  payload: Record<string, unknown> | string,
  secrets: { active: string; previous?: string }
): WebhookVerificationResult {
  // 1. Validate timestamp format
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return {
      valid: false,
      error: 'invalid_timestamp_format',
    };
  }

  // 2. Check timestamp age (prevents replay attacks)
  const now = Date.now();
  const age = now - timestampNum;
  
  if (age > MAX_TIMESTAMP_AGE_MS) {
    return {
      valid: false,
      error: 'timestamp_too_old',
    };
  }

  // Also reject timestamps from the future (clock skew tolerance: 1 minute)
  if (age < -60000) {
    return {
      valid: false,
      error: 'timestamp_too_old', // Reuse same error
    };
  }

  // 3. Try active secret first
  const expectedSignatureActive = generateWebhookSignature(secrets.active, timestampNum, payload);
  
  // Use timing-safe comparison (check length first to avoid RangeError)
  if (signature.length === expectedSignatureActive.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignatureActive))) {
    return { valid: true };
  }

  // 4. Try previous secret (if exists during grace period)
  if (secrets.previous) {
    const expectedSignaturePrevious = generateWebhookSignature(secrets.previous, timestampNum, payload);
    
    // Use timing-safe comparison (check length first)
    if (signature.length === expectedSignaturePrevious.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignaturePrevious))) {
      return { valid: true };
    }
  }

  // 5. No match - signature is invalid
  return {
    valid: false,
    error: 'signature_mismatch',
  };
}

/**
 * Extract and validate webhook signature headers from a request.
 * 
 * @param headers - HTTP headers object (keys can be lowercase or mixed case)
 * @returns Validated signature headers or error
 * 
 * @example
 * const result = extractWebhookHeaders(req.headers);
 * 
 * if (!result.valid) {
 *   return res.status(400).json({ error: result.error });
 * }
 * 
 * const { signature, timestamp, requestId } = result.headers;
 */
export function extractWebhookHeaders(
  headers: Record<string, string | string[] | undefined>
): 
  | { valid: true; headers: { signature: string; timestamp: string; requestId: string } }
  | { valid: false; error: WebhookVerificationError } 
{
  // Normalize header names (case-insensitive lookup)
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalizedHeaders[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      normalizedHeaders[key.toLowerCase()] = value[0];
    }
  }

  // Extract required headers
  const signature = normalizedHeaders['x-genesis-signature'];
  const timestamp = normalizedHeaders['x-genesis-timestamp'];
  const requestId = normalizedHeaders['x-genesis-request-id'];

  // Validate presence
  if (!signature) {
    return { valid: false, error: 'missing_signature' };
  }

  if (!timestamp) {
    return { valid: false, error: 'missing_timestamp' };
  }

  if (!requestId) {
    return { valid: false, error: 'missing_request_id' };
  }

  return {
    valid: true,
    headers: { signature, timestamp, requestId },
  };
}

// ============================================
// COMPLETE VERIFICATION (Headers + Signature + Deduplication)
// ============================================

/**
 * Perform complete webhook verification:
 * 1. Extract headers
 * 2. Verify signature
 * 3. Check for duplicate request ID (caller must implement deduplication check)
 * 
 * @param headers - HTTP headers
 * @param payload - Request body
 * @param secrets - Active and optional previous secret
 * @returns Verification result with extracted data or error
 * 
 * @example
 * const result = verifyWebhookRequest(
 *   req.headers,
 *   req.body,
 *   { active: workspaceSecret.active, previous: workspaceSecret.previous }
 * );
 * 
 * if (!result.valid) {
 *   return res.status(401).json({ error: result.error });
 * }
 * 
 * // Check request ID deduplication separately:
 * const isDuplicate = await checkRequestIdDuplicate(result.requestId);
 * if (isDuplicate) {
 *   return res.status(401).json({ error: 'duplicate_request_id' });
 * }
 */
export function verifyWebhookRequest(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown> | string,
  secrets: { active: string; previous?: string }
): 
  | { valid: true; signature: string; timestamp: string; requestId: string }
  | { valid: false; error: WebhookVerificationError }
{
  // Step 1: Extract headers
  const headerResult = extractWebhookHeaders(headers);
  if (!headerResult.valid) {
    return { valid: false, error: headerResult.error };
  }

  const { signature, timestamp, requestId } = headerResult.headers;

  // Step 2: Verify signature
  const signatureResult = verifyWebhookSignature(signature, timestamp, payload, secrets);
  if (!signatureResult.valid) {
    return { valid: false, error: signatureResult.error! };
  }

  // Step 3: Return validated data (caller must check request ID deduplication)
  return {
    valid: true,
    signature,
    timestamp,
    requestId,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a timestamp is within acceptable range.
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @param maxAgeMs - Maximum age in milliseconds (default 5 minutes)
 * @returns True if timestamp is acceptable
 */
export function isTimestampValid(timestamp: number, maxAgeMs: number = MAX_TIMESTAMP_AGE_MS): boolean {
  const now = Date.now();
  const age = now - timestamp;
  
  // Reject if too old
  if (age > maxAgeMs) {
    return false;
  }

  // Reject if too far in future (clock skew tolerance: 1 minute)
  if (age < -60000) {
    return false;
  }

  return true;
}

/**
 * Get verification error message for user-facing responses.
 * 
 * @param error - Verification error type
 * @returns Human-readable error message
 */
export function getVerificationErrorMessage(error: WebhookVerificationError): string {
  const messages: Record<WebhookVerificationError, string> = {
    missing_signature: 'Missing X-Genesis-Signature header',
    missing_timestamp: 'Missing X-Genesis-Timestamp header',
    missing_request_id: 'Missing X-Genesis-Request-Id header',
    signature_mismatch: 'Invalid webhook signature',
    timestamp_too_old: 'Webhook timestamp too old (possible replay attack)',
    duplicate_request_id: 'Duplicate request ID (possible replay attack)',
    invalid_timestamp_format: 'Invalid timestamp format',
    unknown_error: 'Unknown webhook verification error',
  };

  return messages[error] || messages.unknown_error;
}
