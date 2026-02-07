/**
 * Phase 67.B: Login Audit Trail - API Integration Tests
 * 
 * Tests for:
 * - Login history API
 * - Active sessions API
 * - Clerk webhook integration
 */

import { NextRequest } from 'next/server';
import { GET as getLoginHistory } from '@/app/api/audit/login-history/route';
import { GET as getActiveSessions } from '@/app/api/audit/active-sessions/route';
import { POST as clerkWebhook } from '@/app/api/webhooks/clerk/audit/route';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
    schema: jest.fn(() => ({
      from: jest.fn(() => ({
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
            order: jest.fn(() => ({
              limit: jest.fn(() => ({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

jest.mock('@/lib/genesis/login-audit', () => ({
  getLoginHistory: jest.fn(() => Promise.resolve([])),
  getActiveSessions: jest.fn(() => Promise.resolve([])),
  processClerkAuditEvent: jest.fn(() => Promise.resolve({
    success: true,
    auditId: 'mock-audit-id',
  })),
}));

jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn(() => ({
      type: 'session.created',
      data: {
        id: 'session-123',
        user_id: 'user-456',
        created_at: Date.now(),
      },
    })),
  })),
}));

describe('Phase 67.B: Login Audit Trail - API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // LOGIN HISTORY API TESTS
  // ============================================

  describe('GET /api/audit/login-history', () => {
    test('should return 401 without authorization header', async () => {
      const request = new NextRequest('http://localhost/api/audit/login-history');

      const response = await getLoginHistory(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authorization header required');
    });

    test('should return 401 with invalid token', async () => {
      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      const request = new NextRequest('http://localhost/api/audit/login-history', {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const response = await getLoginHistory(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return login history for authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockHistory = [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          action: 'LOGIN_SUCCESS',
          ip_address: '8.8.8.8',
          user_agent: 'Mozilla/5.0',
          details: {
            success: true,
            geo_country: 'United States',
            geo_city: 'San Francisco',
            session_id: 'session-456',
          },
        },
      ];

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getLoginHistory: getLoginHistoryMock } = require('@/lib/genesis/login-audit');
      getLoginHistoryMock.mockResolvedValueOnce(mockHistory);

      const request = new NextRequest('http://localhost/api/audit/login-history', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await getLoginHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].eventType).toBe('login_success');
      expect(data.data[0].ipAddress).toBe('8.8.8.8');
    });

    test('should apply limit query parameter', async () => {
      const mockUser = { id: 'user-123' };

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getLoginHistory: getLoginHistoryMock } = require('@/lib/genesis/login-audit');

      const request = new NextRequest('http://localhost/api/audit/login-history?limit=10', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await getLoginHistory(request);

      expect(getLoginHistoryMock).toHaveBeenCalledWith('user-123', {
        limit: 10,
        startDate: undefined,
        endDate: undefined,
        eventType: undefined,
      });
    });

    test('should cap limit at 100', async () => {
      const mockUser = { id: 'user-123' };

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getLoginHistory: getLoginHistoryMock } = require('@/lib/genesis/login-audit');

      const request = new NextRequest('http://localhost/api/audit/login-history?limit=500', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await getLoginHistory(request);

      expect(getLoginHistoryMock).toHaveBeenCalledWith('user-123', {
        limit: 100,
        startDate: undefined,
        endDate: undefined,
        eventType: undefined,
      });
    });

    test('should apply date range filters', async () => {
      const mockUser = { id: 'user-123' };

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getLoginHistory: getLoginHistoryMock } = require('@/lib/genesis/login-audit');

      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-02-01T00:00:00Z';

      const request = new NextRequest(
        `http://localhost/api/audit/login-history?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            authorization: 'Bearer valid-token',
          },
        }
      );

      await getLoginHistory(request);

      expect(getLoginHistoryMock).toHaveBeenCalledWith('user-123', {
        limit: 50,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        eventType: undefined,
      });
    });

    test('should filter by event type', async () => {
      const mockUser = { id: 'user-123' };

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getLoginHistory: getLoginHistoryMock } = require('@/lib/genesis/login-audit');

      const request = new NextRequest(
        'http://localhost/api/audit/login-history?eventType=login_failure',
        {
          headers: {
            authorization: 'Bearer valid-token',
          },
        }
      );

      await getLoginHistory(request);

      expect(getLoginHistoryMock).toHaveBeenCalledWith('user-123', {
        limit: 50,
        startDate: undefined,
        endDate: undefined,
        eventType: 'login_failure',
      });
    });
  });

  // ============================================
  // ACTIVE SESSIONS API TESTS
  // ============================================

  describe('GET /api/audit/active-sessions', () => {
    test('should return 401 without authorization', async () => {
      const request = new NextRequest('http://localhost/api/audit/active-sessions');

      const response = await getActiveSessions(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authorization header required');
    });

    test('should return active sessions for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      const mockSessions = [
        {
          sessionId: 'session-456',
          loginTime: new Date().toISOString(),
          ipAddress: '8.8.8.8',
          userAgent: 'Mozilla/5.0',
          country: 'United States',
          city: 'San Francisco',
        },
      ];

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getActiveSessions: getActiveSessionsMock } = require('@/lib/genesis/login-audit');
      getActiveSessionsMock.mockResolvedValueOnce(mockSessions);

      const request = new NextRequest('http://localhost/api/audit/active-sessions', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await getActiveSessions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
      expect(data.data).toEqual(mockSessions);
    });

    test('should return empty array when no active sessions', async () => {
      const mockUser = { id: 'user-123' };

      const { supabaseAdmin } = require('@/lib/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getActiveSessions: getActiveSessionsMock } = require('@/lib/genesis/login-audit');
      getActiveSessionsMock.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost/api/audit/active-sessions', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await getActiveSessions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(0);
      expect(data.data).toEqual([]);
    });
  });

  // ============================================
  // CLERK WEBHOOK TESTS
  // ============================================

  describe('POST /api/webhooks/clerk/audit', () => {
    test('should return 500 when CLERK_WEBHOOK_SECRET not set', async () => {
      const originalEnv = process.env.CLERK_WEBHOOK_SECRET;
      delete process.env.CLERK_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost/api/webhooks/clerk/audit', {
        method: 'POST',
        body: JSON.stringify({ type: 'session.created', data: {} }),
      });

      const response = await clerkWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook secret not configured');

      process.env.CLERK_WEBHOOK_SECRET = originalEnv;
    });

    test('should return 400 when svix headers missing', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const request = new NextRequest('http://localhost/api/webhooks/clerk/audit', {
        method: 'POST',
        body: JSON.stringify({ type: 'session.created', data: {} }),
      });

      const response = await clerkWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing svix headers');
    });

    test('should return 401 on invalid signature', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const { Webhook } = require('svix');
      Webhook.mockImplementationOnce(() => ({
        verify: jest.fn(() => {
          throw new Error('Invalid signature');
        }),
      }));

      const request = new NextRequest('http://localhost/api/webhooks/clerk/audit', {
        method: 'POST',
        headers: {
          'svix-id': 'msg_123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'invalid',
        },
        body: JSON.stringify({ type: 'session.created', data: {} }),
      });

      const response = await clerkWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    test('should process session.created event', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const { Webhook } = require('svix');
      Webhook.mockImplementationOnce(() => ({
        verify: jest.fn(() => ({
          type: 'session.created',
          data: {
            id: 'session-123',
            user_id: 'user-456',
            created_at: Date.now(),
          },
        })),
      }));

      const request = new NextRequest('http://localhost/api/webhooks/clerk/audit', {
        method: 'POST',
        headers: {
          'svix-id': 'msg_123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid',
        },
        body: JSON.stringify({
          type: 'session.created',
          data: {
            id: 'session-123',
            user_id: 'user-456',
          },
        }),
      });

      const response = await clerkWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventType).toBe('session.created');
    });

    test('should acknowledge unknown event types', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const { Webhook } = require('svix');
      Webhook.mockImplementationOnce(() => ({
        verify: jest.fn(() => ({
          type: 'unknown.event',
          data: {},
        })),
      }));

      const { processClerkAuditEvent } = require('@/lib/genesis/login-audit');
      processClerkAuditEvent.mockResolvedValueOnce({
        success: false, // Changed from true to trigger the "Unknown" path
        auditId: null,
        error: 'Unknown Clerk event type: unknown.event',
      });

      const request = new NextRequest('http://localhost/api/webhooks/clerk/audit', {
        method: 'POST',
        headers: {
          'svix-id': 'msg_123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid',
        },
        body: JSON.stringify({ type: 'unknown.event', data: {} }),
      });

      const response = await clerkWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Event acknowledged but not logged');
    });
  });
});
