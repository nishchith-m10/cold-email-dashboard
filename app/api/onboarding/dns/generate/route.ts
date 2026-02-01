/**
 * PHASE 65.2: DNS Record Generation API
 * 
 * POST /api/onboarding/dns/generate
 * 
 * Generates SPF, DKIM, and DMARC records for email authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DNSRecordGenerator } from '@/lib/genesis/phase65-2/dns-record-generator';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, provider, sendingDomain, reportEmail, dmarcPolicy } = body;

    if (!domain || !provider) {
      return NextResponse.json(
        { error: 'Domain and provider are required' },
        { status: 400 }
      );
    }

    if (provider !== 'gmail' && provider !== 'smtp') {
      return NextResponse.json(
        { error: 'Provider must be gmail or smtp' },
        { status: 400 }
      );
    }

    // Validate domain format
    const generator = new DNSRecordGenerator();
    const validation = generator.validateDomain(domain);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid domain' },
        { status: 400 }
      );
    }

    // Generate DNS records
    const records = await generator.generateRecords({
      domain,
      provider,
      sendingDomain,
      reportEmail,
      dmarcPolicy,
    });

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('DNS generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate DNS records' },
      { status: 500 }
    );
  }
}
