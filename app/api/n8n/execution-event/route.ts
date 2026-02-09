/**
 * PHASE 45 - POST /api/n8n/execution-event
 * 
 * Ingests execution events from Sidecar Agent.
 * Authenticated via X-Workspace-ID + X-Sidecar-Auth headers (not Clerk).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ExecutionEventService } from '@/lib/genesis/phase45/execution-event-service';
import { PiiSanitizer } from '@/lib/genesis/phase45/pii-sanitizer';
import type { IncomingExecutionEvent } from '@/lib/genesis/phase45/types';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const SIDECAR_AUTH_TOKEN = process.env.SIDECAR_AUTH_TOKEN || '';

function createDB() {
  if (!supabaseAdmin) return null;
  return {
    async insertEvent(event: Record<string, unknown>) {
      const { error } = await supabaseAdmin!.schema('genesis' as any)
        .from('workflow_execution_events')
        .insert(event as any);
      return { error };
    },
    async getEventsByExecution() { return { data: null, error: null }; },
    async isExecutionComplete() { return false; },
    async getExecutionWorkspace() { return null; },
    async getAllEvents() { return { data: null, error: null }; },
    async createTestRun() { return { data: null, error: null }; },
    async updateTestRun() { return { error: null }; },
    async listTestRuns() { return { data: null, error: null }; },
    async countRunsInWindow() { return 0; },
  };
}

export async function POST(request: NextRequest) {
  try {
    const db = createDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    // Verify Sidecar authentication
    const workspaceId = request.headers.get('x-workspace-id');
    const authToken = request.headers.get('x-sidecar-auth');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing X-Workspace-ID header' },
        { status: 400, headers: API_HEADERS }
      );
    }

    if (SIDECAR_AUTH_TOKEN && authToken !== SIDECAR_AUTH_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    const event: IncomingExecutionEvent = await request.json();

    // Validate required fields
    if (!event.executionId || !event.nodeId || !event.nodeName || !event.nodeType || !event.status) {
      return NextResponse.json(
        { error: 'Missing required fields: executionId, nodeId, nodeName, nodeType, status' },
        { status: 400, headers: API_HEADERS }
      );
    }

    const service = new ExecutionEventService(db, new PiiSanitizer());
    const result = await service.ingestEvent(workspaceId, event);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500, headers: API_HEADERS }
      );
    }

    return NextResponse.json({ success: true }, { headers: API_HEADERS });
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[ExecutionEvent] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
