/**
 * DELETE /api/workspace/export/cancel/[jobId]
 * Cancel in-progress export
 * 
 * Stops export job and releases workspace lock
 */

import { NextRequest, NextResponse } from 'next/server';
import { cancelDataExport } from '@/lib/genesis/data-export';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId' },
        { status: 400 }
      );
    }

    // Cancel export
    const result = await cancelDataExport(jobId, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to cancel export',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Export cancelled successfully',
    });
  } catch (error) {
    console.error('[API] Cancel export error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
