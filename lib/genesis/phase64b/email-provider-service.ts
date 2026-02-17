/**
 * Phase 64.B: Email Provider Service
 * 
 * Main service for managing email provider configurations
 * Handles encryption/decryption, database operations, and provider-specific logic
 */

import {
  EmailProvider,
  EmailProviderConfig,
  DecryptedEmailConfig,
  SaveEmailConfigRequest,
  TestEmailRequest,
  TestEmailResponse,
  ValidationResult,
  EmailProviderConfigRow,
  SMTPEncryption,
  IEmailProviderService,
} from './email-provider-types';
import { EmailProviderValidator } from './email-provider-validator';

/**
 * Mock encryption/decryption functions
 * In production, these would use the actual encryption service from Phase 64
 */
class MockEncryption {
  static encrypt(data: string): Buffer {
    // Mock encryption: just convert to buffer
    return Buffer.from(data, 'utf-8');
  }
  
  static decrypt(data: Buffer): string {
    // Mock decryption: just convert back to string
    return data.toString('utf-8');
  }
}

/**
 * Mock database client
 * In production, this would be the actual Supabase client
 */
interface MockSupabaseClient {
  from(table: string): MockQueryBuilder;
}

interface MockQueryBuilder {
  select(columns: string): MockQueryBuilder;
  insert(data: any): MockQueryBuilder;
  update(data: any): MockQueryBuilder;
  delete(): MockQueryBuilder;
  eq(column: string, value: any): MockQueryBuilder;
  single(): Promise<{ data: any; error: any }>;
}

export class EmailProviderService implements IEmailProviderService {
  private validator: EmailProviderValidator;
  private db: MockSupabaseClient;
  
  constructor(db: MockSupabaseClient) {
    this.validator = new EmailProviderValidator();
    this.db = db;
  }
  
  /**
   * Get email provider configuration for a workspace
   */
  async getConfig(workspaceId: string): Promise<EmailProviderConfig | null> {
    try {
      const { data, error } = await this.db
        .from('email_provider_config')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return this.rowToConfig(data);
    } catch (error) {
      console.error('Error getting email config:', error);
      return null;
    }
  }
  
  /**
   * Get decrypted email configuration for n8n runtime
   */
  async getDecryptedConfig(workspaceId: string): Promise<DecryptedEmailConfig | null> {
    const config = await this.getConfig(workspaceId);
    
    if (!config) {
      return null;
    }
    
    return this.decryptConfig(config);
  }
  
  /**
   * Save email provider configuration
   * 
   * Phase 64.B: Supports partial saves for initial provider selection.
   * If only `provider` is specified (no provider-specific fields), skip validation.
   * This allows the onboarding flow to save the provider choice before full configuration.
   */
  async saveConfig(workspaceId: string, request: SaveEmailConfigRequest): Promise<EmailProviderConfig> {
    // Phase 64.B: Check if this is just a provider selection (no full config)
    const isProviderSelectionOnly = this.isProviderSelectionOnly(request);
    
    // Only validate if we have provider-specific fields
    if (!isProviderSelectionOnly) {
      const validation = this.validateConfig(request);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
    }
    
    // Encrypt sensitive fields
    const row = this.requestToRow(workspaceId, request);
    
    // Check if config exists
    const existing = await this.getConfig(workspaceId);
    
    if (existing) {
      // Update
      const { data, error } = await this.db
        .from('email_provider_config')
        .update(row)
        .eq('workspace_id', workspaceId)
        .select('*')
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to update email config: ${error?.message || 'No data returned'}`);
      }
      
      return this.rowToConfig(data);
    } else {
      // Insert
      const { data, error } = await this.db
        .from('email_provider_config')
        .insert(row)
        .select('*')
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to save email config: ${error?.message || 'No data returned'}`);
      }
      
