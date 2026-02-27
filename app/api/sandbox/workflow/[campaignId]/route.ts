/**
 * GET /api/sandbox/workflow/[campaignId]
 *
 * Fetches an n8n workflow for a campaign, transforms it into a
 * WorkflowGraph for the sandbox flow canvas.
 *
 * Query params:
 *   - workflowType: WorkflowTemplateType (required)
 *   - workspace_id: string (required, via header or query)
 *
 * Response: WorkflowGraphResponse { graph, source }
 *
 * Falls back to reading the base template from disk when the
 * sidecar is unreachable or the campaign has no live workflows.
 *
 * @module app/api/sandbox/workflow/[campaignId]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import { transformN8nToGraph } from '@/lib/workflow-graph/adapter';
import {
  WORKFLOW_TEMPLATE_FILES,
  type WorkflowTemplateType,
  type WorkflowGraphResponse,
} from '@/lib/workflow-graph/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_WORKFLOW_TYPES = new Set<string>(Object.keys(WORKFLOW_TEMPLATE_FILES));

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * Load a base template JSON from the `base-cold-email/` directory.
 */
async function loadBaseTemplate(
  workflowType: WorkflowTemplateType,
): Promise<unknown | null> {
  const filename = WORKFLOW_TEMPLATE_FILES[workflowType];
  const templatePath = path.join(process.cwd(), 'base-cold-email', filename);

  try {
    const raw = await fs.readFile(templatePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Attempt to fetch a live workflow from the sidecar via
 * HttpSidecarClient. Returns null if unavailable.
 *
 * NOTE: This path requires genesis infrastructure (partition_registry,
 * HttpSidecarClient). It's designed to fail gracefully and fall back to
 * the template path when genesis is not provisioned.
 */
async function fetchLiveWorkflow(
  workspaceId: string,
  _campaignId: string,
  _workflowType: WorkflowTemplateType,
): Promise<unknown | null> {
  try {
    // Dynamic import to avoid hard dependency on genesis modules
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) return null;

    // Look up the partition registry for the workspace's droplet IP
    const { data: registryRow, error: registryError } = await (supabaseAdmin as any)
      .schema('genesis')
      .from('partition_registry')
      .select('workspace_id, droplet_ip, status')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .maybeSingle();

    if (registryError || !registryRow || !registryRow.droplet_ip) {
      return null;
    }

    // Look up the campaign's n8n workflow ID from the campaigns table
    // Campaigns store a single n8n_workflow_id — in the future this will
    // be extended to per-template workflow IDs via campaign_workflows.
    // For now, we fall back to template.
    // TODO(SBX): Extend to support per-template workflow lookups
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS },
      );
    }

    // ── 2. Workspace validation ──────────────────────────────────────
    const accessError = await validateWorkspaceAccess(request);
    if (accessError) return accessError;

    const workspaceId = extractWorkspaceId(request);

    // ── 3. Parse params ─────────────────────────────────────────────
    const { campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const workflowTypeParam = searchParams.get('workflowType');

    if (!workflowTypeParam || !VALID_WORKFLOW_TYPES.has(workflowTypeParam)) {
      return NextResponse.json(
        {
          error: 'Invalid or missing workflowType query parameter',
          validTypes: Array.from(VALID_WORKFLOW_TYPES),
        },
        { status: 400, headers: API_HEADERS },
      );
    }

    const workflowType = workflowTypeParam as WorkflowTemplateType;

    // ── 4. Try live workflow first ───────────────────────────────────
    const liveWorkflow = await fetchLiveWorkflow(
      workspaceId!,
      campaignId,
      workflowType,
    );

    if (liveWorkflow) {
      const graph = transformN8nToGraph(liveWorkflow, workflowType);
      const response: WorkflowGraphResponse = { graph, source: 'live' };
      return NextResponse.json(response, { headers: API_HEADERS });
    }

    // ── 5. Fallback to base template ────────────────────────────────
    const template = await loadBaseTemplate(workflowType);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found for workflow type: ${workflowType}` },
        { status: 404, headers: API_HEADERS },
      );
    }

    const graph = transformN8nToGraph(template, workflowType);
    const response: WorkflowGraphResponse = { graph, source: 'template' };
    return NextResponse.json(response, { headers: API_HEADERS });
  } catch (error) {
    console.error('[Sandbox Workflow API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}
