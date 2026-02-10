/**
 * GENESIS PHASE 70: MOCK DIGITALOCEAN ENVIRONMENT
 *
 * In-memory mock for DisasterRecoveryEnvironment interface,
 * simulating droplets, snapshots, regions, and failover scenarios.
 */

import {
  DisasterRecoveryEnvironment,
  Snapshot,
  SnapshotType,
  SnapshotStatus,
  HeartbeatStatus,
  FailoverEvent,
  SNAPSHOT_CONFIGS,
  generateEventId,
  type DORegion,
} from './types';

export class MockDOEnvironment implements DisasterRecoveryEnvironment {
  private droplets: Map<string, { status: string; region: DORegion }> = new Map();
  private snapshots: Map<string, Snapshot> = new Map();
  private events: FailoverEvent[] = [];
  private heartbeatOverrides: Map<DORegion, Partial<HeartbeatStatus>> = new Map();

  // Track calls for test assertions
  callLog: Array<{ method: string; args: any[] }> = [];

  // ============================================
  // DROPLET OPERATIONS
  // ============================================

  async getDropletStatus(dropletId: string): Promise<{ status: string; region: DORegion }> {
    this.callLog.push({ method: 'getDropletStatus', args: [dropletId] });
    const droplet = this.droplets.get(dropletId);
    if (!droplet) throw new Error(`Droplet ${dropletId} not found`);
    return droplet;
  }

  async listDropletsByRegion(region: DORegion): Promise<string[]> {
    this.callLog.push({ method: 'listDropletsByRegion', args: [region] });
    return Array.from(this.droplets.entries())
      .filter(([, d]) => d.region === region)
      .map(([id]) => id);
  }

  // ============================================
  // SNAPSHOT OPERATIONS
  // ============================================

  async createSnapshot(dropletId: string, name: string, type: SnapshotType): Promise<Snapshot> {
    this.callLog.push({ method: 'createSnapshot', args: [dropletId, name, type] });

    const droplet = await this.getDropletStatus(dropletId);
    const config = SNAPSHOT_CONFIGS[type];
    
    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.retentionDays);

    // Extract workspaceId from the snapshot name (format: type_date_workspaceId)
    // This avoids the ws-${dropletId} coupling and respects the caller's workspace mapping
    const nameParts = name.split('_');
    const workspaceId = nameParts.length >= 3 ? nameParts.slice(2).join('_') : `ws-${dropletId}`;

    const snapshot: Snapshot = {
      id: snapshotId,
      workspaceId,
      dropletId,
      type,
      region: droplet.region,
      status: 'completed',
      sizeGb: 5 + Math.random() * 10, // 5-15 GB
      createdAt,
      expiresAt: expiresAt.toISOString(),
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshot;
  }

  async transferSnapshot(snapshotId: string, targetRegion: DORegion): Promise<{ success: boolean }> {
    this.callLog.push({ method: 'transferSnapshot', args: [snapshotId, targetRegion] });
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return { success: false };

    snapshot.transferredTo = targetRegion;
    snapshot.status = 'completed';
    return { success: true };
  }

  async deleteSnapshot(snapshotId: string): Promise<{ success: boolean }> {
    this.callLog.push({ method: 'deleteSnapshot', args: [snapshotId] });
    return { success: this.snapshots.delete(snapshotId) };
  }

  async listSnapshots(region?: DORegion): Promise<Snapshot[]> {
    this.callLog.push({ method: 'listSnapshots', args: [region] });
    const all = Array.from(this.snapshots.values());
    return region ? all.filter(s => s.region === region) : all;
  }

  // ============================================
  // RESTORATION OPERATIONS
  // ============================================

  async createDropletFromSnapshot(
    snapshotId: string,
    region: DORegion,
    name: string,
  ): Promise<{ dropletId: string; ipAddress: string }> {
    this.callLog.push({ method: 'createDropletFromSnapshot', args: [snapshotId, region, name] });

    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

    const dropletId = `droplet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ipAddress = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    this.droplets.set(dropletId, { status: 'active', region });

    return { dropletId, ipAddress };
  }

  async deleteDroplet(dropletId: string): Promise<{ success: boolean }> {
    this.callLog.push({ method: 'deleteDroplet', args: [dropletId] });
    return { success: this.droplets.delete(dropletId) };
  }

  // ============================================
  // HEARTBEAT MONITORING
  // ============================================

  async getHeartbeatStatus(region: DORegion): Promise<HeartbeatStatus> {
    this.callLog.push({ method: 'getHeartbeatStatus', args: [region] });

    const override = this.heartbeatOverrides.get(region);
    const droplets = await this.listDropletsByRegion(region);
    const totalDroplets = droplets.length || 100; // Default 100 for tests
    const missingHeartbeats = override?.missingHeartbeats ?? 0;
    const healthyDroplets = totalDroplets - missingHeartbeats;

    return {
      region,
      totalDroplets,
      healthyDroplets,
      missingHeartbeats,
      healthPercentage: (healthyDroplets / totalDroplets) * 100,
      timestamp: new Date().toISOString(),
      ...override,
    };
  }

  // ============================================
  // EVENTS
  // ============================================

  async logEvent(event: Omit<FailoverEvent, 'eventId' | 'timestamp'>): Promise<void> {
    this.callLog.push({ method: 'logEvent', args: [event] });
    this.events.push({
      ...event,
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
    });
  }

  async getEvents(region?: DORegion): Promise<FailoverEvent[]> {
    this.callLog.push({ method: 'getEvents', args: [region] });
    return region ? this.events.filter(e => e.sourceRegion === region) : [...this.events];
  }

  // ============================================
  // TEST HELPERS
  // ============================================

  addDroplet(dropletId: string, region: DORegion, status: string = 'active'): void {
    this.droplets.set(dropletId, { status, region });
  }

  addSnapshot(snapshot: Snapshot): void {
    this.snapshots.set(snapshot.id, snapshot);
  }

  setHeartbeatOverride(region: DORegion, override: Partial<HeartbeatStatus>): void {
    this.heartbeatOverrides.set(region, override);
  }

  clearHeartbeatOverrides(): void {
    this.heartbeatOverrides.clear();
  }

  reset(): void {
    this.droplets.clear();
    this.snapshots.clear();
    this.events = [];
    this.heartbeatOverrides.clear();
    this.callLog = [];
  }

  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  getAllSnapshots(): Snapshot[] {
    return Array.from(this.snapshots.values());
  }

  getDroplet(dropletId: string): { status: string; region: DORegion } | undefined {
    return this.droplets.get(dropletId);
  }

  getAllDroplets(): Map<string, { status: string; region: DORegion }> {
    return new Map(this.droplets);
  }
}
