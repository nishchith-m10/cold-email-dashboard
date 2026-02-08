/**
 * PHASE 44 - GET /api/admin/scale-health/alerts
 * 
 * List scale alerts with optional status filter.
 * Super Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ScaleHealthService } from '@/lib/genesis/phase44/scale-health-service';
import type { AlertStatus } from '@/lib/genesis/phase44/types';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const VALID_STATUSES = ['active', 'acknowledged', 'resolved', 'ignored'];

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const statusFilter = statusParam && VALID_STATUSES.includes(statusParam)
      ? statusParam as AlertStatus
      : undefined;

    const service = new ScaleHealthService(supabaseAdmin as any);
    const alerts = await service.getAlerts(statusFilter);

    return NextResponse.json(
      { success: true, alerts, totalCount: alerts.length },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[ScaleHealth] Alerts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
