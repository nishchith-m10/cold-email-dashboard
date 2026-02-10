/**
 * GENESIS PHASE 70: SNAPSHOT MANAGER
 *
 * Cross-region snapshot creation, transfer, retention management,
 * and garbage collection for disaster recovery.
 */

import {
  Snapshot,
  SnapshotType,
  SnapshotStatus,
  SnapshotConfig,
  SnapshotRecord,
  OrphanedSnapshot,
  GarbageCategory,
  GarbageCollectionResult,
  DisasterRecoveryEnvironment,
  SNAPSHOT_CONFIGS,
  DR_DEFAULTS,
  calculateSnapshotCost,
  isSnapshotExpired,
  generateSnapshotName,
  getBackupRegion,
  type DORegion,
} from './types';

export class SnapshotManagerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SnapshotManagerError';
  }
}

export class SnapshotManager {
  private snapshotRecords: Map<string, SnapshotRecord> = new Map();

  constructor(private readonly env: DisasterRecoveryEnvironment) {}

  // ============================================
  // SNAPSHOT CREATION
  // ============================================

  /**
   * Create a snapshot for a workspace droplet.
   */
  async createSnapshot(
    workspaceId: string,
    dropletId: string,
    type: SnapshotType,
  ): Promise<Snapshot> {
    const name = generateSnapshotName(workspaceId, type);
    const snapshot = await this.env.createSnapshot(dropletId, name, type);

    // Record for retention tracking
    this.recordSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Create snapshots for multiple droplets (batch operation).
   */
  async createBatchSnapshots(
    droplets: Array<{ workspaceId: string; dropletId: string }>,
    type: SnapshotType,
    concurrency: number = DR_DEFAULTS.MAX_CONCURRENT_SNAPSHOTS,
  ): Promise<{ succeeded: Snapshot[]; failed: Array<{ dropletId: string; error: string }> }> {
    const succeeded: Snapshot[] = [];
    const failed: Array<{ dropletId: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < droplets.length; i += concurrency) {
      const batch = droplets.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(({ workspaceId, dropletId }) =>
          this.createSnapshot(workspaceId, dropletId, type),
        ),
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          succeeded.push(result.value);
        } else {
          failed.push({
            dropletId: batch[idx].dropletId,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      });
    }

    return { succeeded, failed };
  }

  // ============================================
  // CROSS-REGION TRANSFER
  // ============================================

  /**
   * Transfer a snapshot to its backup region.
   */
  async transferToCrossRegion(snapshot: Snapshot): Promise<{ success: boolean; error?: string }> {
    const targetRegion = getBackupRegion(snapshot.region);
    const result = await this.env.transferSnapshot(snapshot.id, targetRegion);

    if (result.success) {
      // Update record
      const record = this.snapshotRecords.get(snapshot.id);
      if (record) {
        record.transferredAt = new Date().toISOString();
      }
    }

    return result;
  }

  /**
   * Transfer multiple snapshots (batch).
   */
  async transferBatch(
    snapshots: Snapshot[],
    concurrency: number = DR_DEFAULTS.MAX_CONCURRENT_TRANSFERS,
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < snapshots.length; i += concurrency) {
      const batch = snapshots.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(s => this.transferToCrossRegion(s)),
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          succeeded++;
        } else {
          failed++;
        }
      });
    }

    return { succeeded, failed };
  }

  // ============================================
  // RETENTION & EXPIRY
  // ============================================

  /**
   * Check if a snapshot should be deleted based on retention policy.
   */
  shouldDelete(snapshot: Snapshot): boolean {
    if (isSnapshotExpired(snapshot)) return true;

    const config = SNAPSHOT_CONFIGS[snapshot.type];
    if (!config) return false;

    const ageMs = Date.now() - new Date(snapshot.createdAt).getTime();
    const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;

    return ageMs > retentionMs;
  }

  /**
   * Delete expired snapshots in a region.
   */
  async deleteExpiredSnapshots(region?: DORegion): Promise<{ deleted: number; errors: number }> {
    const snapshots = await this.env.listSnapshots(region);
    const toDelete = snapshots.filter(s => this.shouldDelete(s));

    let deleted = 0;
    let errors = 0;

    for (const snapshot of toDelete) {
      const result = await this.env.deleteSnapshot(snapshot.id);
      if (result.success) {
        deleted++;
        this.markSnapshotDeleted(snapshot.id);
      } else {
        errors++;
      }
    }

    return { deleted, errors };
  }

  // ============================================
  // GARBAGE COLLECTION
  // ============================================

  /**
   * Identify orphaned snapshots that should be cleaned up.
   */
  async identifyOrphanedSnapshots(region?: DORegion): Promise<OrphanedSnapshot[]> {
    const snapshots = await this.env.listSnapshots(region);
    const orphaned: OrphanedSnapshot[] = [];

    for (const snapshot of snapshots) {
      const record = this.snapshotRecords.get(snapshot.id);

      // Orphan criteria
      const isOrphaned =
        !record || // Not in registry
        snapshot.status === 'failed' || // Failed creation
        (snapshot.status === 'transferring' && this.isTransferStuck(snapshot)); // Stuck transfer

      if (isOrphaned) {
        orphaned.push({
          snapshotId: snapshot.id,
          workspaceId: snapshot.workspaceId,
          region: snapshot.region,
          sizeGb: snapshot.sizeGb,
          createdAt: snapshot.createdAt,
          reason: this.getOrphanReason(snapshot, record),
          category: this.categorizeForGC(snapshot),
          deleteAfter: this.calculateDeleteAfter(snapshot),
        });
      }
    }

    return orphaned;
  }

  /**
   * Execute garbage collection.
   */
  async executeGarbageCollection(
    region?: DORegion,
    dryRun: boolean = false,
  ): Promise<GarbageCollectionResult> {
    const orphaned = await this.identifyOrphanedSnapshots(region);
    const immediateDelete = orphaned.filter(o => o.category === 'immediate');

    let snapshotsDeleted = 0;
    let sizeRecoveredGb = 0;
    const errors: Array<{ snapshotId: string; error: string }> = [];

    if (!dryRun) {
      for (const snapshot of immediateDelete) {
        const result = await this.env.deleteSnapshot(snapshot.snapshotId);
        if (result.success) {
          snapshotsDeleted++;
          sizeRecoveredGb += snapshot.sizeGb;
          this.markSnapshotDeleted(snapshot.snapshotId, snapshot.sizeGb);
        } else {
          errors.push({ snapshotId: snapshot.snapshotId, error: 'Delete failed' });
        }
      }
    } else {
      // Dry run: just count
      snapshotsDeleted = immediateDelete.length;
      sizeRecoveredGb = immediateDelete.reduce((sum, s) => sum + s.sizeGb, 0);
    }

    return {
      snapshotsDeleted,
      sizeRecoveredGb,
      costRecoveredMonthly: calculateSnapshotCost(sizeRecoveredGb),
      errors,
    };
  }

  // ============================================
  // RECORD MANAGEMENT
  // ============================================

  private recordSnapshot(snapshot: Snapshot): void {
    this.snapshotRecords.set(snapshot.id, {
      snapshotId: snapshot.id,
      workspaceId: snapshot.workspaceId,
      dropletId: snapshot.dropletId,
      type: snapshot.type,
      region: snapshot.region,
      sizeGb: snapshot.sizeGb,
      createdAt: snapshot.createdAt,
    });
  }

  private markSnapshotDeleted(snapshotId: string, sizeGb?: number): void {
    const record = this.snapshotRecords.get(snapshotId);
    if (record) {
      record.deletedAt = new Date().toISOString();
      record.costRecovered = calculateSnapshotCost(sizeGb || record.sizeGb);
    }
  }

  private isTransferStuck(snapshot: Snapshot): boolean {
    if (snapshot.status !== 'transferring') return false;
    const ageMs = Date.now() - new Date(snapshot.createdAt).getTime();
    return ageMs > 24 * 60 * 60 * 1000; // 24 hours
  }

  private getOrphanReason(snapshot: Snapshot, record?: SnapshotRecord): string {
    if (!record) return 'Not in registry';
    if (snapshot.status === 'failed') return 'Failed creation';
    if (this.isTransferStuck(snapshot)) return 'Transfer stuck > 24h';
    return 'Unknown';
  }

  private categorizeForGC(snapshot: Snapshot): GarbageCategory {
    if (snapshot.status === 'failed') return 'immediate';
    if (this.isTransferStuck(snapshot)) return 'immediate';
    if (isSnapshotExpired(snapshot)) return 'retention_expiry';
    return 'grace_period';
  }

  private calculateDeleteAfter(snapshot: Snapshot): string | undefined {
    if (this.categorizeForGC(snapshot) === 'grace_period') {
      const grace = new Date(snapshot.createdAt);
      grace.setDate(grace.getDate() + DR_DEFAULTS.GRACE_PERIOD_DAYS);
      return grace.toISOString();
    }
    return undefined;
  }

  /**
   * Get all snapshot records.
   */
  getSnapshotRecords(): SnapshotRecord[] {
    return Array.from(this.snapshotRecords.values());
  }

  /**
   * Get snapshot statistics.
   */
  getStatistics(): {
    totalSnapshots: number;
    totalSizeGb: number;
    monthlyCost: number;
    byType: Record<SnapshotType, number>;
  } {
    const records = this.getSnapshotRecords();
    const active = records.filter(r => !r.deletedAt);

    return {
      totalSnapshots: active.length,
      totalSizeGb: active.reduce((sum, r) => sum + r.sizeGb, 0),
      monthlyCost: active.reduce((sum, r) => sum + calculateSnapshotCost(r.sizeGb), 0),
      byType: {
        daily: active.filter(r => r.type === 'daily').length,
        weekly: active.filter(r => r.type === 'weekly').length,
        cross_region: active.filter(r => r.type === 'cross_region').length,
        pre_update: active.filter(r => r.type === 'pre_update').length,
      },
    };
  }
}
