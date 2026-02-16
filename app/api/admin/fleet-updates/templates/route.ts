/**
 * PHASE 72 — POST /api/admin/fleet-updates/templates
 *
 * Publish a new workflow template version.
 * Body: { workflow_name, version, workflow_json, changelog, is_canary? }
 *
 * GET /api/admin/fleet-updates/templates?workflow_name={name}
 * List template versions for a workflow.
 *
 * PATCH /api/admin/fleet-updates/templates
 * Promote or mark canary.
 * Body: { workflow_name, version, action: 'promote' | 'mark_canary' | 'unmark_canary' }
 *
 * Super Admin only.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  publishTemplateVersion,
  getVersionHistory,
  getAllCurrentTemplates,
  promoteToCurrentVersion,
  markAsCanary,
  unmarkCanary,
} from '@/lib/genesis/phase72/template-manager';

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

    const workflowName = request.nextUrl.searchParams.get('workflow_name');

    if (workflowName) {
      const versions = await getVersionHistory(workflowName);
      return NextResponse.json({ success: true, versions }, { headers: API_HEADERS });
    }

    // No specific workflow — return current templates for all
    const currentTemplates = await getAllCurrentTemplates();
    return NextResponse.json({ success: true, templates: currentTemplates }, { headers: API_HEADERS });
  } catch (error) {
    console.error('[FleetUpdates/Templates] GET error:', error);
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
    const { workflow_name, version, workflow_json, changelog, is_canary } = body;

    if (!workflow_name || !version || !workflow_json || !changelog) {
      return NextResponse.json(
        { error: 'Missing required fields: workflow_name, version, workflow_json, changelog' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const template = await publishTemplateVersion({
      workflow_name,
      version,
      workflow_json,
      changelog,
      created_by: userId,
      is_canary,
    });

    return NextResponse.json(
      { success: true, template },
      { status: 201, headers: API_HEADERS }
    );
  } catch (error) {
    console.error('[FleetUpdates/Templates] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

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
    const { workflow_name, version, action } = body;

    if (!workflow_name || !version || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: workflow_name, version, action' },
        { status: 400, headers: API_HEADERS }
      );
    }

    switch (action) {
      case 'promote': {
        const promoted = await promoteToCurrentVersion({
          workflow_name,
          version,
          promoted_by: userId,
        });
        return NextResponse.json({ success: true, template: promoted }, { headers: API_HEADERS });
      }

      case 'mark_canary':
        await markAsCanary(workflow_name, version);
        return NextResponse.json({ success: true, message: `${workflow_name}@${version} marked as canary` }, { headers: API_HEADERS });

      case 'unmark_canary':
        await unmarkCanary(workflow_name, version);
        return NextResponse.json({ success: true, message: `${workflow_name}@${version} canary flag removed` }, { headers: API_HEADERS });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: promote, mark_canary, unmark_canary` },
          { status: 400, headers: API_HEADERS }
        );
    }
  } catch (error) {
    console.error('[FleetUpdates/Templates] PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
