/**
 * Phase 68 Tests: Tenant Lifecycle Management
 * 
 * Test coverage:
 * - Workspace locking
 * - Deletion impact analysis
 * - Pre-deletion validation
 * - Confirmation code generation
 * - Deletion initiation
 * - Deletion confirmation
 * - Workspace restoration
 * - Hard deletion execution
 */

// Declare mock functions BEFORE any imports to avoid initialization errors
const mockRpc = jest.fn();
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockIn = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockFrom = jest.fn().mockReturnThis();
const mockSchema = jest.fn().mockReturnThis();

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    schema: mockSchema,
    from: mockFrom,
    rpc: mockRpc,
    select: mockSelect,
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  },
}));

// Mock audit logger
jest.mock('@/lib/genesis/audit-logger', () => ({
  logAuditEvent: (jest.fn() as any).mockResolvedValue({
    success: true,
    auditId: 'mock-audit-id',
  }),
}));

// Import functions AFTER mocks are defined
import {
  acquireWorkspaceLock,
  releaseWorkspaceLock,
  generateDeletionImpactReport,
  validateDeletion,
  generateConfirmationCode,
  verifyConfirmationCode,
  initiateDeletion,
  confirmDeletion,
  restoreWorkspace,
  executeHardDeletion,
} from '@/lib/genesis/tenant-lifecycle';

import { supabaseAdmin } from '@/lib/supabase';

