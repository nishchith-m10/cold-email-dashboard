/**
 * POST /api/campaigns/[id]/schedule
 *
 * Updates the n8n schedule trigger and send limit for a campaign's
 * Email Preparation workflow. Patched fields:
 *   - scheduleTrigger.parameters.rule.interval → cron expression
 *   - limit.parameters.maxItems → max contacts per run
 *
 * Body: { cronExpr: string, maxPerRun: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { getWorkflow, updateWorkflow } from '@/lib/n8n-client';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

type N8nNode = {
  type: string;
  parameters: Record<string, unknown>;
  [key: string]: unknown;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  // --- Parse body ---
  let cronExpr: string, maxPerRun: number;
  try {
    const body = await req.json();
    cronExpr = String(body.cronExpr || '').trim();
    maxPerRun = Number(body.maxPerRun);
    if (!cronExpr || isNaN(maxPerRun)) throw new Error('missing fields');
  } catch {
    return NextResponse.json({ error: 'Invalid body: cronExpr, maxPerRun required' }, { status: 400 });
  }

  // --- Get campaign ---
  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('campaigns')
    .select('id, n8n_workflow_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (campErr || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (!campaign.n8n_workflow_id) {
    return NextResponse.json({ error: 'Campaign has no linked n8n workflow' }, { status: 400 });
  }

  // --- Get full workflow from n8n ---
  const workflowResult = await getWorkflow(campaign.n8n_workflow_id);
  if (!workflowResult.success) {
    return NextResponse.json(
      { error: 'Failed to fetch workflow from n8n', detail: workflowResult.error },
      { status: 502 },
    );
  }

  const workflow = workflowResult.data as unknown as Record<string, unknown>;
  const nodes = ((workflow.nodes ?? []) as N8nNode[]).map(node => {
    // Patch schedule trigger
    if (node.type === 'n8n-nodes-base.scheduleTrigger') {
      return {
        ...node,
        parameters: {
          ...node.parameters,
          rule: { interval: [{ field: 'cronExpression', expression: cronExpr }] },
        },
      };
    }
    // Patch limit node
    if (node.type === 'n8n-nodes-base.limit') {
      return {
        ...node,
        parameters: { ...node.parameters, maxItems: maxPerRun },
      };
    }
    return node;
  });

  // --- PUT updated workflow back to n8n ---
  const updateResult = await updateWorkflow(campaign.n8n_workflow_id, { ...workflow, nodes });
  if (!updateResult.success) {
    return NextResponse.json(
      { error: 'Failed to update workflow in n8n', detail: updateResult.error },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, schedule: { cronExpr, maxPerRun } });
}
