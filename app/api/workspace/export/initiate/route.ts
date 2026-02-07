/**
 * POST /api/workspace/export/initiate
 * Initiate data export for GDPR portability
 * 
 * Creates background job for exporting all workspace data
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateDataExport } from '@/lib/genesis/data-export';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace ID
    const { workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      );
    }

    // Initiate export
    const result = await initiateDataExport(workspaceId, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to initiate export',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      estimatedMinutes: result.estimatedMinutes,
      message: `Export initiated. Estimated completion: ${result.estimatedMinutes} minute(s).`,
    });
  } catch (error) {
    console.error('[API] Initiate export error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
