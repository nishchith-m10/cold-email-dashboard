/**
 * Sentry Issues API
 *
 * GET /api/admin/sentry-issues
 *   Proxies Sentry's /api/0/projects/{org}/{project}/issues/ endpoint.
 *   Returns recent errors with counts, stack traces preview, first/last seen.
 *
 * Requires env vars: SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isSuperAdmin } from '@/lib/workspace-access';

const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  shortId: string;
  level: string;
  status: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
  };
  project: { slug: string };
  type: string;
  permalink: string;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Check configuration
    if (!SENTRY_ORG || !SENTRY_PROJECT || !SENTRY_AUTH_TOKEN) {
      return NextResponse.json({
        configured: false,
        issues: [],
        message: 'Sentry not configured. Set SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN env vars.',
      });
    }

    const sp = request.nextUrl.searchParams;
    const cursor = sp.get('cursor') || '';
    const query = sp.get('query') || 'is:unresolved';
    const limit = Math.min(Number(sp.get('limit') || '25'), 100);

    const url = new URL(
      `https://sentry.io/api/0/projects/${encodeURIComponent(SENTRY_ORG)}/${encodeURIComponent(SENTRY_PROJECT)}/issues/`
    );
    url.searchParams.set('query', query);
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 }, // Cache 30s
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sentry-issues] Sentry API error:', response.status, errorText);
      return NextResponse.json({
        configured: true,
        issues: [],
        error: `Sentry API returned ${response.status}`,
      });
    }

    const issues: SentryIssue[] = await response.json();

    // Extract cursor for pagination
    const linkHeader = response.headers.get('Link') || '';
    const nextCursor = extractNextCursor(linkHeader);

    return NextResponse.json({
      configured: true,
      issues: issues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        culprit: issue.culprit,
        shortId: issue.shortId,
        level: issue.level,
        status: issue.status,
        count: Number(issue.count),
        userCount: issue.userCount,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        type: issue.metadata?.type || issue.type,
        value: issue.metadata?.value || '',
        filename: issue.metadata?.filename || '',
        permalink: issue.permalink,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error('[sentry-issues] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Sentry issues' }, { status: 500 });
  }
}

function extractNextCursor(link: string): string | null {
  // Sentry Link header: <url>; rel="next"; results="true"; cursor="..."
  const parts = link.split(',');
  for (const part of parts) {
    if (part.includes('rel="next"') && part.includes('results="true"')) {
      const cursorMatch = part.match(/cursor="([^"]+)"/);
      if (cursorMatch) return cursorMatch[1];
    }
  }
  return null;
}
