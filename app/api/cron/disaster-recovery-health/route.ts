/**
 * GENESIS PHASE 70: DISASTER RECOVERY REGIONAL HEALTH CRON
 *
 * Automated regional health checks for all 5 regions.
 * Schedule: Every 5 minutes via Vercel Cron (star/5 * * * *)
 * Auth: CRON_SECRET via query param or Authorization header
 * DRY_RUN: Uses DOClient with dry-run mode (operations tagged in DB)
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 70
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createDOClient,
  type DORegion,
} from '@/lib/genesis/phase70';

// ============================================
// CONSTANTS
// ============================================
const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

const REGIONS: DORegion[] = ['nyc1', 'sfo1', 'fra1', 'lon1', 'sgp1'];

// ============================================
// POST HANDLER
// ============================================
/**
 * POST /api/cron/disaster-recovery-health
 *
 * Checks heartbeat for all 5 regions and saves to database.
 * Returns health summary with counts by status.
 *
 * Auth:
 *   - Query param: ?secret={CRON_SECRET}
 *   - OR Header: Authorization: Bearer {CRON_SECRET}
 *
 * Response:
 *   200: { success: true, regions: 5, healthy, degraded, outage }
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
      console.error('[Cron:DRHealth] CRON_SECRET not configured');
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
      console.warn('[Cron:DRHealth] Unauthorized cron access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    console.log('[Cron:DRHealth] Starting regional health checks...');

    // ============================================
    // 2. CHECK HEARTBEAT FOR ALL REGIONS
    // ============================================
    const isDryRun = process.env.NODE_ENV !== 'production';
    const env = createDOClient(isDryRun);

    const healthResults: Array<{
      region: DORegion;
      status: 'healthy' | 'degraded' | 'outage';
      healthPercentage: number;
    }> = [];

    for (const region of REGIONS) {
      try {
        // Get heartbeat status (automatically saves to DB via DOClient)
        const heartbeat = await env.getHeartbeatStatus(region);

        // Determine status based on health percentage
        let status: 'healthy' | 'degraded' | 'outage';
        if (heartbeat.healthPercentage >= 95) {
          status = 'healthy';
        } else if (heartbeat.healthPercentage >= 70) {
          status = 'degraded';
        } else {
          status = 'outage';
        }

        healthResults.push({
          region,
          status,
          healthPercentage: heartbeat.healthPercentage,
        });

        console.log(
          `[Cron:DRHealth] ${region}: ${status} (${heartbeat.healthPercentage.toFixed(1)}%)`
        );
      } catch (error: any) {
        console.error(`[Cron:DRHealth] Failed to check ${region}:`, error);

        // Record as outage on error
        healthResults.push({
          region,
          status: 'outage',
          healthPercentage: 0,
        });
      }
    }

    // ============================================
    // 3. CALCULATE SUMMARY
    // ============================================
    const healthy = healthResults.filter((r) => r.status === 'healthy').length;
    const degraded = healthResults.filter((r) => r.status === 'degraded').length;
    const outage = healthResults.filter((r) => r.status === 'outage').length;

    // ============================================
    // 4. RETURN RESULTS
    // ============================================
    const duration = Date.now() - startTime;

    console.log(
      `[Cron:DRHealth] Completed: ${healthy} healthy, ${degraded} degraded, ${outage} outage (${duration}ms)`
    );

    return NextResponse.json(
      {
        success: true,
        regions: REGIONS.length,
        healthy,
        degraded,
        outage,
        details: healthResults,
        duration,
        isDryRun,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cron:DRHealth] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        duration: Date.now() - startTime,
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}
