/**
 * PHASE 41: CREDENTIAL VAULT EDGE CASE TESTS
 * 
 * Comprehensive testing of encryption, decryption, and error paths.
 */

import { describe, it, expect } from '@jest/globals';
import {
  CredentialVault,
  MockCredentialVaultDB,
  encryptCredential,
  decryptCredential,
  computeFingerprint,
  createCredentialVault,
} from '@/lib/genesis/credential-vault';

const MASTER_KEY = 'test-master-key-must-be-at-least-32-characters-long-xyz';

// ============================================
// ENCRYPTION EDGE CASES
// ============================================

describe('Encryption Edge Cases', () => {
  it('should handle empty credential data', () => {
    const data = {};
    const encrypted = encryptCredential(data, 'ws_123', MASTER_KEY);
    const decrypted = decryptCredential(encrypted, 'ws_123', MASTER_KEY);
    
    expect(decrypted).toEqual(data);
  });

  it('should handle large credential data (10KB)', () => {
    const largeData = {
      token: 'x'.repeat(10000),
    };
    
    const encrypted = encryptCredential(largeData, 'ws_123', MASTER_KEY);
    const decrypted = decryptCredential(encrypted, 'ws_123', MASTER_KEY);
    
    expect(decrypted).toEqual(largeData);
  });

  it('should handle nested credential data', () => {
    const nestedData = {
      level1: {
        level2: {
          level3: {
            secret: 'deep-secret',
          },
        },
      },
    };
    
    const encrypted = encryptCredential(nestedData, 'ws_123', MASTER_KEY);
    const decrypted = decryptCredential(encrypted, 'ws_123', MASTER_KEY);
    
    expect(decrypted).toEqual(nestedData);
  });

  it('should handle special characters in credential data', () => {
    const data = {
      password: 'P@$$w0rd!#%&*()_+-=[]{}|;:\'",.<>?/~`',
      unicode: '日本語 🚀 Ñoño',
      newlines: 'line1\nline2\rline3\r\nline4',
      tabs: 'col1\tcol2\tcol3',
    };
    
    const encrypted = encryptCredential(data, 'ws_123', MASTER_KEY);
    const decrypted = decryptCredential(encrypted, 'ws_123', MASTER_KEY);
    
    expect(decrypted).toEqual(data);
  });

  it('should produce different ciphertexts for same data (IV randomization)', () => {
    const data = { test: 'data' };
    
    const encrypted1 = encryptCredential(data, 'ws_123', MASTER_KEY);
    const encrypted2 = encryptCredential(data, 'ws_123', MASTER_KEY);
    
    // Different ciphertexts (different IVs)
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both decrypt to same data
    const decrypted1 = decryptCredential(encrypted1, 'ws_123', MASTER_KEY);
    const decrypted2 = decryptCredential(encrypted2, 'ws_123', MASTER_KEY);
    expect(decrypted1).toEqual(data);
    expect(decrypted2).toEqual(data);
  });

  it('should fail decryption with wrong master key', () => {
    const data = { secret: 'value' };
    const encrypted = encryptCredential(data, 'ws_123', MASTER_KEY);
    
    expect(() => {
      decryptCredential(encrypted, 'ws_123', 'wrong-master-key-32-characters-long-abc');
    }).toThrow();
  });

  it('should fail decryption with wrong workspace ID', () => {
    const data = { secret: 'value' };
    const encrypted = encryptCredential(data, 'ws_123', MASTER_KEY);
    
    expect(() => {
      decryptCredential(encrypted, 'ws_456', MASTER_KEY);
    }).toThrow();
  });

  it('should fail decryption with corrupted ciphertext', () => {
    const data = { secret: 'value' };
    const encrypted = encryptCredential(data, 'ws_123', MASTER_KEY);
    
    // Corrupt the ciphertext
    const corrupted = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';
    
    expect(() => {
      decryptCredential(corrupted, 'ws_123', MASTER_KEY);
    }).toThrow();
  });

  it('should fail decryption with truncated ciphertext', () => {
    const data = { secret: 'value' };
    const encrypted = encryptCredential(data, 'ws_123', MASTER_KEY);
    
    // Truncate to less than IV + AuthTag length
    const truncated = encrypted.substring(0, 20);
    
    expect(() => {
      decryptCredential(truncated, 'ws_123', MASTER_KEY);
    }).toThrow();
  });
});

// ============================================
// FINGERPRINT EDGE CASES
// ============================================

