/**
 * GENESIS PHASE 71: SECONDARY API HEALTH CHECK CRON
 * 
 * Automated health checks for secondary services every 1 hour.
 * Monitors: Anthropic, Relevance AI, Apify, Google CSE, DigitalOcean
 * 
 * Schedule: 0 * * * * (Every 1 hour via Vercel Cron)
 * Auth: CRON_SECRET via query param or Authorization header
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 71
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createDefaultRegistry,
  HealthRunner,
  type HealthReport,
  type ServiceHealth,
} from '@/lib/genesis/phase71';

// ============================================
// CONSTANTS
// ============================================
const SECONDARY_SERVICE_IDS = [
  'anthropic',
  'relevance-ai',
  'apify',
  'google-cse',
  'digitalocean',
] as const;

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

// ============================================
// HELPER: Store Snapshot
// ============================================
async function storeSnapshot(report: HealthReport): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable');
  }

  const { error } = await supabaseAdmin.rpc('insert_api_health_snapshot', {
    p_report: report,
    p_overall_status: report.overallStatus,
    p_check_count: report.services.length,
    p_error_count: report.errorCount,
    p_degraded_count: report.degradedCount,
    p_total_latency_ms: report.totalLatencyMs,
    p_slowest_service: report.slowestService,
    p_triggered_by: 'cron-secondary',
    p_triggered_by_user_id: null,
  });

  if (error) {
    console.error('[Cron:APIHealthSecondary] Failed to store snapshot:', error);
    throw new Error('Failed to store health snapshot');
  }
}

// ============================================
// POST HANDLER
// ============================================
/**
 * POST /api/cron/api-health-secondary
 * 
 * Runs health checks for secondary/integration services.
 * 
 * Auth:
 *   - Query param: ?secret={CRON_SECRET}
 *   - OR Header: Authorization: Bearer {CRON_SECRET}
 * 
 * Response:
 *   200: { success: true, checksRun, errors, duration }
 *   401: { error: 'Unauthorized' }
 *   500: { error: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================
    // 1. AUTHENTICATE
    // ============================================
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron:APIHealthSecondary] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Support both query param and Authorization header
    const querySecret = new URL(request.url).searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const headerSecret = authHeader?.replace('Bearer ', '');

    const providedSecret = querySecret || headerSecret;

    if (providedSecret !== cronSecret) {
      console.warn('[Cron:APIHealthSecondary] Unauthorized cron access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    console.log('[Cron:APIHealthSecondary] Starting secondary health checks...');

    // ============================================
    // 2. RUN HEALTH CHECKS (Secondary Services Only)
    // ============================================
    const registry = createDefaultRegistry();
    const runner = new HealthRunner(registry, {
      defaultTimeoutMs: 15000, // 15s timeout for secondary checks
      retryCount: 1, // Single retry for secondary services
    });

    // Filter to secondary services only
    const secondaryChecks = SECONDARY_SERVICE_IDS.map((id) =>
      registry.getById(id)
    ).filter((check) => check !== null);

    if (secondaryChecks.length === 0) {
      console.warn('[Cron:APIHealthSecondary] No secondary checks found');
      return NextResponse.json(
        {
          success: false,
          error: 'No secondary checks configured',
          checksRun: 0,
          errors: 0,
          duration: Date.now() - startTime,
        },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Run checks in parallel
    const checkPromises = secondaryChecks.map(async (check) => {
      if (!check) return null;
      return await runner.runOne(check.id);
    });

    const results = await Promise.all(checkPromises);
    const validResults = results.filter((r): r is ServiceHealth => r !== null);

    // Build consolidated report
    const report: HealthReport = {
      id: `cron-secondary-${Date.now()}`,
      timestamp: new Date().toISOString(),
      services: validResults,
      overallStatus:
        validResults.some((s) => s.status === 'error')
          ? 'error'
          : validResults.some((s) => s.status === 'degraded')
          ? 'degraded'
          : 'ok',
      errorCount: validResults.filter((s) => s.status === 'error').length,
      degradedCount: validResults.filter((s) => s.status === 'degraded')
        .length,
      issueCount:
        validResults.filter((s) => s.status === 'error').length +
        validResults.filter((s) => s.status === 'degraded').length,
      totalLatencyMs: validResults.reduce(
        (sum, s) => sum + (s.result.latencyMs || 0),
        0
      ),
      slowestService: validResults.reduce((slowest, s) => {
        if (!slowest) return s.name;
        const slowestLatency =
          validResults.find((r) => r.name === slowest)?.result.latencyMs || 0;
        const currentLatency = s.result.latencyMs || 0;
        return currentLatency > slowestLatency ? s.name : slowest;
      }, ''),
    };

    // ============================================
    // 3. STORE SNAPSHOT
    // ============================================
    await storeSnapshot(report);

    // ============================================
    // 4. LOG ERRORS (if any)
    // ============================================
    const errors = validResults.filter((s) => s.status === 'error');
    if (errors.length > 0) {
      console.error(
        `[Cron:APIHealthSecondary] ${errors.length} secondary service(s) failed:`,
        errors.map((e) => `${e.name}: ${e.result.error}`).join(', ')
      );
    }

    const executionTimeMs = Date.now() - startTime;

    console.log(
      `[Cron:APIHealthSecondary] Completed: ${validResults.length} checks, ` +
        `${errors.length} errors, ${report.degradedCount} degraded (${executionTimeMs}ms)`
    );

    // ============================================
    // 5. RETURN SUMMARY
    // ============================================
    return NextResponse.json(
      {
        success: true,
        checksRun: validResults.length,
        errors: errors.length,
        degraded: report.degradedCount,
        duration: executionTimeMs,
        overallStatus: report.overallStatus,
        services: validResults.map((s) => ({
          name: s.name,
          status: s.status,
          latencyMs: s.result.latencyMs,
        })),
      },
      { headers: API_HEADERS }
    );
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    console.error('[Cron:APIHealthSecondary] Execution failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        checksRun: 0,
        errors: 1,
        duration: executionTimeMs,
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * GET handler - Not allowed (POST only)
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405, headers: API_HEADERS }
  );
}
