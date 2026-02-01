/**
 * Phase 64.B: Email Provider Validator Tests
 * 
 * Comprehensive test suite for email provider validation
 */

import { EmailProviderValidator } from '@/lib/genesis/phase64b/email-provider-validator';
import { EmailProvider, SMTPEncryption } from '@/lib/genesis/phase64b/email-provider-types';

describe('EmailProviderValidator', () => {
  let validator: EmailProviderValidator;
  
  beforeEach(() => {
    validator = new EmailProviderValidator();
  });
  
  describe('validateGmail', () => {
    it('should validate a correct Gmail address', () => {
      const result = validator.validateGmail('user@gmail.com');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate a Google Workspace email', () => {
      const result = validator.validateGmail('admin@company.com');
      expect(result.valid).toBe(true);
    });
    
    it('should reject empty email', () => {
      const result = validator.validateGmail('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Gmail email address is required');
    });
    
    it('should reject invalid email format', () => {
      const result = validator.validateGmail('not-an-email');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid Gmail email format');
    });
    
    it('should reject whitespace-only email', () => {
      const result = validator.validateGmail('   ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Gmail email address is required');
    });
  });
  
  describe('validateSMTP', () => {
    it('should validate correct SMTP configuration', () => {
      const result = validator.validateSMTP(
        'smtp.example.com',
        587,
        'user@example.com',
        'password123'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject empty host', () => {
      const result = validator.validateSMTP('', 587, 'user', 'pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP host is required');
    });
    
    it('should reject host exceeding 255 characters', () => {
      const longHost = 'a'.repeat(256);
      const result = validator.validateSMTP(longHost, 587, 'user', 'pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP host exceeds maximum length (255)');
    });
    
    it('should reject missing port', () => {
      const result = validator.validateSMTP('smtp.example.com', 0, 'user', 'pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP port is required');
    });
    
    it('should reject invalid port (too low)', () => {
      const result = validator.validateSMTP('smtp.example.com', -1, 'user', 'pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP port must be between 1 and 65535');
    });
    
    it('should reject invalid port (too high)', () => {
      const result = validator.validateSMTP('smtp.example.com', 70000, 'user', 'pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP port must be between 1 and 65535');
    });
    
    it('should warn about non-standard port', () => {
      const result = validator.validateSMTP('smtp.example.com', 8080, 'user', 'pass');
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Non-standard SMTP port (8080). Common ports: 25, 465, 587, 2525');
    });
    
    it('should accept standard ports without warning', () => {
      const ports = [25, 465, 587, 2525];
      ports.forEach(port => {
        const result = validator.validateSMTP('smtp.example.com', port, 'user', 'pass');
        expect(result.valid).toBe(true);
        expect(result.warnings || []).not.toContain('Non-standard SMTP port');
      });
    });
    
    it('should reject empty username', () => {
      const result = validator.validateSMTP('smtp.example.com', 587, '', 'pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP username is required');
    });
    
    it('should reject username exceeding 255 characters', () => {
      const longUsername = 'a'.repeat(256);
      const result = validator.validateSMTP('smtp.example.com', 587, longUsername, 'pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP username exceeds maximum length (255)');
    });
    
    it('should reject empty password', () => {
      const result = validator.validateSMTP('smtp.example.com', 587, 'user', '');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP password is required');
    });
    
    it('should warn about short password', () => {
      const result = validator.validateSMTP('smtp.example.com', 587, 'user', 'abc');
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('SMTP password seems short. Ensure it is correct.');
    });
    
    it('should accept password of 4+ characters without warning', () => {
      const result = validator.validateSMTP('smtp.example.com', 587, 'user', 'abcd');
      expect(result.valid).toBe(true);
      expect(result.warnings || []).not.toContain('SMTP password seems short');
    });
    
    it('should handle whitespace-only fields correctly', () => {
      const result = validator.validateSMTP('   ', 587, '   ', '   ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP host is required');
      expect(result.errors).toContain('SMTP username is required');
      expect(result.errors).toContain('SMTP password is required');
    });
  });
  
  describe('validateSendGrid', () => {
    it('should validate correct SendGrid configuration', () => {
      const result = validator.validateSendGrid(
        'SG.1234567890abcdefghijklmnopqrstuvwxyz',
        'sender@example.com'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject empty API key', () => {
      const result = validator.validateSendGrid('', 'sender@example.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SendGrid API key is required');
    });
    
    it('should reject API key without SG. prefix', () => {
      const result = validator.validateSendGrid('1234567890abcdefg', 'sender@example.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid SendGrid API key format (must start with "SG.")');
    });
    
    it('should reject API key that is too short', () => {
      const result = validator.validateSendGrid('SG.short', 'sender@example.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SendGrid API key seems too short');
    });
    
    it('should reject empty from email', () => {
      const result = validator.validateSendGrid('SG.1234567890abcdefghijklmnopqrstuvwxyz', '');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('From email address is required');
    });
    
    it('should reject invalid from email format', () => {
      const result = validator.validateSendGrid('SG.1234567890abcdefghijklmnopqrstuvwxyz', 'not-an-email');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid from email format');
    });
    
    it('should reject whitespace-only API key', () => {
      const result = validator.validateSendGrid('   ', 'sender@example.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SendGrid API key is required');
    });
  });
  
  describe('testSMTP', () => {
    it('should return success for valid SMTP configuration', async () => {
      const config: any = {
        provider: EmailProvider.SMTP,
        workspace_id: 'test-workspace',
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password_encrypted: Buffer.from('password123'),
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'Test User',
        smtp_from_email: 'user@example.com',
      };
      
      const result = await validator.testSMTP(config);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('SMTP connection successful');
      expect(result.details).toBeDefined();
      expect(result.details?.smtp_verified).toBe(true);
      expect(result.details?.test_email_sent).toBe(true);
      expect(result.details?.response_time_ms).toBeGreaterThan(0);
    });
    
    it('should return error for invalid SMTP configuration', async () => {
      const config: any = {
        provider: EmailProvider.SMTP,
        workspace_id: 'test-workspace',
        smtp_host: '',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password_encrypted: Buffer.from('password123'),
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'Test User',
        smtp_from_email: 'user@example.com',
      };
      
      const result = await validator.testSMTP(config);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid SMTP configuration');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('SMTP host is required');
    });
  });
  
  describe('testSendGrid', () => {
    it('should return success for valid SendGrid configuration', async () => {
      const config: any = {
        provider: EmailProvider.SENDGRID,
        workspace_id: 'test-workspace',
        sendgrid_api_key_encrypted: Buffer.from('SG.1234567890abcdefghijklmnopqrstuvwxyz'),
        sendgrid_from_email: 'sender@example.com',
      };
      
      const result = await validator.testSendGrid(config);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('SendGrid connection successful');
      expect(result.details).toBeDefined();
      expect(result.details?.smtp_verified).toBe(true);
      expect(result.details?.test_email_sent).toBe(true);
      expect(result.details?.response_time_ms).toBeGreaterThan(0);
    });
    
    it('should return error for invalid SendGrid configuration', async () => {
      const config: any = {
        provider: EmailProvider.SENDGRID,
        workspace_id: 'test-workspace',
        sendgrid_api_key_encrypted: Buffer.from('invalid-key'),
        sendgrid_from_email: 'sender@example.com',
      };
      
      const result = await validator.testSendGrid(config);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid SendGrid configuration');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid SendGrid API key format');
    });
  });
  
  describe('edge cases', () => {
    it('should handle Unicode characters in SMTP fields', () => {
      const result = validator.validateSMTP(
        'smtp.例え.com',
        587,
        'user@例え.com',
        'パスワード123'
      );
      expect(result.valid).toBe(true);
    });
    
    it('should handle email with plus addressing', () => {
      const result = validator.validateGmail('user+tag@gmail.com');
      expect(result.valid).toBe(true);
    });
    
    it('should handle email with subdomain', () => {
      const result = validator.validateGmail('user@mail.company.com');
      expect(result.valid).toBe(true);
    });
    
    it('should handle long but valid email', () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const result = validator.validateGmail(longEmail);
      expect(result.valid).toBe(true);
    });
  });
});
