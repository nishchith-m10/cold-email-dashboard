/**
 * PHASE 65.4: Tracking Domain Verification API
 * 
 * POST /api/onboarding/tracking/verify
 * 
 * Verifies tracking domain CNAME record via DNS-over-HTTPS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TrackingDomainVerifier } from '@/lib/genesis/phase65-2/tracking-domain-verifier';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trackingDomain, expectedTarget } = body;

    if (!trackingDomain || !expectedTarget) {
      return NextResponse.json(
        { error: 'trackingDomain and expectedTarget are required' },
        { status: 400 }
      );
    }

    // Verify tracking domain
    const verifier = new TrackingDomainVerifier();
    const result = await verifier.verifyTrackingDomain(trackingDomain, expectedTarget);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tracking domain verification error:', error);
    return NextResponse.json(
      {
        domain: '',
        exists: false,
        matches: false,
        expectedValue: '',
        error: 'Verification failed',
      },
      { status: 500 }
    );
  }
}
