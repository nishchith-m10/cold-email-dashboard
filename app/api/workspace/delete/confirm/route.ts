/**
 * POST /api/workspace/delete/confirm
 * Confirm workspace deletion with code
 * 
 * Verifies confirmation code and moves deletion to grace period
 */

import { NextRequest, NextResponse } from 'next/server';
import { confirmDeletion } from '@/lib/genesis/tenant-lifecycle';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { workspaceId, jobId, confirmationCode } = await request.json();

    if (!workspaceId || !jobId || !confirmationCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Confirm deletion
    const result = await confirmDeletion(
      workspaceId,
      jobId,
      userId,
      confirmationCode
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to confirm deletion',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deletion confirmed. Grace period has started.',
    });
  } catch (error) {
    console.error('[API] Confirm deletion error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
