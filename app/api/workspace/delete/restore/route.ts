/**
 * POST /api/workspace/delete/restore
 * Restore workspace during grace period
 * 
 * Cancels deletion and reactivates workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { restoreWorkspace } from '@/lib/genesis/tenant-lifecycle';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { workspaceId, reason } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      );
    }

    // Restore workspace
    const result = await restoreWorkspace(workspaceId, userId, reason || 'User requested restoration');

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to restore workspace',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      workspaceId: result.workspaceId,
      restoredResources: result.restoredResources,
      message: result.message,
    });
  } catch (error) {
    console.error('[API] Restore workspace error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
