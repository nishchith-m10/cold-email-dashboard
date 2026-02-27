/**
 * PHASE 65.1: Brand Auto-Scrape API Endpoint
 * 
 * POST /api/onboarding/brand/auto-scrape
 * 
 * Fetches brand metadata from a website (Option B: Simple metadata fetch).
 * Returns immediately with success=false if blocked/timeout.
 *
 * D6-005: Added Clerk auth check and SSRF protection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BrandMetadataScraper } from '@/lib/genesis/phase65/brand-metadata-scraper';

// ============================================
// SSRF PROTECTION
// ============================================

/**
 * Reject URLs that could be used for SSRF attacks.
 * - Only http:// or https:// schemes allowed
 * - Internal/private IPs blocked: 10.x, 192.168.x, 127.x, 169.254.x, 0.0.0.0
 */
function isSafeUrl(urlString: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Scheme check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Unsupported URL scheme: ${parsed.protocol}` };
  }

  // Hostname → IP patterns that indicate internal networks
  const hostname = parsed.hostname.toLowerCase();
  const internalPatterns = [
    /^127\./,                    // 127.0.0.0/8 loopback
    /^10\./,                     // 10.0.0.0/8 private
    /^192\.168\./,               // 192.168.0.0/16 private
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private
    /^169\.254\./,               // 169.254.0.0/16 link-local
    /^0\.0\.0\.0$/,              // unspecified
    /^localhost$/,               // localhost
    /^\[::1?\]$/,                // IPv6 loopback
  ];

  for (const pattern of internalPatterns) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: 'Internal/private IP addresses are not allowed' };
    }
  }

  return { safe: true };
}

export async function POST(request: NextRequest) {
  try {
    // D6-005: Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { website } = body;

    if (!website || typeof website !== 'string') {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    // D6-005: SSRF protection
    const urlCheck = isSafeUrl(website);
    if (!urlCheck.safe) {
      return NextResponse.json(
        {
          success: false,
          error: urlCheck.reason || 'URL is not allowed',
          fallbackToManual: true,
        },
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
