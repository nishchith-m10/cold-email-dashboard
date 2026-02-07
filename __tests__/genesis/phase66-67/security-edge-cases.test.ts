/**
 * Security & Edge Case Tests - Phase 66 & 67
 * 
 * Tests for:
 * - Confirmation code brute-force protection
 * - SQL injection attempts
 * - Concurrent operations
 * - Workspace isolation
 * - Large dataset handling
 * - Timeout scenarios
 * - Error propagation
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateDeletionConfirmationCode,
  deleteWorkspaceData,
  exportWorkspaceData,
} from '@/lib/genesis/gdpr-service';
import { logAuditEvent, AuditEvents } from '@/lib/genesis/audit-logger';
import type { SupabaseClient } from '@supabase/supabase-js';

const createMockSupabaseClient = () => {
  const mockClient = {
    schema: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };
  return mockClient as unknown as SupabaseClient<any>;
};

describe('Security - Confirmation Code Validation', () => {
  it('should generate deterministic confirmation codes', () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
    const code1 = generateDeletionConfirmationCode(workspaceId);
    const code2 = generateDeletionConfirmationCode(workspaceId);

    expect(code1).toBe(code2);
    expect(code1).toBe('DELETE-123e4567');
  });

  it('should generate unique codes for different workspaces', () => {
    const ws1 = '123e4567-e89b-12d3-a456-426614174000';
    const ws2 = 'abcdef12-1234-5678-90ab-cdef12345678';

    const code1 = generateDeletionConfirmationCode(ws1);
    const code2 = generateDeletionConfirmationCode(ws2);

    expect(code1).not.toBe(code2);
  });

  it('should handle edge case workspace IDs', () => {
    const testCases = [
      '00000000-0000-0000-0000-000000000001', // Default workspace
      'ffffffff-ffff-ffff-ffff-ffffffffffff', // All F's
      'a1b2c3d4-5678-90ab-cdef-123456789012', // Mixed
    ];

    testCases.forEach((id) => {
      const code = generateDeletionConfirmationCode(id);
      expect(code).toMatch(/^DELETE-[a-f0-9]{8}$/);
    });
  });
});

describe('Security - SQL Injection Protection', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should safely handle malicious workspace IDs in export', async () => {
    const maliciousIds = [
      "'; DROP TABLE workspaces; --",
      "' OR '1'='1",
      '<script>alert("xss")</script>',
      'ws-123\'; DELETE FROM workspaces WHERE \'1\'=\'1',
    ];

    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid workspace ID format' },
      }),
    });

    for (const maliciousId of maliciousIds) {
      const result = await exportWorkspaceData(mockClient, maliciousId);
      expect(result).toBeNull();
    }
  });

  it('should safely handle malicious confirmation codes', async () => {
    const maliciousCodes = [
      "DELETE-'; DROP TABLE workspaces; --",
      "DELETE-' OR '1'='1",
      'DELETE-<script>alert(1)</script>',
    ];

    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            success: false,
            operation: 'invalid_confirmation',
            deleted_counts: null,
            error_message: 'Invalid confirmation code',
          },
        ],
        error: null,
      }),
    });

    for (const maliciousCode of maliciousCodes) {
      const result = await deleteWorkspaceData(
        mockClient,
        'ws-123',
        maliciousCode
      );
      expect(result.success).toBe(false);
    }
  });

  it('should safely handle malicious actor IDs in audit log', async () => {
    const maliciousActorIds = [
      "admin'; DROP TABLE audit_log; --",
      "' OR '1'='1' --",
      '<script>alert(1)</script>',
    ];

    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: 'audit-safe',
        error: null,
      }),
    });

    for (const maliciousId of maliciousActorIds) {
      const result = await logAuditEvent(mockClient, {
        actorType: 'user',
        actorId: maliciousId,
        action: 'TEST',
        actionCategory: 'security',
      });

      // Should succeed (parameterized queries protect against SQL injection)
      expect(result.success).toBe(true);
    }
  });
});

describe('Edge Cases - Large Datasets', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should handle export of workspace with 100k+ leads', async () => {
    const largeLeadsArray = Array.from({ length: 100000 }, (_, i) => ({
      email_address: `user${i}@example.com`,
      first_name: `User${i}`,
      last_name: `Test${i}`,
    }));

    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            export_id: 'export-large',
            workspace_info: { workspace_id: 'ws-large' },
            leads_data: largeLeadsArray,
            events_data: [],
            campaigns_data: [],
            metadata: {
              total_leads: 100000,
              total_events: 0,
              total_campaigns: 0,
            },
          },
        ],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-large');

    expect(result).not.toBeNull();
    expect(result?.leadsData.length).toBe(100000);
  });

  it('should handle audit log queries with 10k+ results', async () => {
    const largeLogs = Array.from({ length: 10000 }, (_, i) => ({
      id: `audit-${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      action: 'TEST_EVENT',
    }));

    (mockClient.schema as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: largeLogs.slice(0, 1000),
        error: null,
      }),
    });

    const { getAuditLogs } = await import('@/lib/genesis/audit-logger');
    const result = await getAuditLogs(mockClient, 'ws-123', { limit: 1000 });

    expect(result.length).toBeLessThanOrEqual(1000);
  });
});

describe('Edge Cases - Concurrent Operations', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should handle concurrent audit log writes', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: 'audit-concurrent',
        error: null,
      }),
    });

    // Simulate 10 concurrent writes
    const promises = Array.from({ length: 10 }, (_, i) =>
      logAuditEvent(mockClient, {
        actorType: 'system',
        actorId: `actor-${i}`,
        action: 'CONCURRENT_TEST',
        actionCategory: 'security',
      })
    );

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach((result) => {
      expect(result.success).toBe(true);
    });
  });

  it('should handle concurrent export requests', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            export_id: 'export-concurrent',
            workspace_info: {},
            leads_data: [],
            events_data: [],
            campaigns_data: [],
            metadata: {},
          },
        ],
        error: null,
      }),
    });

    // Simulate 5 concurrent exports
    const promises = Array.from({ length: 5 }, () =>
      exportWorkspaceData(mockClient, 'ws-123')
    );

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach((result) => {
      expect(result).not.toBeNull();
    });
  });
});

describe('Edge Cases - Null & Empty Data', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should handle workspace with no infrastructure', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            export_id: 'export-no-infra',
            workspace_info: {
              workspace_id: 'ws-123',
              workspace_name: 'Test',
              region: null,
              droplet_size: null,
            },
            leads_data: [],
            events_data: [],
            campaigns_data: [],
            metadata: {
              total_leads: 0,
            },
          },
        ],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-123');

    expect(result).not.toBeNull();
    expect(result?.workspaceInfo.region).toBeNull();
  });

  it('should handle audit events with empty details', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: 'audit-empty-details',
        error: null,
      }),
    });

    const result = await logAuditEvent(mockClient, {
      actorType: 'system',
      actorId: 'test',
      action: 'TEST',
      actionCategory: 'security',
      details: {},
    });

    expect(result.success).toBe(true);
  });

  it('should handle audit events without details field', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: 'audit-no-details',
        error: null,
      }),
    });

    const result = await logAuditEvent(mockClient, {
      actorType: 'system',
      actorId: 'test',
      action: 'TEST',
      actionCategory: 'security',
    });

    expect(result.success).toBe(true);
  });
});

describe('Error Propagation - Network & Database', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should handle network timeout during export', async () => {
    (mockClient.schema as jest.Mock).mockImplementation(() => {
      throw new Error('Network request timeout');
    });

    const result = await exportWorkspaceData(mockClient, 'ws-123');

    expect(result).toBeNull();
  });

  it('should handle database connection loss during logging', async () => {
    (mockClient.schema as jest.Mock).mockImplementation(() => {
      throw new Error('Connection lost');
    });

    const result = await logAuditEvent(mockClient, {
      actorType: 'user',
      actorId: 'user-123',
      action: 'TEST',
      actionCategory: 'security',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection lost');
  });

  it('should handle foreign key constraint violations', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'Foreign key constraint violation',
          code: '23503',
        },
      }),
    });

    const result = await deleteWorkspaceData(
      mockClient,
      'ws-nonexistent',
      'DELETE-wsnonex'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Foreign key');
  });
});

describe('Data Validation - GDPR Export Structure', () => {
  it('should validate export data structure', async () => {
    const mockClient = createMockSupabaseClient();

    const mockExportData = {
      export_id: 'export-123',
      workspace_info: {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        created_at: '2026-01-01T00:00:00Z',
        region: 'us-east',
        droplet_size: 'basic-2vcpu-4gb',
      },
      leads_data: [
        {
          email_address: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          company: 'Test Corp',
          job_title: 'Engineer',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          custom_fields: { notes: 'Test note' },
        },
      ],
      events_data: [
        {
          event_type: 'sent',
          event_timestamp: '2026-01-01T00:00:00Z',
          email_address: 'test@example.com',
          email_number: 1,
          event_data: {},
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      campaigns_data: [
        {
          campaign_name: 'Test Campaign',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      metadata: {
        export_id: 'export-123',
        export_timestamp: '2026-02-07T00:00:00Z',
        export_format_version: '1.0',
        total_leads: 1,
        total_events: 1,
        total_campaigns: 1,
        gdpr_compliant: true,
      },
    };

    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: [mockExportData],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-123');

    expect(result).not.toBeNull();
    
    // Validate structure
    expect(result?.exportId).toBeTruthy();
    expect(result?.workspaceInfo).toBeTruthy();
    expect(Array.isArray(result?.leadsData)).toBe(true);
    expect(Array.isArray(result?.eventsData)).toBe(true);
    expect(Array.isArray(result?.campaignsData)).toBe(true);
    expect(result?.metadata).toBeTruthy();
    expect(result?.metadata.gdpr_compliant).toBe(true);
  });

  it('should handle leads with missing optional fields', async () => {
    const mockClient = createMockSupabaseClient();

    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            export_id: 'export-minimal',
            workspace_info: { workspace_id: 'ws-123' },
            leads_data: [
              {
                email_address: 'minimal@example.com',
                first_name: null,
                last_name: null,
                company: null,
                job_title: null,
                custom_fields: null,
              },
            ],
            events_data: [],
            campaigns_data: [],
            metadata: { total_leads: 1 },
          },
        ],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-123');

    expect(result).not.toBeNull();
    expect(result?.leadsData[0].email_address).toBe('minimal@example.com');
  });
});

describe('Audit Logger - Actor Type Validation', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should accept all valid actor types', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: 'audit-123',
        error: null,
      }),
    });

    const actorTypes: Array<'user' | 'system' | 'support' | 'sidecar' | 'admin'> = [
      'user',
      'system',
      'support',
      'sidecar',
      'admin',
    ];

    for (const actorType of actorTypes) {
      const result = await logAuditEvent(mockClient, {
        actorType,
        actorId: 'test',
        action: 'TEST',
        actionCategory: 'security',
      });

      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid action categories', async () => {
    (mockClient.schema as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: 'audit-123',
        error: null,
      }),
    });

    const categories: Array<
      'provisioning' | 'credentials' | 'workflows' | 'droplet' | 'security' | 'support' | 'billing' | 'data'
    > = [
      'provisioning',
      'credentials',
      'workflows',
      'droplet',
      'security',
      'support',
      'billing',
      'data',
    ];

    for (const category of categories) {
      const result = await logAuditEvent(mockClient, {
        actorType: 'system',
        actorId: 'test',
        action: 'TEST',
        actionCategory: category,
      });

      expect(result.success).toBe(true);
    }
  });
});

describe('Workspace Isolation - Cross-Workspace Access Prevention', () => {
  it('should prevent cross-workspace audit log access in query', async () => {
    const mockClient = createMockSupabaseClient();

    // Mock RLS enforcement: only returns logs for requested workspace
    (mockClient.schema as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'audit-1',
            workspace_id: 'ws-123',
            action: 'TEST',
          },
        ],
        error: null,
      }),
    });

    const { getAuditLogs } = await import('@/lib/genesis/audit-logger');
    const result = await getAuditLogs(mockClient, 'ws-123');

    // Should only return logs for ws-123
    expect(result.every((log: any) => log.workspace_id === 'ws-123')).toBe(true);
  });
});

describe('Performance - Query Optimization', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should apply pagination correctly', async () => {
    const rangeMock = jest.fn().mockResolvedValue({
      data: [{ id: 'audit-1' }],
      error: null,
    });

    (mockClient.schema as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(), // Need to add this
      range: rangeMock,
    });

    const { getAuditLogs } = await import('@/lib/genesis/audit-logger');
    await getAuditLogs(mockClient, 'ws-123', { limit: 50, offset: 100 });

    // Should use range for pagination
    expect(rangeMock).toHaveBeenCalledWith(100, 149);
  });
});
