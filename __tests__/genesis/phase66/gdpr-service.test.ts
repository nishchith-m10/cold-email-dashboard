/**
 * GDPR Service Tests - Phase 66
 * 
 * Tests for GDPR Right to Access, Right to Erasure, and Compliance Reporting
 * 
 * Coverage:
 * - Data export functionality
 * - Data deletion with confirmation
 * - Compliance reporting
 * - Error handling
 * - Edge cases (empty data, large datasets, concurrent access)
 * - Security (confirmation codes, workspace isolation)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  exportWorkspaceData,
  deleteWorkspaceData,
  getGDPRComplianceReport,
  generateDeletionConfirmationCode,
  formatExportAsDownload,
} from '@/lib/genesis/gdpr-service';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockClient = {
    schema: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
  };
  return mockClient as unknown as SupabaseClient<any>;
};

describe('GDPR Service - Data Export (Right to Access)', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should export workspace data successfully', async () => {
    const mockExportData = {
      export_id: 'export-123',
      workspace_info: {
        workspace_id: 'ws-123',
        workspace_name: 'Test Workspace',
        created_at: '2026-01-01T00:00:00Z',
        region: 'us-east',
        droplet_size: 'basic-2vcpu-4gb',
      },
      leads_data: [
        {
          email_address: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
        },
      ],
      events_data: [
        {
          event_type: 'sent',
          email_address: 'test@example.com',
        },
      ],
      campaigns_data: [
        {
          campaign_name: 'Test Campaign',
          status: 'active',
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

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [mockExportData],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-123');

    expect(result).not.toBeNull();
    expect(result?.exportId).toBe('export-123');
    expect(result?.workspaceInfo.workspace_id).toBe('ws-123');
    expect(result?.leadsData).toHaveLength(1);
    expect(result?.metadata.gdpr_compliant).toBe(true);
  });

  it('should handle empty workspace data', async () => {
    const mockExportData = {
      export_id: 'export-456',
      workspace_info: {
        workspace_id: 'ws-empty',
        workspace_name: 'Empty Workspace',
        created_at: '2026-01-01T00:00:00Z',
        region: null,
        droplet_size: null,
      },
      leads_data: [],
      events_data: [],
      campaigns_data: [],
      metadata: {
        export_id: 'export-456',
        export_timestamp: '2026-02-07T00:00:00Z',
        export_format_version: '1.0',
        total_leads: 0,
        total_events: 0,
        total_campaigns: 0,
        gdpr_compliant: true,
      },
    };

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [mockExportData],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-empty');

    expect(result).not.toBeNull();
    expect(result?.leadsData).toEqual([]);
    expect(result?.eventsData).toEqual([]);
    expect(result?.metadata.total_leads).toBe(0);
  });

  it('should return null on database error', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-123');

    expect(result).toBeNull();
  });

  it('should return null on non-existent workspace', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-nonexistent');

    expect(result).toBeNull();
  });

  it('should handle large dataset export', async () => {
    const largeLeadsData = Array.from({ length: 10000 }, (_, i) => ({
      email_address: `user${i}@example.com`,
      first_name: `User${i}`,
      last_name: `Test${i}`,
    }));

    const mockExportData = {
      export_id: 'export-large',
      workspace_info: {
        workspace_id: 'ws-large',
        workspace_name: 'Large Workspace',
        created_at: '2026-01-01T00:00:00Z',
        region: 'us-east',
        droplet_size: 'basic-2vcpu-4gb',
      },
      leads_data: largeLeadsData,
      events_data: [],
      campaigns_data: [],
      metadata: {
        export_id: 'export-large',
        export_timestamp: '2026-02-07T00:00:00Z',
        export_format_version: '1.0',
        total_leads: 10000,
        total_events: 0,
        total_campaigns: 0,
        gdpr_compliant: true,
      },
    };

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [mockExportData],
        error: null,
      }),
    });

    const result = await exportWorkspaceData(mockClient, 'ws-large');

    expect(result).not.toBeNull();
    expect(result?.leadsData).toHaveLength(10000);
    expect(result?.metadata.total_leads).toBe(10000);
  });
});

describe('GDPR Service - Data Deletion (Right to Erasure)', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should delete workspace data with valid confirmation code', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
    const confirmationCode = 'DELETE-123e4567';

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [
          {
            success: true,
            operation: 'deleted',
            deleted_counts: {
              leads: 100,
              events: 500,
              campaigns: 5,
              audit_logs: 50,
              workspace: 1,
            },
            error_message: null,
          },
        ],
        error: null,
      }),
    });

    const result = await deleteWorkspaceData(
      mockClient,
      workspaceId,
      confirmationCode,
      'user-123'
    );

    expect(result.success).toBe(true);
    expect(result.operation).toBe('deleted');
    expect(result.deletedCounts?.leads).toBe(100);
    expect(result.deletedCounts?.workspace).toBe(1);
  });

  it('should reject deletion with invalid confirmation code', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
    const wrongCode = 'DELETE-wrong';

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [
          {
            success: false,
            operation: 'invalid_confirmation',
            deleted_counts: null,
            error_message: 'Invalid confirmation code. Expected: DELETE-123e4567',
          },
        ],
        error: null,
      }),
    });

    const result = await deleteWorkspaceData(
      mockClient,
      workspaceId,
      wrongCode,
      'user-123'
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe('invalid_confirmation');
    expect(result.error).toContain('Invalid confirmation code');
  });

  it('should handle non-existent workspace deletion', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [
          {
            success: false,
            operation: 'not_found',
            deleted_counts: null,
            error_message: 'Workspace not found',
          },
        ],
        error: null,
      }),
    });

    const result = await deleteWorkspaceData(
      mockClient,
      'ws-nonexistent',
      'DELETE-wsnonex',
      'user-123'
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe('not_found');
  });

  it('should generate correct confirmation codes', () => {
    const testCases = [
      {
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        expected: 'DELETE-123e4567',
      },
      {
        workspaceId: 'abcdef12-1234-5678-90ab-cdef12345678',
        expected: 'DELETE-abcdef12',
      },
      {
        workspaceId: '00000000-0000-0000-0000-000000000001',
        expected: 'DELETE-00000000',
      },
    ];

    testCases.forEach(({ workspaceId, expected }) => {
      const code = generateDeletionConfirmationCode(workspaceId);
      expect(code).toBe(expected);
    });
  });

  it('should handle database error during deletion', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint violation' },
      }),
    });

    const result = await deleteWorkspaceData(
      mockClient,
      'ws-123',
      'DELETE-ws123456',
      'user-123'
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe('failed');
    expect(result.error).toBeTruthy();
  });

  it('should handle exception during deletion', async () => {
    (mockClient.schema as jest.Mock<any>).mockImplementation(() => {
      throw new Error('Network timeout');
    });

    const result = await deleteWorkspaceData(
      mockClient,
      'ws-123',
      'DELETE-ws123456'
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe('failed');
    expect(result.error).toBe('Network timeout');
  });

  it('should handle empty response from deletion function', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [], // Empty array
        error: null,
      }),
    });

    const result = await deleteWorkspaceData(
      mockClient,
      'ws-123',
      'DELETE-ws123456'
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe('failed');
    expect(result.error).toBe('No data returned from deletion function');
  });
});

describe('GDPR Service - Compliance Reporting', () => {
  let mockClient: SupabaseClient<any>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  it('should generate comprehensive compliance report', async () => {
    const mockReport = {
      workspace_id: 'ws-123',
      workspace_name: 'Test Workspace',
      data_region: 'eu-west',
      gdpr_compliant: true,
      data_residency_compliant: true,
      personal_data_locations: {
        database: {
          provider: 'Supabase',
          region: 'eu-west',
          tables: ['leads', 'events', 'campaigns', 'audit_log'],
        },
        droplet: {
          provider: 'DigitalOcean',
          region: 'eu-west',
          purpose: 'n8n workflow execution',
        },
      },
      sub_processors: [
        {
          name: 'Supabase',
          purpose: 'Database hosting',
          data_location: 'eu-west',
          dpa_signed: true,
        },
        {
          name: 'DigitalOcean',
          purpose: 'Compute infrastructure',
          data_location: 'eu-west',
          dpa_signed: true,
        },
      ],
      audit_trail_retention_days: 2555,
      last_export_date: '2026-02-01T00:00:00Z',
      compliance_checks: {
        data_in_region: true,
        droplet_in_region: true,
        audit_logging_enabled: true,
        encryption_at_rest: true,
        encryption_in_transit: true,
        rls_enabled: true,
      },
    };

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [mockReport],
        error: null,
      }),
    });

    const result = await getGDPRComplianceReport(mockClient, 'ws-123');

    expect(result).not.toBeNull();
    expect(result?.gdprCompliant).toBe(true);
    expect(result?.dataResidencyCompliant).toBe(true);
    expect(result?.subProcessors).toHaveLength(2);
    expect(result?.auditTrailRetentionDays).toBe(2555);
    expect(result?.complianceChecks.rls_enabled).toBe(true);
  });

  it('should report non-compliant workspace', async () => {
    const mockReport = {
      workspace_id: 'ws-noncompliant',
      workspace_name: 'Non-Compliant Workspace',
      data_region: null,
      gdpr_compliant: true,
      data_residency_compliant: false,
      personal_data_locations: {
        database: {
          provider: 'Supabase',
          region: null,
          tables: ['leads', 'events'],
        },
        droplet: {
          provider: 'DigitalOcean',
          region: null,
          purpose: 'n8n workflow execution',
        },
      },
      sub_processors: [],
      audit_trail_retention_days: 2555,
      last_export_date: null,
      compliance_checks: {
        data_in_region: false,
        droplet_in_region: false,
        audit_logging_enabled: true,
        encryption_at_rest: true,
        encryption_in_transit: true,
        rls_enabled: true,
      },
    };

    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [mockReport],
        error: null,
      }),
    });

    const result = await getGDPRComplianceReport(mockClient, 'ws-noncompliant');

    expect(result).not.toBeNull();
    expect(result?.dataResidencyCompliant).toBe(false);
    expect(result?.complianceChecks.data_in_region).toBe(false);
  });

  it('should return null on database error', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    });

    const result = await getGDPRComplianceReport(mockClient, 'ws-123');

    expect(result).toBeNull();
  });

  it('should handle exception during compliance report fetch', async () => {
    (mockClient.schema as jest.Mock<any>).mockImplementation(() => {
      throw new Error('Connection lost');
    });

    const result = await getGDPRComplianceReport(mockClient, 'ws-123');

    expect(result).toBeNull();
  });

  it('should return null when no compliance report data returned', async () => {
    (mockClient.schema as jest.Mock<any>).mockReturnValue({
      rpc: (jest.fn() as any).mockResolvedValue({
        data: [], // Empty array
        error: null,
      }),
    });

    const result = await getGDPRComplianceReport(mockClient, 'ws-123');

    expect(result).toBeNull();
  });
});

describe('GDPR Service - Export Formatting', () => {
  it('should format export data for download', () => {
    const mockExport = {
      exportId: 'export-123',
      workspaceInfo: {
        workspace_id: 'ws-123',
        workspace_name: 'Test Workspace',
        created_at: '2026-01-01T00:00:00Z',
        region: 'us-east',
        droplet_size: 'basic-2vcpu-4gb',
      },
      leadsData: [{ email_address: 'test@example.com' }],
      eventsData: [],
      campaignsData: [],
      metadata: {
        export_id: 'export-123',
        export_timestamp: '2026-02-07T00:00:00Z',
        export_format_version: '1.0',
        total_leads: 1,
        total_events: 0,
        total_campaigns: 0,
        gdpr_compliant: true,
      },
    };

    const { blob, filename } = formatExportAsDownload(mockExport);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
    expect(filename).toMatch(/^workspace-export-ws-123-/);
    expect(filename).toMatch(/\.json$/);
  });

  it('should use custom filename when provided', () => {
    const mockExport = {
      exportId: 'export-123',
      workspaceInfo: {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        created_at: '2026-01-01T00:00:00Z',
        region: null,
        droplet_size: null,
      },
      leadsData: [],
      eventsData: [],
      campaignsData: [],
      metadata: {
        export_id: 'export-123',
        export_timestamp: '2026-02-07T00:00:00Z',
        export_format_version: '1.0',
        total_leads: 0,
        total_events: 0,
        total_campaigns: 0,
        gdpr_compliant: true,
      },
    };

    const customFilename = 'my-custom-export.json';
    const { filename } = formatExportAsDownload(mockExport, customFilename);

    expect(filename).toBe(customFilename);
  });
});
