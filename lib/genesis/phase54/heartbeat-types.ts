/**
 * PHASE 54: HEARTBEAT STATE MACHINE - TYPE DEFINITIONS
 * 
 * Defines health states, heartbeat payloads, and transition rules
 * for the V35 Fleet Operations system.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 54
 */

// ============================================
// HEALTH STATES
// ============================================

export type HealthState =
  | 'INITIALIZING'       // Droplet created, Cloud-Init running
  | 'HANDSHAKE_PENDING'  // n8n active, waiting for Registration Node
  | 'ACTIVE_HEALTHY'     // n8n running, all metrics normal
  | 'ACTIVE_DEGRADED'    // Running but high CPU/memory/disk (>80%)
  | 'DRIFT_DETECTED'     // Workflow version mismatch or credential error
  | 'HIBERNATING'        // Droplet powered down to save costs
  | 'WAKING'             // Powering on from hibernation
  | 'ZOMBIE'             // Droplet active but Sidecar/n8n unresponsive
  | 'REBOOTING'          // Hard reboot in progress
  | 'ORPHAN'             // Provisioning failed, awaiting cleanup
  | 'MAINTENANCE';       // Manual intervention in progress

export type N8nStatus =
  | 'running'
  | 'stopped'
  | 'crashed'
  | 'unknown';

// ============================================
// HEARTBEAT PAYLOAD
// ============================================

export interface HeartbeatPayload {
  workspace_id: string;
  droplet_id: string;
  timestamp: Date;
  state: HealthState;
  n8n_status: N8nStatus;
  n8n_pid: number | null;
  n8n_version: string;
  active_workflows: number;
  pending_executions: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  memory_total_mb: number;
  disk_usage_percent: number;
  last_execution_at: Date | null;
  uptime_seconds: number;
}

export interface HeartbeatRecord extends HeartbeatPayload {
  id: string;
  created_at: Date;
  consecutive_missed: number;
  last_heartbeat_at: Date;
}

// ============================================
// DROPLET HEALTH
// ============================================

export interface DropletHealth {
  workspace_id: string;
  droplet_id: string;
  state: HealthState;
  last_heartbeat_at: Date;
  consecutive_missed_heartbeats: number;
  last_state_change_at: Date;
  
  // Resource metrics (from last heartbeat)
  cpu_usage_percent: number;
  memory_usage_mb: number;
  memory_total_mb: number;
  disk_usage_percent: number;
  
  // n8n metrics
  n8n_status: N8nStatus;
  n8n_pid: number | null;
  n8n_version: string;
  active_workflows: number;
  pending_executions: number;
  last_execution_at: Date | null;
  uptime_seconds: number;
  
  // Tracking
  created_at: Date;
  updated_at: Date;
}

// ============================================
// STATE TRANSITIONS
// ============================================

export interface StateTransition {
  workspace_id: string;
  droplet_id: string;
  from_state: HealthState;
  to_state: HealthState;
  reason: string;
  triggered_at: Date;
  metadata?: Record<string, unknown>;
}

export interface StateTransitionRule {
  from_state: HealthState;
  to_state: HealthState;
  condition: (health: DropletHealth, history: HeartbeatRecord[]) => boolean;
  reason: string;
  action?: (health: DropletHealth) => Promise<void>;
}

// ============================================
// DETECTION THRESHOLDS
// ============================================

export interface HealthThresholds {
  // ZOMBIE detection
  zombie_missed_heartbeats: number;           // Default: 3
  zombie_check_interval_seconds: number;      // Default: 60
  
  // DEGRADED detection
  degraded_cpu_percent: number;               // Default: 80
  degraded_cpu_consecutive: number;           // Default: 5
  degraded_memory_percent: number;            // Default: 85
  degraded_memory_consecutive: number;        // Default: 5
  degraded_disk_percent: number;              // Default: 90
  degraded_disk_consecutive: number;          // Default: 3
  
  // RECOVERY detection
  recovery_cpu_percent: number;               // Default: 70
  recovery_memory_percent: number;            // Default: 75
  recovery_disk_percent: number;              // Default: 85
  recovery_consecutive: number;               // Default: 3
  
  // REBOOT timeout
  reboot_timeout_minutes: number;             // Default: 5
}

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  zombie_missed_heartbeats: 3,
  zombie_check_interval_seconds: 60,
  degraded_cpu_percent: 80,
  degraded_cpu_consecutive: 5,
  degraded_memory_percent: 85,
  degraded_memory_consecutive: 5,
  degraded_disk_percent: 90,
  degraded_disk_consecutive: 3,
  recovery_cpu_percent: 70,
  recovery_memory_percent: 75,
  recovery_disk_percent: 85,
  recovery_consecutive: 3,
  reboot_timeout_minutes: 5,
};

// ============================================
// METRIC HISTORY
// ============================================

