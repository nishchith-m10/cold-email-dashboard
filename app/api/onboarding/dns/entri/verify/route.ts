/**
 * PHASE 65.2: Entri Session Verification API
 * 
 * POST /api/onboarding/dns/entri/verify
 * 
 * Verifies that Entri session completed successfully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EntriIntegration } from '@/lib/genesis/phase65-2/entri-integration';
import { auth } from '@clerk/nextjs/server';

// Initialize Entri (will be unconfigured if env vars not set)
const entri = new EntriIntegration(
  process.env.ENTRI_API_KEY && process.env.ENTRI_APP_ID
    ? {
        apiKey: process.env.ENTRI_API_KEY,
        applicationId: process.env.ENTRI_APP_ID,
      }
    : undefined
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!entri.isConfigured()) {
      return NextResponse.json(
        { error: 'Entri is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Verify session
    const result = await entri.verifySession(sessionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Entri verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Verification failed',
      },
      { status: 500 }
    );
  }
}
