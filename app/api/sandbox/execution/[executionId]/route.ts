/**
 * PHASE 45 - GET /api/sandbox/execution/:executionId
 * 
 * Returns all events and summary for a specific execution.
 * Requires Clerk auth + workspace access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ExecutionEventService } from '@/lib/genesis/phase45/execution-event-service';
import { isGenesisSchemaAvailable } from '@/lib/genesis/schema-check';
import type { ExecutionEventRow, SandboxTestRunRow } from '@/lib/genesis/phase45/types';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function createDB() {
  if (!supabaseAdmin) return null;

  return {
    async insertEvent() { return { error: null }; },

    async getEventsByExecution(executionId: string, afterId?: string) {
      let query = (supabaseAdmin as any).schema('genesis')
        .from('workflow_execution_events')
        .select('*')
        .eq('execution_id', executionId);
      if (afterId) {
        query = query.gt('created_at', afterId);
      }
      query = query.order('created_at', { ascending: true });
      const { data, error } = await query;
      return { data: data as ExecutionEventRow[] | null, error };
    },

    async isExecutionComplete(executionId: string) {
      const { data } = await (supabaseAdmin as any).schema('genesis')
        .from('workflow_execution_events')
        .select('id')
        .eq('execution_id', executionId)
        .eq('node_type', '_execution_complete')
        .maybeSingle();
      return !!data;
    },

    async getExecutionWorkspace(executionId: string) {
      const { data } = await (supabaseAdmin as any).schema('genesis')
        .from('workflow_execution_events')
        .select('workspace_id')
        .eq('execution_id', executionId)
        .limit(1)
        .maybeSingle();
      return data?.workspace_id ?? null;
    },

    async getAllEvents(executionId: string) {
      const { data, error } = await (supabaseAdmin as any).schema('genesis')
        .from('workflow_execution_events')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true });
      return { data: data as ExecutionEventRow[] | null, error };
    },

    async createTestRun() { return { data: null as SandboxTestRunRow | null, error: null }; },
    async updateTestRun() { return { error: null }; },
    async listTestRuns() { return { data: null as SandboxTestRunRow[] | null, error: null }; },
    async countRunsInWindow() { return 0; },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const db = createDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    if (!(await isGenesisSchemaAvailable())) {
      return NextResponse.json(
        { success: true, events: [], summary: null, _notice: 'genesis schema not exposed in PostgREST' },
        { headers: API_HEADERS }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    const { executionId } = await params;

    // Verify workspace access
    const workspaceId = await db.getExecutionWorkspace(executionId);
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404, headers: API_HEADERS }
      );
    }

    const { data: membership } = await supabaseAdmin!
      .from('user_workspaces')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const service = new ExecutionEventService(db);
    const { events, summary } = await service.getExecutionDetail(executionId);

    return NextResponse.json(
      { success: true, events, summary },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[ExecutionDetail] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
