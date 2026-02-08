/**
 * PHASE 44: Bulk Update Service Tests
 * 
 * Covers: config validation, job creation, error handling.
 */

import { BulkUpdateService, BulkUpdateError, BulkUpdateDB } from '@/lib/genesis/phase44/bulk-update';
import type { BulkUpdateConfig } from '@/lib/genesis/phase44/types';

// ============================================
// MOCK FACTORY
// ============================================

function createMockDB(partitionData: any[] = []): BulkUpdateDB {
  const createQuery = () => {
    const chain: any = {
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: partitionData, error: null }),
    };
    Object.defineProperty(chain, 'then', {
      value: (resolve: any) => resolve({ data: partitionData, error: null }),
      configurable: true,
    });
    return chain;
  };

  return {
    schema: () => ({
      from: () => ({
        select: () => createQuery(),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'job-1' }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  };
}

// ============================================
// TESTS
// ============================================

describe('Phase 44 - BulkUpdateService', () => {
  // ============================================
  // CONFIG VALIDATION
  // ============================================
  describe('createJob - validation', () => {
    it('rejects missing blueprintId', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      await expect(
        service.createJob({ blueprintId: '', rateLimit: 10 }, 'admin-1')
      ).rejects.toThrow(BulkUpdateError);
    });

    it('rejects rateLimit below 1', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      await expect(
        service.createJob({ blueprintId: 'bp-1', rateLimit: 0 }, 'admin-1')
      ).rejects.toThrow('rateLimit must be between 1 and 1000');
    });

    it('rejects rateLimit above 1000', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      await expect(
        service.createJob({ blueprintId: 'bp-1', rateLimit: 1001 }, 'admin-1')
      ).rejects.toThrow('rateLimit must be between 1 and 1000');
    });

    it('rejects canaryPercentage below 0', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      await expect(
        service.createJob({ blueprintId: 'bp-1', rateLimit: 10, canaryPercentage: -5 }, 'admin-1')
      ).rejects.toThrow('canaryPercentage must be between 0 and 100');
    });

    it('rejects canaryPercentage above 100', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      await expect(
        service.createJob({ blueprintId: 'bp-1', rateLimit: 10, canaryPercentage: 110 }, 'admin-1')
      ).rejects.toThrow('canaryPercentage');
    });

    it('rejects rollbackThreshold outside 0-1 range', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      await expect(
        service.createJob({ blueprintId: 'bp-1', rateLimit: 10, rollbackThreshold: 1.5 }, 'admin-1')
      ).rejects.toThrow('rollbackThreshold');
    });
  });

  // ============================================
  // JOB CREATION
  // ============================================
  describe('createJob - success', () => {
    it('creates a job with explicit target workspaces', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      const config: BulkUpdateConfig = {
        blueprintId: 'bp-1',
        targetWorkspaceIds: ['ws-1', 'ws-2', 'ws-3'],
        rateLimit: 10,
      };

      const job = await service.createJob(config, 'admin-1');

      expect(job.id).toBeDefined();
      expect(job.status).toBe('pending');
      expect(job.totalWorkspaces).toBe(3);
      expect(job.processedCount).toBe(0);
      expect(job.failedCount).toBe(0);
      expect(job.createdBy).toBe('admin-1');
    });

    it('counts provisioned workspaces when no targets specified', async () => {
      const partitions = [
        { workspace_id: 'ws-1', status: 'active' },
        { workspace_id: 'ws-2', status: 'active' },
        { workspace_id: 'ws-3', status: 'active' },
        { workspace_id: 'ws-4', status: 'active' },
        { workspace_id: 'ws-5', status: 'active' },
      ];
      const db = createMockDB(partitions);
      const service = new BulkUpdateService(db);

      const config: BulkUpdateConfig = {
        blueprintId: 'bp-1',
        rateLimit: 10,
      };

      const job = await service.createJob(config, 'admin-1');
      expect(job.totalWorkspaces).toBe(5);
    });

    it('throws when no target workspaces found', async () => {
      const db = createMockDB([]); // Empty partition registry
      const service = new BulkUpdateService(db);

      const config: BulkUpdateConfig = {
        blueprintId: 'bp-1',
        rateLimit: 10,
      };

      await expect(service.createJob(config, 'admin-1')).rejects.toThrow('No target workspaces found');
    });

    it('BulkUpdateError has correct code property', async () => {
      const db = createMockDB();
      const service = new BulkUpdateService(db);

      try {
        await service.createJob({ blueprintId: '', rateLimit: 10 }, 'admin-1');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BulkUpdateError);
        expect((err as BulkUpdateError).code).toBe('INVALID_CONFIG');
      }
    });
  });

  // ============================================
  // STUBS (future implementation)
  // ============================================
  describe('stub methods', () => {
    it('getJob returns null', async () => {
      const service = new BulkUpdateService(createMockDB());
      const job = await service.getJob('any-id');
      expect(job).toBeNull();
    });

    it('cancelJob returns false', async () => {
      const service = new BulkUpdateService(createMockDB());
      const result = await service.cancelJob('any-id');
      expect(result).toBe(false);
    });

    it('listJobs returns empty array', async () => {
      const service = new BulkUpdateService(createMockDB());
      const jobs = await service.listJobs();
      expect(jobs).toEqual([]);
    });
  });
});
