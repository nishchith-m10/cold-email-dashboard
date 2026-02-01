/**
 * PHASE 55: HIBERNATION & WAKE PHYSICS - MOCK IMPLEMENTATIONS
 */

import type {
  HibernationDB,
  PowerClient,
  WorkspaceActivity,
  HibernationProcess,
  MetricSnapshot,
  WakeProcess,
  FleetCostSummary,
  PowerOperationResult,
  PowerStatus,
  PowerAction,
} from './hibernation-types';
import { COST_RUNNING_DROPLET, COST_HIBERNATING_DROPLET } from './hibernation-types';

export class MockHibernationDB implements HibernationDB {
  private workspaceActivity = new Map<string, WorkspaceActivity>();
  private hibernationProcesses = new Map<string, HibernationProcess>();
  private wakeProcesses = new Map<string, WakeProcess>();
  private snapshots = new Map<string, MetricSnapshot>();
  private hibernationTimes = new Map<string, Date>();
  private wakeTimes = new Map<string, Date>();

  async getWorkspaceActivity(workspaceId: string): Promise<WorkspaceActivity | null> {
    return this.workspaceActivity.get(workspaceId) || null;
  }

  async getAllWorkspaceActivity(): Promise<WorkspaceActivity[]> {
    return Array.from(this.workspaceActivity.values());
  }

  async startHibernationProcess(workspaceId: string, dropletId: string): Promise<HibernationProcess> {
    const process: HibernationProcess = {
      workspace_id: workspaceId,
      droplet_id: dropletId,
      started_at: new Date(),
      step: 'notification',
      notification_sent_at: null,
      snapshot_collected_at: null,
      shutdown_completed_at: null,
      powered_off_at: null,
      completed_at: null,
    };
    this.hibernationProcesses.set(workspaceId, process);
    return process;
  }

  async updateHibernationProcess(workspaceId: string, updates: Partial<HibernationProcess>): Promise<void> {
    const existing = this.hibernationProcesses.get(workspaceId);
    if (existing) {
      this.hibernationProcesses.set(workspaceId, { ...existing, ...updates });
    }
  }

  async getHibernationProcess(workspaceId: string): Promise<HibernationProcess | null> {
    return this.hibernationProcesses.get(workspaceId) || null;
  }

  async storeMetricSnapshot(snapshot: MetricSnapshot): Promise<void> {
    this.snapshots.set(snapshot.workspace_id, snapshot);
  }

  async getLatestSnapshot(workspaceId: string): Promise<MetricSnapshot | null> {
    return this.snapshots.get(workspaceId) || null;
  }

  async startWakeProcess(workspaceId: string, dropletId: string): Promise<WakeProcess> {
    const process: WakeProcess = {
      workspace_id: workspaceId,
      droplet_id: dropletId,
      started_at: new Date(),
      step: 'power_on',
      power_on_initiated_at: null,
      droplet_booted_at: null,
      containers_started_at: null,
      health_check_passed_at: null,
      completed_at: null,
      target_wake_time_seconds: 60,
      actual_wake_time_seconds: null,
    };
    this.wakeProcesses.set(workspaceId, process);
    return process;
  }

  async updateWakeProcess(workspaceId: string, updates: Partial<WakeProcess>): Promise<void> {
    const existing = this.wakeProcesses.get(workspaceId);
    if (existing) {
      this.wakeProcesses.set(workspaceId, { ...existing, ...updates });
    }
  }

  async getWakeProcess(workspaceId: string): Promise<WakeProcess | null> {
    return this.wakeProcesses.get(workspaceId) || null;
  }

  async recordHibernation(workspaceId: string, hibernatedAt: Date): Promise<void> {
    this.hibernationTimes.set(workspaceId, hibernatedAt);
  }

  async recordWake(workspaceId: string, wokenAt: Date): Promise<void> {
    this.wakeTimes.set(workspaceId, wokenAt);
  }

  async getFleetCostSummary(): Promise<FleetCostSummary> {
    const total = this.workspaceActivity.size;
    const hibernating = Array.from(this.hibernationProcesses.values())
      .filter(p => p.step === 'completed').length;
    const active = total - hibernating;
    const rate = total > 0 ? hibernating / total : 0;

    return {
      total_droplets: total,
      active_droplets: active,
      hibernating_droplets: hibernating,
      hibernation_rate: rate,
      monthly_active_cost: active * COST_RUNNING_DROPLET,
      monthly_hibernation_cost: hibernating * COST_HIBERNATING_DROPLET,
      total_monthly_savings: hibernating * (COST_RUNNING_DROPLET - COST_HIBERNATING_DROPLET),
      estimated_annual_savings: hibernating * (COST_RUNNING_DROPLET - COST_HIBERNATING_DROPLET) * 12,
    };
  }

  // Test helpers
  setWorkspaceActivity(activity: WorkspaceActivity): void {
    this.workspaceActivity.set(activity.workspace_id, activity);
  }

  reset(): void {
    this.workspaceActivity.clear();
    this.hibernationProcesses.clear();
    this.wakeProcesses.clear();
    this.snapshots.clear();
    this.hibernationTimes.clear();
    this.wakeTimes.clear();
  }
}

export class MockPowerClient implements PowerClient {
  private powerStatus = new Map<string, PowerStatus>();
  private operations: PowerOperationResult[] = [];

  async powerOn(dropletId: string): Promise<PowerOperationResult> {
    const startTime = new Date();
    this.powerStatus.set(dropletId, 'active');
    
    const result: PowerOperationResult = {
      success: true,
      droplet_id: dropletId,
      action: 'power_on',
      started_at: startTime,
      completed_at: new Date(),
      duration_ms: 10,
    };
    
    this.operations.push(result);
    return result;
  }

  async powerOff(dropletId: string): Promise<PowerOperationResult> {
    const startTime = new Date();
    this.powerStatus.set(dropletId, 'off');
    
    const result: PowerOperationResult = {
      success: true,
      droplet_id: dropletId,
      action: 'power_off',
      started_at: startTime,
      completed_at: new Date(),
      duration_ms: 10,
    };
    
    this.operations.push(result);
    return result;
  }

  async powerCycle(dropletId: string): Promise<PowerOperationResult> {
    const startTime = new Date();
    this.powerStatus.set(dropletId, 'active');
    
    const result: PowerOperationResult = {
      success: true,
      droplet_id: dropletId,
      action: 'power_cycle',
      started_at: startTime,
      completed_at: new Date(),
      duration_ms: 10,
    };
    
    this.operations.push(result);
    return result;
  }

  async getPowerStatus(dropletId: string): Promise<PowerStatus> {
    return this.powerStatus.get(dropletId) || 'unknown';
  }

  // Test helpers
  getOperations(): PowerOperationResult[] {
    return this.operations;
  }

  getLastOperation(): PowerOperationResult | undefined {
    return this.operations[this.operations.length - 1];
  }

  reset(): void {
    this.powerStatus.clear();
    this.operations = [];
  }
}

export function createMockHibernationDB(): MockHibernationDB {
  return new MockHibernationDB();
}

export function createMockPowerClient(): MockPowerClient {
  return new MockPowerClient();
}
