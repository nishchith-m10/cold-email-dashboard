/**
 * GENESIS PART VI - PHASE 62.B: ONBOARDING RATE LIMITING
 * Rate Limit Key Generator Tests
 */

import { RateLimitKeyGenerator } from '@/lib/genesis/phase62b/rate-limit-key-generator';

describe('RateLimitKeyGenerator', () => {
  describe('generateKey', () => {
    it('should generate key with correct format', () => {
      const key = RateLimitKeyGenerator.generateKey(
        'signup_per_ip',
        'ip',
        '192.168.1.1',
        'hourly'
      );

      expect(key).toBe('ip:192.168.1.1:signup_per_ip:hourly');
    });

    it('should generate different keys for different types', () => {
      const key1 = RateLimitKeyGenerator.generateKey(
        'signup_per_ip',
        'ip',
        '192.168.1.1',
        'hourly'
      );
      const key2 = RateLimitKeyGenerator.generateKey(
        'signup_per_domain',
        'email_domain',
        'gmail.com',
        'daily'
      );

      expect(key1).not.toBe(key2);
    });
  });

  describe('forSignupPerIP', () => {
    it('should generate IP signup key', () => {
      const key = RateLimitKeyGenerator.forSignupPerIP('192.168.1.1');
      expect(key).toBe('ip:192.168.1.1:signup_per_ip:hourly');
    });
  });

  describe('forSignupPerDomain', () => {
    it('should generate domain signup key', () => {
      const key = RateLimitKeyGenerator.forSignupPerDomain('gmail.com');
      expect(key).toBe('email_domain:gmail.com:signup_per_domain:daily');
    });
  });

  describe('forActiveWorkspaces', () => {
    it('should generate active workspaces key', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const key = RateLimitKeyGenerator.forActiveWorkspaces(userId);
      
      expect(key).toBe(`user:${userId}:active_workspaces:per_operation`);
    });
  });

  describe('forPendingIgnitions', () => {
    it('should generate pending ignitions key', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const key = RateLimitKeyGenerator.forPendingIgnitions(userId);
      
      expect(key).toBe(`user:${userId}:pending_ignitions:per_operation`);
    });
  });

  describe('forCsvUploads', () => {
    it('should generate CSV uploads key', () => {
      const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
      const key = RateLimitKeyGenerator.forCsvUploads(workspaceId);
      
      expect(key).toBe(`workspace:${workspaceId}:csv_uploads:hourly`);
    });
  });

  describe('forLeadsPerUpload', () => {
    it('should generate leads per upload key', () => {
      const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
      const uploadId = 'upload-123';
      const key = RateLimitKeyGenerator.forLeadsPerUpload(workspaceId, uploadId);
      
      expect(key).toContain(workspaceId);
      expect(key).toContain(uploadId);
    });
  });

  describe('parseKey', () => {
    it('should parse valid key', () => {
      const key = 'ip:192.168.1.1:signup_per_ip:hourly';
      const parsed = RateLimitKeyGenerator.parseKey(key);

      expect(parsed).not.toBeNull();
      expect(parsed?.scope).toBe('ip');
      expect(parsed?.identifier).toBe('192.168.1.1');
      expect(parsed?.type).toBe('signup_per_ip');
      expect(parsed?.window).toBe('hourly');
    });

    it('should return null for invalid key', () => {
      const parsed = RateLimitKeyGenerator.parseKey('invalid');
      expect(parsed).toBeNull();
    });

    it('should parse all standard key formats', () => {
      const keys = [
        RateLimitKeyGenerator.forSignupPerIP('192.168.1.1'),
        RateLimitKeyGenerator.forSignupPerDomain('gmail.com'),
        RateLimitKeyGenerator.forActiveWorkspaces('user-123'),
        RateLimitKeyGenerator.forPendingIgnitions('user-123'),
        RateLimitKeyGenerator.forCsvUploads('workspace-123'),
      ];

      keys.forEach(key => {
        const parsed = RateLimitKeyGenerator.parseKey(key);
        expect(parsed).not.toBeNull();
      });
    });
  });

  describe('extractEmailDomain', () => {
    it('should extract domain from email', () => {
      expect(RateLimitKeyGenerator.extractEmailDomain('user@gmail.com')).toBe('gmail.com');
      expect(RateLimitKeyGenerator.extractEmailDomain('test@example.org')).toBe('example.org');
    });

    it('should lowercase domain', () => {
      expect(RateLimitKeyGenerator.extractEmailDomain('USER@GMAIL.COM')).toBe('gmail.com');
    });

    it('should throw error for invalid email', () => {
      expect(() => {
        RateLimitKeyGenerator.extractEmailDomain('invalid-email');
      }).toThrow('Invalid email format');
    });

    it('should handle subdomain emails', () => {
      expect(RateLimitKeyGenerator.extractEmailDomain('user@mail.company.com')).toBe('mail.company.com');
    });
  });

  describe('normalizeIP', () => {
    it('should remove IPv6 prefix', () => {
      expect(RateLimitKeyGenerator.normalizeIP('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('should lowercase IP', () => {
      expect(RateLimitKeyGenerator.normalizeIP('192.168.1.1')).toBe('192.168.1.1');
    });

    it('should handle plain IPv4', () => {
      expect(RateLimitKeyGenerator.normalizeIP('10.0.0.1')).toBe('10.0.0.1');
    });
  });

  describe('validateIdentifier', () => {
    it('should validate IP addresses', () => {
      const result = RateLimitKeyGenerator.validateIdentifier('ip', '192.168.1.1');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid IP format', () => {
      const result = RateLimitKeyGenerator.validateIdentifier('ip', 'not-an-ip');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid IP');
    });

    it('should validate email domains', () => {
      const result = RateLimitKeyGenerator.validateIdentifier('email_domain', 'gmail.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid domain format', () => {
      const result = RateLimitKeyGenerator.validateIdentifier('email_domain', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid email domain');
    });

    it('should validate UUIDs for users', () => {
      const result = RateLimitKeyGenerator.validateIdentifier(
        'user',
        '123e4567-e89b-12d3-a456-426614174000'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = RateLimitKeyGenerator.validateIdentifier('user', 'not-a-uuid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid UUID');
    });

    it('should reject empty identifier', () => {
      const result = RateLimitKeyGenerator.validateIdentifier('ip', '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('isKeyExpired', () => {
    it('should return false for recent hourly key', () => {
      const windowStart = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      expect(RateLimitKeyGenerator.isKeyExpired(windowStart, 'hourly')).toBe(false);
    });

    it('should return true for expired hourly key', () => {
      const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      expect(RateLimitKeyGenerator.isKeyExpired(windowStart, 'hourly')).toBe(true);
    });

    it('should return false for recent daily key', () => {
      const windowStart = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      expect(RateLimitKeyGenerator.isKeyExpired(windowStart, 'daily')).toBe(false);
    });

    it('should return true for expired daily key', () => {
      const windowStart = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(RateLimitKeyGenerator.isKeyExpired(windowStart, 'daily')).toBe(true);
    });

    it('should return false for per_operation keys', () => {
      const windowStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      expect(RateLimitKeyGenerator.isKeyExpired(windowStart, 'per_operation')).toBe(false);
    });
  });

  describe('calculateExpiry', () => {
    it('should calculate hourly expiry', () => {
      const windowStart = new Date('2024-01-01T10:30:00Z');
      const expiry = RateLimitKeyGenerator.calculateExpiry(windowStart, 'hourly');

      expect(expiry.getTime()).toBeGreaterThan(windowStart.getTime());
      const diff = expiry.getTime() - windowStart.getTime();
      expect(diff).toBeLessThanOrEqual(60 * 60 * 1000); // Max 1 hour
    });

    it('should calculate daily expiry', () => {
      const windowStart = new Date('2024-01-01T10:30:00Z');
      const expiry = RateLimitKeyGenerator.calculateExpiry(windowStart, 'daily');

      expect(expiry.getTime()).toBeGreaterThan(windowStart.getTime());
      const diff = expiry.getTime() - windowStart.getTime();
      expect(diff).toBeLessThanOrEqual(24 * 60 * 60 * 1000); // Max 24 hours
    });

    it('should calculate far future expiry for per_operation', () => {
      const windowStart = new Date('2024-01-01T10:30:00Z');
      const expiry = RateLimitKeyGenerator.calculateExpiry(windowStart, 'per_operation');

      expect(expiry.getFullYear()).toBe(windowStart.getFullYear() + 1);
    });
  });

  describe('Integration: Complete Key Lifecycle', () => {
    it('should generate, parse, and validate key', () => {
      const ipAddress = '192.168.1.1';
      
      // Generate key
      const key = RateLimitKeyGenerator.forSignupPerIP(ipAddress);
      expect(key).toBeTruthy();

      // Parse key
      const parsed = RateLimitKeyGenerator.parseKey(key);
      expect(parsed).not.toBeNull();
      expect(parsed?.identifier).toBe(ipAddress);

      // Validate identifier
      const validation = RateLimitKeyGenerator.validateIdentifier('ip', ipAddress);
      expect(validation.valid).toBe(true);
    });

    it('should handle email-based workflow', () => {
      const email = 'user@gmail.com';
      
      // Extract domain
      const domain = RateLimitKeyGenerator.extractEmailDomain(email);
      expect(domain).toBe('gmail.com');

      // Generate key
      const key = RateLimitKeyGenerator.forSignupPerDomain(domain);
      expect(key).toContain('gmail.com');

      // Validate domain
      const validation = RateLimitKeyGenerator.validateIdentifier('email_domain', domain);
      expect(validation.valid).toBe(true);
    });
  });
});
