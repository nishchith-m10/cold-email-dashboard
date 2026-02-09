/**
 * PHASE 45: EXECUTION EVENT SERVICE
 * 
 * Core service for ingesting, querying, and streaming execution events.
 * Handles storage of events from Sidecar, SSE streaming to the frontend,
 * and execution summary generation.
 */

import { PiiSanitizer } from './pii-sanitizer';
import type {
  ExecutionEvent,
  ExecutionEventRow,
  IncomingExecutionEvent,
  ExecutionSummary,
  SandboxTestRun,
  SandboxTestRunRow,
} from './types';
import { mapExecutionEventRow, mapSandboxTestRunRow } from './types';

// ============================================
// DATABASE INTERFACE
// ============================================

export interface ExecutionEventDB {
  /** Insert a single execution event */
  insertEvent(event: {
    execution_id: string;
    workspace_id: string;
    campaign_id?: string | null;
    workflow_type?: string | null;
    node_id: string;
    node_name: string;
    node_type: string;
    status: string;
    execution_time_ms?: number | null;
    input_data?: Record<string, unknown> | null;
    output_data?: Record<string, unknown> | null;
    error_message?: string | null;
    test_mode: boolean;
  }): Promise<{ error: unknown }>;

  /** Query events for an execution (for SSE streaming) */
  getEventsByExecution(
    executionId: string,
    afterId?: string
  ): Promise<{ data: ExecutionEventRow[] | null; error: unknown }>;

  /** Check if execution is complete */
  isExecutionComplete(executionId: string): Promise<boolean>;

  /** Get workspace_id from an execution's first event */
  getExecutionWorkspace(executionId: string): Promise<string | null>;

  /** Get events for an execution (all) */
  getAllEvents(executionId: string): Promise<{ data: ExecutionEventRow[] | null; error: unknown }>;

  /** Create a sandbox test run record */
  createTestRun(run: {
    workspace_id: string;
    execution_id?: string;
    campaign_id?: string;
    test_email: string;
    status: string;
  }): Promise<{ data: SandboxTestRunRow | null; error: unknown }>;

  /** Update test run status */
  updateTestRun(
    runId: string,
    updates: Partial<{
      execution_id: string;
      status: string;
      completed_at: string;
      node_count: number;
      error_count: number;
      total_duration_ms: number;
    }>
  ): Promise<{ error: unknown }>;

  /** List test runs for a workspace */
  listTestRuns(workspaceId: string, limit?: number): Promise<{ data: SandboxTestRunRow[] | null; error: unknown }>;

  /** Count test runs in a time window (for rate limiting) */
  countRunsInWindow(workspaceId: string, windowSeconds: number): Promise<number>;
}

// ============================================
// EXECUTION EVENT SERVICE
// ============================================

export class ExecutionEventService {
  private readonly db: ExecutionEventDB;
  private readonly sanitizer: PiiSanitizer;

  constructor(db: ExecutionEventDB, sanitizer?: PiiSanitizer) {
    this.db = db;
    this.sanitizer = sanitizer ?? new PiiSanitizer();
  }

