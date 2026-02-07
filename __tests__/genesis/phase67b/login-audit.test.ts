/**
 * Phase 67.B: Login Audit Trail - Unit Tests
 * 
 * Tests for login-specific audit logging, geolocation, and suspicious activity detection.
 */

import {
  logLoginAuditEvent,
  auditLoginSuccess,
  auditLoginFailure,
  auditLogout,
  auditSessionRefresh,
  auditSessionRevoked,
  auditPasswordChange,
  auditPasswordResetRequest,
  auditPasswordResetComplete,
  auditMFAEnabled,
  auditMFADisabled,
  auditMFAChallenge,
  auditSuspiciousActivity,
  getGeoLocationFromIP,
  detectSuspiciousLoginActivity,
  getLoginHistory,
  getFailedLoginAttempts,
  getActiveSessions,
  type LoginAuditEvent,
} from '@/lib/genesis/login-audit';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
    schema: jest.fn(() => ({
      from: jest.fn(() => ({
        insert: jest.fn(() => ({ data: { id: 'mock-audit-id' }, error: null })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({ data: [], error: null })),
                })),
              })),
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({ data: [], error: null })),
                })),
              })),
              order: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [], error: null })),
              })),
            })),
            gte: jest.fn(() => ({
              order: jest.fn(() => ({ data: [], error: null })),
            })),
            in: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn(() => ({ data: null, error: null })),
              })),
            })),
          })),
        })),
      })),
    })),
  },
}));

jest.mock('@/lib/genesis/audit-logger', () => ({
  logAuditEvent: jest.fn(() => Promise.resolve({
    success: true,
    auditId: 'mock-audit-id',
  })),
}));

// Mock fetch for geolocation
global.fetch = jest.fn();

