/**
 * PHASE 41: CREDENTIAL VAULT
 * 
 * AES-256-GCM encryption for workspace credentials.
 * Provides secure storage and retrieval with audit logging.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 41.A.3
 */

import * as crypto from 'crypto';
import type { CredentialConfig, CredentialType, StoredCredential } from './ignition-types';

// ============================================
// ENCRYPTION CONFIGURATION
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// ============================================
// KEY DERIVATION
// ============================================

/**
 * Derive workspace-specific encryption key from master key.
 * Uses SHA-256 to combine master key + workspace ID.
 */
function deriveKey(workspaceId: string, masterKey: string): Buffer {
  return crypto
    .createHash('sha256')
    .update(masterKey + workspaceId)
    .digest();
}

// ============================================
// ENCRYPTION/DECRYPTION
// ============================================

/**
 * Encrypt credential data using AES-256-GCM.
 * 
 * Format: [IV (16 bytes)][Auth Tag (16 bytes)][Encrypted Data]
 * 
 * @returns Base64-encoded encrypted blob
 */
export function encryptCredential(
  data: Record<string, unknown>,
  workspaceId: string,
  masterKey: string
): string {
  const key = deriveKey(workspaceId, masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(data);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Concatenate: IV + AuthTag + Encrypted Data
  const blob = Buffer.concat([iv, authTag, encrypted]);
  
  return blob.toString('base64');
}

/**
 * Decrypt credential data using AES-256-GCM.
 * 
 * @param encryptedData Base64-encoded encrypted blob
 * @returns Decrypted credential data
 */
export function decryptCredential(
  encryptedData: string,
  workspaceId: string,
  masterKey: string
): Record<string, unknown> {
  const key = deriveKey(workspaceId, masterKey);
  const blob = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]);
  
  return JSON.parse(decrypted.toString('utf8'));
}

// ============================================
// FINGERPRINT GENERATION
// ============================================

/**
 * Generate SHA-256 fingerprint for credential data.
 * Used for drift detection without decryption.
 */
export function computeFingerprint(data: Record<string, unknown>): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);
}

// ============================================
// CREDENTIAL VAULT INTERFACE
// ============================================

/**
 * Database operations for credential vault.
 * This interface allows for mocking in tests.
 */
export interface CredentialVaultDB {
  insert(record: {
    workspace_id: string;
    credential_type: string;
    credential_name: string;
    encrypted_data: string;
    data_fingerprint: string;
    created_by: string;
  }): Promise<{ id: string }>;
  
  update(id: string, updates: {
    n8n_credential_id?: string;
    status?: string;
    last_synced_at?: string;
  }): Promise<void>;
  
  select(workspace_id: string): Promise<StoredCredential[]>;
  
  selectOne(id: string): Promise<(StoredCredential & { encrypted_data: string; data_fingerprint: string }) | null>;
  
  delete(id: string): Promise<void>;
  
