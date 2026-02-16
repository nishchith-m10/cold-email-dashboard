/**
 * GENESIS PHASE 70: DISASTER RECOVERY GARBAGE COLLECTION CRON
 *
 * Automated garbage collection for expired snapshots.
 * Schedule: 0 * * * * (Hourly via Vercel Cron)
 * Auth: CRON_SECRET via query param or Authorization header
 * DRY_RUN: Database update only (no DO API calls)
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 70
 */

import { NextRequest, NextResponse } from 'next/server';
import { markExpiredSnapshots } from '@/lib/genesis/phase70/db-service';

// ============================================
// CONSTANTS
// ============================================
const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

// ============================================
// POST HANDLER
// ============================================
/**
 * POST /api/cron/disaster-recovery-garbage
 *
 * Marks snapshots older than their expiry date as expired.
 * The expires_at field is set during snapshot creation based on retention policy.
 *
 * Auth:
 *   - Query param: ?secret={CRON_SECRET}
 *   - OR Header: Authorization: Bearer {CRON_SECRET}
 *
 * Response:
 *   200: { success: true, marked }
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
      console.error('[Cron:DRGarbage] CRON_SECRET not configured');
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
      console.warn('[Cron:DRGarbage] Unauthorized cron access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    console.log('[Cron:DRGarbage] Starting garbage collection...');

    // ============================================
    // 2. MARK EXPIRED SNAPSHOTS
    // ============================================
    const marked = await markExpiredSnapshots();

    // ============================================
    // 3. RETURN RESULTS
    // ============================================
    const duration = Date.now() - startTime;

    console.log(`[Cron:DRGarbage] Completed: ${marked} snapshots marked as expired (${duration}ms)`);

    return NextResponse.json(
      {
        success: true,
        marked,
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cron:DRGarbage] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        duration: Date.now() - startTime,
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}
