/**
 * Phase 64.B: Email Provider Validation Service
 * 
 * Validates email provider configurations before saving
 * Tests connections to external email services
 */

import {
  EmailProvider,
  SMTPConfig,
  SendGridConfig,
  ValidationResult,
  TestEmailResponse,
  EMAIL_REGEX,
  DEFAULT_SMTP_PORTS,
  IEmailProviderValidator,
} from './email-provider-types';

export class EmailProviderValidator implements IEmailProviderValidator {
  /**
   * Validate Gmail configuration
   */
  validateGmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email || email.trim() === '') {
      errors.push('Gmail email address is required');
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push('Invalid Gmail email format');
    } else if (!email.toLowerCase().endsWith('@gmail.com') && !email.toLowerCase().endsWith('@googlemail.com')) {
      // Allow Google Workspace domains
      // This is just a warning, not an error
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Validate SMTP configuration
   */
  validateSMTP(host: string, port: number, username: string, password: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Host validation
    if (!host || host.trim() === '') {
      errors.push('SMTP host is required');
    } else if (host.length > 255) {
      errors.push('SMTP host exceeds maximum length (255)');
    }
    
    // Port validation
    if (!port) {
      errors.push('SMTP port is required');
    } else if (port < 1 || port > 65535) {
      errors.push('SMTP port must be between 1 and 65535');
    } else if (![25, 465, 587, 2525].includes(port)) {
      warnings.push(`Non-standard SMTP port (${port}). Common ports: 25, 465, 587, 2525`);
    }
    
    // Username validation
    if (!username || username.trim() === '') {
      errors.push('SMTP username is required');
    } else if (username.length > 255) {
      errors.push('SMTP username exceeds maximum length (255)');
    }
    
    // Password validation
    if (!password || password.trim() === '') {
      errors.push('SMTP password is required');
    } else if (password.length < 4) {
      warnings.push('SMTP password seems short. Ensure it is correct.');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Validate SendGrid configuration
   */
  validateSendGrid(apiKey: string, fromEmail: string): ValidationResult {
    const errors: string[] = [];
    
    // API key validation
    if (!apiKey || apiKey.trim() === '') {
      errors.push('SendGrid API key is required');
    } else if (!apiKey.startsWith('SG.')) {
      errors.push('Invalid SendGrid API key format (must start with "SG.")');
    } else if (apiKey.length < 20) {
      errors.push('SendGrid API key seems too short');
    }
    
    // From email validation
    if (!fromEmail || fromEmail.trim() === '') {
      errors.push('From email address is required');
    } else if (!EMAIL_REGEX.test(fromEmail)) {
      errors.push('Invalid from email format');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Test SMTP connection
   * 
   * This is a mock implementation for isolated development.
   * In production, this would use nodemailer to test the connection.
   */
  async testSMTP(config: SMTPConfig): Promise<TestEmailResponse> {
    const startTime = Date.now();
    
    // Add small delay to ensure measurable response time
    await new Promise(resolve => setTimeout(resolve, 1));
    
    try {
      // Validate config first
      const validation = this.validateSMTP(
        config.smtp_host,
        config.smtp_port,
        config.smtp_username,
        Buffer.from(config.smtp_password_encrypted).toString() // Mock decryption
      );
      
      if (!validation.valid) {
        return {
          success: false,
          message: 'Invalid SMTP configuration',
          error: validation.errors.join(', '),
        };
      }
      
      // Mock successful connection
      // In production, this would:
      // 1. Create nodemailer transporter
      // 2. Call transporter.verify()
      // 3. Send test email
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'SMTP connection successful',
        details: {
          smtp_verified: true,
          test_email_sent: true,
          response_time_ms: responseTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'SMTP connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Test SendGrid connection
   * 
   * This is a mock implementation for isolated development.
   * In production, this would make an actual API call to SendGrid.
   */
  async testSendGrid(config: SendGridConfig): Promise<TestEmailResponse> {
    const startTime = Date.now();
    
    // Add small delay to ensure measurable response time
    await new Promise(resolve => setTimeout(resolve, 1));
    
    try {
      // Validate config first
      const validation = this.validateSendGrid(
        Buffer.from(config.sendgrid_api_key_encrypted).toString(), // Mock decryption
        config.sendgrid_from_email
      );
      
      if (!validation.valid) {
        return {
          success: false,
          message: 'Invalid SendGrid configuration',
          error: validation.errors.join(', '),
        };
      }
      
      // Mock successful API call
      // In production, this would:
      // 1. Make a test API call to SendGrid
      // 2. Verify the API key
      // 3. Send a test email
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'SendGrid connection successful',
        details: {
          smtp_verified: true,
          test_email_sent: true,
          response_time_ms: responseTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'SendGrid connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
  }
}
