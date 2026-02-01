/**
 * PHASE 64: Gmail OAuth Authorization API
 * 
 * POST /api/oauth/gmail/authorize - Generate OAuth URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GmailOAuthService, OAuthStateManager, GMAIL_OAUTH_CONFIG } from '@/lib/genesis/phase64/gmail-oauth-service';

// Lazy initialize to avoid module-level errors when OAuth not configured
let stateManager: OAuthStateManager | null = null;
let gmailService: GmailOAuthService | null = null;

function getGmailService(): { service: GmailOAuthService } | { error: string } {
  const clientId = GMAIL_OAUTH_CONFIG.clientId;
  const clientSecret = GMAIL_OAUTH_CONFIG.clientSecret;
  
  if (!clientId || !clientSecret) {
    return { 
      error: 'Gmail OAuth not configured. Add GMAIL_OAUTH_CLIENT_ID and GMAIL_OAUTH_CLIENT_SECRET to your .env.local file.' 
    };
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
  
  return { service: gmailService };
}

/**
 * POST - Generate OAuth authorization URL
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const { workspaceId, returnUrl } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const result = getGmailService();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const authorizationUrl = result.service.generateAuthorizationUrl(
      workspaceId,
      userId,
      returnUrl
    );

    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    console.error('Gmail OAuth authorize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
