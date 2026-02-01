/**
 * Phase 64.B: Email Provider Abstraction
 * Type Definitions
 * 
 * Supports multiple email sending methods through a unified interface
 */

// ============================================
// EMAIL PROVIDER TYPES
// ============================================

/**
 * Supported email providers
 */
export enum EmailProvider {
  GMAIL = 'gmail',
  SMTP = 'smtp',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  SES = 'ses',
  POSTMARK = 'postmark',
}

/**
 * SMTP encryption methods
 */
export enum SMTPEncryption {
  NONE = 'none',
  SSL = 'ssl',
  STARTTLS = 'starttls',
}

// ============================================
// CONFIGURATION INTERFACES
// ============================================

/**
 * Base email provider configuration
 */
export interface BaseEmailConfig {
  provider: EmailProvider;
  workspace_id: string;
  last_test_at?: Date;
  last_test_success?: boolean;
  last_test_error?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Gmail-specific configuration
 */
export interface GmailConfig extends BaseEmailConfig {
  provider: EmailProvider.GMAIL;
  gmail_credential_id?: string;
  gmail_refresh_token_encrypted?: Buffer;
  gmail_email: string;
}

/**
 * SMTP-specific configuration
 */
export interface SMTPConfig extends BaseEmailConfig {
  provider: EmailProvider.SMTP;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password_encrypted: Buffer;
  smtp_encryption: SMTPEncryption;
  smtp_from_name: string;
  smtp_from_email: string;
}

/**
 * SendGrid-specific configuration
 */
export interface SendGridConfig extends BaseEmailConfig {
  provider: EmailProvider.SENDGRID;
  sendgrid_api_key_encrypted: Buffer;
  sendgrid_from_email: string;
  sendgrid_from_name?: string;
}

/**
 * Mailgun-specific configuration
 */
export interface MailgunConfig extends BaseEmailConfig {
  provider: EmailProvider.MAILGUN;
  mailgun_api_key_encrypted: Buffer;
  mailgun_domain: string;
  mailgun_from_email: string;
  mailgun_from_name?: string;
}

/**
 * Amazon SES configuration
 */
export interface SESConfig extends BaseEmailConfig {
  provider: EmailProvider.SES;
  ses_access_key_encrypted: Buffer;
  ses_secret_key_encrypted: Buffer;
  ses_region: string;
  ses_from_email: string;
  ses_from_name?: string;
}

/**
 * Postmark configuration
 */
export interface PostmarkConfig extends BaseEmailConfig {
  provider: EmailProvider.POSTMARK;
  postmark_server_token_encrypted: Buffer;
  postmark_from_email: string;
  postmark_from_name?: string;
}

/**
 * Union type of all email provider configurations
 */
export type EmailProviderConfig =
  | GmailConfig
  | SMTPConfig
  | SendGridConfig
  | MailgunConfig
  | SESConfig
  | PostmarkConfig;

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request to save email provider configuration
 */
export interface SaveEmailConfigRequest {
  provider: EmailProvider;
  
  // Gmail fields
  gmail_email?: string;
  gmail_refresh_token?: string;
  gmail_credential_id?: string;
  
  // SMTP fields
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_encryption?: SMTPEncryption;
  smtp_from_name?: string;
  smtp_from_email?: string;
  
  // SendGrid fields
  sendgrid_api_key?: string;
  sendgrid_from_email?: string;
  sendgrid_from_name?: string;
  
  // Mailgun fields
  mailgun_api_key?: string;
  mailgun_domain?: string;
  mailgun_from_email?: string;
  mailgun_from_name?: string;
  
  // SES fields
  ses_access_key?: string;
  ses_secret_key?: string;
  ses_region?: string;
  ses_from_email?: string;
  ses_from_name?: string;
  
  // Postmark fields
  postmark_server_token?: string;
  postmark_from_email?: string;
  postmark_from_name?: string;
}

/**
 * Decrypted email configuration for n8n runtime
 */
export interface DecryptedEmailConfig {
  provider: EmailProvider;
  
  // Gmail
  gmail_email?: string;
  
  // SMTP
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string; // DECRYPTED
  smtp_encryption?: SMTPEncryption;
  from_name?: string;
  from_email?: string;
  
  // SendGrid
  sendgrid_api_key?: string; // DECRYPTED
  
  // Mailgun
  mailgun_api_key?: string; // DECRYPTED
  mailgun_domain?: string;
  
  // SES
  ses_access_key?: string; // DECRYPTED
  ses_secret_key?: string; // DECRYPTED
  ses_region?: string;
  
  // Postmark
  postmark_server_token?: string; // DECRYPTED
}

/**
 * Test email request
 */
export interface TestEmailRequest {
  provider: EmailProvider;
  
