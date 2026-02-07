/**
 * POST /api/cron/process-exports
 * Background job processor for data exports
 * 
 * Called by Vercel Cron (every 2 minutes) or manually triggered
 * Processes pending export jobs one at a time
 */

import { NextRequest, NextResponse } from 'next/server';
import { processExportJob } from '@/lib/genesis/data-export';
import { supabaseAdmin } from '@/lib/supabase';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.MATERIALIZED_VIEWS_REFRESH_TOKEN;
  
  if (!cronSecret) {
    console.error('[Export Processor] CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    // Get next pending export job
    const { data: pendingJobs, error: fetchError } = await supabaseAdmin
      .schema('genesis')
      .from('data_export_jobs')
      .select('id, workspace_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('[Export Processor] Failed to fetch pending jobs:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: fetchError.message },
        { status: 500 }
      );
    }

    // No pending jobs
    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending export jobs',
        processed: 0,
      });
    }

    const job = pendingJobs[0];

    console.log(`[Export Processor] Processing job ${job.id} for workspace ${job.workspace_id}`);

    // Process the export
    const result = await processExportJob(job.id);

    if (!result.success) {
      console.error(`[Export Processor] Job ${job.id} failed:`, result.error);
      return NextResponse.json(
        {
          success: false,
          jobId: job.id,
          error: result.error,
        },
        { status: 500 }
      );
    }

    console.log(`[Export Processor] Job ${job.id} completed successfully`);

    return NextResponse.json({
      success: true,
      message: 'Export job processed',
      processed: 1,
      jobId: job.id,
      downloadUrl: result.downloadUrl,
    });
  } catch (error) {
    console.error('[Export Processor] Exception:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual status check
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    // Get export job stats
    const { data: stats, error } = await supabaseAdmin
      .schema('genesis')
      .from('data_export_jobs')
      .select('status')
      .then((result) => {
        if (result.error) return result;

        const statusCounts = (result.data || []).reduce(
          (acc: Record<string, number>, job: { status: string }) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
          },
          {}
        );

        return { data: statusCounts, error: null };
      });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
      message: 'Export processor status',
    });
  } catch (error) {
    console.error('[Export Processor] Status check failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
