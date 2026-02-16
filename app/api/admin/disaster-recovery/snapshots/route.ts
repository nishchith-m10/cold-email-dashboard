/**
 * GENESIS PHASE 70: DISASTER RECOVERY SNAPSHOTS API
 *
 * GET /api/admin/disaster-recovery/snapshots - List snapshots
 * POST /api/admin/disaster-recovery/snapshots - Create manual snapshot
 *
 * Auth: SUPER_ADMIN_IDS only
 * Rate limit: Max 1 snapshot per workspace per 24h
 * DRY_RUN mode: X-DR-Mode header support
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  listSnapshots,
  saveSnapshot,
  type SnapshotFilters,
} from '@/lib/genesis/phase70/db-service';
import {
  createDOClient,
  type DORegion,
} from '@/lib/genesis/phase70';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * GET /api/admin/disaster-recovery/snapshots
 *
 * List snapshots with optional filters.
 * Query params: workspaceId, region, status, isDryRun
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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const filters: SnapshotFilters = {};

    const workspaceId = searchParams.get('workspaceId');
    if (workspaceId) {
      filters.workspaceId = workspaceId;
    }

    const region = searchParams.get('region');
    if (region) {
      filters.region = region;
    }

    const status = searchParams.get('status');
    if (status && ['pending', 'completed', 'failed', 'expired'].includes(status)) {
      filters.status = status as 'pending' | 'completed' | 'failed' | 'expired';
    }

    const isDryRunParam = searchParams.get('isDryRun');
    if (isDryRunParam !== null) {
      filters.isDryRun = isDryRunParam === 'true';
    }

    // Fetch snapshots
    const snapshots = await listSnapshots(filters);

    // Pagination metadata
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const paginatedSnapshots = snapshots.slice(offset, offset + limit);

    return NextResponse.json(
      {
        snapshots: paginatedSnapshots,
        pagination: {
          total: snapshots.length,
          limit,
          offset,
          hasMore: offset + limit < snapshots.length,
        },
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error: any) {
    console.error('[DR-Snapshots] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list snapshots' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * POST /api/admin/disaster-recovery/snapshots
 *
 * Create manual snapshot for a workspace.
 * Body: { workspaceId, dropletId, region, type?: 'full' | 'incremental' }
 *
 * Rate limit: Max 1 snapshot per workspace per 24h
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { workspaceId, dropletId, region, type = 'manual' } = body;

    // Validation
    if (!workspaceId || !dropletId || !region) {
      return NextResponse.json(
        { error: 'workspaceId, dropletId, and region are required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const validRegions = ['nyc1', 'sfo1', 'fra1', 'lon1', 'sgp1'];
    if (!validRegions.includes(region)) {
      return NextResponse.json(
        { error: `Invalid region. Must be one of: ${validRegions.join(', ')}` },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Rate limit check: Max 1 snapshot per workspace per 24h
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const recentSnapshots = await listSnapshots({
      workspaceId,
      isDryRun: false,
    });

    const recentSnapshot = recentSnapshots.find(
      (s) => new Date(s.created_at) > last24h && s.status !== 'failed'
    );

    if (recentSnapshot) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded: Max 1 snapshot per workspace per 24 hours',
          lastSnapshot: {
            id: recentSnapshot.id,
            createdAt: recentSnapshot.created_at,
          },
        },
        { status: 429, headers: API_HEADERS }
      );
    }

    // Check DRY_RUN mode from header
    const isDryRun = req.headers.get('X-DR-Mode') === 'dry-run';

    // Create snapshot using real DigitalOcean API
    const env = createDOClient(isDryRun);

    // Create snapshot via DigitalOcean API (persists to DB automatically)
    const snapshotName = `${type}_${new Date().toISOString().split('T')[0]}_${workspaceId}`;
    const snapshot = await env.createSnapshot(dropletId, snapshotName, type as any);

    // Build response headers
    const responseHeaders: Record<string, string> = { ...API_HEADERS };
    if (isDryRun) {
      responseHeaders['X-DR-Mode'] = 'dry-run';
    }

    return NextResponse.json(
      {
        message: isDryRun ? 'Snapshot created (dry-run mode)' : 'Snapshot created successfully',
        snapshot: {
          id: snapshot.id,
          workspaceId: snapshot.workspaceId,
          dropletId: snapshot.dropletId,
          region: snapshot.region,
          type: snapshot.type,
          status: snapshot.status,
          createdAt: snapshot.createdAt,
          expiresAt: snapshot.expiresAt,
          sizeGb: snapshot.sizeGb,
        },
        isDryRun,
      },
      { status: 201, headers: responseHeaders }
    );
  } catch (error: any) {
    console.error('[DR-Snapshots] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create snapshot' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
