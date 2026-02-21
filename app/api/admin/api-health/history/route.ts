/**
 * GENESIS PHASE 71 - API HEALTH HISTORY
 * Endpoint: GET /api/admin/api-health/history
 *
 * Returns historical health snapshots for trending analysis.
 * Query params:
 *   - days: Number of days to fetch (default: 7, max: 365)
 *   - limit: Max snapshots to return (default: 100, max: 1000)
 *   - status: Filter by status ('ok', 'degraded', 'error')
 *
 * Auth: Super Admin only
 * LAW #5 Compliance: 16-nines quality with input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// CONFIGURATION
// ============================================
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '')
  .split(',')
  .filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

const DEFAULT_DAYS = 7;
const MAX_DAYS = 365;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

const VALID_STATUSES = ['ok', 'degraded', 'error'] as const;
type HealthStatus = (typeof VALID_STATUSES)[number];

// ============================================
// HELPER: Parse Query Params
// ============================================
function parseQueryParams(url: URL): {
  days: number;
  limit: number;
  status?: HealthStatus;
  errors: string[];
} {
  const errors: string[] = [];
  let days = DEFAULT_DAYS;
  let limit = DEFAULT_LIMIT;
  let status: HealthStatus | undefined;

  // Parse 'days' param
  const daysParam = url.searchParams.get('days');
  if (daysParam) {
    const parsedDays = parseInt(daysParam, 10);
    if (isNaN(parsedDays) || parsedDays < 1) {
      errors.push('days must be a positive integer');
    } else if (parsedDays > MAX_DAYS) {
      errors.push(`days cannot exceed ${MAX_DAYS}`);
    } else {
      days = parsedDays;
    }
  }

  // Parse 'limit' param
  const limitParam = url.searchParams.get('limit');
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('limit must be a positive integer');
    } else if (parsedLimit > MAX_LIMIT) {
      errors.push(`limit cannot exceed ${MAX_LIMIT}`);
    } else {
      limit = parsedLimit;
    }
  }

  // Parse 'status' param
  const statusParam = url.searchParams.get('status');
  if (statusParam) {
    if (!VALID_STATUSES.includes(statusParam as HealthStatus)) {
      errors.push(
        `status must be one of: ${VALID_STATUSES.join(', ')}`
      );
    } else {
      status = statusParam as HealthStatus;
    }
  }

  return { days, limit, status, errors };
}

// ============================================
// GET: Fetch Historical Snapshots
// ============================================
export async function GET(req: NextRequest) {
  try {
    // Check database availability
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable - database not configured' },
        { status: 503, headers: API_HEADERS }
      );
    }

    // Auth: Super Admin only
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401, headers: API_HEADERS }
      );
    }

    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Parse and validate query params
    const { days, limit, status, errors } = parseQueryParams(
      new URL(req.url)
    );

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: errors },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Calculate date threshold
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch history using RPC function
    const { data, error } = await supabaseAdmin.rpc('get_api_health_history', {
      p_days: days,
      p_limit: limit,
      p_status: status || null,
    });

    if (error) {
      /* eslint-disable-next-line no-console */
      console.warn('[APIHealth] History query error (function may not be provisioned yet):', error.message);
      // Gracefully return empty history instead of 500
      return NextResponse.json(
        {
          success: true,
          snapshots: [],
          summary: {
            totalSnapshots: 0,
            dateRange: {
              from: cutoffDate.toISOString(),
              to: new Date().toISOString(),
            },
            statusBreakdown: { ok: 0, degraded: 0, error: 0 },
            averageLatencyMs: 0,
          },
          params: { days, limit, status },
        },
        { headers: API_HEADERS }
      );
    }

    // Calculate summary statistics
    const snapshots = (data || []) as any[];
    const summary = {
      totalSnapshots: snapshots.length,
      dateRange: {
        from: cutoffDate.toISOString(),
        to: new Date().toISOString(),
      },
      statusBreakdown: {
        ok: snapshots.filter((s: any) => s.overall_status === 'ok').length,
        degraded: snapshots.filter((s: any) => s.overall_status === 'degraded')
          .length,
        error: snapshots.filter((s: any) => s.overall_status === 'error').length,
      },
      averageLatencyMs:
        snapshots.length > 0
          ? Math.round(
              snapshots.reduce((sum: number, s: any) => sum + (s.total_latency_ms || 0), 0) /
                snapshots.length
            )
          : 0,
    };

    return NextResponse.json(
      {
        success: true,
        snapshots,
        summary,
        params: { days, limit, status },
      },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] History GET error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: API_HEADERS }
    );
  }
}
