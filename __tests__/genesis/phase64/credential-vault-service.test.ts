/**
 * PHASE 64: Credential Vault Service Tests
 * 
 * Comprehensive tests for credential storage, encryption, and retrieval.
 */

import { EncryptionService, CredentialVaultService } from '@/lib/genesis/phase64/credential-vault-service';
import type { CredentialType } from '@/lib/genesis/phase64/credential-vault-types';

// ============================================
// MOCKS
// ============================================

const mockSupabase: any = {
  from: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

// Generate a test master key (64 hex characters = 32 bytes)
const TEST_MASTER_KEY = 'a'.repeat(64);

describe('EncryptionService', () => {
  let encryption: EncryptionService;

  beforeEach(() => {
    encryption = new EncryptionService(TEST_MASTER_KEY);
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'my-secret-api-key';
      const workspaceId = 'ws-123';

      const encrypted = encryption.encrypt(plaintext, workspaceId);
      const decrypted = encryption.decrypt(encrypted, workspaceId);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'my-secret-api-key';
      const workspaceId = 'ws-123';

      const encrypted1 = encryption.encrypt(plaintext, workspaceId);
      const encrypted2 = encryption.encrypt(plaintext, workspaceId);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it('should encrypt with workspace-specific keys', () => {
      const plaintext = 'my-secret-api-key';

      const encrypted1 = encryption.encrypt(plaintext, 'ws-1');
      const encrypted2 = encryption.encrypt(plaintext, 'ws-2');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should fail to decrypt with wrong workspace ID', () => {
      const plaintext = 'my-secret-api-key';

      const encrypted = encryption.encrypt(plaintext, 'ws-1');

      expect(() => {
        encryption.decrypt(encrypted, 'ws-2');
      }).toThrow();
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const workspaceId = 'ws-123';

      const encrypted = encryption.encrypt(plaintext, workspaceId);
      const decrypted = encryption.decrypt(encrypted, workspaceId);

      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const plaintext = '🔑 秘密鍵 🔐';
      const workspaceId = 'ws-123';

      const encrypted = encryption.encrypt(plaintext, workspaceId);
      const decrypted = encryption.decrypt(encrypted, workspaceId);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long strings', () => {
      const plaintext = 'x'.repeat(10000);
      const workspaceId = 'ws-123';

      const encrypted = encryption.encrypt(plaintext, workspaceId);
      const decrypted = encryption.decrypt(encrypted, workspaceId);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw if master key is missing', () => {
      delete process.env.ENCRYPTION_MASTER_KEY;
      
      expect(() => {
        new EncryptionService();
      }).toThrow('ENCRYPTION_MASTER_KEY not configured');
    });
  });
});

describe('CredentialVaultService', () => {
  let service: CredentialVaultService;
  let encryption: EncryptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    encryption = new EncryptionService(TEST_MASTER_KEY);
    service = new CredentialVaultService({
      encryptionService: encryption,
      supabaseClient: mockSupabase,
    });
  });

  describe('storeOAuthCredential', () => {
    it('should store and encrypt OAuth tokens', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-123' },
        error: null,
      });

      const result = await service.storeOAuthCredential(
        'ws-123',
        'gmail_oauth',
        {
          accessToken: 'access-123',
          refreshToken: 'refresh-456',
          tokenType: 'Bearer',
          expiresIn: 3600,
          scope: 'https://www.googleapis.com/auth/gmail.send',
        }
      );

      expect(result.success).toBe(true);
      expect(result.credentialId).toBe('cred-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('genesis.workspace_credentials');
      expect(mockSupabase.insert).toHaveBeenCalled();

      // Verify tokens were encrypted
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.access_token).not.toBe('access-123');
      expect(insertCall.refresh_token).not.toBe('refresh-456');
    });

    it('should calculate correct expiry time', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-123' },
        error: null,
      });

      const now = Date.now();
      await service.storeOAuthCredential('ws-123', 'gmail_oauth', {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: 'email',
      });

      const insertCall = mockSupabase.insert.mock.calls[0][0];
      const expiresAt = new Date(insertCall.expires_at).getTime();
      
      // Should be ~1 hour from now
      expect(expiresAt).toBeGreaterThan(now + 3500 * 1000);
      expect(expiresAt).toBeLessThan(now + 3700 * 1000);
    });

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await service.storeOAuthCredential('ws-123', 'gmail_oauth', {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: 'email',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('storeApiKeyCredential', () => {
    it('should store and encrypt API key', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-456' },
        error: null,
      });

      const result = await service.storeApiKeyCredential(
        'ws-123',
        'openai_api_key',
        'sk-1234567890abcdef'
      );

      expect(result.success).toBe(true);
      expect(result.credentialId).toBe('cred-456');

      // Verify key was encrypted
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.api_key).not.toBe('sk-1234567890abcdef');
    });

    it('should store metadata for Google CSE', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-789' },
        error: null,
      });

      const result = await service.storeApiKeyCredential(
        'ws-123',
        'google_cse_api_key',
        'api-key-123',
        { engineId: 'engine-abc' }
      );

      expect(result.success).toBe(true);

      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.metadata).toEqual({ engineId: 'engine-abc' });
    });

    it('should set status to pending_validation', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-999' },
        error: null,
      });

      await service.storeApiKeyCredential('ws-123', 'openai_api_key', 'sk-test');

      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.status).toBe('pending_validation');
    });
  });

  describe('storeCalendlyUrl', () => {
    it('should store Calendly URL without encryption', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-cal' },
        error: null,
      });

      const url = 'https://calendly.com/acme/30min';
      const result = await service.storeCalendlyUrl('ws-123', url, true);

      expect(result.success).toBe(true);

      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.booking_url).toBe(url);
      expect(insertCall.status).toBe('valid');
    });

    it('should mark as pending if not validated', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-cal' },
        error: null,
      });

      await service.storeCalendlyUrl('ws-123', 'https://calendly.com/test', false);

      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.status).toBe('pending_validation');
    });
  });

  describe('getCredential', () => {
    it('should retrieve and decrypt OAuth credential', async () => {
      const encryptedAccess = encryption.encrypt('access-token', 'ws-123');
      const encryptedRefresh = encryption.encrypt('refresh-token', 'ws-123');

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'cred-123',
          workspace_id: 'ws-123',
          credential_type: 'gmail_oauth',
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          token_type: 'Bearer',
          scope: 'email',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          status: 'valid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await service.getCredential('ws-123', 'gmail_oauth');

      expect(result.success).toBe(true);
      expect(result.credential).toBeDefined();
      expect(result.credential?.type).toBe('gmail_oauth');
      
      const oauth = result.credential as any;
      expect(oauth.accessToken).toBe('access-token');
      expect(oauth.refreshToken).toBe('refresh-token');
    });

    it('should retrieve and decrypt API key credential', async () => {
      const encryptedKey = encryption.encrypt('sk-test-key', 'ws-123');

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'cred-456',
          workspace_id: 'ws-123',
          credential_type: 'openai_api_key',
          api_key: encryptedKey,
          metadata: { organization: 'acme' },
          status: 'valid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await service.getCredential('ws-123', 'openai_api_key');

      expect(result.success).toBe(true);
      const apiKey = result.credential as any;
      expect(apiKey.apiKey).toBe('sk-test-key');
      expect(apiKey.metadata.organization).toBe('acme');
    });

    it('should handle credential not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await service.getCredential('ws-123', 'openai_api_key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('getAllCredentials', () => {
    it('should retrieve all credentials for workspace', async () => {
      const encryptedOAuth = encryption.encrypt('oauth-token', 'ws-123');
      const encryptedKey = encryption.encrypt('api-key', 'ws-123');

      // For getAllCredentials, we need to mock the result without .single()
      const getAllMock = (jest.fn() as any).mockResolvedValue({
        data: [
          {
            id: 'cred-1',
            workspace_id: 'ws-123',
            credential_type: 'gmail_oauth',
            access_token: encryptedOAuth,
            refresh_token: encryptedOAuth,
            token_type: 'Bearer',
            scope: 'email',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            status: 'valid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'cred-2',
            workspace_id: 'ws-123',
            credential_type: 'openai_api_key',
            api_key: encryptedKey,
            metadata: {},
            status: 'valid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });
      
      mockSupabase.order = jest.fn(() => getAllMock());

      const result = await service.getAllCredentials('ws-123');

      expect(result.success).toBe(true);
      expect(result.credentials).toHaveLength(2);
    });

    it('should return empty array if no credentials', async () => {
      const getAllMock = (jest.fn() as any).mockResolvedValue({
        data: [],
        error: null,
      });
      
      mockSupabase.order = jest.fn(() => getAllMock());

      const result = await service.getAllCredentials('ws-123');

      expect(result.success).toBe(true);
      expect(result.credentials).toHaveLength(0);
    });
  });

  describe('hasValidCredential', () => {
    it('should return true if valid credential exists', async () => {
      const encrypted = encryption.encrypt('token', 'ws-123');

      const singleMock = (jest.fn() as any).mockResolvedValue({
        data: {
          id: 'cred-1',
          workspace_id: 'ws-123',
          credential_type: 'gmail_oauth',
          access_token: encrypted,
          refresh_token: encrypted,
          token_type: 'Bearer',
          scope: 'email',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          status: 'valid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });
      
      // Build complete chain: .from().select().eq().eq().order().limit().single()
      mockSupabase.from = jest.fn(() => mockSupabase);
      mockSupabase.select = jest.fn(() => mockSupabase);
      mockSupabase.eq = jest.fn(() => mockSupabase);
      mockSupabase.order = jest.fn(() => mockSupabase);
      mockSupabase.limit = jest.fn(() => ({ single: singleMock }));

      const result = await service.hasValidCredential('ws-123', 'gmail_oauth');

      expect(result).toBe(true);
    });

    it('should return false if credential is invalid', async () => {
      const encrypted = encryption.encrypt('token', 'ws-123');

      const singleMock = (jest.fn() as any).mockResolvedValue({
        data: {
          id: 'cred-1',
          workspace_id: 'ws-123',
          credential_type: 'gmail_oauth',
          access_token: encrypted,
          refresh_token: encrypted,
          token_type: 'Bearer',
          scope: 'email',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          status: 'invalid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });
      
      // Build complete chain
      mockSupabase.from = jest.fn(() => mockSupabase);
      mockSupabase.select = jest.fn(() => mockSupabase);
      mockSupabase.eq = jest.fn(() => mockSupabase);
      mockSupabase.order = jest.fn(() => mockSupabase);
      mockSupabase.limit = jest.fn(() => ({ single: singleMock }));

      const result = await service.hasValidCredential('ws-123', 'gmail_oauth');

      expect(result).toBe(false);
    });

    it('should return false if credential not found', async () => {
      const singleMock = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });
      
      // Build complete chain
      mockSupabase.from = jest.fn(() => mockSupabase);
      mockSupabase.select = jest.fn(() => mockSupabase);
      mockSupabase.eq = jest.fn(() => mockSupabase);
      mockSupabase.order = jest.fn(() => mockSupabase);
      mockSupabase.limit = jest.fn(() => ({ single: singleMock }));

      const result = await service.hasValidCredential('ws-123', 'openai_api_key');

      expect(result).toBe(false);
    });
  });

  describe('updateCredentialStatus', () => {
    it('should update status to valid', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const validatedAt = new Date();
      const result = await service.updateCredentialStatus('cred-123', 'valid', validatedAt);

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'valid',
        validated_at: validatedAt.toISOString(),
      });
    });

    it('should update status to invalid', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.updateCredentialStatus('cred-123', 'invalid');

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'invalid',
      });
    });

    it('should handle database errors', async () => {
      const updateMock = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });
      mockSupabase.eq = jest.fn(() => updateMock());

      const result = await service.updateCredentialStatus('cred-123', 'valid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('refreshOAuthTokens', () => {
    it('should update OAuth tokens', async () => {
      const updateEqMock = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: null,
      });
      mockSupabase.eq = jest.fn(() => updateEqMock());

      const result = await service.refreshOAuthTokens('cred-123', 'ws-123', {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalled();

      // Verify tokens were encrypted
      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.access_token).not.toBe('new-access');
      expect(updateCall.refresh_token).not.toBe('new-refresh');
    });

    it('should update only access token if refresh not provided', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await service.refreshOAuthTokens('cred-123', 'ws-123', {
        accessToken: 'new-access',
        expiresIn: 3600,
      });

      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.access_token).toBeDefined();
      expect(updateCall.refresh_token).toBeUndefined();
    });
  });

  describe('deleteCredential', () => {
    it('should delete a credential', async () => {
      const deleteEqMock = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: null,
      });
      mockSupabase.eq = jest.fn(() => deleteEqMock());

      const result = await service.deleteCredential('cred-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cred-123');
    });

    it('should handle deletion errors', async () => {
      const deleteMock = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Deletion failed' },
      });
      mockSupabase.eq = jest.fn(() => deleteMock());

      const result = await service.deleteCredential('cred-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deletion failed');
    });
  });

  describe('Security Tests', () => {
    it('should use unique IVs for each encryption', () => {
      const plaintext = 'same-text';
      const encrypted1 = encryption.encrypt(plaintext, 'ws-1');
      const encrypted2 = encryption.encrypt(plaintext, 'ws-1');

      // Different IVs = different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should prevent credential leakage across workspaces', () => {
      const plaintext = 'secret-key';
      const encrypted = encryption.encrypt(plaintext, 'ws-1');

      // Attempting to decrypt with wrong workspace should fail
      expect(() => {
        encryption.decrypt(encrypted, 'ws-2');
      }).toThrow();
    });

    it('should detect tampered ciphertext', () => {
      const plaintext = 'secret';
      const encrypted = encryption.encrypt(plaintext, 'ws-1');

      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => {
        encryption.decrypt(tampered, 'ws-1');
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long API keys', async () => {
      const longKey = 'sk-' + 'x'.repeat(1000);
      
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-long' },
        error: null,
      });

      const result = await service.storeApiKeyCredential('ws-123', 'openai_api_key', longKey);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in API keys', async () => {
      const specialKey = 'sk-abc!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-special' },
        error: null,
      });

      const result = await service.storeApiKeyCredential('ws-123', 'openai_api_key', specialKey);

      expect(result.success).toBe(true);
    });

    it('should handle concurrent updates', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cred-concurrent' },
        error: null,
      });

      // Simulate concurrent storage
      const promises = Array(10).fill(null).map((_, i) =>
        service.storeApiKeyCredential('ws-123', 'openai_api_key', `key-${i}`)
      );

      const results = await Promise.all(promises);

      // All should succeed (upsert handles concurrency)
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});
