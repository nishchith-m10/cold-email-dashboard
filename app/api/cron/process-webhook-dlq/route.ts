/**
 * PHASE 69: PROCESS WEBHOOK DLQ CRON JOB
 * 
 * Retries failed webhook deliveries from the Dead Letter Queue.
 * Runs every 5 minutes with exponential backoff.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDLQBatch } from '@/lib/genesis/phase69';

/**
 * POST /api/cron/process-webhook-dlq
 * 
 * Process a batch of webhook DLQ entries for retry.
 * 
 * Headers:
 *   Authorization: Bearer {CRON_SECRET}
 * 
 * Response:
 *   200: { totalProcessed, successful, failed, abandoned }
 *   401: { error: 'Unauthorized' }
 *   500: { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron:ProcessWebhookDLQ] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      console.warn('[Cron:ProcessWebhookDLQ] Unauthorized cron access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Process DLQ batch (limit 100 entries per run)
    console.log('[Cron:ProcessWebhookDLQ] Starting DLQ batch processing...');
    const startTime = Date.now();

    const result = await processDLQBatch(100);

    const executionTimeMs = Date.now() - startTime;

    console.log(
      `[Cron:ProcessWebhookDLQ] Processed ${result.totalProcessed} entries: ` +
      `${result.successful} successful, ${result.failed} failed, ${result.abandoned} abandoned ` +
      `(${executionTimeMs}ms)`
    );

    // 3. Return result
    return NextResponse.json({
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
      abandoned: result.abandoned,
      executionTimeMs,
      message: `Processed ${result.totalProcessed} DLQ entries`,
    });

  } catch (error: any) {
    console.error('[Cron:ProcessWebhookDLQ] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process-webhook-dlq
 * 
 * Health check endpoint (returns 200 OK).
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/cron/process-webhook-dlq',
    description: 'Webhook DLQ retry processor (runs every 5 minutes)',
  });
}
