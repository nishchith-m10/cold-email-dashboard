/**
 * PHASE 69: ADMIN WEBHOOK DLQ ENDPOINT
 * 
 * Admin endpoint to view webhook Dead Letter Queue entries.
 * Allows filtering by status and workspace.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDLQEntriesForWorkspace, getDLQStats } from '@/lib/genesis/phase69';

/**
 * GET /api/admin/webhook-dlq
 * 
 * Get DLQ entries with optional filtering.
 * 
 * Query params:
 *   workspace_id: Filter by workspace (optional)
 *   status: Filter by status (optional): pending, retrying, resolved, abandoned
 *   limit: Max entries to return (default 100)
 * 
 * Response:
 *   200: { entries: DLQEntry[], stats: DLQStats }
 *   401: { error: 'Unauthorized' }
 *   500: { error: string }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication (Clerk)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check if user is super admin
    const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',') || [];
    if (!superAdminIds.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status') as any;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // 4. Fetch DLQ entries
    let entries;
    if (workspaceId) {
      entries = await getDLQEntriesForWorkspace(workspaceId, status, limit);
    } else {
      // For global view, get stats only (fetching all entries would be expensive)
      entries = [];
    }

    // 5. Get stats
    const stats = await getDLQStats();

    // 6. Return response
    return NextResponse.json({
      entries,
      stats,
      filters: {
        workspaceId: workspaceId || null,
        status: status || null,
        limit,
      },
    });

  } catch (error: any) {
    console.error('[Admin:WebhookDLQ] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
