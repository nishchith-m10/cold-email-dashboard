/**
 * GENESIS PART VI - PHASE 60.D: N8N AUTHENTICATION & ACCESS CONTROL
 * Credential Generator Tests
 */

import { CredentialGenerator } from '@/lib/genesis/phase61b/credential-generator';
import { DEFAULT_N8N_PASSWORD_OPTIONS } from '@/lib/genesis/phase61b/n8n-types';

describe('CredentialGenerator', () => {
  describe('generatePassword', () => {
    it('should generate password with default options', () => {
      const password = CredentialGenerator.generatePassword();
      
      expect(password).toBeDefined();
      expect(password.length).toBe(DEFAULT_N8N_PASSWORD_OPTIONS.length);
    });

    it('should generate password with specified length', () => {
      const password = CredentialGenerator.generatePassword({ ...DEFAULT_N8N_PASSWORD_OPTIONS, length: 16 });
      
      expect(password.length).toBe(16);
    });

    it('should include uppercase letters when specified', () => {
      const password = CredentialGenerator.generatePassword({
        length: 20,
        include_uppercase: true,
        include_lowercase: false,
        include_numbers: false,
        include_symbols: false,
      });
      
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(false);
    });

    it('should include lowercase letters when specified', () => {
      const password = CredentialGenerator.generatePassword({
        length: 20,
        include_uppercase: false,
        include_lowercase: true,
        include_numbers: false,
        include_symbols: false,
      });
      
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(false);
    });

    it('should include numbers when specified', () => {
      const password = CredentialGenerator.generatePassword({
        length: 20,
        include_uppercase: false,
        include_lowercase: false,
        include_numbers: true,
        include_symbols: false,
      });
      
      expect(/[0-9]/.test(password)).toBe(true);
    });

    it('should include symbols when specified', () => {
      const password = CredentialGenerator.generatePassword({
        length: 20,
        include_uppercase: false,
        include_lowercase: false,
        include_numbers: false,
        include_symbols: true,
      });
      
      expect(/[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should include all character types when all options enabled', () => {
      const password = CredentialGenerator.generatePassword(DEFAULT_N8N_PASSWORD_OPTIONS);
      
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should throw error when no character types are included', () => {
      expect(() => {
        CredentialGenerator.generatePassword({
          length: 20,
          include_uppercase: false,
          include_lowercase: false,
          include_numbers: false,
          include_symbols: false,
        });
      }).toThrow('At least one character type must be included');
    });

    it('should throw error when length is too short for required character types', () => {
      expect(() => {
        CredentialGenerator.generatePassword({
          length: 2,
          include_uppercase: true,
          include_lowercase: true,
          include_numbers: true,
          include_symbols: true,
        });
      }).toThrow('Password length must be at least the number of required character types');
    });

    it('should generate different passwords on each call', () => {
      const password1 = CredentialGenerator.generatePassword();
      const password2 = CredentialGenerator.generatePassword();
      
      expect(password1).not.toBe(password2);
    });

    it('should meet n8n password requirements by default', () => {
      const password = CredentialGenerator.generatePassword();
      const validation = CredentialGenerator.validatePassword(password);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('generateOwnerCredentials', () => {
    it('should generate credentials with correct format', () => {
      const credentials = CredentialGenerator.generateOwnerCredentials('ws-123', 'acmecorp');
      
      expect(credentials.workspace_id).toBe('ws-123');
      expect(credentials.workspace_slug).toBe('acmecorp');
      expect(credentials.email).toBe('admin_acmecorp@genesis.local');
      expect(credentials.password).toBeDefined();
      expect(credentials.password.length).toBeGreaterThan(0);
    });

    it('should generate valid password', () => {
      const credentials = CredentialGenerator.generateOwnerCredentials('ws-123', 'testcorp');
      const validation = CredentialGenerator.validatePassword(credentials.password);
      
      expect(validation.valid).toBe(true);
    });

    it('should generate valid email', () => {
      const credentials = CredentialGenerator.generateOwnerCredentials('ws-123', 'testcorp');
      const validation = CredentialGenerator.validateEmail(credentials.email);
      
      expect(validation.valid).toBe(true);
    });

    it('should generate unique passwords for different workspaces', () => {
      const creds1 = CredentialGenerator.generateOwnerCredentials('ws-1', 'corp1');
      const creds2 = CredentialGenerator.generateOwnerCredentials('ws-2', 'corp2');
      
      expect(creds1.password).not.toBe(creds2.password);
    });

    it('should use workspace slug in email', () => {
      const credentials = CredentialGenerator.generateOwnerCredentials('ws-123', 'my_company');
      
      expect(credentials.email).toContain('my_company');
      expect(credentials.email).toMatch(/^admin_\w+@genesis\.local$/);
    });
  });

  describe('generateJwtSecret', () => {
    it('should generate JWT secret with default length', () => {
      const secret = CredentialGenerator.generateJwtSecret();
      
      expect(secret).toBeDefined();
      expect(secret.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate JWT secret with specified length', () => {
      const secret = CredentialGenerator.generateJwtSecret(16);
      
      expect(secret.length).toBe(32); // 16 bytes = 32 hex characters
    });

    it('should generate different secrets on each call', () => {
      const secret1 = CredentialGenerator.generateJwtSecret();
      const secret2 = CredentialGenerator.generateJwtSecret();
      
      expect(secret1).not.toBe(secret2);
    });

    it('should generate hex string', () => {
      const secret = CredentialGenerator.generateJwtSecret();
      
      expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate encryption key with default length', () => {
      const key = CredentialGenerator.generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(key.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate encryption key with specified length', () => {
      const key = CredentialGenerator.generateEncryptionKey(16);
      
      expect(key.length).toBe(32); // 16 bytes = 32 hex characters
    });

    it('should generate different keys on each call', () => {
      const key1 = CredentialGenerator.generateEncryptionKey();
      const key2 = CredentialGenerator.generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });

    it('should generate hex string', () => {
      const key = CredentialGenerator.generateEncryptionKey();
      
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', () => {
      const validation = CredentialGenerator.validatePassword('Abcd1234!');
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const validation = CredentialGenerator.validatePassword('Abc12!');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const validation = CredentialGenerator.validatePassword('abcd1234!');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const validation = CredentialGenerator.validatePassword('ABCD1234!');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const validation = CredentialGenerator.validatePassword('Abcdefgh!');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password must contain at least one number');
    });

    it('should accumulate multiple errors', () => {
      const validation = CredentialGenerator.validatePassword('abc');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });

    it('should accept password with exactly 8 characters', () => {
      const validation = CredentialGenerator.validatePassword('Abcd1234');
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const validation = CredentialGenerator.validateEmail('admin_test@genesis.local');
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject empty email', () => {
      const validation = CredentialGenerator.validateEmail('');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Email is required');
    });

    it('should reject email without @', () => {
      const validation = CredentialGenerator.validateEmail('admingenesis.local');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid email format');
    });

    it('should reject email without domain', () => {
      const validation = CredentialGenerator.validateEmail('admin@');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid email format');
    });

    it('should reject email without local part', () => {
      const validation = CredentialGenerator.validateEmail('@genesis.local');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid email format');
    });

    it('should accept various valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'admin_test@genesis.local',
        'user.name@domain.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach(email => {
        const validation = CredentialGenerator.validateEmail(email);
        expect(validation.valid).toBe(true);
      });
    });
  });

  describe('generateWorkspaceSlug', () => {
    it('should convert to lowercase', () => {
      const slug = CredentialGenerator.generateWorkspaceSlug('AcmeCorp');
      
      expect(slug).toBe('acmecorp');
    });

    it('should replace spaces with underscores', () => {
      const slug = CredentialGenerator.generateWorkspaceSlug('Acme Corp');
      
      expect(slug).toBe('acme_corp');
    });

    it('should replace special characters with underscores', () => {
      const slug = CredentialGenerator.generateWorkspaceSlug('Acme@Corp!');
      
      expect(slug).toBe('acme_corp');
    });

    it('should remove leading underscores', () => {
      const slug = CredentialGenerator.generateWorkspaceSlug('   Acme');
      
      expect(slug).not.toMatch(/^_/);
    });

    it('should remove trailing underscores', () => {
      const slug = CredentialGenerator.generateWorkspaceSlug('Acme   ');
      
      expect(slug).not.toMatch(/_$/);
    });

    it('should limit length to 30 characters', () => {
      const longName = 'A'.repeat(50);
      const slug = CredentialGenerator.generateWorkspaceSlug(longName);
      
      expect(slug.length).toBeLessThanOrEqual(30);
    });

    it('should handle multiple consecutive special characters', () => {
      const slug = CredentialGenerator.generateWorkspaceSlug('Acme!!!Corp');
      
      expect(slug).toBe('acme_corp');
    });

    it('should handle hyphenated names', () => {
      const slug = CredentialGenerator.generateWorkspaceSlug('Acme-Corp-LLC');
      
      expect(slug).toBe('acme_corp_llc');
    });
  });
});
