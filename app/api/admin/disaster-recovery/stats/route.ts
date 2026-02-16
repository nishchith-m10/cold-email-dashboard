/**
 * GENESIS PHASE 70: DISASTER RECOVERY STATS API
 *
 * GET /api/admin/disaster-recovery/stats - Get DR statistics
 *
 * Auth: SUPER_ADMIN_IDS only
 * Returns: Coverage metrics, costs, snapshot counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listSnapshots } from '@/lib/genesis/phase70/db-service';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * GET /api/admin/disaster-recovery/stats
 *
 * Get disaster recovery statistics and metrics.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    // Check Super Admin
    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Fetch all snapshots
    const snapshots = await listSnapshots({});

    // Calculate metrics
    const totalSnapshots = snapshots.length;
    const totalWorkspaces = new Set(snapshots.map(s => s.workspace_id)).size;

    // Calculate recent backups (< 24 hours old)
    const now = Date.now();
    const recentSnapshots = snapshots.filter(s => {
      const age = now - new Date(s.created_at).getTime();
      return age < 24 * 60 * 60 * 1000; // 24 hours
    });
    const workspacesWithRecentBackups = new Set(recentSnapshots.map(s => s.workspace_id)).size;
    const coverage = totalWorkspaces > 0 
      ? Math.round((workspacesWithRecentBackups / totalWorkspaces) * 100) 
      : 0;

    // Calculate storage - convert bytes to GB
    const totalSizeGb = snapshots.reduce((sum, s) => sum + ((s.size_bytes || 0) / (1024 * 1024 * 1024)), 0);
    const estimatedMonthlyCost = totalSizeGb * 0.06; // $0.06 per GB/month

    // Breakdown by status
    const byStatus = snapshots.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Breakdown by region
    const byRegion = snapshots.reduce((acc, s) => {
      acc[s.region] = (acc[s.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Breakdown by type
    const byType = snapshots.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find oldest and newest snapshots
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const oldestSnapshot = sortedSnapshots[0];
    const newestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];

    return NextResponse.json(
      {
        success: true,
        data: {
          totalSnapshots,
          totalWorkspaces,
          workspacesWithRecentBackups,
          coverage,
          totalSizeGb: Math.round(totalSizeGb * 100) / 100,
          estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
          byStatus,
          byRegion,
          byType,
          oldestSnapshot: oldestSnapshot ? {
            id: oldestSnapshot.id,
            workspaceId: oldestSnapshot.workspace_id,
            createdAt: oldestSnapshot.created_at,
          } : null,
          newestSnapshot: newestSnapshot ? {
            id: newestSnapshot.id,
            workspaceId: newestSnapshot.workspace_id,
            createdAt: newestSnapshot.created_at,
          } : null,
        },
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error) {
    console.error('[DR-Stats] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}
