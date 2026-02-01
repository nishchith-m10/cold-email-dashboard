/**
 * PHASE 54: HEARTBEAT STATE MACHINE - MOCK IMPLEMENTATIONS
 */

import type {
  HeartbeatDB,
  RemediationClient,
  HeartbeatPayload,
  HeartbeatRecord,
  DropletHealth,
  StaleHeartbeat,
  StateTransition,
  MetricHistory,
  MetricSnapshot,
} from './heartbeat-types';

export class MockHeartbeatDB implements HeartbeatDB {
  private heartbeats = new Map<string, HeartbeatRecord[]>();
  private dropletHealth = new Map<string, DropletHealth>();
  private transitions = new Map<string, StateTransition[]>();

  async storeHeartbeat(heartbeat: HeartbeatPayload): Promise<void> {
    const record: HeartbeatRecord = {
      ...heartbeat,
      id: `hb_${Date.now()}`,
      created_at: new Date(),
      consecutive_missed: 0,
      last_heartbeat_at: heartbeat.timestamp,
    };
    
    const beats = this.heartbeats.get(heartbeat.workspace_id) || [];
    beats.push(record);
    this.heartbeats.set(heartbeat.workspace_id, beats);
  }

  async getLatestHeartbeat(workspaceId: string): Promise<HeartbeatRecord | null> {
    const beats = this.heartbeats.get(workspaceId) || [];
    return beats.length > 0 ? beats[beats.length - 1] : null;
  }

  async getDropletHealth(workspaceId: string): Promise<DropletHealth | null> {
    return this.dropletHealth.get(workspaceId) || null;
  }

  async updateDropletHealth(health: Partial<DropletHealth> & { workspace_id: string }): Promise<void> {
    const existing = this.dropletHealth.get(health.workspace_id);
    this.dropletHealth.set(health.workspace_id, { ...existing, ...health } as DropletHealth);
  }

  async getAllDropletHealth(): Promise<DropletHealth[]> {
    return Array.from(this.dropletHealth.values());
  }

  async getStaleHeartbeats(thresholdSeconds: number): Promise<StaleHeartbeat[]> {
    const now = new Date();
    const stale: StaleHeartbeat[] = [];
    
    for (const health of this.dropletHealth.values()) {
      const secondsSince = (now.getTime() - health.last_heartbeat_at.getTime()) / 1000;
      if (secondsSince > thresholdSeconds) {
        stale.push({
          workspace_id: health.workspace_id,
          droplet_id: health.droplet_id,
          last_heartbeat_at: health.last_heartbeat_at,
          consecutive_missed: health.consecutive_missed_heartbeats,
          current_state: health.state,
          minutes_since_heartbeat: secondsSince / 60,
        });
      }
    }
    
    return stale;
  }

  async incrementMissedHeartbeats(workspaceIds: string[]): Promise<void> {
    for (const id of workspaceIds) {
      const health = this.dropletHealth.get(id);
      if (health) {
        health.consecutive_missed_heartbeats++;
      }
    }
  }

  async resetMissedHeartbeats(workspaceIds: string[]): Promise<void> {
    for (const id of workspaceIds) {
      const health = this.dropletHealth.get(id);
      if (health) {
        health.consecutive_missed_heartbeats = 0;
      }
    }
  }

  async recordStateTransition(transition: StateTransition): Promise<void> {
    const transitions = this.transitions.get(transition.workspace_id) || [];
    transitions.push(transition);
    this.transitions.set(transition.workspace_id, transitions);
  }

  async getStateHistory(workspaceId: string, limit: number = 10): Promise<StateTransition[]> {
    const transitions = this.transitions.get(workspaceId) || [];
    return transitions.slice(-limit);
  }

  async getMetricHistory(workspaceId: string, windowMinutes: number): Promise<MetricHistory> {
    const beats = this.heartbeats.get(workspaceId) || [];
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const snapshots: MetricSnapshot[] = beats
      .filter(b => b.timestamp >= cutoff)
      .map(b => ({
        timestamp: b.timestamp,
        cpu_usage_percent: b.cpu_usage_percent,
        memory_usage_percent: (b.memory_usage_mb / b.memory_total_mb) * 100,
        disk_usage_percent: b.disk_usage_percent,
      }));
    
    return {
      workspace_id: workspaceId,
      droplet_id: beats.length > 0 ? beats[0].droplet_id : '',
      snapshots,
      window_minutes: windowMinutes,
    };
  }

  reset(): void {
    this.heartbeats.clear();
    this.dropletHealth.clear();
    this.transitions.clear();
  }
}

export class MockRemediationClient implements RemediationClient {
  private rebootedDroplets = new Set<string>();
  private poweredOnDroplets = new Set<string>();
  private poweredOffDroplets = new Set<string>();
  private dropletPowerStatus = new Map<string, 'active' | 'off' | 'unknown'>();

  async hardReboot(dropletId: string): Promise<void> {
    this.rebootedDroplets.add(dropletId);
  }

  async powerOn(dropletId: string): Promise<void> {
    this.poweredOnDroplets.add(dropletId);
    this.dropletPowerStatus.set(dropletId, 'active');
  }

  async powerOff(dropletId: string): Promise<void> {
    this.poweredOffDroplets.add(dropletId);
    this.dropletPowerStatus.set(dropletId, 'off');
  }

  async getDropletPowerStatus(dropletId: string): Promise<'active' | 'off' | 'unknown'> {
    return this.dropletPowerStatus.get(dropletId) || 'active';
  }

  wasRebooted(dropletId: string): boolean {
    return this.rebootedDroplets.has(dropletId);
  }

  reset(): void {
    this.rebootedDroplets.clear();
    this.poweredOnDroplets.clear();
    this.poweredOffDroplets.clear();
    this.dropletPowerStatus.clear();
  }
}

export function createMockHeartbeatDB(): MockHeartbeatDB {
  return new MockHeartbeatDB();
}

export function createMockRemediationClient(): MockRemediationClient {
  return new MockRemediationClient();
}