  // Provider-specific fields (same as SaveEmailConfigRequest)
  [key: string]: any;
}

/**
 * Test email response
 */
export interface TestEmailResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: {
    smtp_verified?: boolean;
    test_email_sent?: boolean;
    response_time_ms?: number;
  };
}

/**
 * Email provider validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================
// SERVICE INTERFACES
// ============================================

/**
 * Email provider service interface
 */
export interface IEmailProviderService {
  /**
   * Get email provider configuration for a workspace
   */
  getConfig(workspaceId: string): Promise<EmailProviderConfig | null>;
  
  /**
   * Get decrypted email configuration for n8n runtime
   */
  getDecryptedConfig(workspaceId: string): Promise<DecryptedEmailConfig | null>;
  
  /**
   * Save email provider configuration
   */
  saveConfig(workspaceId: string, config: SaveEmailConfigRequest): Promise<EmailProviderConfig>;
  
  /**
   * Test email provider connection
   */
  testConnection(config: TestEmailRequest): Promise<TestEmailResponse>;
  
  /**
   * Delete email provider configuration
   */
  deleteConfig(workspaceId: string): Promise<void>;
  
  /**
   * Validate configuration before saving
   */
  validateConfig(config: SaveEmailConfigRequest): ValidationResult;
}

/**
 * Email provider validation service interface
 */
export interface IEmailProviderValidator {
  /**
   * Validate Gmail configuration
   */
  validateGmail(email: string): ValidationResult;
  
  /**
   * Validate SMTP configuration
   */
  validateSMTP(host: string, port: number, username: string, password: string): ValidationResult;
  
  /**
   * Validate SendGrid configuration
   */
  validateSendGrid(apiKey: string, fromEmail: string): ValidationResult;
  
  /**
   * Test SMTP connection
   */
  testSMTP(config: SMTPConfig): Promise<TestEmailResponse>;
  
  /**
   * Test SendGrid connection
   */
  testSendGrid(config: SendGridConfig): Promise<TestEmailResponse>;
}

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Database row structure for email_provider_config table
 */
export interface EmailProviderConfigRow {
  id: string;
  workspace_id: string;
  provider: string;
  
  // Gmail fields
  gmail_credential_id?: string | null;
  gmail_refresh_token_encrypted?: Buffer | null;
  gmail_email?: string | null;
  
  // SMTP fields
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_username?: string | null;
  smtp_password_encrypted?: Buffer | null;
  smtp_encryption?: string | null;
  smtp_from_name?: string | null;
  smtp_from_email?: string | null;
  
  // SendGrid fields
  sendgrid_api_key_encrypted?: Buffer | null;
  sendgrid_from_email?: string | null;
  sendgrid_from_name?: string | null;
  
  // Mailgun fields
  mailgun_api_key_encrypted?: Buffer | null;
  mailgun_domain?: string | null;
  mailgun_from_email?: string | null;
  mailgun_from_name?: string | null;
  
  // SES fields
  ses_access_key_encrypted?: Buffer | null;
  ses_secret_key_encrypted?: Buffer | null;
  ses_region?: string | null;
  ses_from_email?: string | null;
  ses_from_name?: string | null;
  
  // Postmark fields
  postmark_server_token_encrypted?: Buffer | null;
  postmark_from_email?: string | null;
  postmark_from_name?: string | null;
  
  // Metadata
  last_test_at?: string | null;
  last_test_success?: boolean | null;
  last_test_error?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default SMTP ports
 */
export const DEFAULT_SMTP_PORTS = {
  SSL: 465,
  STARTTLS: 587,
  NONE: 25,
} as const;

/**
 * Provider daily sending limits
 */
export const PROVIDER_DAILY_LIMITS = {
  [EmailProvider.GMAIL]: {
    free: 500,
    workspace: 2000,
  },
  [EmailProvider.SMTP]: Infinity, // Server-dependent
  [EmailProvider.SENDGRID]: {
    free: 100,
    paid: Infinity,
  },
  [EmailProvider.MAILGUN]: {
    free: 5000 / 30, // 5000/month
    paid: Infinity,
  },
  [EmailProvider.SES]: 50000,
  [EmailProvider.POSTMARK]: {
    free: 100 / 30, // 100/month
    paid: Infinity,
  },
} as const;

/**
 * Email regex for validation
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Provider display names
 */
export const PROVIDER_NAMES = {
  [EmailProvider.GMAIL]: 'Gmail',
  [EmailProvider.SMTP]: 'SMTP (Custom Server)',
  [EmailProvider.SENDGRID]: 'SendGrid',
  [EmailProvider.MAILGUN]: 'Mailgun',
  [EmailProvider.SES]: 'Amazon SES',
  [EmailProvider.POSTMARK]: 'Postmark',
} as const;
