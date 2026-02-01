/**
 * GENESIS PART VI - PHASE 60.D: N8N AUTHENTICATION & ACCESS CONTROL
 * Type definitions for n8n authentication
 */

/**
 * n8n owner account credentials
 */
export interface N8nOwnerCredentials {
  email: string;
  password: string;
  workspace_id: string;
  workspace_slug: string;
}

/**
 * n8n configuration environment variables
 */
export interface N8nEnvironmentConfig {
  n8n_host: string;
  n8n_encryption_key: string;
  n8n_jwt_secret: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_sender?: string;
}

/**
 * n8n owner account status
 */
export type N8nOwnerAccountStatus = 
  | 'pending_creation'    // Credentials generated, owner account not created yet
  | 'created'            // Owner account created and active
  | 'failed';            // Owner account creation failed

/**
 * n8n access information for admin
 */
export interface N8nAdminAccess {
  workspace_id: string;
  workspace_name: string;
  n8n_url: string;
  owner_email: string;
  owner_password: string;
  owner_account_status: N8nOwnerAccountStatus;
  owner_created_at?: Date;
}

/**
 * Encrypted credential storage format
 */
export interface EncryptedN8nCredentials {
  workspace_id: string;
  service: 'n8n_owner';
  email: string;
  password_encrypted: string;
  created_at: Date;
  last_accessed_at?: Date;
}

/**
 * Password generation options
 */
export interface PasswordGenerationOptions {
  length: number;
  include_uppercase: boolean;
  include_lowercase: boolean;
  include_numbers: boolean;
  include_symbols: boolean;
}

/**
 * Default password generation options for n8n
 * (meets n8n security requirements)
 */
export const DEFAULT_N8N_PASSWORD_OPTIONS: PasswordGenerationOptions = {
  length: 24,
  include_uppercase: true,
  include_lowercase: true,
  include_numbers: true,
  include_symbols: true,
};
