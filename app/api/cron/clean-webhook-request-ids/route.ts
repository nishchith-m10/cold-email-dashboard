/**
 * PHASE 69: CLEAN WEBHOOK REQUEST IDS CRON JOB
 * 
 * Removes webhook request IDs older than 10 minutes to prevent table bloat.
 * Runs every hour.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.2.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanOldRequestIds } from '@/lib/genesis/phase69';

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader?.replace('Bearer ', '') !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean old request IDs (10 minute TTL)
    const deleted = await cleanOldRequestIds(10);

    console.log(`[Cron:CleanRequestIds] Deleted ${deleted} old request IDs`);

    return NextResponse.json({
      deleted,
      message: `Deleted ${deleted} old request IDs`,
    });

  } catch (error: any) {
    console.error('[Cron:CleanRequestIds] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/cron/clean-webhook-request-ids',
    description: 'Hourly cleanup of old webhook request IDs',
  });
}
