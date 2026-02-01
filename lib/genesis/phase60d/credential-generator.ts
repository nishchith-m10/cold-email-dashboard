/**
 * GENESIS PART VI - PHASE 60.D: N8N AUTHENTICATION & ACCESS CONTROL
 * Credential Generator
 * 
 * Generates secure credentials for n8n owner accounts
 */

import { randomBytes } from 'crypto';
import type {
  N8nOwnerCredentials,
  PasswordGenerationOptions,
} from './n8n-types';
import { DEFAULT_N8N_PASSWORD_OPTIONS } from './n8n-types';

/**
 * Credential Generator
 * Generates secure passwords and owner account credentials
 */
export class CredentialGenerator {
  /**
   * Generate a secure random password
   */
  static generatePassword(options: PasswordGenerationOptions = DEFAULT_N8N_PASSWORD_OPTIONS): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';

    let charset = '';
    let requiredChars = '';

    if (options.include_uppercase) {
      charset += uppercase;
      requiredChars += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (options.include_lowercase) {
      charset += lowercase;
      requiredChars += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (options.include_numbers) {
      charset += numbers;
      requiredChars += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (options.include_symbols) {
      charset += symbols;
      requiredChars += symbols[Math.floor(Math.random() * symbols.length)];
    }

    if (charset.length === 0) {
      throw new Error('At least one character type must be included');
    }

    // Generate remaining characters
    const remainingLength = options.length - requiredChars.length;
    if (remainingLength < 0) {
      throw new Error('Password length must be at least the number of required character types');
    }

    const randomChars = Array.from(randomBytes(remainingLength))
      .map(byte => charset[byte % charset.length])
      .join('');

    // Combine and shuffle
    const password = requiredChars + randomChars;
    return this.shuffleString(password);
  }

  /**
   * Generate n8n owner account credentials
   */
  static generateOwnerCredentials(
    workspaceId: string,
    workspaceSlug: string
  ): N8nOwnerCredentials {
    // n8n requires email format (not username)
    const email = `admin_${workspaceSlug}@genesis.local`;
    const password = this.generatePassword();

    return {
      email,
      password,
      workspace_id: workspaceId,
      workspace_slug: workspaceSlug,
    };
  }

  /**
   * Generate JWT secret for n8n User Management
   */
  static generateJwtSecret(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate encryption key for n8n
   */
  static generateEncryptionKey(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Validate password meets n8n requirements
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // n8n password requirements (as of v1.0+)
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format for n8n owner account
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || email.trim().length === 0) {
      return { valid: false, error: 'Email is required' };
    }

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Generate workspace slug from workspace name
   * (for use in n8n owner email)
   */
  static generateWorkspaceSlug(workspaceName: string): string {
    return workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
      .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
      .substring(0, 30);              // Limit length
  }

  /**
   * Shuffle a string (Fisher-Yates shuffle)
   */
  private static shuffleString(str: string): string {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }
}
