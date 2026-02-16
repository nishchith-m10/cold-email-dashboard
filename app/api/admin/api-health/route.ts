/**
 * GENESIS PHASE 71 - API HEALTH MONITOR
 * Endpoint: GET/POST /api/admin/api-health
 *
 * GET:  Return latest health report (from cache or fresh check)
 * POST: Trigger manual health check + store snapshot
 *
 * Auth: Super Admin only
 * LAW #5 Compliance: 16-nines quality with comprehensive error handling
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createDefaultRegistry,
  HealthRunner,
  type HealthReport,
} from '@/lib/genesis/phase71';

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

// ============================================
// HELPER: Store Snapshot
// ============================================
async function storeSnapshot(
  report: HealthReport,
  triggeredBy: string,
  userId?: string
): Promise<void> {
  if (!supabaseAdmin) {
    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] Database unavailable - supabaseAdmin not initialized. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
    throw new Error('Database unavailable - Supabase credentials not configured');
  }

  const { error } = await supabaseAdmin.rpc('insert_api_health_snapshot', {
    p_report: report,
    p_overall_status: report.overallStatus,
    p_check_count: report.services.length,
    p_error_count: report.errorCount,
    p_degraded_count: report.degradedCount,
    p_total_latency_ms: report.totalLatencyMs,
    p_slowest_service: report.slowestService,
    p_triggered_by: triggeredBy,
    p_triggered_by_user_id: userId,
  });

  if (error) {
    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] Failed to store snapshot:', error);
    throw new Error('Failed to store health snapshot');
  }
}

// ============================================
// HELPER: Get Latest Snapshot
// ============================================
async function getLatestSnapshot(): Promise<HealthReport | null> {
  if (!supabaseAdmin) {
    /* eslint-disable-next-line no-console */
    console.warn('[APIHealth] Database unavailable - returning null for latest snapshot');
    return null;
  }

  const { data, error } = await supabaseAdmin.rpc('get_latest_api_health_snapshot');

  if (error || !data) {
    return null;
  }

  return data as HealthReport;
}

// ============================================
// HELPER: Run Health Checks
// ============================================
async function runHealthChecks(): Promise<HealthReport> {
  const registry = createDefaultRegistry();
  const runner = new HealthRunner(registry);

  try {
    const report = await runner.runAll();
    return report;
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] Health check execution failed:', error);
    throw new Error('Health check execution failed');
  }
}

// ============================================
// GET: Return Latest Health Report
// ============================================
export async function GET() {
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

    // Try to get latest snapshot from database first
    let report = await getLatestSnapshot();

    // If no snapshot exists, run fresh check
    if (!report) {
      /* eslint-disable-next-line no-console */
      console.log('[APIHealth] No cached snapshot, running fresh check');
      report = await runHealthChecks();

      // Store the fresh report
      await storeSnapshot(report, 'auto-first-run', userId);
    }

    return NextResponse.json(
      {
        success: true,
        report,
        cached: true, // GET always returns cached/latest
      },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] GET error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: API_HEADERS }
    );
  }
}

// ============================================
// POST: Trigger Manual Health Check
// ============================================
export async function POST() {
  const startTime = Date.now();

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

    // Run health checks
    /* eslint-disable-next-line no-console */
    console.log('[APIHealth] Manual health check triggered by:', userId);

    const report = await runHealthChecks();
    const durationMs = Date.now() - startTime;

    // Store snapshot
    await storeSnapshot(report, 'manual', userId);

    /* eslint-disable-next-line no-console */
    console.log(
      `[APIHealth] Check complete: ${report.overallStatus} (${durationMs}ms, ${report.errorCount} errors)`
    );

    return NextResponse.json(
      {
        success: true,
        report,
        durationMs,
        triggeredBy: 'manual',
        triggeredByUserId: userId,
      },
      { headers: API_HEADERS }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;

    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] POST error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage, durationMs },
      { status: 500, headers: API_HEADERS }
    );
  }
}
