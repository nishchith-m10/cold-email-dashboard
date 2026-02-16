/**
 * Phase 68 Tests: Data Export Service
 * 
 * Test coverage:
 * - Export initiation
 * - Progress tracking
 * - Export cancellation
 * - Export processing
 * - Export history
 * - Expired export cleanup
 */

import {
  initiateDataExport,
  getExportProgress,
  cancelDataExport,
  processExportJob,
  getExportHistory,
  cleanupExpiredExports,
} from '@/lib/genesis/data-export';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    schema: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    head: true,
    count: 'exact',
  },
}));

// Mock tenant lifecycle (for locking)
jest.mock('@/lib/genesis/tenant-lifecycle', () => ({
  acquireWorkspaceLock: (jest.fn() as any).mockResolvedValue({
    success: true,
    expiresAt: '2026-02-08T10:00:00Z',
  }),
  releaseWorkspaceLock: (jest.fn() as any).mockResolvedValue({
    success: true,
  }),
}));

import { supabaseAdmin } from '@/lib/supabase';
import {
  acquireWorkspaceLock,
  releaseWorkspaceLock,
} from '@/lib/genesis/tenant-lifecycle';

describe('Phase 68: Data Export Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Export Initiation', () => {
    it('should initiate export successfully', async () => {
      // Mock existing export check
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  maybeSingle: (jest.fn() as any).mockResolvedValue({
                    data: null, // No active export
                    error: null,
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: { id: 'export_job_123' },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      // Mock resource counts
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation((table: string) => {
        const counts: Record<string, number> = {
          leads: 5000,
          email_events: 10000,
        };

        return {
          select: jest.fn().mockReturnValue({
            eq: (jest.fn() as any).mockResolvedValue({
              count: counts[table] || 0,
            }),
            head: true,
            count: 'exact',
          }),
        } as any;
      });

      const result = await initiateDataExport('ws_test', 'user_123');

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('export_job_123');
      expect(result.estimatedMinutes).toBeGreaterThan(0);
      expect(acquireWorkspaceLock).toHaveBeenCalledWith(
        'ws_test',
        'export',
        'user_123',
        120
      );
    });

    it('should fail if export already in progress', async () => {
      // Mock active export
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  maybeSingle: (jest.fn() as any).mockResolvedValue({
                    data: {
                      id: 'export_job_456',
                      status: 'in_progress',
                      progress_percentage: 50,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await initiateDataExport('ws_test', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export already in progress');
      expect(result.jobId).toBe('export_job_456');
    });

    it('should fail if lock acquisition fails', async () => {
      // Mock no active export
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  maybeSingle: (jest.fn() as any).mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        } as any;
      });

      // Mock failed lock
      (acquireWorkspaceLock as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Workspace locked by deletion operation',
      });

      const result = await initiateDataExport('ws_test', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workspace locked');
    });
  });

  describe('Export Progress', () => {
    it('should retrieve export progress', async () => {
      // Mock job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'export_job_123',
                    workspace_id: 'ws_test',
                    status: 'in_progress',
                    progress_percentage: 65,
                    current_step: 'querying_email_events',
                    total_records: 15000,
                    processed_records: 9750,
                    export_size_bytes: 2048000,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      // Mock user membership
      jest.spyOn(supabaseAdmin!, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: (jest.fn() as any).mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }),
        }),
      } as any);

      const progress = await getExportProgress('export_job_123', 'user_123');

      expect(progress).not.toBeNull();
      expect(progress?.status).toBe('in_progress');
      expect(progress?.progressPercentage).toBe(65);
      expect(progress?.currentStep).toBe('querying_email_events');
    });

    it('should return null if user unauthorized', async () => {
      // Mock job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'export_job_123',
                    workspace_id: 'ws_test',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      // Mock no membership
      jest.spyOn(supabaseAdmin!, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: (jest.fn() as any).mockResolvedValue({
              data: null, // No membership
              error: null,
            }),
          }),
        }),
      } as any);

      const progress = await getExportProgress('export_job_123', 'user_456');

      expect(progress).toBeNull();
    });
  });

  describe('Export Cancellation', () => {
    it('should cancel export successfully', async () => {
      // Mock job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    workspace_id: 'ws_test',
                    status: 'in_progress',
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

      // Mock user membership
      jest.spyOn(supabaseAdmin!, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: (jest.fn() as any).mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await cancelDataExport('export_job_123', 'user_123');

      expect(result.success).toBe(true);
      expect(releaseWorkspaceLock).toHaveBeenCalledWith('ws_test', 'export');
    });

    it('should fail if export not found', async () => {
      // Mock no job
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await cancelDataExport('export_job_123', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export job not found');
    });

    it('should fail if export already completed', async () => {
      // Mock completed job
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    workspace_id: 'ws_test',
                    status: 'completed',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      // Mock user membership
      jest.spyOn(supabaseAdmin!, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: (jest.fn() as any).mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await cancelDataExport('export_job_123', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel export with status: completed');
    });
  });

  describe('Export Processing', () => {
    it('should process export job successfully', async () => {
      // Mock job fetch
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'export_job_123',
                    workspace_id: 'ws_test',
                    status: 'pending',
                    created_by: 'user_123',
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

      // Mock workspace fetch
      jest.spyOn(supabaseAdmin!, 'from').mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: {
                    id: 'ws_test',
                    name: 'Test Workspace',
                    created_at: '2026-01-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        // Mock data fetches
        return {
          select: jest.fn().mockReturnValue({
            eq: (jest.fn() as any).mockResolvedValue({
              data: [
                { id: 'lead_1', name: 'Lead 1' },
                { id: 'lead_2', name: 'Lead 2' },
              ],
              error: null,
            }),
          }),
        } as any;
      });

      const result = await processExportJob('export_job_123');

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(releaseWorkspaceLock).toHaveBeenCalledWith('ws_test', 'export');
    });

    it('should fail if job not found', async () => {
      // Mock no job
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: (jest.fn() as any).mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await processExportJob('export_job_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Job not found');
    });
  });

  describe('Export History', () => {
    it('should retrieve export history', async () => {
      // Mock user membership
      jest.spyOn(supabaseAdmin!, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: (jest.fn() as any).mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock export jobs
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: (jest.fn() as any).mockResolvedValue({
                    data: [
                      {
                        id: 'export_1',
                        status: 'completed',
                        progress_percentage: 100,
                        current_step: 'completed',
                        total_records: 1000,
                        processed_records: 1000,
                        export_size_bytes: 500000,
                      },
                      {
                        id: 'export_2',
                        status: 'in_progress',
                        progress_percentage: 50,
                        current_step: 'querying_leads',
                        total_records: 2000,
                        processed_records: 1000,
                        export_size_bytes: 0,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        } as any;
      });

      const history = await getExportHistory('ws_test', 'user_123', 10);

      expect(history).toHaveLength(2);
      expect(history[0].jobId).toBe('export_1');
      expect(history[0].status).toBe('completed');
      expect(history[1].jobId).toBe('export_2');
      expect(history[1].status).toBe('in_progress');
    });

    it('should return empty array if user unauthorized', async () => {
      // Mock no membership
      jest.spyOn(supabaseAdmin!, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: (jest.fn() as any).mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any);

      const history = await getExportHistory('ws_test', 'user_456');

      expect(history).toHaveLength(0);
    });
  });

  describe('Expired Export Cleanup', () => {
    it('should cleanup expired exports', async () => {
      // Mock cleanup
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                lt: (jest.fn() as any).mockResolvedValue({
                  count: 5,
                  error: null,
                }),
              }),
              count: 'exact',
            }),
          }),
        } as any;
      });

      const result = await cleanupExpiredExports();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock error
      jest.spyOn(supabaseAdmin!, 'schema').mockImplementation(() => {
        return {
          from: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                lt: (jest.fn() as any).mockResolvedValue({
                  count: 0,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await cleanupExpiredExports();

      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(0);
      expect(result.error).toContain('Database error');
    });
  });
});
