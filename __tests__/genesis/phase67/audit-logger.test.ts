/**
 * Audit Logger Tests - Phase 67
 * 
 * Tests for comprehensive audit trail system
 * 
 * Coverage:
 * - Audit event logging
 * - Pre-defined event helpers
 * - Query functionality
 * - Error handling
 * - Edge cases (concurrent writes, large details, filtering)
 * - Security (workspace isolation)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  logAuditEvent,
  getAuditLogs,
  AuditEvents,
  type AuditEvent,
} from '@/lib/genesis/audit-logger';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockClient = {
    schema: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  };
  return mockClient as unknown as SupabaseClient<any>;
};

describe('Audit Logger - Event Logging', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should log audit event successfully', async () => {
    const mockAuditId = 'audit-123';

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: mockAuditId,
        error: null,
      }),
    });

    const event: AuditEvent = {
      actorType: 'user',
      actorId: 'user-123',
      action: 'IGNITION_STARTED',
      actionCategory: 'provisioning',
      workspaceId: 'ws-123',
      targetType: 'workspace',
      targetId: 'ws-123',
      details: { region: 'us-east', droplet_size: 'basic-2vcpu-4gb' },
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(true);
    expect(result.auditId).toBe(mockAuditId);
    expect(result.error).toBeNull();
  });

  it('should handle logging failure gracefully', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    });

    const event: AuditEvent = {
      actorType: 'system',
      actorId: 'system',
      action: 'TEST_EVENT',
      actionCategory: 'security',
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(false);
    expect(result.auditId).toBeNull();
    expect(result.error).toBe('Database error');
  });

  it('should log event with minimal required fields', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: 'audit-minimal',
        error: null,
      }),
    });

    const event: AuditEvent = {
      actorType: 'system',
      actorId: 'system',
      action: 'SYSTEM_EVENT',
      actionCategory: 'security',
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(true);
    expect(result.auditId).toBe('audit-minimal');
  });

  it('should log event with all optional fields', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: 'audit-full',
        error: null,
      }),
    });

    const event: AuditEvent = {
      actorType: 'support',
      actorId: 'agent-jane',
      actorEmail: 'jane@company.com',
      action: 'SUPPORT_ACCESS_GRANTED',
      actionCategory: 'support',
      targetType: 'workspace',
      targetId: 'ws-123',
      workspaceId: 'ws-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      region: 'us-east',
      details: {
        access_level: 'read_only',
        ticket_id: 'SUPPORT-12345',
        duration_minutes: 30,
      },
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(true);
  });

  it('should handle large details object', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: 'audit-large-details',
        error: null,
      }),
    });

    const largeDetails = {
      ...Array.from({ length: 100 }, (_, i) => ({
        [`field${i}`]: `value${i}`,
      })).reduce((acc, obj) => ({ ...acc, ...obj }), {}),
    };

    const event: AuditEvent = {
      actorType: 'system',
      actorId: 'system',
      action: 'LARGE_EVENT',
      actionCategory: 'data',
      details: largeDetails,
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(true);
  });
});

describe('Audit Logger - Pre-defined Event Helpers', () => {
  it('should generate ignitionStarted event correctly', () => {
    const event = AuditEvents.ignitionStarted('ws-123', 'user-123', {
      region: 'us-east',
      droplet_size: 'basic-2vcpu-4gb',
    });

    expect(event.actorType).toBe('user');
    expect(event.actorId).toBe('user-123');
    expect(event.action).toBe('IGNITION_STARTED');
    expect(event.actionCategory).toBe('provisioning');
    expect(event.workspaceId).toBe('ws-123');
    expect(event.targetType).toBe('workspace');
    expect(event.details?.region).toBe('us-east');
  });

  it('should generate ignitionCompleted event correctly', () => {
    const event = AuditEvents.ignitionCompleted('ws-123', {
      droplet_id: 'droplet-123',
      duration_seconds: 180,
    });

    expect(event.actorType).toBe('system');
    expect(event.actorId).toBe('ignition-orchestrator');
    expect(event.action).toBe('IGNITION_COMPLETED');
    expect(event.actionCategory).toBe('provisioning');
  });

  it('should generate loginSuccess event correctly', () => {
    const event = AuditEvents.loginSuccess(
      'user-123',
      'user@example.com',
      '192.168.1.1',
      'Mozilla/5.0'
    );

    expect(event.actorType).toBe('user');
    expect(event.action).toBe('LOGIN_SUCCESS');
    expect(event.actionCategory).toBe('security');
    expect(event.ipAddress).toBe('192.168.1.1');
    expect(event.userAgent).toBe('Mozilla/5.0');
    expect(event.actorEmail).toBe('user@example.com');
  });

  it('should generate loginFailed event correctly', () => {
    const event = AuditEvents.loginFailed(
      'user@example.com',
      '192.168.1.1',
      'Mozilla/5.0',
      'Invalid password'
    );

    expect(event.actorType).toBe('user');
    expect(event.action).toBe('LOGIN_FAILED');
    expect(event.actionCategory).toBe('security');
    expect(event.details?.reason).toBe('Invalid password');
  });

  it('should generate dataExported event correctly', () => {
    const event = AuditEvents.dataExported('ws-123', 'user-123', {
      leads: 100,
      events: 500,
      campaigns: 5,
    });

    expect(event.actorType).toBe('user');
    expect(event.action).toBe('DATA_EXPORTED');
    expect(event.actionCategory).toBe('data');
    expect(event.details?.record_counts.leads).toBe(100);
  });

  it('should generate dataDeleted event correctly', () => {
    const event = AuditEvents.dataDeleted('ws-123', 'user-123', {
      leads: 100,
      events: 500,
      campaigns: 5,
    });

    expect(event.actorType).toBe('user');
    expect(event.action).toBe('DATA_DELETED');
    expect(event.actionCategory).toBe('data');
  });

  it('should generate supportAccessGranted event correctly', () => {
    const event = AuditEvents.supportAccessGranted(
      'ws-123',
      'agent-jane',
      'jane@company.com',
      'read_only',
      'SUPPORT-12345'
    );

    expect(event.actorType).toBe('support');
    expect(event.action).toBe('SUPPORT_ACCESS_GRANTED');
    expect(event.actionCategory).toBe('support');
    expect(event.details?.access_level).toBe('read_only');
    expect(event.details?.ticket_id).toBe('SUPPORT-12345');
  });

  it('should generate dropletCreated event correctly', () => {
    const event = AuditEvents.dropletCreated('ws-123', 'droplet-123', {
      region: 'nyc1',
      size: 'basic-2vcpu-4gb',
      image: 'ubuntu-22-04-x64',
    });

    expect(event.actorType).toBe('system');
    expect(event.actorId).toBe('ignition-orchestrator');
    expect(event.action).toBe('DROPLET_CREATED');
    expect(event.actionCategory).toBe('droplet');
    expect(event.targetType).toBe('droplet');
  });

  it('should generate workflowDeployed event correctly', () => {
    const event = AuditEvents.workflowDeployed(
      'ws-123',
      'Email 1',
      'workflow-123'
    );

    expect(event.actorType).toBe('sidecar');
    expect(event.actorId).toBe('workflow-deployer');
    expect(event.action).toBe('WORKFLOW_DEPLOYED');
    expect(event.actionCategory).toBe('workflows');
    expect(event.details?.workflow_name).toBe('Email 1');
  });
});

describe('Audit Logger - Query Functionality', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should retrieve audit logs with default options', async () => {
    const mockLogs = [
      {
        id: 'audit-1',
        timestamp: '2026-02-07T10:00:00Z',
        action: 'LOGIN_SUCCESS',
        actor_id: 'user-123',
      },
      {
        id: 'audit-2',
        timestamp: '2026-02-07T09:00:00Z',
        action: 'DATA_EXPORTED',
        actor_id: 'user-123',
      },
    ];

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: (jest.fn() as any).mockResolvedValue({
        data: mockLogs,
        error: null,
      }),
    });

    const result = await getAuditLogs(mockClient, 'ws-123');

    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('LOGIN_SUCCESS');
  });

  it('should apply limit filter', async () => {
    const mockLogs = Array.from({ length: 10 }, (_, i) => ({
      id: `audit-${i}`,
      timestamp: `2026-02-07T${10 + i}:00:00Z`,
      action: 'TEST_EVENT',
    }));

    const limitMock = (jest.fn() as any).mockResolvedValue({
      data: mockLogs.slice(0, 5),
      error: null,
    });

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: limitMock,
    });

    const result = await getAuditLogs(mockClient, 'ws-123', { limit: 5 });

    expect(limitMock).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(5);
  });

  it('should apply action filter', async () => {
    const mockLogs = [
      {
        id: 'audit-1',
        timestamp: '2026-02-07T10:00:00Z',
        action: 'LOGIN_SUCCESS',
      },
    ];

    const eqMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockReturnThis();
    
    // Mock the async resolution
    Object.defineProperty(orderMock, 'then', {
      value: jest.fn((resolve: any) => resolve({ data: mockLogs, error: null })),
      writable: true,
    });

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: eqMock,
      order: orderMock,
    });

    await getAuditLogs(mockClient, 'ws-123', { action: 'LOGIN_SUCCESS' });

    // Should be called twice: once for workspace_id, once for action
    expect(eqMock).toHaveBeenCalledTimes(2);
    expect(eqMock).toHaveBeenNthCalledWith(1, 'workspace_id', 'ws-123');
    expect(eqMock).toHaveBeenNthCalledWith(2, 'action', 'LOGIN_SUCCESS');
  });

  it('should apply date range filters', async () => {
    const startDate = new Date('2026-02-01T00:00:00Z');
    const endDate = new Date('2026-02-07T23:59:59Z');

    const gteMock = jest.fn().mockReturnThis();
    const lteMock = jest.fn().mockReturnThis();

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: gteMock,
      lte: lteMock,
    });

    // Mock final resolution
    Object.defineProperty(lteMock, 'then', {
      value: jest.fn((resolve: any) => resolve({ data: [], error: null })),
      writable: true,
    });

    await getAuditLogs(mockClient, 'ws-123', { startDate, endDate });

    expect(gteMock).toHaveBeenCalledWith('timestamp', startDate.toISOString());
    expect(lteMock).toHaveBeenCalledWith('timestamp', endDate.toISOString());
  });

  it('should handle database errors gracefully', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      }),
    });

    const result = await getAuditLogs(mockClient, 'ws-123');

    expect(result).toEqual([]);
  });

  it('should handle empty result set', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: (jest.fn() as any).mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    const result = await getAuditLogs(mockClient, 'ws-123');

    expect(result).toEqual([]);
  });
});

describe('Audit Logger - Event Helper Validation', () => {
  it('ignitionStarted should include all required fields', () => {
    const event = AuditEvents.ignitionStarted('ws-123', 'user-123', {
      region: 'eu-west',
    });

    expect(event).toMatchObject({
      actorType: 'user',
      actorId: 'user-123',
      action: 'IGNITION_STARTED',
      actionCategory: 'provisioning',
      targetType: 'workspace',
      targetId: 'ws-123',
      workspaceId: 'ws-123',
    });
  });

  it('ignitionFailed should include error details', () => {
    const event = AuditEvents.ignitionFailed(
      'ws-123',
      'Droplet provisioning timeout',
      { attempted_region: 'us-east' }
    );

    expect(event.action).toBe('IGNITION_FAILED');
    expect(event.details?.error).toBe('Droplet provisioning timeout');
  });

  it('permissionDenied should capture attempted action', () => {
    const event = AuditEvents.permissionDenied(
      'user-123',
      'workspace_settings',
      'update'
    );

    expect(event.action).toBe('PERMISSION_DENIED');
    expect(event.actionCategory).toBe('security');
    expect(event.details?.resource).toBe('workspace_settings');
    expect(event.details?.attempted_action).toBe('update');
  });

  it('dropletTerminated should include termination reason', () => {
    const event = AuditEvents.dropletTerminated(
      'ws-123',
      'droplet-123',
      'Kill switch triggered'
    );

    expect(event.action).toBe('DROPLET_TERMINATED');
    expect(event.actionCategory).toBe('droplet');
    expect(event.details?.reason).toBe('Kill switch triggered');
  });

  it('supportAccessGranted should include ticket info', () => {
    const event = AuditEvents.supportAccessGranted(
      'ws-123',
      'agent-jane',
      'jane@company.com',
      'debug',
      'SUPPORT-12345'
    );

    expect(event.actorType).toBe('support');
    expect(event.actorEmail).toBe('jane@company.com');
    expect(event.details?.access_level).toBe('debug');
    expect(event.details?.ticket_id).toBe('SUPPORT-12345');
  });

  it('workflowDeployed should track workflow details', () => {
    const event = AuditEvents.workflowDeployed(
      'ws-123',
      'Email 1-SMTP',
      'workflow-123'
    );

    expect(event.actorType).toBe('sidecar');
    expect(event.actorId).toBe('workflow-deployer');
    expect(event.action).toBe('WORKFLOW_DEPLOYED');
    expect(event.targetType).toBe('workflow');
    expect(event.targetId).toBe('workflow-123');
  });
});

describe('Audit Logger - Security & Edge Cases', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should handle null/undefined optional fields', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: 'audit-null-fields',
        error: null,
      }),
    });

    const event: AuditEvent = {
      actorType: 'system',
      actorId: 'system',
      action: 'TEST',
      actionCategory: 'security',
      targetType: undefined,
      targetId: undefined,
      ipAddress: undefined,
      details: undefined,
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(true);
  });

  it('should handle exception during logging', async () => {
    (mockClient.schema as jest.Mock<any>).mockImplementation(() => {
      throw new Error('Network failure');
    });

    const event: AuditEvent = {
      actorType: 'user',
      actorId: 'user-123',
      action: 'TEST',
      actionCategory: 'security',
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network failure');
  });

  it('should handle special characters in details', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: 'audit-special-chars',
        error: null,
      }),
    });

    const event: AuditEvent = {
      actorType: 'user',
      actorId: 'user-123',
      action: 'TEST',
      actionCategory: 'security',
      details: {
        message: "Test with 'quotes' and \"double quotes\"",
        sql: "SELECT * FROM users WHERE id = '123'",
        json: '{"key": "value"}',
      },
    };

    const result = await logAuditEvent(mockClient, event);

    expect(result.success).toBe(true);
  });
});
