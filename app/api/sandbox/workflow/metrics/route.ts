/**
 * GET /api/sandbox/workflow/metrics
 *
 * Aggregates per-node performance metrics (avg duration, error rate,
 * execution count) from workflow_execution_events for a given
 * campaign + workflow type.
 *
 * Query params:
 *   - campaignId: string (required)
 *   - workflowType: WorkflowTemplateType (required)
 *   - workspace_id: string (required)
 *
 * @module app/api/sandbox/workflow/metrics/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import { supabaseAdmin } from '@/lib/supabase';
import type { WorkflowTemplateType } from '@/lib/workflow-graph/types';
import { WORKFLOW_TEMPLATE_FILES } from '@/lib/workflow-graph/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NodeMetrics {
  nodeId: string;
  nodeName: string;
  avgDurationMs: number;
  errorRate: number;
  executionCount: number;
}

export interface MetricsResponse {
  metrics: NodeMetrics[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const VALID_WORKFLOW_TYPES = new Set<string>(Object.keys(WORKFLOW_TEMPLATE_FILES));

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  /* 1. Auth */
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: API_HEADERS });
  }

  /* 2. Workspace access */
  const accessError = await validateWorkspaceAccess(req);
  if (accessError) return accessError;

  const workspaceId = extractWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400, headers: API_HEADERS });
  }

  /* 3. Query params */
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');
  const workflowType = searchParams.get('workflowType') as WorkflowTemplateType | null;

  if (!campaignId) {
    return NextResponse.json({ error: 'Missing campaignId' }, { status: 400, headers: API_HEADERS });
  }
  if (!workflowType || !VALID_WORKFLOW_TYPES.has(workflowType)) {
    return NextResponse.json({ error: 'Invalid workflowType' }, { status: 400, headers: API_HEADERS });
  }

  /* 4. Fetch aggregated metrics from DB */
  if (!supabaseAdmin) {
    return NextResponse.json({ metrics: [] } satisfies MetricsResponse, { headers: API_HEADERS });
  }

  try {
    // Query individual execution events, group in JS
    const { data: rows, error: dbError } = await (supabaseAdmin as any)
      .schema('genesis')
      .from('workflow_execution_events')
      .select('node_id, node_name, status, execution_time_ms')
      .eq('workspace_id', workspaceId)
      .eq('campaign_id', campaignId)
      .eq('workflow_type', workflowType)
      .not('node_type', 'eq', '_execution_complete')
      .order('created_at', { ascending: false })
      .limit(500);

    if (dbError) {
      console.error('[metrics] DB error:', dbError);
      return NextResponse.json({ metrics: [] } satisfies MetricsResponse, { headers: API_HEADERS });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ metrics: [] } satisfies MetricsResponse, { headers: API_HEADERS });
    }

    // Aggregate per node
    const nodeMap = new Map<
      string,
      { nodeName: string; totalMs: number; count: number; errors: number; durCount: number }
    >();

    for (const row of rows) {
      const key = row.node_id || row.node_name;
      if (!key) continue;

      let entry = nodeMap.get(key);
      if (!entry) {
        entry = { nodeName: row.node_name, totalMs: 0, count: 0, errors: 0, durCount: 0 };
        nodeMap.set(key, entry);
      }

      entry.count += 1;
      if (row.status === 'error' || row.status === 'failed') {
        entry.errors += 1;
      }
      if (row.execution_time_ms != null) {
        entry.totalMs += row.execution_time_ms;
        entry.durCount += 1;
      }
    }

    const metrics: NodeMetrics[] = [];
    for (const [nodeId, entry] of nodeMap) {
      metrics.push({
        nodeId,
        nodeName: entry.nodeName,
        avgDurationMs: entry.durCount > 0 ? Math.round(entry.totalMs / entry.durCount) : 0,
        errorRate: entry.count > 0 ? Number((entry.errors / entry.count).toFixed(3)) : 0,
        executionCount: entry.count,
      });
    }

    return NextResponse.json(
      { metrics } satisfies MetricsResponse,
      { headers: API_HEADERS },
    );
  } catch (err) {
    console.error('[metrics] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS },
    );
  }
}
