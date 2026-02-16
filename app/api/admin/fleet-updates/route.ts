/**
 * PHASE 72 — GET /api/admin/fleet-updates
 *
 * Returns fleet update dashboard data:
 *   - Active rollouts with progress & health
 *   - Fleet version overview (all components)
 *   - Recent rollout history
 *
 * Super Admin only.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.9
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDashboardData } from '@/lib/genesis/phase72/update-monitor';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function GET() {
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

    const data = await getDashboardData();

    return NextResponse.json(
      { success: true, ...data },
      { headers: API_HEADERS }
    );
  } catch (error) {
    console.error('[FleetUpdates] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
