/**
 * GET /api/workspace/export/history/[workspaceId]
 * Get export history for workspace
 * 
 * Returns list of past exports with status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExportHistory } from '@/lib/genesis/data-export';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      );
    }

    // Get limit from query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get history
    const history = await getExportHistory(workspaceId, userId, limit);

    return NextResponse.json({
      exports: history,
      count: history.length,
    });
  } catch (error) {
    console.error('[API] Export history error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
