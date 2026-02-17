/**
 * GET /api/workspace/export/progress/[jobId]
 * Get export job progress
 * 
 * Returns current status, progress percentage, and download URL when ready
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExportProgress } from '@/lib/genesis/data-export';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId' },
        { status: 400 }
      );
    }

    // Get progress
    const progress = await getExportProgress(jobId, userId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('[API] Export progress error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