  /**
   * Ingest an execution event from the Sidecar.
   * Sanitizes PII in input/output data before storage.
   */
  async ingestEvent(
    workspaceId: string,
    event: IncomingExecutionEvent
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Sanitize PII in data fields
      const sanitizedInput = event.inputData
        ? this.sanitizer.sanitize(event.inputData)
        : null;
      const sanitizedOutput = event.outputData
        ? this.sanitizer.sanitize(event.outputData)
        : null;

      const { error } = await this.db.insertEvent({
        execution_id: event.executionId,
        workspace_id: workspaceId,
        campaign_id: event.campaignId || null,
        workflow_type: event.workflowType || null,
        node_id: event.nodeId,
        node_name: event.nodeName,
        node_type: event.nodeType,
        status: event.status,
        execution_time_ms: event.executionTime ?? null,
        input_data: sanitizedInput?.data ?? null,
        output_data: sanitizedOutput?.data ?? null,
        error_message: event.errorMessage || null,
        test_mode: event.testMode ?? false,
      });

      if (error) {
        /* eslint-disable-next-line no-console */
        console.error('[ExecutionEventService] Insert failed:', error);
        return { success: false, error: 'Failed to store execution event' };
      }

      return { success: true };
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('[ExecutionEventService] Ingest error:', err);
      return { success: false, error: 'Internal error during event ingestion' };
    }
  }

  /**
   * Get new events for an execution since a given event ID (for SSE polling).
   */
  async getNewEvents(executionId: string, afterId?: string): Promise<ExecutionEvent[]> {
    const { data, error } = await this.db.getEventsByExecution(executionId, afterId);
    if (error || !data) return [];
    return data.map(mapExecutionEventRow);
  }

  /**
   * Check if an execution has completed.
   */
  async isComplete(executionId: string): Promise<boolean> {
    return this.db.isExecutionComplete(executionId);
  }

  /**
   * Get the workspace ID for an execution.
   */
  async getExecutionWorkspace(executionId: string): Promise<string | null> {
    return this.db.getExecutionWorkspace(executionId);
  }

  /**
   * Get all events for an execution and build a summary.
   */
  async getExecutionDetail(executionId: string): Promise<{
    events: ExecutionEvent[];
    summary: ExecutionSummary;
  }> {
    const { data, error } = await this.db.getAllEvents(executionId);
    if (error || !data || data.length === 0) {
      return {
        events: [],
        summary: {
          executionId,
          workspaceId: '',
          campaignId: null,
          workflowType: null,
          testMode: false,
          nodeCount: 0,
          successCount: 0,
          errorCount: 0,
          totalDurationMs: 0,
          startedAt: new Date().toISOString(),
          completedAt: null,
          status: 'running',
        },
      };
    }

    const events = data.map(mapExecutionEventRow);
    const nonSynthetic = events.filter(e => e.nodeType !== '_execution_complete');
    const completionEvent = events.find(e => e.nodeType === '_execution_complete');

    const summary: ExecutionSummary = {
      executionId,
      workspaceId: events[0].workspaceId,
      campaignId: events[0].campaignId,
      workflowType: events[0].workflowType,
      testMode: events.some(e => e.testMode),
      nodeCount: nonSynthetic.length,
      successCount: nonSynthetic.filter(e => e.status === 'success').length,
      errorCount: nonSynthetic.filter(e => e.status === 'error').length,
      totalDurationMs: nonSynthetic.reduce((sum, e) => sum + (e.executionTimeMs ?? 0), 0),
      startedAt: events[0].createdAt,
      completedAt: completionEvent?.createdAt ?? null,
      status: completionEvent
        ? (nonSynthetic.some(e => e.status === 'error') ? 'failed' : 'completed')
        : 'running',
    };

    return { events, summary };
  }

  // ============================================
  // TEST RUN MANAGEMENT
  // ============================================

  /**
   * Create a new sandbox test run record.
   */
  async createTestRun(params: {
    workspaceId: string;
    executionId?: string;
    campaignId?: string;
    testEmail: string;
  }): Promise<SandboxTestRun | null> {
    const { data, error } = await this.db.createTestRun({
      workspace_id: params.workspaceId,
      execution_id: params.executionId,
      campaign_id: params.campaignId,
      test_email: params.testEmail,
      status: 'pending',
    });

    if (error || !data) return null;
    return mapSandboxTestRunRow(data);
  }

  /**
   * Update a test run to mark it as running with an execution ID.
   */
  async markTestRunStarted(runId: string, executionId: string): Promise<void> {
    await this.db.updateTestRun(runId, {
      execution_id: executionId,
      status: 'running',
    });
  }

  /**
   * Complete a test run with final stats.
   */
  async completeTestRun(runId: string, stats: {
    nodeCount: number;
    errorCount: number;
    totalDurationMs: number;
    failed?: boolean;
  }): Promise<void> {
    await this.db.updateTestRun(runId, {
      status: stats.failed ? 'failed' : 'completed',
      completed_at: new Date().toISOString(),
      node_count: stats.nodeCount,
      error_count: stats.errorCount,
      total_duration_ms: stats.totalDurationMs,
    });
  }

  /**
   * List recent test runs for a workspace.
   */
  async listTestRuns(workspaceId: string, limit: number = 20): Promise<SandboxTestRun[]> {
    const { data, error } = await this.db.listTestRuns(workspaceId, limit);
    if (error || !data) return [];
    return data.map(mapSandboxTestRunRow);
  }
}
