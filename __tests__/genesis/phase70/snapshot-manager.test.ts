/**
 * GENESIS PHASE 70: SNAPSHOT MANAGER TESTS
 */

import {
  SnapshotManager,
  MockDOEnvironment,
  type Snapshot,
} from '../../../lib/genesis/phase70';

describe('Phase 70 Snapshot Manager', () => {
  let env: MockDOEnvironment;
  let manager: SnapshotManager;

  beforeEach(() => {
    env = new MockDOEnvironment();
    manager = new SnapshotManager(env);
    // Add test droplets
    env.addDroplet('d-1', 'nyc1');
    env.addDroplet('d-2', 'nyc1');
    env.addDroplet('d-3', 'sfo1');
  });

  describe('Snapshot Creation', () => {
    it('should create a snapshot', async () => {
      const snapshot = await manager.createSnapshot('ws-1', 'd-1', 'daily');
      expect(snapshot.id).toBeTruthy();
      expect(snapshot.workspaceId).toBe('ws-1'); // Mock extracts workspaceId from snapshot name
      expect(snapshot.dropletId).toBe('d-1');
      expect(snapshot.type).toBe('daily');
    });

    it('should create batch snapshots', async () => {
      const droplets = [
        { workspaceId: 'ws-1', dropletId: 'd-1' },
        { workspaceId: 'ws-2', dropletId: 'd-2' },
      ];
      const result = await manager.createBatchSnapshots(droplets, 'daily');
      expect(result.succeeded.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    it('should handle batch failures', async () => {
      const droplets = [
        { workspaceId: 'ws-1', dropletId: 'd-1' },
        { workspaceId: 'ws-99', dropletId: 'd-invalid' },
      ];
      const result = await manager.createBatchSnapshots(droplets, 'daily');
      expect(result.succeeded.length).toBe(1);
      expect(result.failed.length).toBe(1);
    });
  });

  describe('Cross-Region Transfer', () => {
    it('should transfer snapshot to backup region', async () => {
      const snapshot = await manager.createSnapshot('ws-1', 'd-1', 'daily');
      const result = await manager.transferToCrossRegion(snapshot);
      expect(result.success).toBe(true);
      const updated = env.getSnapshot(snapshot.id)!;
      expect(updated.transferredTo).toBe('sfo1');
    });

    it('should transfer batch', async () => {
      const snap1 = await manager.createSnapshot('ws-1', 'd-1', 'daily');
      const snap2 = await manager.createSnapshot('ws-2', 'd-2', 'daily');
      const result = await manager.transferBatch([snap1, snap2]);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('Retention & Expiry', () => {
    it('should identify expired snapshots', () => {
      const oldSnapshot: Snapshot = {
        id: 'snap-old',
        workspaceId: 'ws-1',
        dropletId: 'd-1',
        type: 'daily',
        region: 'nyc1',
        status: 'completed',
        sizeGb: 5,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      };
      expect(manager.shouldDelete(oldSnapshot)).toBe(true);
    });

    it('should not delete recent snapshots', async () => {
      const snapshot = await manager.createSnapshot('ws-1', 'd-1', 'daily');
      expect(manager.shouldDelete(snapshot)).toBe(false);
    });

    it('should delete expired snapshots', async () => {
      const oldSnapshot: Snapshot = {
        id: 'snap-old',
        workspaceId: 'ws-1',
        dropletId: 'd-1',
        type: 'daily',
        region: 'nyc1',
        status: 'completed',
        sizeGb: 5,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      };
      env.addSnapshot(oldSnapshot);
      const result = await manager.deleteExpiredSnapshots('nyc1');
      expect(result.deleted).toBe(1);
    });
  });

  describe('Garbage Collection', () => {
    it('should identify orphaned snapshots', async () => {
      const orphan: Snapshot = {
        id: 'snap-orphan',
        workspaceId: 'ws-orphan',
        dropletId: 'd-orphan',
        type: 'daily',
        region: 'nyc1',
        status: 'failed',
        sizeGb: 5,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      env.addSnapshot(orphan);
      const orphaned = await manager.identifyOrphanedSnapshots('nyc1');
      expect(orphaned.length).toBe(1);
      expect(orphaned[0].snapshotId).toBe('snap-orphan');
    });

    it('should execute garbage collection in dry-run', async () => {
      const orphan: Snapshot = {
        id: 'snap-orphan',
        workspaceId: 'ws-orphan',
        dropletId: 'd-orphan',
        type: 'daily',
        region: 'nyc1',
        status: 'failed',
        sizeGb: 10,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      env.addSnapshot(orphan);
      const result = await manager.executeGarbageCollection('nyc1', true);
      expect(result.snapshotsDeleted).toBe(1);
      expect(result.sizeRecoveredGb).toBe(10);
      expect(result.costRecoveredMonthly).toBeGreaterThan(0);
      // Dry run: snapshot should still exist
      expect(env.getSnapshot('snap-orphan')).toBeDefined();
    });

    it('should actually delete in non-dry-run', async () => {
      const orphan: Snapshot = {
        id: 'snap-orphan',
        workspaceId: 'ws-orphan',
        dropletId: 'd-orphan',
        type: 'daily',
        region: 'nyc1',
        status: 'failed',
        sizeGb: 10,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      env.addSnapshot(orphan);
      const result = await manager.executeGarbageCollection('nyc1', false);
      expect(result.snapshotsDeleted).toBe(1);
      // Should be deleted
      expect(env.getSnapshot('snap-orphan')).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should return statistics', async () => {
      await manager.createSnapshot('ws-1', 'd-1', 'daily');
      await manager.createSnapshot('ws-2', 'd-2', 'weekly');
      const stats = manager.getStatistics();
      expect(stats.totalSnapshots).toBe(2);
      expect(stats.totalSizeGb).toBeGreaterThan(0);
      expect(stats.monthlyCost).toBeGreaterThan(0);
      expect(stats.byType.daily).toBe(1);
      expect(stats.byType.weekly).toBe(1);
    });
  });
});
