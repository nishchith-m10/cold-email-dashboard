/**
 * PHASE 69: TYPE MAPPERS AND VALIDATION TESTS
 * 
 * Tests for snake_case ↔ camelCase mappers and type conversions.
 */

import {
  mapCredentialFromDb,
  mapWebhookSecretFromDb,
  mapDLQEntryFromDb,
  calculateRotationDate,
} from '@/lib/genesis/phase69';
import type {
  CredentialRecord,
  WebhookSecretRecord,
  WebhookDLQRecord,
} from '@/lib/genesis/phase69/types';

describe('Phase 69: Type Mappers', () => {
  describe('mapCredentialFromDb', () => {
    it('should map credential record to TypeScript format', () => {
      const record: CredentialRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        workspace_id: '223e4567-e89b-12d3-a456-426614174000',
        type: 'gmail_oauth',
        provider: 'google',
        encrypted_value: 'encrypted-data',
        expires_at: '2024-03-01T00:00:00Z',
        rotation_status: 'valid',
        last_rotated_at: '2024-02-01T00:00:00Z',
        next_rotation_at: '2024-02-15T00:00:00Z',
        rotation_failure_count: 0,
        last_rotation_error: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      };

      const mapped = mapCredentialFromDb(record);

      expect(mapped.id).toBe(record.id);
      expect(mapped.workspaceId).toBe(record.workspace_id);
      expect(mapped.type).toBe('gmail_oauth');
      expect(mapped.expiresAt).toBeInstanceOf(Date);
      expect(mapped.expiresAt?.toISOString()).toBe('2024-03-01T00:00:00.000Z');
      expect(mapped.rotationStatus).toBe('valid');
      expect(mapped.lastRotatedAt).toBeInstanceOf(Date);
      expect(mapped.nextRotationAt).toBeInstanceOf(Date);
      expect(mapped.rotationFailureCount).toBe(0);
    });

    it('should handle optional fields', () => {
      const record: CredentialRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        workspace_id: '223e4567-e89b-12d3-a456-426614174000',
        type: 'openai_api_key',
        provider: 'openai',
        encrypted_value: 'encrypted-data',
        rotation_status: 'valid',
        rotation_failure_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      };

      const mapped = mapCredentialFromDb(record);

      expect(mapped.expiresAt).toBeUndefined();
      expect(mapped.lastRotatedAt).toBeUndefined();
      expect(mapped.nextRotationAt).toBeUndefined();
      expect(mapped.lastRotationError).toBeUndefined();
    });

    it('should preserve all credential types', () => {
      const types: Array<CredentialRecord['type']> = [
        'gmail_oauth',
        'google_sheets_oauth',
        'openai_api_key',
        'anthropic_api_key',
        'webhook_secret',
        'sidecar_token',
      ];

      for (const type of types) {
        const record: CredentialRecord = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          workspace_id: '223e4567-e89b-12d3-a456-426614174000',
          type,
          provider: 'test',
          encrypted_value: 'test',
          rotation_status: 'valid',
          rotation_failure_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        };

        const mapped = mapCredentialFromDb(record);
        expect(mapped.type).toBe(type);
      }
    });
  });

  describe('mapWebhookSecretFromDb', () => {
    it('should map webhook secret record to TypeScript format', () => {
      const record: WebhookSecretRecord = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        workspace_id: '223e4567-e89b-12d3-a456-426614174000',
        secret_active: 'encrypted-active-secret',
        secret_previous: 'encrypted-previous-secret',
        rotated_at: '2024-02-01T00:00:00Z',
        rotation_initiated_by: 'user_123',
        rotation_reason: 'scheduled',
        next_rotation_at: '2024-05-01T00:00:00Z',
        grace_period_ends_at: '2024-02-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      };

      const mapped = mapWebhookSecretFromDb(record);

      expect(mapped.id).toBe(record.id);
      expect(mapped.workspaceId).toBe(record.workspace_id);
      expect(mapped.secretActive).toBe(record.secret_active);
      expect(mapped.secretPrevious).toBe(record.secret_previous);
      expect(mapped.rotatedAt).toBeInstanceOf(Date);
      expect(mapped.nextRotationAt).toBeInstanceOf(Date);
      expect(mapped.gracePeriodEndsAt).toBeInstanceOf(Date);
    });

    it('should handle missing previous secret', () => {
      const record: WebhookSecretRecord = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        workspace_id: '223e4567-e89b-12d3-a456-426614174000',
        secret_active: 'encrypted-active-secret',
        rotated_at: '2024-02-01T00:00:00Z',
        next_rotation_at: '2024-05-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      };

      const mapped = mapWebhookSecretFromDb(record);

      expect(mapped.secretPrevious).toBeUndefined();
      expect(mapped.gracePeriodEndsAt).toBeUndefined();
    });
  });

  describe('mapDLQEntryFromDb', () => {
    it('should map DLQ entry record to TypeScript format', () => {
      const record: WebhookDLQRecord = {
        id: '423e4567-e89b-12d3-a456-426614174000',
        workspace_id: '223e4567-e89b-12d3-a456-426614174000',
        webhook_url: 'https://sidecar.example.com/webhook',
        http_method: 'POST',
        payload: { event: 'test' },
        headers: { 'Content-Type': 'application/json' },
        error_message: 'Connection timeout',
        error_code: 'ETIMEDOUT',
        error_stack: 'Error: Connection timeout\n  at fetch...',
        attempt_count: 2,
        max_attempts: 5,
        first_attempt_at: '2024-02-01T00:00:00Z',
        last_attempt_at: '2024-02-01T00:05:00Z',
        next_retry_at: '2024-02-01T00:35:00Z',
        status: 'retrying',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:05:00Z',
      };

      const mapped = mapDLQEntryFromDb(record);

      expect(mapped.id).toBe(record.id);
      expect(mapped.workspaceId).toBe(record.workspace_id);
      expect(mapped.webhookUrl).toBe(record.webhook_url);
      expect(mapped.httpMethod).toBe('POST');
      expect(mapped.attemptCount).toBe(2);
      expect(mapped.status).toBe('retrying');
      expect(mapped.firstAttemptAt).toBeInstanceOf(Date);
      expect(mapped.lastAttemptAt).toBeInstanceOf(Date);
      expect(mapped.nextRetryAt).toBeInstanceOf(Date);
    });

    it('should handle optional fields', () => {
      const record: WebhookDLQRecord = {
        id: '423e4567-e89b-12d3-a456-426614174000',
        workspace_id: '223e4567-e89b-12d3-a456-426614174000',
        webhook_url: 'https://sidecar.example.com/webhook',
        http_method: 'POST',
        payload: { event: 'test' },
        attempt_count: 0,
        max_attempts: 5,
        first_attempt_at: '2024-02-01T00:00:00Z',
        status: 'pending',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      };

      const mapped = mapDLQEntryFromDb(record);

      expect(mapped.headers).toBeUndefined();
      expect(mapped.errorMessage).toBeUndefined();
      expect(mapped.lastAttemptAt).toBeUndefined();
      expect(mapped.resolvedAt).toBeUndefined();
      expect(mapped.abandonedAt).toBeUndefined();
    });

    it('should handle resolved status', () => {
      const record: WebhookDLQRecord = {
        id: '423e4567-e89b-12d3-a456-426614174000',
        workspace_id: '223e4567-e89b-12d3-a456-426614174000',
        webhook_url: 'https://sidecar.example.com/webhook',
        http_method: 'POST',
        payload: { event: 'test' },
        attempt_count: 2,
        max_attempts: 5,
        first_attempt_at: '2024-02-01T00:00:00Z',
        last_attempt_at: '2024-02-01T00:05:00Z',
        status: 'resolved',
        resolved_at: '2024-02-01T00:05:00Z',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:05:00Z',
      };

      const mapped = mapDLQEntryFromDb(record);

      expect(mapped.status).toBe('resolved');
      expect(mapped.resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('calculateRotationDate edge cases', () => {
    it('should handle dates at month boundaries', () => {
      const expiresAt = new Date('2024-01-14T00:00:00Z');
      const rotationDate = calculateRotationDate(expiresAt);

      // Expected: 2023-12-31T00:00:00Z (crosses year boundary)
      const expectedDate = new Date('2023-12-31T00:00:00Z');
      expect(rotationDate.getTime()).toBe(expectedDate.getTime());
    });

    it('should handle dates at year boundaries', () => {
      const expiresAt = new Date('2024-01-01T00:00:00Z');
      const rotationDate = calculateRotationDate(expiresAt);

      const expectedDate = new Date('2023-12-18T00:00:00Z');
      expect(rotationDate.getTime()).toBe(expectedDate.getTime());
    });
  });
});
