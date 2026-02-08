/**
 * PHASE 44 - POST /api/admin/scale-health/run-checks
 * 
 * Trigger manual health check run.
 * Also serves as Vercel Cron endpoint (fallback for pg_cron).
 * Super Admin only (or cron secret).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ScaleHealthService } from '@/lib/genesis/phase44/scale-health-service';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);
const CRON_SECRET = process.env.CRON_SECRET || '';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    // Auth: Super Admin OR cron secret header
    const cronAuth = req.headers.get('authorization');
    const isCron = CRON_SECRET && cronAuth === `Bearer ${CRON_SECRET}`;

    if (!isCron) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: API_HEADERS }
        );
      }
      if (!SUPER_ADMIN_IDS.includes(userId)) {
        return NextResponse.json(
          { error: 'Super Admin access required' },
          { status: 403, headers: API_HEADERS }
        );
      }
    }

    const service = new ScaleHealthService(supabaseAdmin as any);
    const { results, alertsCreated, durationMs } = await service.runHealthChecks();

    return NextResponse.json(
      { success: true, results, alertsCreated, durationMs },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[ScaleHealth] Run checks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
