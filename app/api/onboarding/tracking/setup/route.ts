/**
 * PHASE 65.4: Tracking Domain Setup API
 * 
 * POST /api/onboarding/tracking/setup
 * 
 * Generates CNAME record for custom tracking domain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TrackingDomainManager } from '@/lib/genesis/phase65-2/tracking-domain-manager';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subdomain, baseDomain, trackingTarget } = body;

    if (!subdomain || !baseDomain) {
      return NextResponse.json(
        { error: 'Subdomain and baseDomain are required' },
        { status: 400 }
      );
    }

    // Setup tracking domain
    const manager = new TrackingDomainManager();
    const setup = manager.setupTrackingDomain({
      subdomain,
      baseDomain,
      trackingTarget: trackingTarget || '',
    });

    return NextResponse.json({
      success: true,
      setup,
    });
  } catch (error) {
    console.error('Tracking domain setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to setup tracking domain' },
      { status: 500 }
    );
  }
}
