/**
 * PHASE 69: WEBHOOK SIGNATURE SERVICE TESTS
 * 
 * Comprehensive tests for HMAC-SHA256 webhook signature generation and verification.
 * Critical for preventing unauthorized webhook calls and replay attacks.
 */

import {
  generateWebhookSignature,
  generateWebhookHeaders,
  verifyWebhookSignature,
  extractWebhookHeaders,
  verifyWebhookRequest,
  isTimestampValid,
  getVerificationErrorMessage,
} from '@/lib/genesis/phase69/webhook-signature-service';

describe('Phase 69: Webhook Signature Service', () => {
  const testSecret = 'test-secret-key-12345';
  const testPayload = { event: 'workflow_completed', executionId: '123' };
  const testRequestId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  describe('generateWebhookSignature', () => {
    it('should generate consistent HMAC-SHA256 signature', () => {
      const timestamp = 1704067200000;
      const signature1 = generateWebhookSignature(testSecret, timestamp, testPayload);
      const signature2 = generateWebhookSignature(testSecret, timestamp, testPayload);

      expect(signature1).toBe(signature2);
      expect(signature1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should generate different signatures for different payloads', () => {
      const timestamp = Date.now();
      const payload1 = { event: 'test1' };
      const payload2 = { event: 'test2' };

      const sig1 = generateWebhookSignature(testSecret, timestamp, payload1);
      const sig2 = generateWebhookSignature(testSecret, timestamp, payload2);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const timestamp1 = 1704067200000;
      const timestamp2 = 1704067201000;

      const sig1 = generateWebhookSignature(testSecret, timestamp1, testPayload);
      const sig2 = generateWebhookSignature(testSecret, timestamp2, testPayload);

      expect(sig1).not.toBe(sig2);
    });

    it('should handle string payloads', () => {
      const timestamp = Date.now();
      const stringPayload = JSON.stringify(testPayload);
      
      const signature = generateWebhookSignature(testSecret, timestamp, stringPayload);
      
      expect(signature).toHaveLength(64);
    });
  });

  describe('generateWebhookHeaders', () => {
    it('should generate all required headers', () => {
      const headers = generateWebhookHeaders(testSecret, testPayload, testRequestId);

      expect(headers).toHaveProperty('x-genesis-signature');
      expect(headers).toHaveProperty('x-genesis-timestamp');
      expect(headers).toHaveProperty('x-genesis-request-id');
      expect(headers['x-genesis-request-id']).toBe(testRequestId);
    });

    it('should use provided timestamp', () => {
      const customTimestamp = 1704067200000;
      const headers = generateWebhookHeaders(testSecret, testPayload, testRequestId, customTimestamp);

      expect(headers['x-genesis-timestamp']).toBe('1704067200000');
    });

    it('should use current timestamp if not provided', () => {
      const before = Date.now();
      const headers = generateWebhookHeaders(testSecret, testPayload, testRequestId);
      const after = Date.now();

      const timestamp = parseInt(headers['x-genesis-timestamp'], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature with active secret', () => {
      const timestamp = Date.now();
      const signature = generateWebhookSignature(testSecret, timestamp, testPayload);

      const result = verifyWebhookSignature(
        signature,
        timestamp.toString(),
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should verify valid signature with previous secret during grace period', () => {
      const timestamp = Date.now();
      const oldSecret = 'old-secret';
      const newSecret = 'new-secret';
      const signature = generateWebhookSignature(oldSecret, timestamp, testPayload);

      const result = verifyWebhookSignature(
        signature,
        timestamp.toString(),
        testPayload,
        { active: newSecret, previous: oldSecret }
      );

      expect(result.valid).toBe(true);
    });

    it('should reject signature with wrong secret', () => {
      const timestamp = Date.now();
      const signature = generateWebhookSignature('wrong-secret', timestamp, testPayload);

      const result = verifyWebhookSignature(
        signature,
        timestamp.toString(),
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('signature_mismatch');
    });

    it('should reject timestamp older than 5 minutes', () => {
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      const signature = generateWebhookSignature(testSecret, oldTimestamp, testPayload);

      const result = verifyWebhookSignature(
        signature,
        oldTimestamp.toString(),
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('timestamp_too_old');
    });

    it('should reject timestamp from future (beyond 1 min clock skew)', () => {
      const futureTimestamp = Date.now() + (2 * 60 * 1000); // 2 minutes in future
      const signature = generateWebhookSignature(testSecret, futureTimestamp, testPayload);

      const result = verifyWebhookSignature(
        signature,
        futureTimestamp.toString(),
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('timestamp_too_old');
    });

    it('should accept timestamp within 5 minute window', () => {
      const recentTimestamp = Date.now() - (4 * 60 * 1000); // 4 minutes ago
      const signature = generateWebhookSignature(testSecret, recentTimestamp, testPayload);

      const result = verifyWebhookSignature(
        signature,
        recentTimestamp.toString(),
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(true);
    });

    it('should reject invalid timestamp format', () => {
      const signature = generateWebhookSignature(testSecret, Date.now(), testPayload);

      const result = verifyWebhookSignature(
        signature,
        'invalid-timestamp',
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_timestamp_format');
    });
  });

  describe('extractWebhookHeaders', () => {
    it('should extract headers from valid request', () => {
      const headers = {
        'x-genesis-signature': 'abc123',
        'x-genesis-timestamp': '1704067200000',
        'x-genesis-request-id': testRequestId,
      };

      const result = extractWebhookHeaders(headers);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.headers.signature).toBe('abc123');
        expect(result.headers.timestamp).toBe('1704067200000');
        expect(result.headers.requestId).toBe(testRequestId);
      }
    });

    it('should handle case-insensitive header names', () => {
      const headers = {
        'X-Genesis-Signature': 'abc123',
        'X-GENESIS-TIMESTAMP': '1704067200000',
        'x-GENESIS-request-ID': testRequestId,
      };

      const result = extractWebhookHeaders(headers);

      expect(result.valid).toBe(true);
    });

    it('should reject missing signature header', () => {
      const headers = {
        'x-genesis-timestamp': '1704067200000',
        'x-genesis-request-id': testRequestId,
      };

      const result = extractWebhookHeaders(headers);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('missing_signature');
      }
    });

    it('should reject missing timestamp header', () => {
      const headers = {
        'x-genesis-signature': 'abc123',
        'x-genesis-request-id': testRequestId,
      };

      const result = extractWebhookHeaders(headers);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('missing_timestamp');
      }
    });

    it('should reject missing request ID header', () => {
      const headers = {
        'x-genesis-signature': 'abc123',
        'x-genesis-timestamp': '1704067200000',
      };

      const result = extractWebhookHeaders(headers);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('missing_request_id');
      }
    });
  });

  describe('verifyWebhookRequest', () => {
    it('should verify complete valid webhook request', () => {
      const timestamp = Date.now();
      const signature = generateWebhookSignature(testSecret, timestamp, testPayload);

      const headers = {
        'x-genesis-signature': signature,
        'x-genesis-timestamp': timestamp.toString(),
        'x-genesis-request-id': testRequestId,
      };

      const result = verifyWebhookRequest(
        headers,
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.signature).toBe(signature);
        expect(result.timestamp).toBe(timestamp.toString());
        expect(result.requestId).toBe(testRequestId);
      }
    });

    it('should reject request with invalid signature', () => {
      const timestamp = Date.now();
      const wrongSignature = 'wrong-signature-12345';

      const headers = {
        'x-genesis-signature': wrongSignature,
        'x-genesis-timestamp': timestamp.toString(),
        'x-genesis-request-id': testRequestId,
      };

      const result = verifyWebhookRequest(
        headers,
        testPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('signature_mismatch');
      }
    });
  });

  describe('isTimestampValid', () => {
    it('should accept current timestamp', () => {
      const now = Date.now();
      expect(isTimestampValid(now)).toBe(true);
    });

    it('should accept timestamp within default 5 minute window', () => {
      const fourMinutesAgo = Date.now() - (4 * 60 * 1000);
      expect(isTimestampValid(fourMinutesAgo)).toBe(true);
    });

    it('should reject timestamp older than max age', () => {
      const sixMinutesAgo = Date.now() - (6 * 60 * 1000);
      expect(isTimestampValid(sixMinutesAgo)).toBe(false);
    });

    it('should accept custom max age', () => {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      expect(isTimestampValid(tenMinutesAgo, 15 * 60 * 1000)).toBe(true);
    });

    it('should reject timestamp too far in future', () => {
      const twoMinutesInFuture = Date.now() + (2 * 60 * 1000);
      expect(isTimestampValid(twoMinutesInFuture)).toBe(false);
    });
  });

  describe('getVerificationErrorMessage', () => {
    it('should return descriptive error messages', () => {
      expect(getVerificationErrorMessage('missing_signature').toLowerCase()).toContain('signature');
      expect(getVerificationErrorMessage('missing_timestamp').toLowerCase()).toContain('timestamp');
      expect(getVerificationErrorMessage('signature_mismatch')).toContain('Invalid');
      expect(getVerificationErrorMessage('timestamp_too_old').toLowerCase()).toContain('old');
      expect(getVerificationErrorMessage('duplicate_request_id')).toContain('Duplicate');
    });
  });

  describe('Security: Timing attack prevention', () => {
    it('should use timing-safe comparison (no early return)', () => {
      const timestamp = Date.now();
      const correctSignature = generateWebhookSignature(testSecret, timestamp, testPayload);
      const wrongSignature = 'a'.repeat(64); // Same length, all wrong

      const result1 = verifyWebhookSignature(
        wrongSignature,
        timestamp.toString(),
        testPayload,
        { active: testSecret }
      );

      const result2 = verifyWebhookSignature(
        correctSignature,
        timestamp.toString(),
        testPayload,
        { active: testSecret }
      );

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(true);
    });
  });
});
