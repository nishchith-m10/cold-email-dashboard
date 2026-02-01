/**
 * PHASE 65.1: Brand Auto-Scrape API Endpoint
 * 
 * POST /api/onboarding/brand/auto-scrape
 * 
 * Fetches brand metadata from a website (Option B: Simple metadata fetch).
 * Returns immediately with success=false if blocked/timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BrandMetadataScraper } from '@/lib/genesis/phase65/brand-metadata-scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { website } = body;

    if (!website || typeof website !== 'string') {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    // Fetch metadata
    const scraper = new BrandMetadataScraper();
    const result = await scraper.fetchMetadata(website);

    if (!result.success) {
      // Scraping failed - client should fallback to manual form
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch website metadata',
          fallbackToManual: true,
        },
        { status: 200 } // 200 OK, but success=false signals client to show manual form
      );
    }

    // Success - return extracted metadata
    return NextResponse.json({
      success: true,
      companyName: result.companyName,
      logoUrl: result.logoUrl,
      description: result.description,
    });
  } catch (error) {
    console.error('Brand auto-scrape error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        fallbackToManual: true,
      },
      { status: 500 }
    );
  }
}
