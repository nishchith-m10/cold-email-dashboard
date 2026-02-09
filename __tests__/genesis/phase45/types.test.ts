/**
 * PHASE 45: TYPES & MAPPER TESTS
 */

import {
  mapExecutionEventRow,
  mapSandboxTestRunRow,
  DEFAULT_PII_FIELDS,
  DEFAULT_PII_CONFIG,
  SANDBOX_RATE_LIMIT,
} from '@/lib/genesis/phase45/types';
import type { ExecutionEventRow, SandboxTestRunRow } from '@/lib/genesis/phase45/types';

describe('Phase 45 Types', () => {
  describe('mapExecutionEventRow', () => {
    const baseRow: ExecutionEventRow = {
      id: '00000000-0000-0000-0000-000000000001',
      execution_id: 'exec-123',
      workspace_id: 'ws-456',
      campaign_id: 'camp-789',
      workflow_type: 'research',
      node_id: 'node-1',
      node_name: 'OpenAI',
      node_type: 'n8n-nodes-base.openAi',
      status: 'success',
      execution_time_ms: 150,
      input_data: { prompt: 'test' },
      output_data: { result: 'ok' },
      error_message: null,
      test_mode: true,
      created_at: '2026-02-08T12:00:00Z',
    };

    it('maps all fields to camelCase', () => {
      const mapped = mapExecutionEventRow(baseRow);
      expect(mapped.id).toBe(baseRow.id);
      expect(mapped.executionId).toBe('exec-123');
      expect(mapped.workspaceId).toBe('ws-456');
      expect(mapped.campaignId).toBe('camp-789');
      expect(mapped.workflowType).toBe('research');
      expect(mapped.nodeId).toBe('node-1');
      expect(mapped.nodeName).toBe('OpenAI');
      expect(mapped.nodeType).toBe('n8n-nodes-base.openAi');
      expect(mapped.status).toBe('success');
      expect(mapped.executionTimeMs).toBe(150);
      expect(mapped.inputData).toEqual({ prompt: 'test' });
      expect(mapped.outputData).toEqual({ result: 'ok' });
      expect(mapped.errorMessage).toBeNull();
      expect(mapped.testMode).toBe(true);
      expect(mapped.createdAt).toBe('2026-02-08T12:00:00Z');
    });

    it('handles null campaign_id and null execution_time_ms', () => {
      const row: ExecutionEventRow = {
        ...baseRow,
        campaign_id: null,
        execution_time_ms: null,
      };
      const mapped = mapExecutionEventRow(row);
      expect(mapped.campaignId).toBeNull();
      expect(mapped.executionTimeMs).toBeNull();
    });

    it('maps error status', () => {
      const row: ExecutionEventRow = {
        ...baseRow,
        status: 'error',
        error_message: 'Something went wrong',
      };
      const mapped = mapExecutionEventRow(row);
      expect(mapped.status).toBe('error');
      expect(mapped.errorMessage).toBe('Something went wrong');
    });
  });

  describe('mapSandboxTestRunRow', () => {
    const baseRow: SandboxTestRunRow = {
      id: '00000000-0000-0000-0000-000000000002',
      workspace_id: 'ws-456',
      execution_id: 'exec-123',
      campaign_id: 'camp-789',
      test_email: 'test@example.com',
      status: 'completed',
      started_at: '2026-02-08T12:00:00Z',
      completed_at: '2026-02-08T12:01:00Z',
      node_count: 5,
      error_count: 0,
      total_duration_ms: 3200,
    };

    it('maps all fields to camelCase', () => {
      const mapped = mapSandboxTestRunRow(baseRow);
      expect(mapped.id).toBe(baseRow.id);
      expect(mapped.workspaceId).toBe('ws-456');
      expect(mapped.executionId).toBe('exec-123');
      expect(mapped.campaignId).toBe('camp-789');
      expect(mapped.testEmail).toBe('test@example.com');
      expect(mapped.status).toBe('completed');
      expect(mapped.startedAt).toBe('2026-02-08T12:00:00Z');
      expect(mapped.completedAt).toBe('2026-02-08T12:01:00Z');
      expect(mapped.nodeCount).toBe(5);
      expect(mapped.errorCount).toBe(0);
      expect(mapped.totalDurationMs).toBe(3200);
    });

    it('handles pending run with nulls', () => {
      const row: SandboxTestRunRow = {
        ...baseRow,
        execution_id: null,
        campaign_id: null,
        status: 'pending',
        completed_at: null,
        node_count: 0,
        error_count: 0,
        total_duration_ms: null,
      };
      const mapped = mapSandboxTestRunRow(row);
      expect(mapped.executionId).toBeNull();
      expect(mapped.campaignId).toBeNull();
      expect(mapped.status).toBe('pending');
      expect(mapped.completedAt).toBeNull();
      expect(mapped.totalDurationMs).toBeNull();
    });
  });

  describe('Constants', () => {
    it('DEFAULT_PII_FIELDS contains required fields', () => {
      expect(DEFAULT_PII_FIELDS).toContain('email_address');
      expect(DEFAULT_PII_FIELDS).toContain('email');
      expect(DEFAULT_PII_FIELDS).toContain('phone');
      expect(DEFAULT_PII_FIELDS).toContain('first_name');
      expect(DEFAULT_PII_FIELDS).toContain('last_name');
    });

    it('DEFAULT_PII_CONFIG has correct defaults', () => {
      expect(DEFAULT_PII_CONFIG.maxDataSizeBytes).toBe(10240);
      expect(DEFAULT_PII_CONFIG.placeholder).toBe('***REDACTED***');
    });

    it('SANDBOX_RATE_LIMIT has correct defaults', () => {
      expect(SANDBOX_RATE_LIMIT.maxRunsPerHour).toBe(10);
      expect(SANDBOX_RATE_LIMIT.windowSeconds).toBe(3600);
    });
  });
});
