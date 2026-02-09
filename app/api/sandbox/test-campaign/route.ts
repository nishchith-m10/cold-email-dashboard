/**
 * PHASE 45 - POST /api/sandbox/test-campaign
 * 
 * Triggers a test campaign workflow via the Sidecar Agent.
 * Requires Clerk auth + workspace access. Rate limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SandboxRateLimiter } from '@/lib/genesis/phase45/sandbox-rate-limiter';
import {
  WorkflowTriggerService,
  WorkflowTriggerError,
} from '@/lib/genesis/phase45/workflow-trigger';
import type { ExecutionEventDB } from '@/lib/genesis/phase45/execution-event-service';
import { ExecutionEventService } from '@/lib/genesis/phase45/execution-event-service';
import { isGenesisSchemaAvailable } from '@/lib/genesis/schema-check';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function createRateLimitDB() {
  if (!supabaseAdmin) return null;
  return {
    async countRunsInWindow(workspaceId: string, windowSeconds: number): Promise<number> {
      const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
      const { count, error } = await (supabaseAdmin as any).schema('genesis')
        .from('sandbox_test_runs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('started_at', cutoff);
      if (error) return 0;
      return count ?? 0;
    },
  };
}

function createEventDB(): ExecutionEventDB | null {
  if (!supabaseAdmin) return null;
  return {
    async insertEvent() { return { error: null }; },
    async getEventsByExecution() { return { data: null, error: null }; },
    async isExecutionComplete() { return false; },
    async getExecutionWorkspace() { return null; },
    async getAllEvents() { return { data: null, error: null }; },
    async createTestRun(run: Record<string, unknown>) {
      const { data, error } = await (supabaseAdmin as any).schema('genesis')
        .from('sandbox_test_runs')
        .insert(run)
        .select()
        .single();
      return { data, error };
    },
    async updateTestRun(runId: string, updates: Record<string, unknown>) {
      const { error } = await (supabaseAdmin as any).schema('genesis')
        .from('sandbox_test_runs')
        .update(updates)
        .eq('id', runId);
      return { error };
    },
    async listTestRuns() { return { data: null, error: null }; },
    async countRunsInWindow() { return 0; },
  };
}

function createWorkspaceLookupDB() {
  if (!supabaseAdmin) return null;
  return {
    async getSidecarUrl(workspaceId: string): Promise<string | null> {
      // Try partition_registry first (has sidecar URL)
      const { data } = await (supabaseAdmin as any).schema('genesis')
        .from('partition_registry')
        .select('sidecar_url')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      return data?.sidecar_url ?? null;
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    if (!(await isGenesisSchemaAvailable())) {
      return NextResponse.json(
        { error: 'Sandbox not available: genesis schema not exposed in PostgREST. Add "genesis" to Supabase Dashboard > Settings > API > Exposed schemas.' },
        { status: 503, headers: API_HEADERS }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    const body = await request.json();
    const { workspaceId, campaignId, testEmail, testLeadData } = body;

    if (!workspaceId || !campaignId) {
      return NextResponse.json(
        { error: 'workspaceId and campaignId are required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Verify workspace access
    const { data: membership } = await supabaseAdmin
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

    // Rate limit check
    const rateLimitDB = createRateLimitDB();
    if (rateLimitDB) {
      const limiter = new SandboxRateLimiter(rateLimitDB);
      const limit = await limiter.checkLimit(workspaceId);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            remaining: limit.remaining,
            retryAfterSeconds: limit.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              ...API_HEADERS,
              'Retry-After': String(limit.retryAfterSeconds || 3600),
            },
          }
        );
      }
    }

    // Create test run record
    const eventDB = createEventDB();
    let testRunId: string | undefined;
    if (eventDB) {
      const eventService = new ExecutionEventService(eventDB);
      const testRun = await eventService.createTestRun({
        workspaceId,
        campaignId,
        testEmail: testEmail || 'test@example.com',
      });
      testRunId = testRun?.id;
    }

    // Trigger workflow via Sidecar
    const lookupDB = createWorkspaceLookupDB();
    if (!lookupDB) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503, headers: API_HEADERS }
      );
    }

    const triggerService = new WorkflowTriggerService(lookupDB);

    try {
      const result = await triggerService.triggerTest({
        workspaceId,
        campaignId,
        testEmail: testEmail || 'test@example.com',
        testLeadData,
      });

      // Update test run with execution ID
      if (testRunId && eventDB) {
        const eventService = new ExecutionEventService(eventDB);
        await eventService.markTestRunStarted(testRunId, result.executionId);
      }

      return NextResponse.json(
        {
          success: true,
          executionId: result.executionId,
          streamUrl: result.streamUrl,
          testRunId,
        },
        { headers: API_HEADERS }
      );
    } catch (triggerError) {
      if (triggerError instanceof WorkflowTriggerError) {
        const status = triggerError.code === 'NO_SIDECAR' ? 404 : 502;
        return NextResponse.json(
          { error: triggerError.message, code: triggerError.code },
          { status, headers: API_HEADERS }
        );
      }
      throw triggerError;
    }
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[TestCampaign] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
