/**
 * GENESIS PHASE 70: DISASTER RECOVERY CONTROLLER
 *
 * Top-level controller coordinating snapshot management, failover
 * detection, and restoration orchestration for complete DR operations.
 */

import {
  RestorationResult,
  FailoverEvent,
  DisasterRecoveryEnvironment,
  type DORegion,
  SnapshotType,
  GarbageCollectionResult,
} from './types';
import { SnapshotManager } from './snapshot-manager';
import { FailoverDetector } from './failover-detector';
import { RestorationOrchestrator } from './restoration-orchestrator';

export class DisasterRecoveryControllerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DisasterRecoveryControllerError';
  }
}

export class DisasterRecoveryController {
  private readonly snapshotManager: SnapshotManager;
  private readonly failoverDetector: FailoverDetector;
  private readonly restorationOrchestrator: RestorationOrchestrator;

  constructor(private readonly env: DisasterRecoveryEnvironment) {
    this.snapshotManager = new SnapshotManager(env);
    this.failoverDetector = new FailoverDetector(env);
    this.restorationOrchestrator = new RestorationOrchestrator(env);
  }

  // ============================================
  // SNAPSHOT OPERATIONS
  // ============================================

  /**
   * Create daily snapshots for all droplets in a region.
   */
  async executeDailySnapshots(
    region: DORegion,
  ): Promise<{ succeeded: number; failed: number; transferred: number }> {
    const droplets = await this.env.listDropletsByRegion(region);
    const dropletData = droplets.map(id => ({ workspaceId: `ws-${id}`, dropletId: id }));

    // Create snapshots
    const result = await this.snapshotManager.createBatchSnapshots(dropletData, 'daily');

    // Transfer to cross-region
    const transferResult = await this.snapshotManager.transferBatch(result.succeeded);

    return {
      succeeded: result.succeeded.length,
      failed: result.failed.length,
      transferred: transferResult.succeeded,
    };
  }

  /**
   * Execute garbage collection for snapshots.
   */
  async executeGarbageCollection(
    region?: DORegion,
    dryRun: boolean = false,
  ): Promise<GarbageCollectionResult> {
    return this.snapshotManager.executeGarbageCollection(region, dryRun);
  }

  /**
   * Get snapshot statistics.
   */
  getSnapshotStatistics() {
    return this.snapshotManager.getStatistics();
  }

  // ============================================
  // FAILOVER DETECTION
  // ============================================

  /**
   * Check if a region should failover.
   */
  async checkFailover(region: DORegion) {
    return this.failoverDetector.detectFailover(region);
  }

  /**
   * Monitor all regions and get failover status.
   */
  async monitorAllRegions() {
    return this.failoverDetector.monitorAllRegions();
  }

  /**
   * Manually declare a regional failover.
   */
  async declareFailover(region: DORegion, reason: string): Promise<FailoverEvent> {
    return this.failoverDetector.declareFailover(region, reason);
  }

  // ============================================
  // RESTORATION
  // ============================================

  /**
   * Execute full regional restoration.
   */
  async executeRegionalRestoration(
    sourceRegion: DORegion,
    trigger: string,
  ): Promise<RestorationResult> {
    // Get affected droplets
    const droplets = await this.env.listDropletsByRegion(sourceRegion);
    const workspaceIds = droplets.map(id => `ws-${id}`);

    // Get available snapshots
    const snapshots = await this.env.listSnapshots(sourceRegion);

    // Execute restoration
    return this.restorationOrchestrator.executeRestoration(
      sourceRegion,
      trigger,
      workspaceIds,
      snapshots,
    );
  }

  /**
   * Get restoration progress if active.
   */
  getRestorationProgress() {
    return this.restorationOrchestrator.getProgress();
  }

  // ============================================
  // AUTO-FAILOVER & RESTORATION
  // ============================================

  /**
   * Check for and execute auto-failover with restoration.
   * This is the main entry point for automated DR.
   */
  async monitorAndAutoRecover(region: DORegion): Promise<{
    failoverEvent: FailoverEvent | null;
    restorationResult: RestorationResult | null;
  }> {
    // Check if failover should trigger
    const failoverEvent = await this.failoverDetector.checkAndAutoFailover(region);

    if (!failoverEvent) {
      return { failoverEvent: null, restorationResult: null };
    }

    // Execute restoration
    const restorationResult = await this.executeRegionalRestoration(
      region,
      `Auto-failover: ${failoverEvent.trigger}`,
    );

    return { failoverEvent, restorationResult };
  }

  // ============================================
  // SERVICE ACCESS
  // ============================================

  getSnapshotManager(): SnapshotManager {
    return this.snapshotManager;
  }

  getFailoverDetector(): FailoverDetector {
    return this.failoverDetector;
  }

  getRestorationOrchestrator(): RestorationOrchestrator {
    return this.restorationOrchestrator;
  }
}
