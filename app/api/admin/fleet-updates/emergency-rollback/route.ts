/**
 * PHASE 72 — POST /api/admin/fleet-updates/emergency-rollback
 *
 * Execute an emergency rollback ("The Oh Shit Button").
 * Body: { component, rollback_to_version, scope, specific_workspace_id?, reason }
 *
 * Super Admin only.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeEmergencyRollback, estimateRollbackTime } from '@/lib/genesis/phase72/emergency-rollback';
import type { FleetComponent, RollbackScope } from '@/lib/genesis/phase72/types';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

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
    const {
      component,
      rollback_to_version,
      scope,
      specific_workspace_id,
      reason,
    } = body;

    if (!component || !rollback_to_version || !scope || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: component, rollback_to_version, scope, reason' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const validScopes: RollbackScope[] = ['all_tenants', 'affected_only', 'specific_tenant'];
    if (!validScopes.includes(scope)) {
      return NextResponse.json(
        { error: `Invalid scope: ${scope}. Valid: ${validScopes.join(', ')}` },
        { status: 400, headers: API_HEADERS }
      );
    }

    if (scope === 'specific_tenant' && !specific_workspace_id) {
      return NextResponse.json(
        { error: 'specific_workspace_id required when scope is specific_tenant' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const result = await executeEmergencyRollback({
      component: component as FleetComponent,
      rollback_to_version,
      scope: scope as RollbackScope,
      specific_workspace_id,
      initiated_by: userId,
      reason,
    });

    const timing = estimateRollbackTime(result.total_affected);

    return NextResponse.json(
      {
        success: true,
        result,
        estimated_time: timing.formatted,
      },
      { status: 201, headers: API_HEADERS }
    );
  } catch (error) {
    console.error('[FleetUpdates/EmergencyRollback] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
