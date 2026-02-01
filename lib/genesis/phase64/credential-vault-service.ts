/**
 * PHASE 64: Credential Vault Service
 * 
 * Core service for storing, retrieving, and managing encrypted credentials.
 * Uses AES-256-GCM encryption with workspace-scoped keys.
 */

import * as crypto from 'crypto';
import {
  Credential,
  CredentialType,
  CredentialStatus,
  OAuthCredential,
  ApiKeyCredential,
  CalendlyCredential,
  RelevanceAICredential,
  RelevanceAIConfig,
  ValidationResult,
} from './credential-vault-types';

// ============================================
// ENCRYPTION CONFIGURATION
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// ============================================
// ENCRYPTION SERVICE
// ============================================

export class EncryptionService {
  private masterKey: Buffer;

  constructor(masterKeyHex?: string) {
    // In production, load from environment variable
    const key = masterKeyHex || process.env.ENCRYPTION_MASTER_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_MASTER_KEY not configured');
    }
    this.masterKey = Buffer.from(key, 'hex');
  }

  /**
   * Derive a workspace-specific encryption key using PBKDF2
   */
  private deriveWorkspaceKey(workspaceId: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      Buffer.concat([this.masterKey, Buffer.from(workspaceId)]),
      salt,
      100000, // iterations
      32, // key length
      'sha256'
    );
  }

  /**
   * Encrypt a value using AES-256-GCM
   */
  encrypt(plaintext: string, workspaceId: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveWorkspaceKey(workspaceId, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: salt + iv + authTag + encrypted
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypt a value using AES-256-GCM
   */
  decrypt(ciphertext: string, workspaceId: string): string {
    const combined = Buffer.from(ciphertext, 'base64');
    
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = this.deriveWorkspaceKey(workspaceId, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  }
}

// ============================================
// CREDENTIAL VAULT SERVICE
// ============================================

export interface CredentialVaultConfig {
  encryptionService: EncryptionService;
  supabaseClient: any; // Type as SupabaseClient in real implementation
}

export class CredentialVaultService {
  private encryption: EncryptionService;
  private supabase: any;

  constructor(config: CredentialVaultConfig) {
    this.encryption = config.encryptionService;
    this.supabase = config.supabaseClient;
  }

  // ============================================
  // CREATE CREDENTIALS
  // ============================================

  /**
   * Store an OAuth credential
   */
  async storeOAuthCredential(
    workspaceId: string,
    type: Extract<CredentialType, 'gmail_oauth' | 'google_sheets_oauth' | 'entri_oauth'>,
    tokens: {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
      scope: string;
    }
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      // Encrypt tokens
      const encryptedAccessToken = this.encryption.encrypt(tokens.accessToken, workspaceId);
      const encryptedRefreshToken = this.encryption.encrypt(tokens.refreshToken, workspaceId);
      
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      
      const { data, error } = await this.supabase
        .from('genesis.workspace_credentials')
        .insert({
          workspace_id: workspaceId,
          credential_type: type,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_type: tokens.tokenType,
          scope: tokens.scope,
          expires_at: expiresAt.toISOString(),
          status: 'valid',
          validated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, credentialId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store OAuth credential' 
      };
    }
  }

  /**
   * Store an API key credential
   */
  async storeApiKeyCredential(
    workspaceId: string,
    type: Extract<CredentialType, 'openai_api_key' | 'anthropic_api_key' | 'google_cse_api_key' | 'apify_api_token'>,
    apiKey: string,
    metadata?: { engineId?: string; organization?: string }
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      // Encrypt API key
      const encryptedKey = this.encryption.encrypt(apiKey, workspaceId);
      
      const { data, error } = await this.supabase
        .from('genesis.workspace_credentials')
        .insert({
          workspace_id: workspaceId,
          credential_type: type,
          api_key: encryptedKey,
          metadata: metadata || {},
          status: 'pending_validation',
        })
        .select('id')
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, credentialId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store API key' 
      };
    }
  }

  /**
   * Store Calendly URL
   */
  async storeCalendlyUrl(
    workspaceId: string,
    bookingUrl: string,
    validated: boolean
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('genesis.workspace_credentials')
        .insert({
          workspace_id: workspaceId,
          credential_type: 'calendly_url',
          booking_url: bookingUrl,
          status: validated ? 'valid' : 'pending_validation',
          metadata: { validated, lastChecked: new Date().toISOString() },
        })
        .select('id')
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, credentialId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store Calendly URL' 
      };
    }
  }

  /**
   * Store Relevance AI configuration (full config)
   */
  async storeRelevanceConfig(
    workspaceId: string,
    config: {
      baseUrl: string;
      projectId: string;
      studioId: string;
      authToken: string;
      toolImported: boolean;
      toolId?: string;
    }
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      // Encrypt the auth token
      const encryptedToken = this.encryption.encrypt(config.authToken, workspaceId);
      
      // Store as metadata (encrypted token in api_key field for consistency)
      const { data, error } = await this.supabase
        .from('genesis.workspace_credentials')
        .upsert({
          workspace_id: workspaceId,
          credential_type: 'relevance_config',
          api_key: encryptedToken, // Encrypted auth token
          metadata: {
            baseUrl: config.baseUrl,
            projectId: config.projectId,
            studioId: config.studioId,
            toolImported: config.toolImported,
            toolId: config.toolId,
          },
          status: 'valid',
        }, {
          onConflict: 'workspace_id,credential_type',
        })
        .select('id')
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, credentialId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store Relevance config' 
      };
    }
  }

  /**
   * Get Relevance AI configuration
   */
  async getRelevanceConfig(
    workspaceId: string
  ): Promise<{ 
    success: boolean; 
    config?: {
      baseUrl: string;
      projectId: string;
      studioId: string;
      authToken: string;
      toolImported: boolean;
      toolId?: string;
    }; 
    error?: string 
  }> {
    try {
      const { data, error } = await this.supabase
        .from('genesis.workspace_credentials')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('credential_type', 'relevance_config')
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No Relevance config found' };
      }
      
      // Decrypt the auth token
      const authToken = this.encryption.decrypt(data.api_key, workspaceId);
      
      return { 
        success: true, 
        config: {
          baseUrl: data.metadata?.baseUrl || '',
          projectId: data.metadata?.projectId || '',
          studioId: data.metadata?.studioId || '',
          authToken,
          toolImported: data.metadata?.toolImported || false,
          toolId: data.metadata?.toolId,
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get Relevance config' 
      };
    }
  }

  // ============================================
  // RETRIEVE CREDENTIALS
  // ============================================

  /**
   * Get a credential by type (returns most recent if multiple exist)
   */
  async getCredential(
    workspaceId: string,
    type: CredentialType
  ): Promise<{ success: boolean; credential?: Credential; error?: string }> {
    try {
      const result = await this.supabase
        .from('genesis.workspace_credentials')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('credential_type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      const data = result.data;
      
      if (!data) {
        return { success: false, error: 'Credential not found' };
      }
      
      // Decrypt sensitive fields
      const credential = this.decryptCredential(data, workspaceId);
      
      return { success: true, credential };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve credential' 
      };
    }
  }

  /**
   * Get all credentials for a workspace
   */
  async getAllCredentials(
    workspaceId: string
  ): Promise<{ success: boolean; credentials?: Credential[]; error?: string }> {
    try {
      const result = await this.supabase
        .from('genesis.workspace_credentials')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      const data = result.data;
      
      const credentials = data.map((row: any) => this.decryptCredential(row, workspaceId));
      
      return { success: true, credentials };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve credentials' 
      };
    }
  }

  /**
   * Check if a credential exists and is valid
   */
  async hasValidCredential(
    workspaceId: string,
    type: CredentialType
  ): Promise<boolean> {
    const result = await this.getCredential(workspaceId, type);
    return result.success && result.credential?.status === 'valid';
  }

  // ============================================
  // UPDATE CREDENTIALS
  // ============================================

  /**
   * Update credential status
   */
  async updateCredentialStatus(
    credentialId: string,
    status: CredentialStatus,
    validatedAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { status };
      if (validatedAt) {
        updateData.validated_at = validatedAt.toISOString();
      }
      
      const result = await this.supabase
        .from('genesis.workspace_credentials')
        .update(updateData)
        .eq('id', credentialId);
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update credential status' 
      };
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshOAuthTokens(
    credentialId: string,
    workspaceId: string,
    newTokens: {
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const encryptedAccessToken = this.encryption.encrypt(newTokens.accessToken, workspaceId);
      const expiresAt = new Date(Date.now() + newTokens.expiresIn * 1000);
      
      const updateData: any = {
        access_token: encryptedAccessToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (newTokens.refreshToken) {
        updateData.refresh_token = this.encryption.encrypt(newTokens.refreshToken, workspaceId);
      }
      
      const result = await this.supabase
        .from('genesis.workspace_credentials')
        .update(updateData)
        .eq('id', credentialId);
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh OAuth tokens' 
      };
    }
  }

  // ============================================
  // DELETE CREDENTIALS
  // ============================================

  /**
   * Delete a credential
   */
  async deleteCredential(
    credentialId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.supabase
        .from('genesis.workspace_credentials')
        .delete()
        .eq('id', credentialId);
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete credential' 
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Decrypt credential fields
   */
  private decryptCredential(row: any, workspaceId: string): Credential {
    const base: any = {
      id: row.id,
      workspaceId: row.workspace_id,
      type: row.credential_type,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      validatedAt: row.validated_at ? new Date(row.validated_at) : undefined,
    };
    
    // Decrypt based on type
    if (row.access_token && row.refresh_token) {
      // OAuth credential
      return {
        ...base,
        accessToken: this.encryption.decrypt(row.access_token, workspaceId),
        refreshToken: this.encryption.decrypt(row.refresh_token, workspaceId),
        tokenType: row.token_type,
        scope: row.scope,
        expiresAt: new Date(row.expires_at),
      } as OAuthCredential;
    } else if (row.api_key) {
      // API Key credential
      return {
        ...base,
        apiKey: this.encryption.decrypt(row.api_key, workspaceId),
        metadata: row.metadata || {},
      } as ApiKeyCredential;
    } else if (row.booking_url) {
      // Calendly credential
      return {
        ...base,
        bookingUrl: row.booking_url,
        metadata: row.metadata || {},
      } as CalendlyCredential;
    }
    
    throw new Error(`Unknown credential type: ${row.credential_type}`);
  }
}
