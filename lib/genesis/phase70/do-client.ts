/**
 * GENESIS PHASE 70: REAL DIGITALOCEAN API CLIENT
 *
 * Production-ready DigitalOcean API client implementing
 * the DisasterRecoveryEnvironment interface. Uses the
 * DigitalOcean REST API v2 directly via fetch().
 *
 * Requires: DIGITALOCEAN_API_TOKEN environment variable.
 * If not set, all operations throw a descriptive error.
 *
 * @see https://docs.digitalocean.com/reference/api/api-reference/
 */

import {
  DisasterRecoveryEnvironment,
  Snapshot,
  SnapshotType,
  HeartbeatStatus,
  FailoverEvent,
  SNAPSHOT_CONFIGS,
  generateEventId,
  type DORegion,
} from './types';
import {
  saveSnapshot,
  saveRegionalHealth,
} from './db-service';

// ============================================
// CONSTANTS
// ============================================

const DO_API_BASE = 'https://api.digitalocean.com/v2';

// ============================================
// HELPERS
// ============================================

function getApiToken(): string {
  const token = process.env.DIGITALOCEAN_API_TOKEN;
  if (!token) {
    throw new Error(
      '[DO-Client] DIGITALOCEAN_API_TOKEN is not configured. ' +
      'Set this environment variable to enable DigitalOcean API operations. ' +
      'Get your token from https://cloud.digitalocean.com/account/api/tokens'
    );
  }
  return token;
}

