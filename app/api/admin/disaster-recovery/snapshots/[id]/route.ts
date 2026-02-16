/**
 * GENESIS PHASE 70: DISASTER RECOVERY SNAPSHOT DETAIL API
 *
 * GET /api/admin/disaster-recovery/snapshots/[id] - Get snapshot details
 * DELETE /api/admin/disaster-recovery/snapshots/[id] - Mark snapshot expired
 *
 * Auth: SUPER_ADMIN_IDS only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateSnapshotStatus } from '@/lib/genesis/phase70/db-service';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * GET /api/admin/disaster-recovery/snapshots/[id]
 *
 * Get snapshot details by ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Snapshot ID is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Database unavailable');
    }

    // Fetch snapshot by ID
    const { data: snapshot, error } = await supabaseAdmin.rpc('get_snapshot', {
      p_snapshot_id: id,
    });

    if (error || !snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404, headers: API_HEADERS }
      );
    }

    return NextResponse.json(
      { snapshot },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error: any) {
    console.error('[DR-Snapshot-Detail] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch snapshot' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * DELETE /api/admin/disaster-recovery/snapshots/[id]
 *
 * Mark snapshot as expired (soft delete).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Snapshot ID is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Database unavailable');
    }

    // Check if snapshot exists
    const { data: snapshot, error: fetchError } = await supabaseAdmin.rpc('get_snapshot', {
      p_snapshot_id: id,
    });

    if (fetchError || !snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404, headers: API_HEADERS }
      );
    }

    if ((snapshot as any).status === 'expired') {
      return NextResponse.json(
        { error: 'Snapshot is already expired' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Mark as expired
    await updateSnapshotStatus(id, 'expired');

    return NextResponse.json(
      {
        message: 'Snapshot marked as expired',
        snapshotId: id,
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error: any) {
    console.error('[DR-Snapshot-Detail] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete snapshot' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
