/**
 * PHASE 64: Credential Validation API
 * 
 * POST /api/onboarding/validate-credential - Validate a credential without storing
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CredentialValidationService } from '@/lib/genesis/phase64/credential-validation-service';

const validationService = new CredentialValidationService();

/**
 * POST - Validate a credential
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const { type, value, config } = body;

    if (!type) {
      return NextResponse.json({ error: 'type required' }, { status: 400 });
    }

    // Validate the credential
    const result = await validationService.validateCredential(type, value || '', config);

    return NextResponse.json({
      valid: result.valid,
      error: result.error,
      details: result.details,
    });
  } catch (error) {
    console.error('Validate credential error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