export interface MetricSnapshot {
  timestamp: Date;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
}

export interface MetricHistory {
  workspace_id: string;
  droplet_id: string;
  snapshots: MetricSnapshot[];
  window_minutes: number;
}

// ============================================
// WATCHDOG RESULTS
// ============================================

export interface WatchdogScanResult {
  scanned_at: Date;
  total_droplets: number;
  healthy: number;
  degraded: number;
  zombies_detected: number;
  zombies_rebooted: number;
  transitions: StateTransition[];
  errors: string[];
  duration_ms: number;
}

export interface StaleHeartbeat {
  workspace_id: string;
  droplet_id: string;
  last_heartbeat_at: Date;
  consecutive_missed: number;
  current_state: HealthState;
  minutes_since_heartbeat: number;
}

// ============================================
// DATABASE INTERFACES
// ============================================

export interface HeartbeatDB {
  // Heartbeat storage
  storeHeartbeat(heartbeat: HeartbeatPayload): Promise<void>;
  getLatestHeartbeat(workspaceId: string): Promise<HeartbeatRecord | null>;
  
  // Droplet health
  getDropletHealth(workspaceId: string): Promise<DropletHealth | null>;
  updateDropletHealth(health: Partial<DropletHealth> & { workspace_id: string }): Promise<void>;
  getAllDropletHealth(): Promise<DropletHealth[]>;
  
  // Stale heartbeats
  getStaleHeartbeats(thresholdSeconds: number): Promise<StaleHeartbeat[]>;
  incrementMissedHeartbeats(workspaceIds: string[]): Promise<void>;
  resetMissedHeartbeats(workspaceIds: string[]): Promise<void>;
  
  // State transitions
  recordStateTransition(transition: StateTransition): Promise<void>;
  getStateHistory(workspaceId: string, limit?: number): Promise<StateTransition[]>;
  
  // Metric history
  getMetricHistory(workspaceId: string, windowMinutes: number): Promise<MetricHistory>;
}

export interface RemediationClient {
  // Reboot operations
  hardReboot(dropletId: string): Promise<void>;
  powerOn(dropletId: string): Promise<void>;
  powerOff(dropletId: string): Promise<void>;
  
  // Status checks
  getDropletPowerStatus(dropletId: string): Promise<'active' | 'off' | 'unknown'>;
}

// ============================================
// HEARTBEAT SERVICE
// ============================================

export interface HeartbeatService {
  // Process heartbeat
  processHeartbeat(heartbeat: HeartbeatPayload): Promise<{
    accepted: boolean;
    state_changed: boolean;
    new_state?: HealthState;
    transition?: StateTransition;
  }>;
  
  // Watchdog operations
  scanForStaleHeartbeats(): Promise<WatchdogScanResult>;
  
  // State queries
  getDropletHealth(workspaceId: string): Promise<DropletHealth | null>;
  getAllHealthy(): Promise<DropletHealth[]>;
  getAllDegraded(): Promise<DropletHealth[]>;
  getAllZombies(): Promise<DropletHealth[]>;
  
  // Manual operations
  transitionState(
    workspaceId: string,
    toState: HealthState,
    reason: string
  ): Promise<StateTransition>;
}

// ============================================
// CONSTANTS
// ============================================

export const STATE_DESCRIPTIONS: Record<HealthState, string> = {
  INITIALIZING: 'Droplet created, Cloud-Init running',
  HANDSHAKE_PENDING: 'n8n active, waiting for Registration Node',
  ACTIVE_HEALTHY: 'n8n process running, Sidecar responsive, all metrics normal',
  ACTIVE_DEGRADED: 'Running but high CPU/memory/disk (>80%)',
  DRIFT_DETECTED: 'Workflow version mismatch or credential error',
  HIBERNATING: 'Droplet powered down to save costs',
  WAKING: 'Powering on from hibernation',
  ZOMBIE: 'Droplet active but Sidecar/n8n unresponsive',
  REBOOTING: 'Hard reboot in progress',
  ORPHAN: 'Provisioning failed, awaiting cleanup',
  MAINTENANCE: 'Manual intervention in progress',
};

export const TERMINAL_STATES: HealthState[] = ['ORPHAN', 'MAINTENANCE'];

export const UNHEALTHY_STATES: HealthState[] = [
  'ACTIVE_DEGRADED',
  'DRIFT_DETECTED',
  'ZOMBIE',
  'REBOOTING',
  'ORPHAN',
];

export const REQUIRES_IMMEDIATE_ACTION: HealthState[] = [
  'ZOMBIE',
  'ORPHAN',
];

// Heartbeat interval in seconds
export const HEARTBEAT_INTERVAL_SECONDS = 60;

// How long to wait before considering a heartbeat stale
export const STALE_HEARTBEAT_THRESHOLD_SECONDS = 90;
