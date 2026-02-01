/**
 * GENESIS PART VI - PHASE 62.B: ONBOARDING RATE LIMITING
 * Rate Limit Key Generator
 * 
 * Generates unique keys for rate limit tracking
 */

import type { RateLimitType, RateLimitScope, RateLimitWindow } from './rate-limit-types';

/**
 * Rate Limit Key Generator
 * Creates consistent keys for rate limit counters
 */
export class RateLimitKeyGenerator {
  /**
   * Generate rate limit key
   */
  static generateKey(
    type: RateLimitType,
    scope: RateLimitScope,
    identifier: string,
    window: RateLimitWindow
  ): string {
    // Format: {scope}:{identifier}:{type}:{window}
    // Examples:
    //   - ip:192.168.1.1:signup:hourly
    //   - user:uuid-123:workspaces:per_operation
    //   - email_domain:gmail.com:signup:daily
    
    return `${scope}:${identifier}:${type}:${window}`;
  }

  /**
   * Generate key for signup per IP
   */
  static forSignupPerIP(ipAddress: string): string {
    return this.generateKey('signup_per_ip', 'ip', ipAddress, 'hourly');
  }

  /**
   * Generate key for signup per domain
   */
  static forSignupPerDomain(emailDomain: string): string {
    return this.generateKey('signup_per_domain', 'email_domain', emailDomain, 'daily');
  }

  /**
   * Generate key for active workspaces
   */
  static forActiveWorkspaces(userId: string): string {
    return this.generateKey('active_workspaces', 'user', userId, 'per_operation');
  }

  /**
   * Generate key for pending ignitions
   */
  static forPendingIgnitions(userId: string): string {
    return this.generateKey('pending_ignitions', 'user', userId, 'per_operation');
  }

  /**
   * Generate key for CSV uploads
   */
  static forCsvUploads(workspaceId: string): string {
    return this.generateKey('csv_uploads', 'workspace', workspaceId, 'hourly');
  }

  /**
   * Generate key for leads per upload
   */
  static forLeadsPerUpload(workspaceId: string, uploadId: string): string {
    // For per-operation limits, append operation identifier
    return `workspace:${workspaceId}:leads_per_upload:${uploadId}`;
  }

  /**
   * Parse key to extract components
   */
  static parseKey(key: string): {
    scope: string;
    identifier: string;
    type: string;
    window: string;
  } | null {
    const parts = key.split(':');
    
    if (parts.length < 4) {
      return null;
    }

    return {
      scope: parts[0],
      identifier: parts[1],
      type: parts[2],
      window: parts[3],
    };
  }

  /**
   * Extract email domain from email address
   */
  static extractEmailDomain(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) {
      throw new Error('Invalid email format');
    }
    return parts[1].toLowerCase();
  }

  /**
   * Normalize IP address
   */
  static normalizeIP(ipAddress: string): string {
    // Remove IPv6 prefix if present
    return ipAddress.replace(/^::ffff:/, '').toLowerCase();
  }

  /**
   * Validate identifier format
   */
  static validateIdentifier(
    scope: RateLimitScope,
    identifier: string
  ): { valid: boolean; error?: string } {
    if (!identifier || identifier.trim().length === 0) {
      return { valid: false, error: 'Identifier is required' };
    }

    switch (scope) {
      case 'ip':
        // Basic IP validation (IPv4 and IPv6)
        if (!/^[\d.:a-f]+$/i.test(identifier)) {
          return { valid: false, error: 'Invalid IP address format' };
        }
        break;

      case 'email_domain':
        // Basic domain validation
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(identifier)) {
          return { valid: false, error: 'Invalid email domain format' };
        }
        break;

      case 'user':
      case 'workspace':
        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(identifier)) {
          return { valid: false, error: 'Invalid UUID format' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Check if key has expired based on window
   */
  static isKeyExpired(windowStart: Date, window: RateLimitWindow): boolean {
    const now = new Date();
    const elapsed = now.getTime() - windowStart.getTime();

    switch (window) {
      case 'hourly':
        return elapsed > 60 * 60 * 1000; // 1 hour

      case 'daily':
        return elapsed > 24 * 60 * 60 * 1000; // 24 hours

      case 'per_operation':
        return false; // Never expires automatically

      default:
        return false;
    }
  }

  /**
   * Calculate expiry time based on window
   */
  static calculateExpiry(windowStart: Date, window: RateLimitWindow): Date {
    const expiry = new Date(windowStart);

    switch (window) {
      case 'hourly':
        expiry.setHours(expiry.getHours() + 1);
        break;

      case 'daily':
        expiry.setDate(expiry.getDate() + 1);
        break;

      case 'per_operation':
        // Set far future expiry (1 year)
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
    }

    return expiry;
  }
}
