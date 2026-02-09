/**
 * PHASE 69: CREDENTIAL ROTATION CRON JOB
 * 
 * Daily cron job that identifies expiring OAuth credentials and queues rotation jobs.
 * Protected by CRON_SECRET to prevent unauthorized access.
 * 
 * Schedule: Daily at 2 AM UTC
 * Vercel Cron: 0 2 * * * (cron expression in vercel.json)
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.1.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { queueExpiringCredentials } from '@/lib/genesis/phase69';

/**
 * POST /api/cron/rotate-credentials
 * 
 * Identifies expiring credentials and queues rotation jobs via BullMQ.
 * 
 * Headers:
 *   Authorization: Bearer {CRON_SECRET}
 * 
 * Response:
 *   200: { queued: number, message: string }
 *   401: { error: 'Unauthorized' }
 *   500: { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron:RotateCredentials] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      console.warn('[Cron:RotateCredentials] Unauthorized cron access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Queue expiring credentials for rotation
    console.log('[Cron:RotateCredentials] Starting credential rotation scan...');
    const startTime = Date.now();

    const queuedCount = await queueExpiringCredentials();

    const executionTimeMs = Date.now() - startTime;

    console.log(`[Cron:RotateCredentials] Queued ${queuedCount} credentials in ${executionTimeMs}ms`);

    // 3. Return success
    return NextResponse.json({
      queued: queuedCount,
      message: `Queued ${queuedCount} credentials for rotation`,
      executionTimeMs,
    });

  } catch (error: any) {
    console.error('[Cron:RotateCredentials] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/rotate-credentials
 * 
 * Health check endpoint (returns 200 OK).
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/cron/rotate-credentials',
    description: 'Daily credential rotation cron job',
  });
}