      return this.rowToConfig(data);
    }
  }
  
  /**
   * Test email provider connection
   */
  async testConnection(config: TestEmailRequest): Promise<TestEmailResponse> {
    try {
      switch (config.provider) {
        case EmailProvider.SMTP: {
          const smtpConfig: any = {
            provider: EmailProvider.SMTP,
            workspace_id: 'test',
            smtp_host: config.smtp_host,
            smtp_port: config.smtp_port,
            smtp_username: config.smtp_username,
            smtp_password_encrypted: MockEncryption.encrypt(config.smtp_password || ''),
            smtp_encryption: config.smtp_encryption as SMTPEncryption,
            smtp_from_name: config.smtp_from_name,
            smtp_from_email: config.smtp_from_email,
          };
          return await this.validator.testSMTP(smtpConfig);
        }
        
        case EmailProvider.SENDGRID: {
          const sendgridConfig: any = {
            provider: EmailProvider.SENDGRID,
            workspace_id: 'test',
            sendgrid_api_key_encrypted: MockEncryption.encrypt(config.sendgrid_api_key || ''),
            sendgrid_from_email: config.sendgrid_from_email,
          };
          return await this.validator.testSendGrid(sendgridConfig);
        }
        
        case EmailProvider.GMAIL: {
          // Gmail test would validate OAuth token
          const validation = this.validator.validateGmail(config.gmail_email || '');
          return {
            success: validation.valid,
            message: validation.valid ? 'Gmail configuration valid' : 'Invalid Gmail configuration',
            error: validation.valid ? undefined : validation.errors.join(', '),
          };
        }
        
        default:
          return {
            success: false,
            message: 'Unsupported provider for testing',
            error: `Provider ${config.provider} is not yet supported`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Delete email provider configuration
   */
  async deleteConfig(workspaceId: string): Promise<void> {
    const { error } = await this.db
      .from('email_provider_config')
      .delete()
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error) {
      throw new Error(`Failed to delete email config: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Validate configuration before saving
   */
  validateConfig(config: SaveEmailConfigRequest): ValidationResult {
    switch (config.provider) {
      case EmailProvider.GMAIL:
        return this.validator.validateGmail(config.gmail_email || '');
      
      case EmailProvider.SMTP:
        return this.validator.validateSMTP(
          config.smtp_host || '',
          config.smtp_port || 587,
          config.smtp_username || '',
          config.smtp_password || ''
        );
      
      case EmailProvider.SENDGRID:
        return this.validator.validateSendGrid(
          config.sendgrid_api_key || '',
          config.sendgrid_from_email || ''
        );
      
      default:
        return {
          valid: false,
          errors: [`Provider ${config.provider} is not yet supported`],
        };
    }
  }
  
  /**
   * Phase 64.B: Check if request is just a provider selection (no full config)
   * 
   * This allows the onboarding flow to save the provider choice before
   * the user completes the full configuration in subsequent stages.
   */
  private isProviderSelectionOnly(config: SaveEmailConfigRequest): boolean {
    switch (config.provider) {
      case EmailProvider.GMAIL:
        // Gmail selection only - no email or OAuth tokens yet
        // Empty string should NOT skip validation (treat as invalid input, not missing)
        return (config.gmail_email == null) && !config.gmail_refresh_token && !config.gmail_credential_id;
      
      case EmailProvider.SMTP:
        // SMTP selection only - no server config yet
        return !config.smtp_host && !config.smtp_username;
      
      case EmailProvider.SENDGRID:
        // SendGrid selection only - no API key yet
        return !config.sendgrid_api_key;
      
      case EmailProvider.MAILGUN:
        // Mailgun selection only - no API key yet
        return !config.mailgun_api_key;
      
      case EmailProvider.SES:
        // SES selection only - no keys yet
        return !config.ses_access_key;
      
      case EmailProvider.POSTMARK:
        // Postmark selection only - no token yet
        return !config.postmark_server_token;
      
      default:
        return false;
    }
  }
  
  /**
   * Convert database row to EmailProviderConfig
   */
  private rowToConfig(row: EmailProviderConfigRow): EmailProviderConfig {
    const base: any = {
      workspace_id: row.workspace_id,
      provider: row.provider as EmailProvider,
      last_test_at: row.last_test_at ? new Date(row.last_test_at) : undefined,
      last_test_success: row.last_test_success || undefined,
      last_test_error: row.last_test_error || undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
    
    switch (row.provider) {
      case EmailProvider.GMAIL:
        return {
          ...base,
          gmail_credential_id: row.gmail_credential_id || undefined,
          gmail_refresh_token_encrypted: row.gmail_refresh_token_encrypted || undefined,
          gmail_email: row.gmail_email || '',
        };
      
      case EmailProvider.SMTP:
        return {
          ...base,
          smtp_host: row.smtp_host || '',
          smtp_port: row.smtp_port || 587,
          smtp_username: row.smtp_username || '',
          smtp_password_encrypted: row.smtp_password_encrypted || Buffer.from(''),
          smtp_encryption: (row.smtp_encryption as SMTPEncryption) || SMTPEncryption.STARTTLS,
          smtp_from_name: row.smtp_from_name || '',
          smtp_from_email: row.smtp_from_email || '',
        };
      
      case EmailProvider.SENDGRID:
        return {
          ...base,
          sendgrid_api_key_encrypted: row.sendgrid_api_key_encrypted || Buffer.from(''),
          sendgrid_from_email: row.sendgrid_from_email || '',
          sendgrid_from_name: row.sendgrid_from_name || undefined,
        };
      
      default:
        throw new Error(`Unsupported provider: ${row.provider}`);
    }
  }
  
  /**
   * Convert save request to database row
   */
  private requestToRow(workspaceId: string, request: SaveEmailConfigRequest): Partial<EmailProviderConfigRow> {
    const base: any = {
      workspace_id: workspaceId,
      provider: request.provider,
      updated_at: new Date().toISOString(),
    };
    
    switch (request.provider) {
      case EmailProvider.GMAIL:
        return {
          ...base,
          gmail_email: request.gmail_email,
          gmail_credential_id: request.gmail_credential_id,
          gmail_refresh_token_encrypted: request.gmail_refresh_token
            ? MockEncryption.encrypt(request.gmail_refresh_token)
            : undefined,
        };
      
      case EmailProvider.SMTP:
        return {
          ...base,
          smtp_host: request.smtp_host,
          smtp_port: request.smtp_port,
          smtp_username: request.smtp_username,
          smtp_password_encrypted: request.smtp_password
            ? MockEncryption.encrypt(request.smtp_password)
            : undefined,
          smtp_encryption: request.smtp_encryption,
          smtp_from_name: request.smtp_from_name,
          smtp_from_email: request.smtp_from_email,
        };
      
      case EmailProvider.SENDGRID:
        return {
          ...base,
          sendgrid_api_key_encrypted: request.sendgrid_api_key
            ? MockEncryption.encrypt(request.sendgrid_api_key)
            : undefined,
          sendgrid_from_email: request.sendgrid_from_email,
          sendgrid_from_name: request.sendgrid_from_name,
        };
      
      default:
        throw new Error(`Unsupported provider: ${request.provider}`);
    }
  }
  
  /**
   * Decrypt configuration for n8n runtime
   */
  private decryptConfig(config: EmailProviderConfig): DecryptedEmailConfig {
    const base: DecryptedEmailConfig = {
      provider: config.provider,
    };
    
    switch (config.provider) {
      case EmailProvider.GMAIL:
        return {
          ...base,
          gmail_email: config.gmail_email,
        };
      
      case EmailProvider.SMTP:
        return {
          ...base,
          smtp_host: config.smtp_host,
          smtp_port: config.smtp_port,
          smtp_username: config.smtp_username,
          smtp_password: MockEncryption.decrypt(config.smtp_password_encrypted),
          smtp_encryption: config.smtp_encryption,
          from_name: config.smtp_from_name,
          from_email: config.smtp_from_email,
        };
      
      case EmailProvider.SENDGRID:
        return {
          ...base,
          sendgrid_api_key: MockEncryption.decrypt(config.sendgrid_api_key_encrypted),
        };
      
      default:
        return base;
    }
  }
}
