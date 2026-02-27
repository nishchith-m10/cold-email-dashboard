/**
 * POST /api/sandbox/workflow/update
 *
 * Updates a single node's parameters within a workflow.
 *
 * Request body:
 *   {
 *     campaignId: string,
 *     workflowType: WorkflowTemplateType,
 *     nodeId: string,
 *     paramChanges: Record<string, unknown>
 *   }
 *
 * Flow:
 *   1. Auth + workspace validation + role check (owner/admin)
 *   2. Fetch current workflow from sidecar (or template fallback)
 *   3. Apply patch via buildNodePatch
 *   4. Send UPDATE_WORKFLOW to sidecar
 *   5. Return transformed WorkflowGraph
 *
 * @module app/api/sandbox/workflow/update/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  validateWorkspaceAccess,
  extractWorkspaceId,
} from '@/lib/api-workspace-guard';
import { buildNodePatch } from '@/lib/workflow-graph/patch-builder';
import { transformN8nToGraph } from '@/lib/workflow-graph/adapter';
import {
  WORKFLOW_TEMPLATE_FILES,
  type WorkflowTemplateType,
  type WorkflowGraphResponse,
} from '@/lib/workflow-graph/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_WORKFLOW_TYPES = new Set<string>(Object.keys(WORKFLOW_TEMPLATE_FILES));
const EDITOR_ROLES = new Set(['owner', 'admin']);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
 * Check if a user has the required role for editing.
 */
async function checkEditPermission(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) return false;

    const { data } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    return data ? EDITOR_ROLES.has(data.role) : false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400, headers: API_HEADERS },
      );
    }

    // ── 3. Role check ────────────────────────────────────────────────
    const hasPermission = await checkEditPermission(workspaceId, userId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden — only owners and admins can edit workflows' },
        { status: 403, headers: API_HEADERS },
      );
    }

    // ── 4. Parse body ────────────────────────────────────────────────
    const body = await request.json();
    const { campaignId, workflowType, nodeId, paramChanges } = body as {
      campaignId?: string;
      workflowType?: string;
      nodeId?: string;
      paramChanges?: Record<string, unknown>;
    };

    if (!campaignId || !workflowType || !nodeId || !paramChanges) {
      return NextResponse.json(
        {
          error: 'Missing required fields: campaignId, workflowType, nodeId, paramChanges',
        },
        { status: 400, headers: API_HEADERS },
      );
    }

    if (!VALID_WORKFLOW_TYPES.has(workflowType)) {
      return NextResponse.json(
        {
          error: 'Invalid workflowType',
          validTypes: Array.from(VALID_WORKFLOW_TYPES),
        },
        { status: 400, headers: API_HEADERS },
      );
    }

    const wfType = workflowType as WorkflowTemplateType;

    // ── 5. Fetch current workflow (sidecar or template) ──────────────
    // TODO(SBX): Add live sidecar fetch when campaign_workflows is ready.
    // For now, load from base template.
    const currentWorkflow = await loadBaseTemplate(wfType);
    if (!currentWorkflow) {
      return NextResponse.json(
        { error: `Template not found for workflow type: ${wfType}` },
        { status: 404, headers: API_HEADERS },
      );
    }

    // ── 6. Apply patch ───────────────────────────────────────────────
    let patchedWorkflow: unknown;
    try {
      const { nodes: patchedNodes } = buildNodePatch(
        currentWorkflow,
        nodeId,
        paramChanges,
      );
      // Reconstruct full workflow with patched nodes
      patchedWorkflow = {
        ...(currentWorkflow as Record<string, unknown>),
        nodes: patchedNodes,
      };
    } catch (patchError) {
      return NextResponse.json(
        {
          error: 'Failed to apply patch',
          details: patchError instanceof Error ? patchError.message : String(patchError),
        },
        { status: 400, headers: API_HEADERS },
      );
    }

    // ── 7. Send UPDATE_WORKFLOW to sidecar (when available) ──────────
    // TODO(SBX): Send UPDATE_WORKFLOW command to sidecar
    // For now, return the patched graph without persisting to sidecar

    // ── 8. Return transformed graph ──────────────────────────────────
    const graph = transformN8nToGraph(patchedWorkflow, wfType);
    const response: WorkflowGraphResponse = { graph, source: 'template' };
    return NextResponse.json(response, { headers: API_HEADERS });
  } catch (error) {
    console.error('[Sandbox Workflow Update API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}