  logAction(record: {
    workspace_id: string;
    credential_id: string;
    action: string;
    actor_id?: string;
    actor_type?: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

// ============================================
// CREDENTIAL VAULT CLASS
// ============================================

/**
 * Credential Vault for secure storage and retrieval.
 */
export class CredentialVault {
  private masterKey: string;
  private db: CredentialVaultDB;

  constructor(masterKey: string, db: CredentialVaultDB) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }
    this.masterKey = masterKey;
    this.db = db;
  }

  /**
   * Store a credential.
   */
  async store(
    workspaceId: string,
    credential: CredentialConfig,
    createdBy: string
  ): Promise<{ success: boolean; credential_id?: string; error?: string }> {
    try {
      const encrypted = encryptCredential(credential.data, workspaceId, this.masterKey);
      const fingerprint = computeFingerprint(credential.data);

      const result = await this.db.insert({
        workspace_id: workspaceId,
        credential_type: credential.type,
        credential_name: credential.name,
        encrypted_data: encrypted,
        data_fingerprint: fingerprint,
        created_by: createdBy,
      });

      await this.db.logAction({
        workspace_id: workspaceId,
        credential_id: result.id,
        action: 'created',
        actor_id: createdBy,
        actor_type: 'user',
        details: { credential_type: credential.type },
      });

      return { success: true, credential_id: result.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retrieve and decrypt a credential.
   */
  async retrieve(
    workspaceId: string,
    credentialId: string
  ): Promise<{ data: Record<string, unknown> } | null> {
    try {
      const stored = await this.db.selectOne(credentialId);
      
      if (!stored || stored.workspace_id !== workspaceId) {
        return null;
      }

      const decrypted = decryptCredential(
        stored.encrypted_data as any,
        workspaceId,
        this.masterKey
      );

      await this.db.logAction({
        workspace_id: workspaceId,
        credential_id: credentialId,
        action: 'accessed',
        actor_type: 'system',
      });

      return { data: decrypted };
    } catch (error) {
      console.error('[CredentialVault] Retrieval error:', error);
      return null;
    }
  }

  /**
   * Get all credentials for a workspace.
   */
  async list(workspaceId: string): Promise<StoredCredential[]> {
    return this.db.select(workspaceId);
  }

  /**
   * Update credential sync status.
   */
  async updateSyncStatus(
    credentialId: string,
    n8nCredentialId: string,
    success: boolean
  ): Promise<void> {
    await this.db.update(credentialId, {
      n8n_credential_id: n8nCredentialId,
      status: success ? 'synced' : 'sync_failed',
      last_synced_at: new Date().toISOString(),
    });
  }

  /**
   * Delete a credential.
   */
  async delete(workspaceId: string, credentialId: string): Promise<boolean> {
    try {
      await this.db.delete(credentialId);

      await this.db.logAction({
        workspace_id: workspaceId,
        credential_id: credentialId,
        action: 'revoked',
        actor_type: 'system',
      });

      return true;
    } catch (error) {
      console.error('[CredentialVault] Deletion error:', error);
      return false;
    }
  }

  /**
   * Verify credential integrity.
   */
  async verify(credentialId: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const stored = await this.db.selectOne(credentialId);
      
      if (!stored) {
        return { valid: false, reason: 'Credential not found' };
      }

      // Try to decrypt
      const decrypted = decryptCredential(
        stored.encrypted_data as any,
        stored.workspace_id,
        this.masterKey
      );

      // Verify fingerprint
      const fingerprint = computeFingerprint(decrypted);
      if (fingerprint !== stored.data_fingerprint) {
        return { valid: false, reason: 'Fingerprint mismatch (tampering detected)' };
      }

      await this.db.logAction({
        workspace_id: stored.workspace_id,
        credential_id: credentialId,
        action: 'verified',
        actor_type: 'system',
      });

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Decryption failed',
      };
    }
  }
}

// ============================================
// MOCK DB FOR TESTING
// ============================================

/**
 * In-memory credential vault DB for testing.
 */
export class MockCredentialVaultDB implements CredentialVaultDB {
  private credentials: Map<string, StoredCredential & { encrypted_data: string; data_fingerprint: string }> = new Map();
  private auditLog: Array<any> = [];
  private idCounter = 0;

  async insert(record: {
    workspace_id: string;
    credential_type: string;
    credential_name: string;
    encrypted_data: string;
    data_fingerprint: string;
    created_by: string;
  }): Promise<{ id: string }> {
    const id = `cred-${++this.idCounter}`;
    
    this.credentials.set(id, {
      id,
      workspace_id: record.workspace_id,
      credential_type: record.credential_type as CredentialType,
      credential_name: record.credential_name,
      encrypted_data: record.encrypted_data,
      data_fingerprint: record.data_fingerprint,
      n8n_credential_id: null,
      template_credential_id: null,
      status: 'pending',
      last_synced_at: null,
      last_verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { id };
  }

  async update(id: string, updates: {
    n8n_credential_id?: string;
    status?: string;
    last_synced_at?: string;
  }): Promise<void> {
    const cred = this.credentials.get(id);
    if (cred) {
      Object.assign(cred, updates, { updated_at: new Date().toISOString() });
    }
  }

  async select(workspaceId: string): Promise<StoredCredential[]> {
    return Array.from(this.credentials.values())
      .filter(c => c.workspace_id === workspaceId)
      .map(({ encrypted_data, data_fingerprint, ...rest }) => rest);
  }

  async selectOne(id: string): Promise<(StoredCredential & { encrypted_data: string; data_fingerprint: string }) | null> {
    const cred = this.credentials.get(id);
    if (!cred) return null;
    
    return cred;
  }

  async delete(id: string): Promise<void> {
    this.credentials.delete(id);
  }

  async logAction(record: {
    workspace_id: string;
    credential_id: string;
    action: string;
    actor_id?: string;
    actor_type?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    this.auditLog.push({ ...record, created_at: new Date().toISOString() });
  }

  getAuditLog(): Array<any> {
    return [...this.auditLog];
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create credential vault from environment.
 */
export function createCredentialVault(db?: CredentialVaultDB): CredentialVault {
  const masterKey = process.env.CREDENTIAL_MASTER_KEY || 'test-master-key-minimum-32-chars-long';
  
  if (!db) {
    db = new MockCredentialVaultDB();
  }
  
  return new CredentialVault(masterKey, db);
}
