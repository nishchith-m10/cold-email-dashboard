/**
 * PHASE 72 — POST /api/admin/fleet-updates/rollouts
 *
 * Initiate a new fleet rollout.
 * Body: { component, from_version, to_version, strategy, error_threshold?, canary_percentage? }
 *
 * GET /api/admin/fleet-updates/rollouts?id={rolloutId}
 * Get rollout progress for a specific rollout.
 *
 * Super Admin only.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { initiateRollout, getRolloutProgress, pauseRollout, resumeRollout, abortRollout } from '@/lib/genesis/phase72/rollout-engine';
import type { FleetComponent, RolloutStrategy } from '@/lib/genesis/phase72/types';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: API_HEADERS });
    }

    const { userId } = await auth();
    if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: API_HEADERS });
    }

    const rolloutId = request.nextUrl.searchParams.get('id');
    if (!rolloutId) {
      return NextResponse.json({ error: 'Missing rollout id' }, { status: 400, headers: API_HEADERS });
    }

    const progress = await getRolloutProgress(rolloutId);
    return NextResponse.json({ success: true, progress }, { headers: API_HEADERS });
  } catch (error) {
    console.error('[FleetUpdates/Rollouts] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: API_HEADERS });
    }

    const { userId } = await auth();
    if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: API_HEADERS });
    }

    const body = await request.json();
    const { component, from_version, to_version, strategy, error_threshold, canary_percentage } = body;

    if (!component || !from_version || !to_version || !strategy) {
      return NextResponse.json(
        { error: 'Missing required fields: component, from_version, to_version, strategy' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const rollout = await initiateRollout({
      component: component as FleetComponent,
      from_version,
      to_version,
      strategy: strategy as RolloutStrategy,
      initiated_by: userId,
      error_threshold,
      canary_percentage,
    });

    return NextResponse.json(
      { success: true, rollout },
      { status: 201, headers: API_HEADERS }
    );
  } catch (error) {
    console.error('[FleetUpdates/Rollouts] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * PATCH — Control rollout (pause / resume / abort)
 * Body: { rollout_id, action: 'pause' | 'resume' | 'abort', reason? }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: API_HEADERS });
    }

    const { userId } = await auth();
    if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: API_HEADERS });
    }

    const body = await request.json();
    const { rollout_id, action, reason } = body;

    if (!rollout_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: rollout_id, action' },
        { status: 400, headers: API_HEADERS }
      );
    }

    let result;
    switch (action) {
      case 'pause':
        result = await pauseRollout(rollout_id);
        break;
      case 'resume':
        result = await resumeRollout(rollout_id);
        break;
      case 'abort':
        result = await abortRollout(rollout_id, reason ?? 'Admin requested abort');
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: pause, resume, abort` },
          { status: 400, headers: API_HEADERS }
        );
    }

    return NextResponse.json({ success: true, rollout: result }, { headers: API_HEADERS });
  } catch (error) {
    console.error('[FleetUpdates/Rollouts] PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
