/**
 * PHASE 65.3: Calendly Link Validation API Endpoint
 * 
 * POST /api/onboarding/validate-calendly
 * 
 * Validates booking links before campaign launch.
 * Returns validation result with detailed checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CalendlyValidator } from '@/lib/genesis/phase65/calendly-validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingUrl, skipContentCheck } = body;

    if (!bookingUrl || typeof bookingUrl !== 'string') {
      return NextResponse.json(
        { error: 'Booking URL is required' },
        { status: 400 }
      );
    }

    // Validate booking link
    const validator = new CalendlyValidator();
    const result = await validator.validate(bookingUrl, {
      skipContentCheck: skipContentCheck === true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Calendly validation error:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Validation failed',
        checks: {
          formatValid: false,
          linkAccessible: false,
        },
      },
      { status: 500 }
    );
  }
}
