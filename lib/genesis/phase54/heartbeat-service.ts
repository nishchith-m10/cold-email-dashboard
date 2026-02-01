/**
 * PHASE 54: HEARTBEAT STATE MACHINE - SERVICE IMPLEMENTATION
 * 
 * Core service that processes heartbeats and manages droplet health state transitions.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 54
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  HeartbeatService,
  HeartbeatDB,
  RemediationClient,
  HeartbeatPayload,
  DropletHealth,
  HealthState,
  StateTransition,
  WatchdogScanResult,
  StaleHeartbeat,
  HealthThresholds,
  MetricHistory,
} from './heartbeat-types';
import {
  DEFAULT_HEALTH_THRESHOLDS,
  HEARTBEAT_INTERVAL_SECONDS,
  STALE_HEARTBEAT_THRESHOLD_SECONDS,
  TERMINAL_STATES,
} from './heartbeat-types';

// ============================================
// HEARTBEAT STATE MACHINE SERVICE
// ============================================

export class HeartbeatStateMachine implements HeartbeatService {
  constructor(
    private db: HeartbeatDB,
    private remediation: RemediationClient,
    private thresholds: HealthThresholds = DEFAULT_HEALTH_THRESHOLDS
  ) {}

  // ============================================
  // PROCESS HEARTBEAT
  // ============================================

  async processHeartbeat(heartbeat: HeartbeatPayload): Promise<{
    accepted: boolean;
    state_changed: boolean;
    new_state?: HealthState;
    transition?: StateTransition;
  }> {
    try {
      // Store heartbeat
      await this.db.storeHeartbeat(heartbeat);

      // Get or create droplet health record
      let health = await this.db.getDropletHealth(heartbeat.workspace_id);
      
      if (!health) {
        // First heartbeat - create health record
        health = {
          workspace_id: heartbeat.workspace_id,
          droplet_id: heartbeat.droplet_id,
          state: heartbeat.state,
          last_heartbeat_at: heartbeat.timestamp,
          consecutive_missed_heartbeats: 0,
          last_state_change_at: heartbeat.timestamp,
          cpu_usage_percent: heartbeat.cpu_usage_percent,
          memory_usage_mb: heartbeat.memory_usage_mb,
          memory_total_mb: heartbeat.memory_total_mb,
          disk_usage_percent: heartbeat.disk_usage_percent,
          n8n_status: heartbeat.n8n_status,
          n8n_pid: heartbeat.n8n_pid,
          n8n_version: heartbeat.n8n_version,
          active_workflows: heartbeat.active_workflows,
          pending_executions: heartbeat.pending_executions,
          last_execution_at: heartbeat.last_execution_at,
          uptime_seconds: heartbeat.uptime_seconds,
          created_at: heartbeat.timestamp,
          updated_at: heartbeat.timestamp,
        };
        
        await this.db.updateDropletHealth(health);
        
        return {
          accepted: true,
          state_changed: false,
        };
      }

      // Reset missed heartbeat counter
      await this.db.resetMissedHeartbeats([heartbeat.workspace_id]);

      // Check for state transitions
      const oldState = health.state;
      const newState = await this.evaluateStateTransitions(health, heartbeat);

      // Update health record
      await this.db.updateDropletHealth({
        workspace_id: heartbeat.workspace_id,
        last_heartbeat_at: heartbeat.timestamp,
        consecutive_missed_heartbeats: 0,
        cpu_usage_percent: heartbeat.cpu_usage_percent,
        memory_usage_mb: heartbeat.memory_usage_mb,
        memory_total_mb: heartbeat.memory_total_mb,
        disk_usage_percent: heartbeat.disk_usage_percent,
        n8n_status: heartbeat.n8n_status,
        n8n_pid: heartbeat.n8n_pid,
        n8n_version: heartbeat.n8n_version,
        active_workflows: heartbeat.active_workflows,
        pending_executions: heartbeat.pending_executions,
        last_execution_at: heartbeat.last_execution_at,
        uptime_seconds: heartbeat.uptime_seconds,
        updated_at: heartbeat.timestamp,
        ...(newState !== oldState ? {
          state: newState,
          last_state_change_at: heartbeat.timestamp,
        } : {}),
      });

      // Record transition if state changed
      let transition: StateTransition | undefined;
      if (newState !== oldState) {
        transition = {
          workspace_id: heartbeat.workspace_id,
          droplet_id: heartbeat.droplet_id,
          from_state: oldState,
          to_state: newState,
          reason: this.getTransitionReason(oldState, newState, heartbeat),
          triggered_at: heartbeat.timestamp,
          metadata: {
            cpu: heartbeat.cpu_usage_percent,
            memory: heartbeat.memory_usage_mb,
            disk: heartbeat.disk_usage_percent,
          },
        };
        
        await this.db.recordStateTransition(transition);
      }

      return {
        accepted: true,
        state_changed: newState !== oldState,
        new_state: newState,
        transition,
      };
    } catch (error) {
      throw new HeartbeatError(
        `Failed to process heartbeat for workspace ${heartbeat.workspace_id}`,
        'PROCESSING_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // ============================================
  // STATE EVALUATION
  // ============================================

  private async evaluateStateTransitions(
    health: DropletHealth,
    heartbeat: HeartbeatPayload
  ): Promise<HealthState> {
    // Terminal states don't auto-transition
    if (TERMINAL_STATES.includes(health.state)) {
      return health.state;
    }

    // Check for DRIFT_DETECTED
    if (await this.shouldTransitionToDrift(health, heartbeat)) {
      return 'DRIFT_DETECTED';
    }

    // Check for ACTIVE_DEGRADED
    if (await this.shouldTransitionToDegraded(health, heartbeat)) {
      return 'ACTIVE_DEGRADED';
    }

    // Check for RECOVERY from ACTIVE_DEGRADED
    if (health.state === 'ACTIVE_DEGRADED') {
      if (await this.shouldTransitionToHealthy(health, heartbeat)) {
        return 'ACTIVE_HEALTHY';
      }
    }

    // Check for RECOVERY from REBOOTING
    if (health.state === 'REBOOTING' && heartbeat.n8n_status === 'running') {
      return 'ACTIVE_HEALTHY';
    }

    // Check for RECOVERY from WAKING
    if (health.state === 'WAKING' && heartbeat.n8n_status === 'running') {
      return 'ACTIVE_HEALTHY';
    }

    // Default: keep current state
    return health.state;
  }

  private async shouldTransitionToDrift(
    health: DropletHealth,
    heartbeat: HeartbeatPayload
  ): Promise<boolean> {
    // Drift detection would check workflow versions, credential counts, etc.
    // For now, we'll just return false as this requires integration with Phase 43
    return false;
  }

  private async shouldTransitionToDegraded(
    health: DropletHealth,
    heartbeat: HeartbeatPayload
  ): Promise<boolean> {
    // Only transition from ACTIVE_HEALTHY to ACTIVE_DEGRADED
    if (health.state !== 'ACTIVE_HEALTHY') {
      return false;
    }

    // Get metric history for consecutive checks
    const history = await this.db.getMetricHistory(
      health.workspace_id,
      10 // Last 10 minutes
    );

    // Check CPU degradation
    if (heartbeat.cpu_usage_percent > this.thresholds.degraded_cpu_percent) {
      const consecutiveHighCpu = this.countConsecutiveHighMetric(
        history.snapshots,
        'cpu',
        this.thresholds.degraded_cpu_percent
      );
      if (consecutiveHighCpu >= this.thresholds.degraded_cpu_consecutive) {
        return true;
      }
    }

    // Check memory degradation
    const memoryPercent = (heartbeat.memory_usage_mb / heartbeat.memory_total_mb) * 100;
    if (memoryPercent > this.thresholds.degraded_memory_percent) {
      const consecutiveHighMemory = this.countConsecutiveHighMetric(
        history.snapshots,
        'memory',
        this.thresholds.degraded_memory_percent
      );
      if (consecutiveHighMemory >= this.thresholds.degraded_memory_consecutive) {
        return true;
      }
    }

    // Check disk degradation
    if (heartbeat.disk_usage_percent > this.thresholds.degraded_disk_percent) {
      const consecutiveHighDisk = this.countConsecutiveHighMetric(
        history.snapshots,
        'disk',
        this.thresholds.degraded_disk_percent
      );
      if (consecutiveHighDisk >= this.thresholds.degraded_disk_consecutive) {
        return true;
      }
    }

    return false;
  }

  private async shouldTransitionToHealthy(
    health: DropletHealth,
    heartbeat: HeartbeatPayload
  ): Promise<boolean> {
    // Get metric history for consecutive checks
    const history = await this.db.getMetricHistory(
      health.workspace_id,
      10 // Last 10 minutes
    );

    // Check if all metrics are below recovery thresholds
    const memoryPercent = (heartbeat.memory_usage_mb / heartbeat.memory_total_mb) * 100;

    const consecutiveLowCpu = this.countConsecutiveLowMetric(
      history.snapshots,
      'cpu',
      this.thresholds.recovery_cpu_percent
    );

    const consecutiveLowMemory = this.countConsecutiveLowMetric(
      history.snapshots,
      'memory',
      this.thresholds.recovery_memory_percent
    );

    const consecutiveLowDisk = this.countConsecutiveLowMetric(
      history.snapshots,
      'disk',
      this.thresholds.recovery_disk_percent
    );

    return (
      heartbeat.cpu_usage_percent < this.thresholds.recovery_cpu_percent &&
      memoryPercent < this.thresholds.recovery_memory_percent &&
      heartbeat.disk_usage_percent < this.thresholds.recovery_disk_percent &&
      consecutiveLowCpu >= this.thresholds.recovery_consecutive &&
      consecutiveLowMemory >= this.thresholds.recovery_consecutive &&
      consecutiveLowDisk >= this.thresholds.recovery_consecutive
    );
  }

  private countConsecutiveHighMetric(
    snapshots: Array<{ timestamp: Date; cpu_usage_percent: number; memory_usage_percent: number; disk_usage_percent: number }>,
    metric: 'cpu' | 'memory' | 'disk',
    threshold: number
  ): number {
    let count = 0;
    const metricKey = metric === 'cpu' ? 'cpu_usage_percent' :
                      metric === 'memory' ? 'memory_usage_percent' :
                      'disk_usage_percent';

    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i][metricKey] > threshold) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  private countConsecutiveLowMetric(
    snapshots: Array<{ timestamp: Date; cpu_usage_percent: number; memory_usage_percent: number; disk_usage_percent: number }>,
    metric: 'cpu' | 'memory' | 'disk',
    threshold: number
  ): number {
    let count = 0;
    const metricKey = metric === 'cpu' ? 'cpu_usage_percent' :
                      metric === 'memory' ? 'memory_usage_percent' :
                      'disk_usage_percent';

    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i][metricKey] < threshold) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  private getTransitionReason(
    from: HealthState,
    to: HealthState,
    heartbeat: HeartbeatPayload
  ): string {
    if (to === 'ACTIVE_DEGRADED') {
      const reasons: string[] = [];
      if (heartbeat.cpu_usage_percent > this.thresholds.degraded_cpu_percent) {
        reasons.push(`CPU: ${heartbeat.cpu_usage_percent.toFixed(1)}%`);
      }
      const memoryPercent = (heartbeat.memory_usage_mb / heartbeat.memory_total_mb) * 100;
      if (memoryPercent > this.thresholds.degraded_memory_percent) {
        reasons.push(`Memory: ${memoryPercent.toFixed(1)}%`);
      }
      if (heartbeat.disk_usage_percent > this.thresholds.degraded_disk_percent) {
        reasons.push(`Disk: ${heartbeat.disk_usage_percent.toFixed(1)}%`);
      }
      return `High resource usage: ${reasons.join(', ')}`;
    }

    if (to === 'ACTIVE_HEALTHY' && from === 'ACTIVE_DEGRADED') {
      return 'Resource usage returned to normal levels';
    }

    if (to === 'ACTIVE_HEALTHY' && from === 'REBOOTING') {
      return 'Reboot completed successfully';
    }

    if (to === 'ACTIVE_HEALTHY' && from === 'WAKING') {
      return 'Wake completed successfully';
    }

    return `Transition from ${from} to ${to}`;
  }

  // ============================================
  // WATCHDOG SCAN
  // ============================================

  async scanForStaleHeartbeats(): Promise<WatchdogScanResult> {
    const startTime = Date.now();
    const scannedAt = new Date();
    const transitions: StateTransition[] = [];
    const errors: string[] = [];

    try {
      // Get all droplet health records
      const allHealth = await this.db.getAllDropletHealth();
      
      // Get stale heartbeats
      const staleHeartbeats = await this.db.getStaleHeartbeats(
        STALE_HEARTBEAT_THRESHOLD_SECONDS
      );

      // Increment missed heartbeat counters
      if (staleHeartbeats.length > 0) {
        const staleWorkspaceIds = staleHeartbeats.map(s => s.workspace_id);
        await this.db.incrementMissedHeartbeats(staleWorkspaceIds);
      }

      // Identify zombies (3+ consecutive misses)
      const zombies = staleHeartbeats.filter(
        s => s.consecutive_missed >= this.thresholds.zombie_missed_heartbeats &&
             s.current_state === 'ACTIVE_HEALTHY'
      );

      let zombiesRebooted = 0;

      // Transition zombies and trigger remediation
      for (const zombie of zombies) {
        try {
          // Verify droplet is still powered on via DO API
          const powerStatus = await this.remediation.getDropletPowerStatus(zombie.droplet_id);
          
          if (powerStatus === 'active') {
            // Transition to ZOMBIE state
            const transition = await this.transitionState(
              zombie.workspace_id,
              'ZOMBIE',
              `No heartbeat for ${zombie.consecutive_missed} intervals (${zombie.minutes_since_heartbeat} minutes)`
            );
            transitions.push(transition);

            // Trigger hard reboot
            await this.remediation.hardReboot(zombie.droplet_id);
            
            // Transition to REBOOTING state
            const rebootTransition = await this.transitionState(
              zombie.workspace_id,
              'REBOOTING',
              'Hard reboot initiated'
            );
            transitions.push(rebootTransition);
            
            zombiesRebooted++;
          }
        } catch (error) {
          errors.push(`Failed to remediate zombie ${zombie.workspace_id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Check for stuck REBOOTING states
      const rebootingTooLong = allHealth.filter(h => {
        if (h.state !== 'REBOOTING') return false;
        
        const minutesSinceStateChange = 
          (scannedAt.getTime() - h.last_state_change_at.getTime()) / 1000 / 60;
        
        return minutesSinceStateChange > this.thresholds.reboot_timeout_minutes;
      });

      // Transition stuck reboots to ORPHAN
      for (const stuck of rebootingTooLong) {
        try {
          const transition = await this.transitionState(
            stuck.workspace_id,
            'ORPHAN',
            `Reboot timeout: no recovery after ${this.thresholds.reboot_timeout_minutes} minutes`
          );
          transitions.push(transition);
        } catch (error) {
          errors.push(`Failed to mark stuck reboot as orphan ${stuck.workspace_id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Calculate stats
      const healthy = allHealth.filter(h => h.state === 'ACTIVE_HEALTHY').length;
      const degraded = allHealth.filter(h => h.state === 'ACTIVE_DEGRADED').length;

      return {
        scanned_at: scannedAt,
        total_droplets: allHealth.length,
        healthy,
        degraded,
        zombies_detected: zombies.length,
        zombies_rebooted: zombiesRebooted,
        transitions,
        errors,
        duration_ms: Math.max(1, Date.now() - startTime),
      };
    } catch (error) {
      throw new HeartbeatError(
        'Failed to scan for stale heartbeats',
        'SCAN_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // ============================================
  // STATE QUERIES
  // ============================================

  async getDropletHealth(workspaceId: string): Promise<DropletHealth | null> {
    return await this.db.getDropletHealth(workspaceId);
  }

  async getAllHealthy(): Promise<DropletHealth[]> {
    const all = await this.db.getAllDropletHealth();
    return all.filter(h => h.state === 'ACTIVE_HEALTHY');
  }

  async getAllDegraded(): Promise<DropletHealth[]> {
    const all = await this.db.getAllDropletHealth();
    return all.filter(h => h.state === 'ACTIVE_DEGRADED');
  }

  async getAllZombies(): Promise<DropletHealth[]> {
    const all = await this.db.getAllDropletHealth();
    return all.filter(h => h.state === 'ZOMBIE');
  }

  // ============================================
  // MANUAL OPERATIONS
  // ============================================

  async transitionState(
    workspaceId: string,
    toState: HealthState,
    reason: string
  ): Promise<StateTransition> {
    const health = await this.db.getDropletHealth(workspaceId);
    
    if (!health) {
      throw new HeartbeatError(
        `No health record found for workspace ${workspaceId}`,
        'HEALTH_NOT_FOUND',
        { workspaceId }
      );
    }

    const transition: StateTransition = {
      workspace_id: workspaceId,
      droplet_id: health.droplet_id,
      from_state: health.state,
      to_state: toState,
      reason,
      triggered_at: new Date(),
    };

    await this.db.updateDropletHealth({
      workspace_id: workspaceId,
      state: toState,
      last_state_change_at: transition.triggered_at,
    });

    await this.db.recordStateTransition(transition);

    return transition;
  }
}

// ============================================
// FACTORY
// ============================================

export function createHeartbeatService(
  db: HeartbeatDB,
  remediation: RemediationClient,
  thresholds?: HealthThresholds
): HeartbeatService {
  return new HeartbeatStateMachine(db, remediation, thresholds);
}

// ============================================
// ERRORS
// ============================================

export class HeartbeatError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'HeartbeatError';
  }
}
