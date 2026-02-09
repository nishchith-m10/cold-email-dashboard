/**
 * PHASE 45: EXECUTION EVENT SERVICE TESTS
 */

import { ExecutionEventService } from '@/lib/genesis/phase45/execution-event-service';
import type { ExecutionEventDB } from '@/lib/genesis/phase45/execution-event-service';
import type { ExecutionEventRow, SandboxTestRunRow } from '@/lib/genesis/phase45/types';

// ============================================
// MOCK DB
// ============================================

function createMockDB(overrides: Partial<ExecutionEventDB> = {}): ExecutionEventDB {
  return {
    insertEvent: jest.fn().mockResolvedValue({ error: null }),
    getEventsByExecution: jest.fn().mockResolvedValue({ data: [], error: null }),
    isExecutionComplete: jest.fn().mockResolvedValue(false),
    getExecutionWorkspace: jest.fn().mockResolvedValue(null),
    getAllEvents: jest.fn().mockResolvedValue({ data: [], error: null }),
    createTestRun: jest.fn().mockResolvedValue({ data: null, error: null }),
    updateTestRun: jest.fn().mockResolvedValue({ error: null }),
    listTestRuns: jest.fn().mockResolvedValue({ data: [], error: null }),
    countRunsInWindow: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

const makeEventRow = (overrides: Partial<ExecutionEventRow> = {}): ExecutionEventRow => ({
  id: '00000000-0000-0000-0000-000000000001',
  execution_id: 'exec-1',
  workspace_id: 'ws-1',
  campaign_id: null,
  workflow_type: 'research',
  node_id: 'node-1',
  node_name: 'OpenAI',
  node_type: 'n8n-nodes-base.openAi',
  status: 'success',
  execution_time_ms: 100,
  input_data: null,
  output_data: { result: 'ok' },
  error_message: null,
  test_mode: true,
  created_at: '2026-02-08T12:00:00Z',
  ...overrides,
});

const makeTestRunRow = (overrides: Partial<SandboxTestRunRow> = {}): SandboxTestRunRow => ({
  id: '00000000-0000-0000-0000-000000000010',
  workspace_id: 'ws-1',
  execution_id: null,
  campaign_id: null,
  test_email: 'test@example.com',
  status: 'pending',
  started_at: '2026-02-08T12:00:00Z',
  completed_at: null,
  node_count: 0,
  error_count: 0,
  total_duration_ms: null,
  ...overrides,
});

describe('ExecutionEventService', () => {
  describe('ingestEvent', () => {
    it('inserts event with sanitized PII', async () => {
      const db = createMockDB();
      const service = new ExecutionEventService(db);

      const result = await service.ingestEvent('ws-1', {
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeName: 'OpenAI',
        nodeType: 'n8n-nodes-base.openAi',
        status: 'success',
        executionTime: 150,
        inputData: { email: 'secret@acme.com', prompt: 'test' },
        outputData: { result: 'ok' },
        testMode: true,
      });

      expect(result.success).toBe(true);
      expect(db.insertEvent).toHaveBeenCalledTimes(1);

      const insertArg = (db.insertEvent as jest.Mock).mock.calls[0][0];
      expect(insertArg.execution_id).toBe('exec-1');
      expect(insertArg.workspace_id).toBe('ws-1');
      // PII should be redacted
      expect(insertArg.input_data.email).toContain('***');
      expect(insertArg.input_data.prompt).toBe('test');
    });

    it('returns error if insert fails', async () => {
      const db = createMockDB({
        insertEvent: jest.fn().mockResolvedValue({ error: { message: 'DB down' } }),
      });
      const service = new ExecutionEventService(db);

      const result = await service.ingestEvent('ws-1', {
        executionId: 'exec-1',
        nodeId: 'n1',
        nodeName: 'Node',
        nodeType: 'test',
        status: 'success',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store');
    });

    it('handles event with no input/output data', async () => {
      const db = createMockDB();
      const service = new ExecutionEventService(db);

      const result = await service.ingestEvent('ws-1', {
        executionId: 'exec-1',
        nodeId: 'n1',
        nodeName: 'Node',
        nodeType: 'test',
        status: 'skipped',
      });

      expect(result.success).toBe(true);
      const insertArg = (db.insertEvent as jest.Mock).mock.calls[0][0];
      expect(insertArg.input_data).toBeNull();
      expect(insertArg.output_data).toBeNull();
    });
  });

  describe('getNewEvents', () => {
    it('returns mapped events', async () => {
      const db = createMockDB({
        getEventsByExecution: jest.fn().mockResolvedValue({
          data: [makeEventRow(), makeEventRow({ id: '00000000-0000-0000-0000-000000000002', node_name: 'Gmail' })],
          error: null,
        }),
      });
      const service = new ExecutionEventService(db);

      const events = await service.getNewEvents('exec-1');
      expect(events).toHaveLength(2);
      expect(events[0].nodeName).toBe('OpenAI');
      expect(events[1].nodeName).toBe('Gmail');
    });

    it('returns empty array on error', async () => {
      const db = createMockDB({
        getEventsByExecution: jest.fn().mockResolvedValue({ data: null, error: 'fail' }),
      });
      const service = new ExecutionEventService(db);

      const events = await service.getNewEvents('exec-1');
      expect(events).toEqual([]);
    });
  });

  describe('getExecutionDetail', () => {
    it('builds summary from events', async () => {
      const db = createMockDB({
        getAllEvents: jest.fn().mockResolvedValue({
          data: [
            makeEventRow({ status: 'success', execution_time_ms: 100 }),
            makeEventRow({ id: '2', node_name: 'Gmail', status: 'success', execution_time_ms: 200 }),
            makeEventRow({ id: '3', node_name: 'Complete', node_type: '_execution_complete', status: 'success', execution_time_ms: 0 }),
          ],
          error: null,
        }),
      });
      const service = new ExecutionEventService(db);

      const { events, summary } = await service.getExecutionDetail('exec-1');
      expect(events).toHaveLength(3);
      expect(summary.nodeCount).toBe(2); // Excludes _execution_complete
      expect(summary.successCount).toBe(2);
      expect(summary.errorCount).toBe(0);
      expect(summary.totalDurationMs).toBe(300);
      expect(summary.status).toBe('completed');
      expect(summary.completedAt).toBeTruthy();
    });

    it('marks running if no completion event', async () => {
      const db = createMockDB({
        getAllEvents: jest.fn().mockResolvedValue({
          data: [makeEventRow()],
          error: null,
        }),
      });
      const service = new ExecutionEventService(db);

      const { summary } = await service.getExecutionDetail('exec-1');
      expect(summary.status).toBe('running');
      expect(summary.completedAt).toBeNull();
    });

    it('marks failed if errors exist', async () => {
      const db = createMockDB({
        getAllEvents: jest.fn().mockResolvedValue({
          data: [
            makeEventRow({ status: 'error', error_message: 'fail' }),
            makeEventRow({ id: '2', node_type: '_execution_complete', status: 'success' }),
          ],
          error: null,
        }),
      });
      const service = new ExecutionEventService(db);

      const { summary } = await service.getExecutionDetail('exec-1');
      expect(summary.status).toBe('failed');
    });

    it('returns empty summary for unknown execution', async () => {
      const db = createMockDB();
      const service = new ExecutionEventService(db);

      const { events, summary } = await service.getExecutionDetail('unknown');
      expect(events).toHaveLength(0);
      expect(summary.nodeCount).toBe(0);
      expect(summary.status).toBe('running');
    });
  });

  describe('test run management', () => {
    it('creates a test run', async () => {
      const db = createMockDB({
        createTestRun: jest.fn().mockResolvedValue({
          data: makeTestRunRow(),
          error: null,
        }),
      });
      const service = new ExecutionEventService(db);

      const run = await service.createTestRun({
        workspaceId: 'ws-1',
        testEmail: 'test@example.com',
      });

      expect(run).not.toBeNull();
      expect(run!.workspaceId).toBe('ws-1');
      expect(run!.status).toBe('pending');
    });

    it('marks test run as started', async () => {
      const db = createMockDB();
      const service = new ExecutionEventService(db);

      await service.markTestRunStarted('run-1', 'exec-1');
      expect(db.updateTestRun).toHaveBeenCalledWith('run-1', {
        execution_id: 'exec-1',
        status: 'running',
      });
    });

    it('completes test run with stats', async () => {
      const db = createMockDB();
      const service = new ExecutionEventService(db);

      await service.completeTestRun('run-1', {
        nodeCount: 5,
        errorCount: 1,
        totalDurationMs: 3000,
        failed: false,
      });

      const call = (db.updateTestRun as jest.Mock).mock.calls[0];
      expect(call[0]).toBe('run-1');
      expect(call[1].status).toBe('completed');
      expect(call[1].node_count).toBe(5);
      expect(call[1].error_count).toBe(1);
    });

    it('marks failed test run', async () => {
      const db = createMockDB();
      const service = new ExecutionEventService(db);

      await service.completeTestRun('run-1', {
        nodeCount: 3,
        errorCount: 3,
        totalDurationMs: 1000,
        failed: true,
      });

      const call = (db.updateTestRun as jest.Mock).mock.calls[0];
      expect(call[1].status).toBe('failed');
    });

    it('lists test runs', async () => {
      const db = createMockDB({
        listTestRuns: jest.fn().mockResolvedValue({
          data: [makeTestRunRow(), makeTestRunRow({ id: '2', test_email: 'other@test.com' })],
          error: null,
        }),
      });
      const service = new ExecutionEventService(db);

      const runs = await service.listTestRuns('ws-1');
      expect(runs).toHaveLength(2);
      expect(runs[0].testEmail).toBe('test@example.com');
    });

    it('returns empty array on list error', async () => {
      const db = createMockDB({
        listTestRuns: jest.fn().mockResolvedValue({ data: null, error: 'fail' }),
      });
      const service = new ExecutionEventService(db);

      const runs = await service.listTestRuns('ws-1');
      expect(runs).toEqual([]);
    });
  });
});
