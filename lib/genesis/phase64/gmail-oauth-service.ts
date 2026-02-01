/**
 * PHASE 64: Gmail OAuth Service
 * 
 * Handles OAuth flow for Gmail (Genesis-operated OAuth app).
 * Manages state, CSRF tokens, and token exchange.
 */

import * as crypto from 'crypto';
import {
  OAuthConfig,
  OAuthState,
  OAuthTokenResponse,
} from './credential-vault-types';

// ============================================
// OAUTH CONFIGURATION
// ============================================

export const GMAIL_OAUTH_CONFIG: OAuthConfig = {
  clientId: process.env.GMAIL_OAUTH_CLIENT_ID || '',
  clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET || '',
  redirectUri: process.env.GMAIL_OAUTH_REDIRECT_URI || 'https://app.genesis.io/api/oauth/gmail/callback',
  scope: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
};

// ============================================
// STATE MANAGEMENT
// ============================================

export class OAuthStateManager {
  private stateStore: Map<string, OAuthState>;
  private stateExpiry: number = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.stateStore = new Map();
    // Clean up expired states every minute
    setInterval(() => this.cleanExpiredStates(), 60 * 1000);
  }

  /**
   * Generate a cryptographically secure state token
   */
  generateState(workspaceId: string, userId: string, returnUrl?: string): string {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const state: OAuthState = {
      workspaceId,
      userId,
      csrfToken,
      returnUrl,
      timestamp: Date.now(),
    };

    this.stateStore.set(csrfToken, state);
    return csrfToken;
  }

  /**
   * Validate and retrieve state
   */
  validateState(csrfToken: string): OAuthState | null {
    const state = this.stateStore.get(csrfToken);
    
    if (!state) {
      return null;
    }

    // Check if expired
    if (Date.now() - state.timestamp > this.stateExpiry) {
      this.stateStore.delete(csrfToken);
      return null;
    }

    // Remove from store after validation (one-time use)
    this.stateStore.delete(csrfToken);
    return state;
  }

  /**
   * Clean up expired states
   */
  private cleanExpiredStates(): void {
    const now = Date.now();
    const entries = Array.from(this.stateStore.entries());
    for (const [token, state] of entries) {
      if (now - state.timestamp > this.stateExpiry) {
        this.stateStore.delete(token);
      }
    }
  }
}

// ============================================
// GMAIL OAUTH SERVICE
// ============================================

export interface GmailOAuthServiceConfig {
  config: OAuthConfig;
  stateManager: OAuthStateManager;
}

export class GmailOAuthService {
  private config: OAuthConfig;
  private stateManager: OAuthStateManager;

  constructor(serviceConfig: GmailOAuthServiceConfig) {
    this.config = serviceConfig.config;
    this.stateManager = serviceConfig.stateManager;

    // Validate configuration
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Gmail OAuth not configured: missing client ID or secret');
    }
  }

  // ============================================
  // AUTHORIZATION URL GENERATION
  // ============================================

  /**
   * Generate OAuth authorization URL
   */
  generateAuthorizationUrl(
    workspaceId: string,
    userId: string,
    returnUrl?: string
  ): string {
    const state = this.stateManager.generateState(workspaceId, userId, returnUrl);
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope.join(' '),
      state,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  // ============================================
  // TOKEN EXCHANGE
  // ============================================

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    stateToken: string
  ): Promise<{
    success: boolean;
    tokens?: OAuthTokenResponse;
    state?: OAuthState;
    error?: string;
  }> {
    try {
      // Validate state
      const state = this.stateManager.validateState(stateToken);
      if (!state) {
        return {
          success: false,
          error: 'Invalid or expired state token',
        };
      }

      // Exchange code for tokens
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error_description || `Token exchange failed: ${response.status}`,
        };
      }

      const tokens = await response.json() as OAuthTokenResponse;

      return {
        success: true,
        tokens,
        state,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{
    success: boolean;
    tokens?: { accessToken: string; expiresIn: number };
    error?: string;
  }> {
    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error_description || `Token refresh failed: ${response.status}`,
        };
      }

      const data: any = await response.json();

      return {
        success: true,
        tokens: {
          accessToken: data.access_token,
          expiresIn: data.expires_in,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  // ============================================
  // TOKEN REVOCATION
  // ============================================

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token,
        }).toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Token revocation failed: ${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token revocation failed',
      };
    }
  }

  // ============================================
  // USER INFO
  // ============================================

  /**
   * Get user info from Gmail
   */
  async getUserInfo(
    accessToken: string
  ): Promise<{
    success: boolean;
    userInfo?: { email: string; verified: boolean };
    error?: string;
  }> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get user info: ${response.status}`,
        };
      }

      const data: any = await response.json();

      return {
        success: true,
        userInfo: {
          email: data.email,
          verified: data.verified_email,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user info',
      };
    }
  }
}
