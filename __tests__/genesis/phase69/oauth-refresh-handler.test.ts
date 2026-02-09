/**
 * PHASE 69: OAUTH REFRESH HANDLER TESTS
 * 
 * Tests for OAuth token refresh logic, failure classification,
 * and credential value building.
 */

import {
  extractRefreshToken,
  buildUpdatedCredentialValue,
  calculateRotationDate,
  isExpiringSoon,
  isExpired,
  generateWebhookSignature,
  verifyWebhookSignature,
} from '@/lib/genesis/phase69';
import type { OAuthRefreshResponse } from '@/lib/genesis/phase69/types';

describe('Phase 69: OAuth Refresh Handler', () => {
  describe('extractRefreshToken', () => {
    it('should extract refresh token from valid JSON', () => {
      const value = JSON.stringify({
        access_token: 'ya29.abc123',
        refresh_token: 'refresh_token_xyz',
        expires_in: 3600,
      });

      const refreshToken = extractRefreshToken(value);

      expect(refreshToken).toBe('refresh_token_xyz');
    });

    it('should throw error if refresh_token missing', () => {
      const value = JSON.stringify({
        access_token: 'ya29.abc123',
        expires_in: 3600,
      });

      expect(() => extractRefreshToken(value)).toThrow('No refresh_token found');
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = 'not-valid-json';

      expect(() => extractRefreshToken(invalidJson)).toThrow('Failed to extract refresh token');
    });

    it('should handle complex credential structures', () => {
      const value = JSON.stringify({
        access_token: 'ya29.abc123',
        refresh_token: 'refresh_token_xyz',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        token_type: 'Bearer',
        metadata: { user_id: 'user@example.com' },
      });

      const refreshToken = extractRefreshToken(value);

      expect(refreshToken).toBe('refresh_token_xyz');
    });
  });

  describe('buildUpdatedCredentialValue', () => {
    it('should update tokens in credential value', () => {
      const oldValue = JSON.stringify({
        access_token: 'old_access_token',
        refresh_token: 'old_refresh_token',
        expires_in: 3600,
        scope: 'gmail.send',
      });

      const newTokens: OAuthRefreshResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 7200,
        scope: 'gmail.send',
        token_type: 'Bearer',
      };

      const updated = buildUpdatedCredentialValue(oldValue, newTokens);
      const parsed = JSON.parse(updated);

      expect(parsed.access_token).toBe('new_access_token');
      expect(parsed.refresh_token).toBe('new_refresh_token');
      expect(parsed.expires_in).toBe(7200);
      expect(parsed.updated_at).toBeDefined();
    });

    it('should preserve refresh token if Google does not return new one', () => {
      const oldValue = JSON.stringify({
        access_token: 'old_access_token',
        refresh_token: 'old_refresh_token',
        expires_in: 3600,
      });

      const newTokens: OAuthRefreshResponse = {
        access_token: 'new_access_token',
        // No refresh_token in response
        expires_in: 7200,
        scope: 'gmail.send',
        token_type: 'Bearer',
      };

      const updated = buildUpdatedCredentialValue(oldValue, newTokens);
      const parsed = JSON.parse(updated);

      expect(parsed.access_token).toBe('new_access_token');
      expect(parsed.refresh_token).toBe('old_refresh_token'); // Preserved
    });

    it('should preserve other fields in credential value', () => {
      const oldValue = JSON.stringify({
        access_token: 'old_access_token',
        refresh_token: 'old_refresh_token',
        expires_in: 3600,
        scope: 'gmail.send',
        user_email: 'user@example.com',
        custom_metadata: { foo: 'bar' },
      });

      const newTokens: OAuthRefreshResponse = {
        access_token: 'new_access_token',
        expires_in: 7200,
        scope: 'gmail.send',
        token_type: 'Bearer',
      };

      const updated = buildUpdatedCredentialValue(oldValue, newTokens);
      const parsed = JSON.parse(updated);

      expect(parsed.user_email).toBe('user@example.com');
      expect(parsed.custom_metadata).toEqual({ foo: 'bar' });
    });
  });

  describe('calculateRotationDate', () => {
    it('should calculate rotation date 14 days before expiry', () => {
      const expiresAt = new Date('2024-02-28T00:00:00Z');
      const rotationDate = calculateRotationDate(expiresAt);

      // Expected: 2024-02-14T00:00:00Z (14 days before expiry)
      const expectedDate = new Date('2024-02-14T00:00:00Z');
      expect(rotationDate.getTime()).toBe(expectedDate.getTime());
    });

    it('should handle leap years correctly', () => {
      const expiresAt = new Date('2024-03-01T00:00:00Z'); // 2024 is a leap year
      const rotationDate = calculateRotationDate(expiresAt);

      const expectedDate = new Date('2024-02-16T00:00:00Z');
      expect(rotationDate.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe('isExpiringSoon', () => {
    it('should return true if expiring within 14 days', () => {
      const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

      expect(isExpiringSoon(expiresAt)).toBe(true);
    });

    it('should return false if expiring after 14 days', () => {
      const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days from now

      expect(isExpiringSoon(expiresAt)).toBe(false);
    });

    it('should return true if expiring today', () => {
      const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute from now

      expect(isExpiringSoon(expiresAt)).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('should return true for past date', () => {
      const expiresAt = new Date(Date.now() - 60 * 1000); // 1 minute ago

      expect(isExpired(expiresAt)).toBe(true);
    });

    it('should return false for future date', () => {
      const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute from now

      expect(isExpired(expiresAt)).toBe(false);
    });

    it('should return false for current second', () => {
      const expiresAt = new Date(Date.now() + 500); // 500ms from now

      expect(isExpired(expiresAt)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty payload gracefully', () => {
      const timestamp = Date.now();
      const emptyPayload = {};
      const signature = generateWebhookSignature(testSecret, timestamp, emptyPayload);

      const result = verifyWebhookSignature(
        signature,
        timestamp.toString(),
        emptyPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(true);
    });

    it('should handle very large payloads', () => {
      const timestamp = Date.now();
      const largePayload = { data: 'x'.repeat(10000) };
      const signature = generateWebhookSignature(testSecret, timestamp, largePayload);

      const result = verifyWebhookSignature(
        signature,
        timestamp.toString(),
        largePayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(true);
    });

    it('should handle special characters in payload', () => {
      const timestamp = Date.now();
      const specialPayload = { 
        message: 'Hello 世界 🌍',
        emoji: '🎉',
        unicode: '\u00A9 \u00AE',
      };
      const signature = generateWebhookSignature(testSecret, timestamp, specialPayload);

      const result = verifyWebhookSignature(
        signature,
        timestamp.toString(),
        specialPayload,
        { active: testSecret }
      );

      expect(result.valid).toBe(true);
    });
  });
});
