/**
 * PHASE 64: Gmail OAuth Service Tests
 * 
 * Tests for OAuth flow, state management, and token operations.
 */

import { 
  OAuthStateManager, 
  GmailOAuthService,
  GMAIL_OAUTH_CONFIG 
} from '@/lib/genesis/phase64/gmail-oauth-service';

// ============================================
// MOCKS
// ============================================

global.fetch = jest.fn();

describe('OAuthStateManager', () => {
  let stateManager: OAuthStateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    stateManager = new OAuthStateManager();
  });

  describe('generateState', () => {
    it('should generate unique state tokens', () => {
      const state1 = stateManager.generateState('ws-1', 'user-1');
      const state2 = stateManager.generateState('ws-2', 'user-2');

      expect(state1).not.toBe(state2);
      expect(state1).toHaveLength(64); // 32 bytes hex = 64 chars
    });

    it('should store state with correct metadata', () => {
      const token = stateManager.generateState('ws-123', 'user-456', '/dashboard');
      const state = stateManager.validateState(token);

      expect(state).not.toBeNull();
      expect(state?.workspaceId).toBe('ws-123');
      expect(state?.userId).toBe('user-456');
      expect(state?.returnUrl).toBe('/dashboard');
    });

    it('should include timestamp in state', () => {
      const now = Date.now();
      const token = stateManager.generateState('ws-1', 'user-1');
      const state = stateManager.validateState(token);

      expect(state?.timestamp).toBeGreaterThanOrEqual(now);
      expect(state?.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('validateState', () => {
    it('should validate valid state token', () => {
      const token = stateManager.generateState('ws-1', 'user-1');
      const state = stateManager.validateState(token);

      expect(state).not.toBeNull();
      expect(state?.csrfToken).toBe(token);
    });

    it('should return null for invalid token', () => {
      const state = stateManager.validateState('invalid-token');

      expect(state).toBeNull();
    });

    it('should return null for expired token', () => {
      const token = stateManager.generateState('ws-1', 'user-1');

      // Fast-forward time by 11 minutes
      jest.useFakeTimers();
      jest.advanceTimersByTime(11 * 60 * 1000);

      const state = stateManager.validateState(token);

      expect(state).toBeNull();

      jest.useRealTimers();
    });

    it('should consume token (one-time use)', () => {
      const token = stateManager.generateState('ws-1', 'user-1');

      const state1 = stateManager.validateState(token);
      const state2 = stateManager.validateState(token);

      expect(state1).not.toBeNull();
      expect(state2).toBeNull(); // Already consumed
    });
  });

  describe('cleanExpiredStates', () => {
    it('should clean up expired states', () => {
      jest.useFakeTimers();

      const token = stateManager.generateState('ws-1', 'user-1');

      // Fast-forward past expiry
      jest.advanceTimersByTime(11 * 60 * 1000);

      // Trigger cleanup (normally runs every minute)
      jest.advanceTimersByTime(60 * 1000);

      const state = stateManager.validateState(token);
      expect(state).toBeNull();

      jest.useRealTimers();
    });
  });
});

describe('GmailOAuthService', () => {
  let service: GmailOAuthService;
  let stateManager: OAuthStateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    stateManager = new OAuthStateManager();
    
    // Mock OAuth config
    const testConfig = {
      ...GMAIL_OAUTH_CONFIG,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://app.test.com/callback',
    };

    service = new GmailOAuthService({
      config: testConfig,
      stateManager,
    });
  });

  describe('generateAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const url = service.generateAuthorizationUrl('ws-123', 'user-456');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.test.com%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include all required scopes', () => {
      const url = service.generateAuthorizationUrl('ws-123', 'user-456');

      expect(url).toContain('scope=');
      expect(url).toContain('gmail.send');
      expect(url).toContain('gmail.readonly');
      expect(url).toContain('userinfo.email');
    });

    it('should include state parameter', () => {
      const url = service.generateAuthorizationUrl('ws-123', 'user-456');

      expect(url).toContain('state=');
      
      // Extract state from URL
      const stateMatch = url.match(/state=([^&]+)/);
      expect(stateMatch).not.toBeNull();
      
      const stateToken = stateMatch![1];
      expect(stateToken).toHaveLength(64);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const stateToken = stateManager.generateState('ws-123', 'user-456');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'ya29.access',
          refresh_token: 'ya29.refresh',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/gmail.send',
        }),
      });

      const result = await service.exchangeCodeForTokens('auth-code-123', stateToken);

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.access_token).toBe('ya29.access');
      expect(result.tokens?.refresh_token).toBe('ya29.refresh');
      expect(result.state).toBeDefined();
      expect(result.state?.workspaceId).toBe('ws-123');
    });

    it('should reject invalid state token', async () => {
      const result = await service.exchangeCodeForTokens('auth-code', 'invalid-state');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired state');
    });

    it('should handle token exchange errors', async () => {
      const stateToken = stateManager.generateState('ws-123', 'user-456');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Authorization code has expired',
        }),
      });

      const result = await service.exchangeCodeForTokens('expired-code', stateToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authorization code has expired');
    });

    it('should consume state token after use', async () => {
      const stateToken = stateManager.generateState('ws-123', 'user-456');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'email',
        }),
      });

      await service.exchangeCodeForTokens('code', stateToken);

      // Try to use same state again
      const result2 = await service.exchangeCodeForTokens('code2', stateToken);

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Invalid or expired state');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });

      const result = await service.refreshAccessToken('old-refresh-token');

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBe('new-access-token');
      expect(result.tokens?.expiresIn).toBe(3600);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle refresh token revoked', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Token has been revoked',
        }),
      });

      const result = await service.refreshAccessToken('revoked-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token has been revoked');
    });

    it('should handle network errors during refresh', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await service.refreshAccessToken('refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await service.revokeToken('token-to-revoke');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle revocation errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      const result = await service.revokeToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('revocation failed');
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
          verified_email: true,
        }),
      });

      const result = await service.getUserInfo('access-token');

      expect(result.success).toBe(true);
      expect(result.userInfo).toEqual({
        email: 'user@example.com',
        verified: true,
      });
    });

    it('should handle unverified emails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
          verified_email: false,
        }),
      });

      const result = await service.getUserInfo('access-token');

      expect(result.success).toBe(true);
      expect(result.userInfo?.verified).toBe(false);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await service.getUserInfo('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get user info');
    });
  });

  describe('Configuration Validation', () => {
    it('should throw if client ID missing', () => {
      expect(() => {
        new GmailOAuthService({
          config: {
            ...GMAIL_OAUTH_CONFIG,
            clientId: '',
            clientSecret: 'secret',
          },
          stateManager,
        });
      }).toThrow('Gmail OAuth not configured');
    });

    it('should throw if client secret missing', () => {
      expect(() => {
        new GmailOAuthService({
          config: {
            ...GMAIL_OAUTH_CONFIG,
            clientId: 'client',
            clientSecret: '',
          },
          stateManager,
        });
      }).toThrow('Gmail OAuth not configured');
    });
  });
});
