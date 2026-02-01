/**
 * PHASE 65.2: DNS Record Verification API
 * 
 * POST /api/onboarding/dns/verify
 * 
 * Verifies DNS records via DNS-over-HTTPS lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DNSVerifier } from '@/lib/genesis/phase65-2/dns-verifier';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, expectedRecords } = body;

    if (!domain || !expectedRecords) {
      return NextResponse.json(
        { error: 'Domain and expectedRecords are required' },
        { status: 400 }
      );
    }

    // Verify DNS records
    const verifier = new DNSVerifier();
    const result = await verifier.verifyAll(domain, expectedRecords);

    return NextResponse.json(result);
  } catch (error) {
    console.error('DNS verification error:', error);
    return NextResponse.json(
      {
        allValid: false,
        error: 'Verification failed',
      },
      { status: 500 }
    );
  }
}
