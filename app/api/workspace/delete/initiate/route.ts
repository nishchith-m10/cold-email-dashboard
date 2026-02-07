/**
 * POST /api/workspace/delete/initiate
 * Initiate workspace deletion
 * 
 * Creates deletion job, sends confirmation code via email
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateDeletion } from '@/lib/genesis/tenant-lifecycle';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { workspaceId, triggerReason, gracePeriodDays } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      );
    }

    // Initiate deletion
    const result = await initiateDeletion(
      workspaceId,
      userId,
      'user_request',
      triggerReason,
      gracePeriodDays || 7
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to initiate deletion',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      confirmationCode: result.confirmationCode,
      gracePeriodEnd: result.gracePeriodEnd,
      message: `Deletion scheduled. You have ${gracePeriodDays || 7} days to cancel.`,
    });
  } catch (error) {
    console.error('[API] Initiate deletion error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
