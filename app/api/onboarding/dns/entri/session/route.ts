/**
 * PHASE 65.2: Entri Session Management API
 * 
 * POST /api/onboarding/dns/entri/session - Create Entri session
 * GET /api/onboarding/dns/entri/session?sessionId=xxx - Get session status
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

/**
 * POST - Create Entri session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!entri.isConfigured()) {
      return NextResponse.json(
        { error: 'Entri is not configured. Manual DNS setup required.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { domain, records } = body;

    if (!domain || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Domain and records are required' },
        { status: 400 }
      );
    }

    // Create Entri session
    const session = await entri.createSession(domain, records);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Entri session creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get session status
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!entri.isConfigured()) {
      return NextResponse.json({ error: 'Entri not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const status = await entri.getSessionStatus(sessionId);

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Entri session status error:', error);
    return NextResponse.json(
      { error: 'Failed to get session status' },
      { status: 500 }
    );
  }
}