describe('Phase 68: Tenant Lifecycle Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks to default chainable behavior
    mockSchema.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    });
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    });
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    });
    
    mockEq.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    });
    
    mockIn.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });
  });

  describe('Workspace Locking', () => {
    it('should acquire workspace lock successfully', async () => {
      mockRpc.mockResolvedValue({
        data: { success: true, expires_at: '2026-02-08T10:00:00Z' },
        error: null,
      });

      const result = await acquireWorkspaceLock(
        'ws_test',
        'deletion',
        'user_123',
        60
      );

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBe('2026-02-08T10:00:00Z');
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_acquire_workspace_lock',
        {
          p_workspace_id: 'ws_test',
          p_lock_type: 'deletion',
          p_locked_by: 'user_123',
          p_timeout_minutes: 60,
        }
      );
    });

    it('should fail to acquire lock when workspace is locked', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: false,
          lock_type: 'export',
          locked_by: 'user_456',
          expires_at: '2026-02-08T12:00:00Z',
        },
        error: null,
      });

      const result = await acquireWorkspaceLock(
        'ws_test',
        'deletion',
        'user_123',
        60
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workspace locked by export operation');
    });

    it('should release workspace lock', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await releaseWorkspaceLock('ws_test', 'deletion');

      expect(result.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_release_workspace_lock',
        {
          p_workspace_id: 'ws_test',
          p_lock_type: 'deletion',
        }
      );
    });
  });

  describe('Deletion Impact Analysis', () => {
    it('should generate deletion impact report', async () => {
      // Mock workspace query
      (supabaseAdmin!.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: (jest.fn() as any).mockResolvedValue({
              data: { name: 'Test Workspace' },
              error: null,
            }),
          }),
        }),
      });

      // Mock resource counts
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation((table: string) => {
        const mockCounts: Record<string, any> = {
          campaigns: { count: 5 },
          sequences: { count: 10 },
          email_events: { count: 1000 },
        };

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn(),
              count: mockCounts[table]?.count || 0,
            }),
            head: true,
            count: 'exact',
          }),
        } as any;
      });

      const report = await generateDeletionImpactReport('ws_test');

      expect(report).not.toBeNull();
      expect(report?.workspaceName).toBe('Test Workspace');
      expect(report?.resources).toHaveProperty('campaigns');
      expect(report?.resources).toHaveProperty('leads');
      expect(report?.estimatedSizeGB).toBeGreaterThanOrEqual(0);
    });

    it('should return null if workspace not found', async () => {
      (supabaseAdmin!.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: (jest.fn() as any).mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const report = await generateDeletionImpactReport('ws_nonexistent');

      expect(report).toBeNull();
    });
  });

  describe('Pre-Deletion Validation', () => {
    it('should block deletion if active campaigns exist', async () => {
      // Mock impact report
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: { name: 'Test Workspace' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: (jest.fn() as any).mockResolvedValue({
                  data: [
                    { id: 'camp_1', name: 'Active Campaign', status: 'running' },
                  ],
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: (jest.fn() as any).mockResolvedValue({ data: [], error: null }),
          }),
        } as any;
      });

      const validation = await validateDeletion('ws_test');

      expect(validation).not.toBeNull();
      expect(validation?.canDelete).toBe(false);
      expect(validation?.blockingIssues).toHaveLength(1);
      expect(validation?.blockingIssues[0]).toContain('active campaign');
    });

    it('should warn if positive wallet balance exists', async () => {
      // Mock validation with positive balance
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: (jest.fn() as any).mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: (jest.fn() as any).mockResolvedValue({ data: null, error: null }),
          }),
        } as any;
      });

      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation((schema: string) => {
        if (schema === 'genesis') {
          return {
            from: jest.fn().mockImplementation((table: string) => {
              if (table === 'wallets') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: (jest.fn() as any).mockResolvedValue({
                        data: { balance_cents: 5000 },
                        error: null,
                      }),
                    }),
                  }),
                };
              }

              return {
                select: jest.fn().mockReturnValue({
                  eq: (jest.fn() as any).mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              };
            }),
          } as any;
        }

        return supabaseAdmin as any;
      });

      const validation = await validateDeletion('ws_test');

      expect(validation).not.toBeNull();
      expect(validation?.warnings).toContain(
        expect.stringContaining('Positive wallet balance')
      );
    });

    it('should allow deletion if no blocking issues', async () => {
      // Mock clean validation
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: (jest.fn() as any).mockResolvedValue({
                data: [],
                error: null,
              }),
              single: (jest.fn() as any).mockResolvedValue({
                data: { name: 'Test Workspace' },
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const validation = await validateDeletion('ws_test');

      expect(validation?.canDelete).toBe(true);
      expect(validation?.blockingIssues).toHaveLength(0);
    });
  });

  describe('Confirmation Code', () => {
    it('should generate deterministic 6-digit code', () => {
      const workspaceId = 'ws_test';
      const timestamp = 1707307200000; // Fixed timestamp

      const code1 = generateConfirmationCode(workspaceId, timestamp);
      const code2 = generateConfirmationCode(workspaceId, timestamp);

      expect(code1).toBe(code2);
      expect(code1).toHaveLength(6);
      expect(code1).toMatch(/^\d{6}$/);
    });

    it('should verify correct confirmation code', () => {
      const workspaceId = 'ws_test';
      const timestamp = Date.now();
      const code = generateConfirmationCode(workspaceId, timestamp);

      const isValid = verifyConfirmationCode(workspaceId, code, timestamp);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect confirmation code', () => {
      const workspaceId = 'ws_test';
      const timestamp = Date.now();

      const isValid = verifyConfirmationCode(workspaceId, '000000', timestamp);

      expect(isValid).toBe(false);
    });
  });

  describe('Deletion Initiation', () => {
    it('should initiate deletion successfully', async () => {
      // Mock validation
      const mockValidation = {
        canDelete: true,
        blockingIssues: [],
        warnings: [],
        impactReport: {
          workspaceId: 'ws_test',
          workspaceName: 'Test',
          resources: {},
          estimatedSizeGB: 0,
          walletBalanceCents: 0,
          gracePeriodEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      // Mock lock acquisition
      (supabaseAdmin!.rpc as jest.Mock).mockResolvedValue({
        data: { success: true, expires_at: '2026-02-08T10:00:00Z' },
        error: null,
      });

      // Mock job creation
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: { id: 'del_job_123' },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      // Mock workspace update
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation(() => {
        return {
          update: jest.fn().mockReturnValue({
            eq: (jest.fn() as any).mockResolvedValue({
              data: {},
              error: null,
            }),
          }),
        } as any;
      });

      const result = await initiateDeletion(
        'ws_test',
        'user_123',
        'user_request',
        'Testing deletion'
      );

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('del_job_123');
      expect(result.confirmationCode).toMatch(/^\d{6}$/);
    });

    it('should fail if validation fails', async () => {
      // Mock failed validation
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: (jest.fn() as any).mockResolvedValue({
                  data: [{ id: 'camp_1', name: 'Active', status: 'running' }],
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: (jest.fn() as any).mockResolvedValue({
              data: { name: 'Test' },
              error: null,
            }),
          }),
        } as any;
      });

      const result = await initiateDeletion(
        'ws_test',
        'user_123',
        'user_request'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete workspace');
    });
  });

  describe('Deletion Confirmation', () => {
    it('should confirm deletion with valid code', async () => {
      const timestamp = Date.now();
      const code = generateConfirmationCode('ws_test', timestamp);

      // Mock job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'del_job_123',
                    workspace_id: 'ws_test',
                    status: 'pending',
                    confirmation_code: code,
                    confirmation_code_expires_at: new Date(
                      Date.now() + 15 * 60 * 1000
                    ).toISOString(),
                    confirmation_attempts: 0,
                    created_at: new Date(timestamp).toISOString(),
                    deletion_scheduled_at: new Date(
                      Date.now() + 7 * 24 * 60 * 60 * 1000
                    ).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: (jest.fn() as any).mockResolvedValue({
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const result = await confirmDeletion(
        'ws_test',
        'del_job_123',
        'user_123',
        code
      );

      expect(result.success).toBe(true);
    });

    it('should reject invalid confirmation code', async () => {
      const timestamp = Date.now();
      const validCode = generateConfirmationCode('ws_test', timestamp);

      // Mock job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'del_job_123',
                    workspace_id: 'ws_test',
                    status: 'pending',
                    confirmation_code: validCode,
                    confirmation_code_expires_at: new Date(
                      Date.now() + 15 * 60 * 1000
                    ).toISOString(),
                    confirmation_attempts: 0,
                    created_at: new Date(timestamp).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: (jest.fn() as any).mockResolvedValue({
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const result = await confirmDeletion(
        'ws_test',
        'del_job_123',
        'user_123',
        '000000' // Wrong code
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid confirmation code');
    });

    it('should reject expired confirmation code', async () => {
      const timestamp = Date.now() - 20 * 60 * 1000; // 20 minutes ago
      const code = generateConfirmationCode('ws_test', timestamp);

      // Mock job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'del_job_123',
                    workspace_id: 'ws_test',
                    status: 'pending',
                    confirmation_code: code,
                    confirmation_code_expires_at: new Date(
                      timestamp + 15 * 60 * 1000
                    ).toISOString(), // Expired
                    confirmation_attempts: 0,
                    created_at: new Date(timestamp).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await confirmDeletion(
        'ws_test',
        'del_job_123',
        'user_123',
        code
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('Workspace Restoration', () => {
    it('should restore workspace during grace period', async () => {
      // Mock deletion job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'del_job_123',
                    workspace_id: 'ws_test',
                    status: 'in_grace_period',
                    can_restore: true,
                    deletion_scheduled_at: new Date(
                      Date.now() + 5 * 24 * 60 * 60 * 1000
                    ).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: (jest.fn() as any).mockResolvedValue({
                error: null,
              }),
            }),
          }),
        } as any;
      });

      // Mock lock acquisition
      (supabaseAdmin!.rpc as jest.Mock).mockResolvedValue({
        data: { success: true, expires_at: '2026-02-08T10:00:00Z' },
        error: null,
      });

      // Mock workspace update
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation(() => {
        return {
          update: jest.fn().mockReturnValue({
            eq: (jest.fn() as any).mockResolvedValue({
              error: null,
            }),
          }),
        } as any;
      });

      const result = await restoreWorkspace(
        'ws_test',
        'user_123',
        'Changed my mind'
      );

      expect(result.success).toBe(true);
      expect(result.workspaceId).toBe('ws_test');
    });

    it('should fail if grace period expired', async () => {
      // Mock expired deletion job
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: (jest.fn() as any).mockResolvedValue({
                  data: null, // No active grace period job
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await restoreWorkspace(
        'ws_test',
        'user_123',
        'Too late'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active deletion found');
    });

    it('should fail if restoration not allowed', async () => {
      // Mock deletion job with can_restore = false
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'del_job_123',
                    workspace_id: 'ws_test',
                    status: 'in_grace_period',
                    can_restore: false, // Not allowed
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await restoreWorkspace(
        'ws_test',
        'user_123',
        'Trying to restore'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Restoration not allowed');
    });
  });
});