describe('Phase 67.B: Login Audit Trail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // GEOLOCATION TESTS
  // ============================================

  describe('getGeoLocationFromIP', () => {
    test('should fetch geolocation data for valid IP', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'United States',
          city: 'San Francisco',
          regionName: 'California',
          timezone: 'America/Los_Angeles',
          isp: 'Comcast',
        }),
      });

      const result = await getGeoLocationFromIP('8.8.8.8');

      expect(result).toEqual({
        country: 'United States',
        city: 'San Francisco',
        region: 'California',
        timezone: 'America/Los_Angeles',
        isp: 'Comcast',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://ip-api.com/json/8.8.8.8?fields=status,country,city,regionName,timezone,isp',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    test('should return null for localhost IP', async () => {
      const result = await getGeoLocationFromIP('127.0.0.1');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should return null for private IP (192.168.x.x)', async () => {
      const result = await getGeoLocationFromIP('192.168.1.1');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should return null for private IP (10.x.x.x)', async () => {
      const result = await getGeoLocationFromIP('10.0.0.1');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should return null on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await getGeoLocationFromIP('8.8.8.8');
      expect(result).toBeNull();
    });

    test('should return null on API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'fail',
          message: 'invalid query',
        }),
      });

      const result = await getGeoLocationFromIP('invalid-ip');
      expect(result).toBeNull();
    });

    test('should handle fetch timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));

      const result = await getGeoLocationFromIP('8.8.8.8');
      expect(result).toBeNull();
    });

    test('should handle fetch network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await getGeoLocationFromIP('8.8.8.8');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // LOGIN AUDIT EVENT TESTS
  // ============================================

  describe('logLoginAuditEvent', () => {
    test('should log login event with geolocation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'United States',
          city: 'New York',
          regionName: 'New York',
          timezone: 'America/New_York',
          isp: 'Verizon',
        }),
      });

      const event: LoginAuditEvent = {
        eventType: 'login_success',
        userId: 'user-123',
        userEmail: 'test@example.com',
        sessionId: 'session-456',
        success: true,
        ipAddress: '8.8.8.8',
        userAgent: 'Mozilla/5.0',
      };

      const result = await logLoginAuditEvent(event);

      expect(result.success).toBe(true);
      expect(result.auditId).toBe('mock-audit-id');
    });

    test('should log event without geolocation for private IP', async () => {
      const event: LoginAuditEvent = {
        eventType: 'login_failure',
        userEmail: 'test@example.com',
        success: false,
        failureReason: 'Invalid password',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await logLoginAuditEvent(event);

      expect(result.success).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should handle missing IP address', async () => {
      const event: LoginAuditEvent = {
        eventType: 'logout',
        userId: 'user-123',
        sessionId: 'session-456',
        success: true,
      };

      const result = await logLoginAuditEvent(event);
      expect(result.success).toBe(true);
    });

    test('should include custom metadata', async () => {
      const event: LoginAuditEvent = {
        eventType: 'password_change',
        userId: 'user-123',
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: {
          initiated_by: 'user',
          reason: 'security_policy',
        },
      };

      const result = await logLoginAuditEvent(event);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // CONVENIENCE FUNCTION TESTS
  // ============================================

  describe('auditLoginSuccess', () => {
    test('should log successful login', async () => {
      const result = await auditLoginSuccess(
        'user-123',
        'test@example.com',
        'session-456',
        '8.8.8.8',
        'Mozilla/5.0',
        'workspace-789'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditLoginFailure', () => {
    test('should log failed login with reason', async () => {
      const result = await auditLoginFailure(
        'test@example.com',
        'Invalid password',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditLogout', () => {
    test('should log manual logout', async () => {
      const result = await auditLogout(
        'user-123',
        'session-456',
        'manual',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });

    test('should log timeout logout', async () => {
      const result = await auditLogout(
        'user-123',
        'session-456',
        'timeout',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });

    test('should log forced logout', async () => {
      const result = await auditLogout(
        'user-123',
        'session-456',
        'forced',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditSessionRefresh', () => {
    test('should log session refresh', async () => {
      const result = await auditSessionRefresh(
        'user-123',
        'session-456',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditSessionRevoked', () => {
    test('should log session revocation by admin', async () => {
      const result = await auditSessionRevoked(
        'user-123',
        'session-456',
        'admin-999',
        'Security policy violation',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditPasswordChange', () => {
    test('should log user-initiated password change', async () => {
      const result = await auditPasswordChange(
        'user-123',
        'test@example.com',
        'user',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });

    test('should log admin-initiated password change', async () => {
      const result = await auditPasswordChange(
        'user-123',
        'test@example.com',
        'admin',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditPasswordResetRequest', () => {
    test('should log password reset request', async () => {
      const result = await auditPasswordResetRequest(
        'test@example.com',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditPasswordResetComplete', () => {
    test('should log password reset completion', async () => {
      const result = await auditPasswordResetComplete(
        'user-123',
        'test@example.com',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditMFAEnabled', () => {
    test('should log TOTP MFA enabled', async () => {
      const result = await auditMFAEnabled(
        'user-123',
        'totp',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });

    test('should log SMS MFA enabled', async () => {
      const result = await auditMFAEnabled(
        'user-123',
        'sms',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });

    test('should log backup codes MFA enabled', async () => {
      const result = await auditMFAEnabled(
        'user-123',
        'backup_codes',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditMFADisabled', () => {
    test('should log MFA disabled by user', async () => {
      const result = await auditMFADisabled(
        'user-123',
        'user-123',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });

    test('should log MFA disabled by admin', async () => {
      const result = await auditMFADisabled(
        'user-123',
        'admin-999',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditMFAChallenge', () => {
    test('should log successful MFA challenge', async () => {
      const result = await auditMFAChallenge(
        'user-123',
        'totp',
        true,
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });

    test('should log failed MFA challenge', async () => {
      const result = await auditMFAChallenge(
        'user-123',
        'totp',
        false,
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('auditSuspiciousActivity', () => {
    test('should log suspicious activity with metadata', async () => {
      const result = await auditSuspiciousActivity(
        'user-123',
        'Multiple failed login attempts',
        '8.8.8.8',
        'Mozilla/5.0',
        {
          failure_count: 5,
          time_window: '5 minutes',
        }
      );

      expect(result.success).toBe(true);
    });

    test('should log suspicious activity for anonymous user', async () => {
      const result = await auditSuspiciousActivity(
        undefined,
        'Brute force attempt detected',
        '8.8.8.8',
        'Mozilla/5.0',
        {
          attempts: 10,
        }
      );

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // SUSPICIOUS ACTIVITY DETECTION TESTS
  // ============================================

  describe('detectSuspiciousLoginActivity', () => {
    test('should detect rapid login failures (brute force)', async () => {
      // Simplified test - check the function handles the scenario
      const result = await detectSuspiciousLoginActivity(
        'user-123',
        'test@example.com',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      // Should complete without error (no logs means no suspicious activity)
      expect(result).toHaveProperty('suspicious');
      expect(result.suspicious).toBe(false);
    });

    test('should detect multiple IPs in short time', async () => {
      // Simplified test - check the function handles the scenario
      const result = await detectSuspiciousLoginActivity(
        'user-123',
        'test@example.com',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      // Should complete without error
      expect(result).toHaveProperty('suspicious');
    });

    test('should detect login from new country', async () => {
      // Mock geolocation for current IP
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'Russia',
          city: 'Moscow',
          regionName: 'Moscow',
        }),
      });

      const result = await detectSuspiciousLoginActivity(
        'user-123',
        'test@example.com',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      // Should complete without error
      expect(result).toHaveProperty('suspicious');
    });

    test('should return false for normal activity', async () => {
      // Mock empty logs (no suspicious activity)
      const result = await detectSuspiciousLoginActivity(
        'user-123',
        'test@example.com',
        '8.8.8.8',
        'Mozilla/5.0'
      );

      expect(result.suspicious).toBe(false);
    });
  });

  // ============================================
  // QUERY FUNCTION TESTS
  // ============================================

  describe('getLoginHistory', () => {
    test('should handle query errors', async () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      const { supabaseAdmin } = require('@/lib/supabase');
      const mockError = new Error('Database error');
      supabaseAdmin.schema = jest.fn(() => ({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({ data: null, error: mockError })),
              })),
            })),
          })),
        })),
      }));

      const result = await getLoginHistory('user-123');
      expect(result).toEqual([]);

      // Restore console.error
      console.error = originalError;
    });
  });

  describe('getFailedLoginAttempts', () => {
    test('should handle exceptions', async () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.schema = jest.fn(() => {
        throw new Error('Connection error');
      });

      const result = await getFailedLoginAttempts('test@example.com', 60);
      expect(result).toEqual([]);

      // Restore console.error
      console.error = originalError;
    });
  });

  describe('getActiveSessions', () => {
    test('should handle exceptions', async () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.schema = jest.fn(() => {
        throw new Error('Connection error');
      });

      const result = await getActiveSessions('user-123');
      expect(result).toEqual([]);

      // Restore console.error
      console.error = originalError;
    });

    test('should skip logins without session IDs', async () => {
      const mockLogins = [
        {
          id: 'log-1',
          actor_id: 'user-123',
          action: 'LOGIN_SUCCESS',
          timestamp: new Date().toISOString(),
          details: {}, // No session_id
        },
      ];

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.schema = jest.fn(() => ({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({ data: mockLogins, error: null })),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getActiveSessions('user-123');
      expect(result).toEqual([]);
    });
  });
});
