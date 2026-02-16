/**
 * PHASE 72 — GET /api/admin/fleet-updates/versions
 *
 * Get fleet version information:
 *   ?component={name} — Version distribution for a single component
 *   No params — Full fleet overview (all components)
 *
 * Super Admin only.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.3, 68.10
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getComponentVersionDistribution, getFleetOverview } from '@/lib/genesis/phase72/update-monitor';
import { checkVersionCompatibility } from '@/lib/genesis/phase72/version-registry';
import type { FleetComponent } from '@/lib/genesis/phase72/types';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const VALID_COMPONENTS: FleetComponent[] = [
  'dashboard',
  'workflow_email_1',
  'workflow_email_2',
  'workflow_email_3',
  'workflow_email_1_smtp',
  'workflow_email_2_smtp',
  'workflow_email_3_smtp',
  'workflow_email_preparation',
  'workflow_reply_tracker',
  'workflow_research',
  'workflow_opt_out',
  'sidecar',
];

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: API_HEADERS });
    }

    const { userId } = await auth();
    if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: API_HEADERS });
    }

    const component = request.nextUrl.searchParams.get('component');

    if (component) {
      if (!VALID_COMPONENTS.includes(component as FleetComponent)) {
        return NextResponse.json(
          { error: `Invalid component: ${component}. Valid: ${VALID_COMPONENTS.join(', ')}` },
          { status: 400, headers: API_HEADERS }
        );
      }

      const distribution = await getComponentVersionDistribution(component as FleetComponent);
      return NextResponse.json({ success: true, distribution }, { headers: API_HEADERS });
    }

    // Full fleet overview
    const overview = await getFleetOverview();

    // Also check version compatibility if query params provided
    const dashVer = request.nextUrl.searchParams.get('dashboard_version');
    const sidecarVer = request.nextUrl.searchParams.get('sidecar_version');
    const workflowVer = request.nextUrl.searchParams.get('workflow_version');

    let compatibility = null;
    if (dashVer && sidecarVer && workflowVer) {
      compatibility = checkVersionCompatibility(dashVer, sidecarVer, workflowVer);
    }

    return NextResponse.json(
      { success: true, overview, compatibility },
      { headers: API_HEADERS }
    );
  } catch (error) {
    console.error('[FleetUpdates/Versions] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