async function doFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getApiToken();

  const response = await fetch(`${DO_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'No body');
    throw new Error(
      `[DO-Client] API request failed: ${response.status} ${response.statusText} - ${path}\n${body}`
    );
  }

  return response;
}

// ============================================
// DIGITALOCEAN API CLIENT
// ============================================

/**
 * Production DigitalOcean API client.
 *
 * Implements DisasterRecoveryEnvironment using real DigitalOcean
 * REST API v2 calls. Database persistence is handled via db-service.
 */
export class DOClient implements DisasterRecoveryEnvironment {
  private isDryRun: boolean;

  constructor(isDryRun: boolean = false) {
    this.isDryRun = isDryRun;
  }

  // ============================================
  // DROPLET OPERATIONS
  // ============================================

  async getDropletStatus(
    dropletId: string
  ): Promise<{ status: string; region: DORegion }> {
    const res = await doFetch(`/droplets/${dropletId}`);
    const data = await res.json();
    const droplet = data.droplet;

    return {
      status: droplet.status, // 'active', 'off', 'archive', 'new'
      region: droplet.region.slug as DORegion,
    };
  }

  async listDropletsByRegion(region: DORegion): Promise<string[]> {
    // DO API doesn't filter by region directly, so we paginate and filter
    const dropletIds: string[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await doFetch(
        `/droplets?page=${page}&per_page=200&tag_name=genesis`
      );
      const data = await res.json();

      for (const droplet of data.droplets || []) {
        if (droplet.region?.slug === region) {
          dropletIds.push(String(droplet.id));
        }
      }

      hasMore =
        data.links?.pages?.next !== undefined &&
        (data.droplets?.length || 0) > 0;
      page++;
    }

    return dropletIds;
  }

  // ============================================
  // SNAPSHOT OPERATIONS
  // ============================================

  async createSnapshot(
    dropletId: string,
    name: string,
    type: SnapshotType
  ): Promise<Snapshot> {
    // Request snapshot creation via DO API
    const res = await doFetch(`/droplets/${dropletId}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'snapshot',
        name,
      }),
    });
    const data = await res.json();
    const action = data.action;

    // Get the droplet's region
    const dropletInfo = await this.getDropletStatus(dropletId);
    const config = SNAPSHOT_CONFIGS[type];

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.retentionDays);

    // Extract workspaceId from name (format: type_date_workspaceId)
    const nameParts = name.split('_');
    const workspaceId =
      nameParts.length >= 3
        ? nameParts.slice(2).join('_')
        : `ws-${dropletId}`;

    const snapshot: Snapshot = {
      id: `snap-${action.id}`,
      workspaceId,
      dropletId,
      type,
      region: dropletInfo.region,
      status: action.status === 'completed' ? 'completed' : 'in_progress',
      sizeGb: 0, // Size populated after completion
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Persist to database
    try {
      await saveSnapshot(snapshot, this.isDryRun);
    } catch (error) {
      console.error('[DO-Client] Failed to persist snapshot to DB:', error);
    }

    return snapshot;
  }

  async transferSnapshot(
    snapshotId: string,
    targetRegion: DORegion
  ): Promise<{ success: boolean }> {
    // DO snapshots use image IDs - extract from our ID format
    const doImageId = snapshotId.replace('snap-', '');

    try {
      await doFetch(`/images/${doImageId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'transfer',
          region: targetRegion,
        }),
      });
      return { success: true };
    } catch (error) {
      console.error('[DO-Client] Snapshot transfer failed:', error);
      return { success: false };
    }
  }

  async deleteSnapshot(
    snapshotId: string
  ): Promise<{ success: boolean }> {
    const doImageId = snapshotId.replace('snap-', '');

    try {
      await doFetch(`/snapshots/${doImageId}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      console.error('[DO-Client] Snapshot delete failed:', error);
      return { success: false };
    }
  }

  async listSnapshots(region?: DORegion): Promise<Snapshot[]> {
    const res = await doFetch('/snapshots?resource_type=droplet&per_page=200');
    const data = await res.json();

    const snapshots: Snapshot[] = (data.snapshots || []).map(
      (s: any): Snapshot => ({
        id: `snap-${s.id}`,
        workspaceId: '', // Not available from DO API - resolved from DB
        dropletId: '', // Not available from DO API listing
        type: 'daily' as SnapshotType, // Default type
        region: (s.regions?.[0] || 'nyc1') as DORegion,
        status: 'completed' as const,
        sizeGb: s.size_gigabytes || 0,
        createdAt: s.created_at,
        expiresAt: '', // Calculated from retention policy
      })
    );

    if (region) {
      return snapshots.filter((s) => s.region === region);
    }

    return snapshots;
  }

  // ============================================
  // RESTORATION OPERATIONS
  // ============================================

  async createDropletFromSnapshot(
    snapshotId: string,
    region: DORegion,
    name: string
  ): Promise<{ dropletId: string; ipAddress: string }> {
    const doImageId = snapshotId.replace('snap-', '');

    const res = await doFetch('/droplets', {
      method: 'POST',
      body: JSON.stringify({
        name,
        region,
        size: 's-2vcpu-4gb', // Standard Genesis droplet size
        image: doImageId,
        tags: ['genesis', 'restored'],
        monitoring: true,
      }),
    });
    const data = await res.json();
    const droplet = data.droplet;

    // IP may not be immediately available
    const ipv4 = droplet.networks?.v4?.find(
      (n: any) => n.type === 'public'
    );

    return {
      dropletId: String(droplet.id),
      ipAddress: ipv4?.ip_address || 'pending',
    };
  }

  async deleteDroplet(
    dropletId: string
  ): Promise<{ success: boolean }> {
    try {
      await doFetch(`/droplets/${dropletId}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      console.error('[DO-Client] Droplet delete failed:', error);
      return { success: false };
    }
  }

  // ============================================
  // HEARTBEAT MONITORING
  // ============================================

  async getHeartbeatStatus(region: DORegion): Promise<HeartbeatStatus> {
    // Get all genesis-tagged droplets in this region
    const dropletIds = await this.listDropletsByRegion(region);
    const totalDroplets = dropletIds.length;

    // Check each droplet's status
    let healthyCount = 0;
    for (const id of dropletIds) {
      try {
        const status = await this.getDropletStatus(id);
        if (status.status === 'active') {
          healthyCount++;
        }
      } catch {
        // Droplet unreachable = not healthy
      }
    }

    const missingHeartbeats = totalDroplets - healthyCount;
    const healthPercentage =
      totalDroplets > 0 ? (healthyCount / totalDroplets) * 100 : 100;

    const heartbeatStatus: HeartbeatStatus = {
      region,
      totalDroplets,
      healthyDroplets: healthyCount,
      missingHeartbeats,
      healthPercentage,
      timestamp: new Date().toISOString(),
    };

    // Persist to database
    try {
      await saveRegionalHealth(region, heartbeatStatus);
    } catch (error) {
      console.error(
        '[DO-Client] Failed to persist heartbeat to DB:',
        error
      );
    }

    return heartbeatStatus;
  }

  // ============================================
  // EVENTS
  // ============================================

  private events: FailoverEvent[] = [];

  async logEvent(
    event: Omit<FailoverEvent, 'eventId' | 'timestamp'>
  ): Promise<void> {
    this.events.push({
      ...event,
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
    });
  }

  async getEvents(region?: DORegion): Promise<FailoverEvent[]> {
    return region
      ? this.events.filter((e) => e.sourceRegion === region)
      : [...this.events];
  }

  // ============================================
  // UTILITY
  // ============================================

  getIsDryRun(): boolean {
    return this.isDryRun;
  }

  setIsDryRun(isDryRun: boolean): void {
    this.isDryRun = isDryRun;
  }
}

/**
 * Factory function to create a properly configured DO environment.
 *
 * In production (DIGITALOCEAN_API_TOKEN set): returns real DOClient.
 * Token missing: throws descriptive error on first API call (not on construction).
 *
 * @param isDryRun - Whether to tag records as dry-run in the database
 */
export function createDOClient(isDryRun: boolean = false): DOClient {
  return new DOClient(isDryRun);
}
