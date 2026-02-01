/**
 * PHASE 64: Gmail OAuth Callback API
 * 
 * GET /api/oauth/gmail/callback - Handle OAuth redirect from Google
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  GmailOAuthService, 
  OAuthStateManager, 
  GMAIL_OAUTH_CONFIG 
} from '@/lib/genesis/phase64/gmail-oauth-service';
import { EncryptionService, CredentialVaultService } from '@/lib/genesis/phase64/credential-vault-service';

// Lazy initialize to avoid module-level errors when not configured
let stateManager: OAuthStateManager | null = null;
let gmailService: GmailOAuthService | null = null;
let encryption: EncryptionService | null = null;
let vaultService: CredentialVaultService | null = null;

interface Services {
  gmailService: GmailOAuthService;
  vaultService: CredentialVaultService;
}

function getServices(): { services: Services } | { error: string } {
  const clientId = GMAIL_OAUTH_CONFIG.clientId;
  const clientSecret = GMAIL_OAUTH_CONFIG.clientSecret;
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  
  if (!clientId || !clientSecret) {
    return { error: 'Gmail OAuth not configured' };
  }
  if (!masterKey) {
    return { error: 'ENCRYPTION_MASTER_KEY not configured' };
  }
  
  if (!stateManager) {
    stateManager = new OAuthStateManager();
  }
  if (!gmailService) {
    gmailService = new GmailOAuthService({
      config: GMAIL_OAUTH_CONFIG,
      stateManager,
    });
  }
  if (!encryption) {
    encryption = new EncryptionService(masterKey);
  }
  if (!vaultService) {
    vaultService = new CredentialVaultService({
      encryptionService: encryption,
      supabaseClient: supabaseAdmin,
    });
  }
  
  return { services: { gmailService, vaultService } };
}

/**
 * GET - OAuth callback handler
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        `/onboarding?error=${encodeURIComponent(error)}&stage=gmail_oauth`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        '/onboarding?error=invalid_callback&stage=gmail_oauth'
      );
    }

    // Get services
    const result = getServices();
    if ('error' in result) {
      return NextResponse.redirect(
        `/onboarding?error=${encodeURIComponent(result.error)}&stage=gmail_oauth`
      );
    }
    const { gmailService: gmail, vaultService: vault } = result.services;

    // Exchange code for tokens
    const tokenResult = await gmail.exchangeCodeForTokens(code, state);

    if (!tokenResult.success || !tokenResult.tokens || !tokenResult.state) {
      return NextResponse.redirect(
        `/onboarding?error=${encodeURIComponent(tokenResult.error || 'token_exchange_failed')}&stage=gmail_oauth`
      );
    }

    // Store tokens in vault
    const storeResult = await vault.storeOAuthCredential(
      tokenResult.state.workspaceId,
      'gmail_oauth',
      {
        accessToken: tokenResult.tokens.access_token,
        refreshToken: tokenResult.tokens.refresh_token || '',
        tokenType: tokenResult.tokens.token_type,
        expiresIn: tokenResult.tokens.expires_in,
        scope: tokenResult.tokens.scope,
      }
    );

    if (!storeResult.success) {
      return NextResponse.redirect(
        `/onboarding?error=${encodeURIComponent(storeResult.error || 'storage_failed')}&stage=gmail_oauth`
      );
    }

    // Get user email for display
    const userInfoResult = await gmail.getUserInfo(tokenResult.tokens.access_token);
    
    // Redirect back to onboarding
    const returnUrl = tokenResult.state.returnUrl || '/onboarding?stage=gmail_oauth';
    const successUrl = new URL(returnUrl, req.url);
    successUrl.searchParams.set('gmail_connected', 'true');
    if (userInfoResult.success && userInfoResult.userInfo) {
      successUrl.searchParams.set('gmail_email', userInfoResult.userInfo.email);
    }

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    return NextResponse.redirect(
      '/onboarding?error=callback_error&stage=gmail_oauth'
    );
  }
}