describe('Fingerprint Edge Cases', () => {
  it('should generate different fingerprints for different data', () => {
    const data1 = { key: 'value1' };
    const data2 = { key: 'value2' };
    
    const fp1 = computeFingerprint(data1);
    const fp2 = computeFingerprint(data2);
    
    expect(fp1).not.toBe(fp2);
  });

  it('should be sensitive to key order (object serialization)', () => {
    const data1 = { a: '1', b: '2' };
    const data2 = { b: '2', a: '1' };
    
    const fp1 = computeFingerprint(data1);
    const fp2 = computeFingerprint(data2);
    
    // JSON.stringify preserves key order, so different order = different fingerprint
    expect(fp1).not.toBe(fp2);
  });

  it('should handle empty object', () => {
    const fp = computeFingerprint({});
    expect(fp).toHaveLength(16);
  });
});

// ============================================
// VAULT OPERATIONS EDGE CASES
// ============================================

describe('Vault Operations Edge Cases', () => {
  it('should prevent retrieval from wrong workspace', async () => {
    const vault = createCredentialVault();

    const storeResult = await vault.store(
      'ws_123',
      {
        type: 'google_oauth2',
        name: 'Gmail',
        data: { secret: 'value' },
      },
      'user_1'
    );

    expect(storeResult.success).toBe(true);

    // Try to retrieve from different workspace
    const retrieved = await vault.retrieve('ws_456', storeResult.credential_id!);
    
    expect(retrieved).toBeNull();
  });

  it('should handle deletion of non-existent credential', async () => {
    const vault = createCredentialVault();

    const result = await vault.delete('ws_123', 'cred_nonexistent');
    
    // Should succeed (idempotent deletion)
    expect(result).toBe(true);
  });

  it('should update sync status correctly', async () => {
    const db = new MockCredentialVaultDB();
    const vault = new CredentialVault(MASTER_KEY, db);

    const storeResult = await vault.store(
      'ws_123',
      {
        type: 'google_oauth2',
        name: 'Gmail',
        data: { test: 'data' },
      },
      'user_1'
    );

    await vault.updateSyncStatus(storeResult.credential_id!, 'n8n_cred_123', true);

    const list = await vault.list('ws_123');
    const updated = list.find(c => c.id === storeResult.credential_id);
    
    expect(updated?.status).toBe('synced');
    expect(updated?.n8n_credential_id).toBe('n8n_cred_123');
  });

  it('should verify credential integrity correctly', async () => {
    const vault = createCredentialVault();

    const storeResult = await vault.store(
      'ws_123',
      {
        type: 'google_oauth2',
        name: 'Gmail',
        data: { test: 'data' },
      },
      'user_1'
    );

    const verifyResult = await vault.verify(storeResult.credential_id!);
    
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.reason).toBeUndefined();
  });

  it('should detect non-existent credential during verify', async () => {
    const vault = createCredentialVault();

    const verifyResult = await vault.verify('cred_nonexistent');
    
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.reason).toContain('not found');
  });

  it('should handle multiple credentials for same workspace', async () => {
    const vault = createCredentialVault();

    const cred1 = await vault.store('ws_123', {
      type: 'google_oauth2',
      name: 'Gmail',
      data: { id: '1' },
    }, 'user_1');

    const cred2 = await vault.store('ws_123', {
      type: 'openai_api',
      name: 'OpenAI',
      data: { key: '2' },
    }, 'user_1');

    const list = await vault.list('ws_123');
    
    expect(list).toHaveLength(2);
    expect(list.map(c => c.credential_type)).toContain('google_oauth2');
    expect(list.map(c => c.credential_type)).toContain('openai_api');
  });
});

// ============================================
// VAULT ERROR HANDLING
// ============================================

describe('Vault Error Handling', () => {
  it('should handle database insert error', async () => {
    const failingDB: any = {
      insert: async () => { throw new Error('Database error'); },
      update: async () => {},
      select: async () => [],
      selectOne: async () => null,
      delete: async () => {},
      logAction: async () => {},
    };

    const vault = new CredentialVault(MASTER_KEY, failingDB);

    const result = await vault.store('ws_123', {
      type: 'google_oauth2',
      name: 'Gmail',
      data: { test: 'data' },
    }, 'user_1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Database error');
  });

  it('should handle database select error during retrieve', async () => {
    const failingDB: any = {
      insert: async (record: any) => ({ id: 'cred_123' }),
      update: async () => {},
      select: async () => [],
      selectOne: async () => { throw new Error('Select error'); },
      delete: async () => {},
      logAction: async () => {},
    };

    const vault = new CredentialVault(MASTER_KEY, failingDB);

    const retrieved = await vault.retrieve('ws_123', 'cred_123');
    
    expect(retrieved).toBeNull();
  });

  it('should reject master key shorter than 32 characters', () => {
    expect(() => {
      new CredentialVault('short-key', new MockCredentialVaultDB());
    }).toThrow('at least 32 characters');
  });
});
