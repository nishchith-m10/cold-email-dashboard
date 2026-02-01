/**
 * GENESIS PART VI - PHASE 62.B: ONBOARDING RATE LIMITING
 * Rate Limit Checker Tests
 */

import { RateLimitChecker } from '@/lib/genesis/phase62b/rate-limit-checker';
import { RATE_LIMIT_CONFIGS } from '@/lib/genesis/phase62b/rate-limit-types';

describe('RateLimitChecker', () => {
  describe('checkLimit', () => {
    it('should allow operation within limit', () => {
      const result = RateLimitChecker.checkLimit({
        type: 'signup_per_ip',
        identifier: '192.168.1.1',
        current_count: 2,
      });

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(1);
    });

    it('should block operation exceeding limit', () => {
      const result = RateLimitChecker.checkLimit({
        type: 'signup_per_ip',
        identifier: '192.168.1.1',
        current_count: 3,
      });

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.message).toBeDefined();
    });

    it('should default to 0 if current_count not provided', () => {
      const result = RateLimitChecker.checkLimit({
        type: 'signup_per_ip',
        identifier: '192.168.1.1',
      });

      expect(result.current).toBe(0);
      expect(result.remaining).toBe(3);
    });

    it('should include reset time', () => {
      const result = RateLimitChecker.checkLimit({
        type: 'signup_per_ip',
        identifier: '192.168.1.1',
        current_count: 2,
      });

      expect(result.reset_at).toBeInstanceOf(Date);
      expect(result.reset_at.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('checkSignupByIP', () => {
    it('should check IP signup rate limit', () => {
      const result = RateLimitChecker.checkSignupByIP('192.168.1.1', 2);

      expect(result.limit).toBe(3);
      expect(result.current).toBe(2);
      expect(result.allowed).toBe(true);
    });

    it('should block after 3 signups', () => {
      const result = RateLimitChecker.checkSignupByIP('192.168.1.1', 3);

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('Too many signups');
    });

    it('should normalize IP address', () => {
      const result = RateLimitChecker.checkSignupByIP('::ffff:192.168.1.1', 1);
      expect(result).toBeDefined();
    });
  });

  describe('checkSignupByDomain', () => {
    it('should check domain signup rate limit', () => {
      const result = RateLimitChecker.checkSignupByDomain('gmail.com', 8);

      expect(result.limit).toBe(10);
      expect(result.current).toBe(8);
      expect(result.remaining).toBe(2);
    });

    it('should block after 10 signups per domain', () => {
      const result = RateLimitChecker.checkSignupByDomain('gmail.com', 10);

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('email domain');
    });

    it('should lowercase domain', () => {
      const result = RateLimitChecker.checkSignupByDomain('GMAIL.COM', 5);
      expect(result).toBeDefined();
    });
  });

  describe('checkActiveWorkspaces', () => {
    it('should check active workspaces limit', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkActiveWorkspaces(userId, 3);

      expect(result.limit).toBe(5);
      expect(result.current).toBe(3);
      expect(result.allowed).toBe(true);
    });

    it('should block after 5 workspaces', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkActiveWorkspaces(userId, 5);

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('Maximum 5 active workspaces');
    });
  });

  describe('checkPendingIgnitions', () => {
    it('should allow first pending ignition', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkPendingIgnitions(userId, 0);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
    });

    it('should block second pending ignition', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkPendingIgnitions(userId, 1);

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('pending ignition');
    });
  });

  describe('checkCsvUploads', () => {
    it('should check CSV upload rate limit', () => {
      const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkCsvUploads(workspaceId, 3);

      expect(result.limit).toBe(5);
      expect(result.current).toBe(3);
      expect(result.allowed).toBe(true);
    });

    it('should block after 5 uploads per hour', () => {
      const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkCsvUploads(workspaceId, 5);

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('Maximum 5 CSV uploads');
    });
  });

  describe('checkLeadsPerUpload', () => {
    it('should allow uploads under 5000 leads', () => {
      const result = RateLimitChecker.checkLeadsPerUpload(4500);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5000);
    });

    it('should block uploads over 5000 leads', () => {
      const result = RateLimitChecker.checkLeadsPerUpload(5001);

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('Maximum 5000 leads');
    });

    it('should allow exactly 5000 leads', () => {
      const result = RateLimitChecker.checkLeadsPerUpload(5000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should get config for rate limit type', () => {
      const config = RateLimitChecker.getConfig('signup_per_ip');

      expect(config.type).toBe('signup_per_ip');
      expect(config.limit).toBe(3);
      expect(config.window).toBe('hourly');
    });
  });

  describe('getAllConfigs', () => {
    it('should return all rate limit configs', () => {
      const configs = RateLimitChecker.getAllConfigs();

      expect(Object.keys(configs)).toHaveLength(6);
      expect(configs.signup_per_ip).toBeDefined();
      expect(configs.signup_per_domain).toBeDefined();
      expect(configs.active_workspaces).toBeDefined();
      expect(configs.pending_ignitions).toBeDefined();
      expect(configs.csv_uploads).toBeDefined();
      expect(configs.leads_per_upload).toBeDefined();
    });
  });

  describe('isCounterExpired', () => {
    it('should return false for non-expired counter', () => {
      const counter = {
        key: 'test',
        count: 1,
        window_start: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      expect(RateLimitChecker.isCounterExpired(counter)).toBe(false);
    });

    it('should return true for expired counter', () => {
      const counter = {
        key: 'test',
        count: 1,
        window_start: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };

      expect(RateLimitChecker.isCounterExpired(counter)).toBe(true);
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter', () => {
      const counter = {
        key: 'test',
        count: 5,
        window_start: new Date(),
        expires_at: new Date(),
      };

      const incremented = RateLimitChecker.incrementCounter(counter);

      expect(incremented.count).toBe(6);
      expect(incremented.key).toBe(counter.key);
    });
  });

  describe('createCounter', () => {
    it('should create new counter with count 1', () => {
      const counter = RateLimitChecker.createCounter('test-key', 'hourly');

      expect(counter.key).toBe('test-key');
      expect(counter.count).toBe(1);
      expect(counter.window_start).toBeInstanceOf(Date);
      expect(counter.expires_at).toBeInstanceOf(Date);
    });

    it('should set expiry based on window', () => {
      const counter = RateLimitChecker.createCounter('test-key', 'hourly');

      expect(counter.expires_at.getTime()).toBeGreaterThan(counter.window_start.getTime());
    });
  });

  describe('formatLimitInfo', () => {
    it('should format limit info', () => {
      const info = RateLimitChecker.formatLimitInfo('signup_per_ip');

      expect(info).toContain('Signups per IP');
      expect(info).toContain('3');
    });

    it('should format all limit types', () => {
      const types = [
        'signup_per_ip',
        'signup_per_domain',
        'active_workspaces',
        'pending_ignitions',
        'csv_uploads',
        'leads_per_upload',
      ] as const;

      types.forEach(type => {
        const info = RateLimitChecker.formatLimitInfo(type);
        expect(info).toBeTruthy();
      });
    });
  });

  describe('Blocked Messages', () => {
    it('should include time until reset in message', () => {
      const result = RateLimitChecker.checkSignupByIP('192.168.1.1', 3);

      expect(result.message).toBeDefined();
      expect(result.message).toMatch(/in \d+ (minute|hour|day)/);
    });

    it('should provide actionable message for workspaces limit', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkActiveWorkspaces(userId, 5);

      expect(result.message).toContain('delete unused workspaces');
    });

    it('should provide actionable message for pending ignitions', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RateLimitChecker.checkPendingIgnitions(userId, 1);

      expect(result.message).toContain('Complete or cancel');
    });
  });

  describe('Integration: Rate Limit Flow', () => {
    it('should handle complete signup flow', () => {
      const ipAddress = '192.168.1.1';

      // First signup - allowed
      const check1 = RateLimitChecker.checkSignupByIP(ipAddress, 0);
      expect(check1.allowed).toBe(true);

      // Second signup - allowed
      const check2 = RateLimitChecker.checkSignupByIP(ipAddress, 1);
      expect(check2.allowed).toBe(true);
      expect(check2.remaining).toBe(2);

      // Third signup - allowed (at limit)
      const check3 = RateLimitChecker.checkSignupByIP(ipAddress, 2);
      expect(check3.allowed).toBe(true);
      expect(check3.remaining).toBe(1);

      // Fourth signup - blocked
      const check4 = RateLimitChecker.checkSignupByIP(ipAddress, 3);
      expect(check4.blocked).toBe(true);
      expect(check4.message).toBeDefined();
    });

    it('should handle CSV upload flow', () => {
      const workspaceId = '123e4567-e89b-12d3-a456-426614174000';

      // Progressive uploads
      for (let i = 0; i < 5; i++) {
        const result = RateLimitChecker.checkCsvUploads(workspaceId, i);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - i);
      }

      // 6th upload blocked
      const blocked = RateLimitChecker.checkCsvUploads(workspaceId, 5);
      expect(blocked.blocked).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero current count', () => {
      const result = RateLimitChecker.checkSignupByIP('192.168.1.1', 0);
      expect(result.remaining).toBe(3);
    });

    it('should handle at-limit count', () => {
      const result = RateLimitChecker.checkSignupByIP('192.168.1.1', 3);
      expect(result.remaining).toBe(0);
      expect(result.blocked).toBe(true);
    });

    it('should handle over-limit count', () => {
      const result = RateLimitChecker.checkSignupByIP('192.168.1.1', 5);
      expect(result.remaining).toBe(0);
      expect(result.blocked).toBe(true);
    });
  });
});
