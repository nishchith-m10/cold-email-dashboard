/**
 * DELETE /api/workspace/delete/validate
 * Validate if workspace can be deleted
 * 
 * Returns blocking issues, warnings, and impact report
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateDeletion } from '@/lib/genesis/tenant-lifecycle';
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

    // Validate deletion
    const validation = await validateDeletion(workspaceId);

    if (!validation) {
      return NextResponse.json(
        { error: 'Failed to validate deletion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      canDelete: validation.canDelete,
      blockingIssues: validation.blockingIssues,
      warnings: validation.warnings,
      impactReport: validation.impactReport,
    });
  } catch (error) {
    console.error('[API] Validation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
