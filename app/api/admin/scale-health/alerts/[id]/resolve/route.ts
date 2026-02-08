/**
 * PHASE 44 - POST /api/admin/scale-health/alerts/:id/resolve
 * 
 * Manually resolve an alert with resolution notes.
 * Super Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ScaleHealthService } from '@/lib/genesis/phase44/scale-health-service';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const { id: alertId } = await params;
    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const body = await req.json();
    const { resolution_notes } = body;

    if (!resolution_notes || typeof resolution_notes !== 'string') {
      return NextResponse.json(
        { error: 'resolution_notes is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const service = new ScaleHealthService(supabaseAdmin as any);
    const alert = await service.resolveAlert(alertId, userId, resolution_notes);

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found or update failed' },
        { status: 404, headers: API_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, alert },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[ScaleHealth] Resolve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
