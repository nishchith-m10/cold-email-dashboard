/**
 * GENESIS PHASE 70: DISASTER RECOVERY & REGIONAL FAILOVER
 *
 * Type definitions for cross-region snapshots, mass restoration,
 * failover detection, and disaster recovery orchestration.
 */

// ============================================
// FAILURE MODES
// ============================================

export type FailureMode =
  | 'droplet_crash'
  | 'sidecar_death'
  | 'n8n_crash'
  | 'region_degraded'
  | 'region_failure'
  | 'supabase_outage'
  | 'redis_outage'
  | 'dashboard_outage';

export interface FailureModeDefinition {
  mode: FailureMode;
  impact: string;
  rtoMinutes: number; // Recovery Time Objective
  rpoMinutes: number; // Recovery Point Objective
  autoFailover: boolean;
}

export const FAILURE_MODE_CATALOG: FailureModeDefinition[] = [
  { mode: 'droplet_crash', impact: '1 tenant offline', rtoMinutes: 5, rpoMinutes: 0, autoFailover: true },
  { mode: 'sidecar_death', impact: 'Workflows paused', rtoMinutes: 2, rpoMinutes: 0, autoFailover: true },
  { mode: 'n8n_crash', impact: 'Workflows paused', rtoMinutes: 2, rpoMinutes: 0, autoFailover: true },
  { mode: 'region_degraded', impact: '20-30% tenants affected', rtoMinutes: 60, rpoMinutes: 60, autoFailover: false },
  { mode: 'region_failure', impact: '20-30% tenants offline', rtoMinutes: 240, rpoMinutes: 60, autoFailover: true },
  { mode: 'supabase_outage', impact: 'All reads/writes fail', rtoMinutes: 120, rpoMinutes: 0, autoFailover: false },
  { mode: 'redis_outage', impact: 'BullMQ jobs paused', rtoMinutes: 15, rpoMinutes: 0, autoFailover: false },
  { mode: 'dashboard_outage', impact: 'No provisioning', rtoMinutes: 15, rpoMinutes: 0, autoFailover: false },
];

// ============================================
// REGIONS & MAPPING
// ============================================

export type DORegion =
  | 'nyc1' // US-East
  | 'sfo1' // US-West
  | 'fra1' // EU-West (Frankfurt)
  | 'lon1' // UK (London)
  | 'sgp1'; // APAC (Singapore)

export interface RegionMapping {
  primary: DORegion;
  backup: DORegion;
  rationale: string;
}

export const CROSS_REGION_MAPPINGS: RegionMapping[] = [
  { primary: 'nyc1', backup: 'sfo1', rationale: 'Same country, different coast' },
  { primary: 'sfo1', backup: 'nyc1', rationale: 'Same country, different coast' },
  { primary: 'fra1', backup: 'lon1', rationale: 'GDPR-compliant backup' },
  { primary: 'lon1', backup: 'fra1', rationale: 'GDPR-compliant backup' },
  { primary: 'sgp1', backup: 'sfo1', rationale: 'Closest alternative' },
];

export function getBackupRegion(primary: DORegion): DORegion {
  const mapping = CROSS_REGION_MAPPINGS.find(m => m.primary === primary);
  if (!mapping) throw new Error(`No backup region for ${primary}`);
  return mapping.backup;
}

// ============================================
// SNAPSHOTS
// ============================================

export type SnapshotType = 'daily' | 'weekly' | 'cross_region' | 'pre_update';

export type SnapshotStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'transferring'
  | 'failed'
  | 'expired';

export interface SnapshotConfig {
  type: SnapshotType;
  frequency: string; // e.g., "24 hours"
  retentionDays: number;
  crossRegion: boolean;
}

export const SNAPSHOT_CONFIGS: Record<SnapshotType, SnapshotConfig> = {
  daily: { type: 'daily', frequency: '24 hours', retentionDays: 7, crossRegion: false },
  weekly: { type: 'weekly', frequency: '7 days', retentionDays: 30, crossRegion: false },
  cross_region: { type: 'cross_region', frequency: '24 hours', retentionDays: 7, crossRegion: true },
  pre_update: { type: 'pre_update', frequency: 'on-demand', retentionDays: 2, crossRegion: false },
};

export interface Snapshot {
  id: string; // DO snapshot ID
  workspaceId: string;
  dropletId: string;
  type: SnapshotType;
  region: DORegion;
  status: SnapshotStatus;
  sizeGb: number;
  createdAt: string;
  transferredTo?: DORegion;
  expiresAt: string;
}

export interface SnapshotRecord {
  snapshotId: string;
  workspaceId: string;
  dropletId: string;
  type: SnapshotType;
  region: DORegion;
  sizeGb: number;
  createdAt: string;
  transferredAt?: string;
  deletedAt?: string;
  costRecovered?: number;
}

// ============================================
// RESTORATION
// ============================================

export type RestorationPhase =
  | 'assessment'
  | 'provisioning'
  | 'verification'
  | 'cleanup'
  | 'complete'
  | 'failed';

export type RestorationPriority = 'critical' | 'paying' | 'free' | 'trial';

export interface RestorationTask {
  taskId: string;
  workspaceId: string;
  dropletId: string; // Old droplet
  snapshotId: string;
  sourceRegion: DORegion;
  targetRegion: DORegion;
  priority: RestorationPriority;
  status: RestorationPhase;
  newDropletId?: string;
  newIpAddress?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface RestorationPlan {
  planId: string;
  trigger: string; // Reason for restoration
  sourceRegion: DORegion;
  targetRegion: DORegion;
  affectedTenants: string[]; // workspace_ids
  totalTasks: number;
  startedAt: string;
  estimatedCompletionAt: string;
  concurrency: number;
}

export interface RestorationProgress {
  planId: string;
  phase: RestorationPhase;
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
  tasksInProgress: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface RestorationResult {
  planId: string;
  success: boolean;
  tenantsRestored: number;
  tenantsFailed: number;
  totalDurationMs: number;
  rto: number; // Actual RTO achieved in minutes
  rpo: number; // Actual RPO in minutes
  tasks: RestorationTask[];
}

// ============================================
// FAILOVER DETECTION
// ============================================

export type FailoverTriggerType =
  | 'do_status_page'
  | 'heartbeat_threshold'
  | 'manual_declaration'
  | 'automated_monitoring';

export interface FailoverTrigger {
  type: FailoverTriggerType;
  region: DORegion;
  threshold?: number; // e.g., 50 for 50% heartbeats missing
  autoInitiate: boolean;
}

export const DEFAULT_FAILOVER_TRIGGERS: FailoverTrigger[] = [
  { type: 'do_status_page', region: 'nyc1', autoInitiate: false },
  { type: 'heartbeat_threshold', region: 'nyc1', threshold: 50, autoInitiate: true },
  { type: 'manual_declaration', region: 'nyc1', autoInitiate: false },
];

export interface HeartbeatStatus {
  region: DORegion;
  totalDroplets: number;
  healthyDroplets: number;
  missingHeartbeats: number;
  healthPercentage: number;
  timestamp: string;
}

export interface FailoverEvent {
  eventId: string;
  trigger: FailoverTriggerType;
  sourceRegion: DORegion;
  targetRegion: DORegion;
  affectedTenants: number;
  timestamp: string;
  autoInitiated: boolean;
  restorationPlanId?: string;
}

// ============================================
// GARBAGE COLLECTION
// ============================================

export type GarbageCategory = 'immediate' | 'grace_period' | 'retention_expiry';

export interface GarbageCollectionConfig {
  maxConcurrent: number;
  retryAttempts: number;
  gracePeriodDays: number;
}

export const GARBAGE_COLLECTION_DEFAULTS: GarbageCollectionConfig = {
  maxConcurrent: 50,
  retryAttempts: 3,
  gracePeriodDays: 7,
};

export interface OrphanedSnapshot {
  snapshotId: string;
  workspaceId?: string;
  region: DORegion;
  sizeGb: number;
  createdAt: string;
  reason: string; // Why orphaned
  category: GarbageCategory;
  deleteAfter?: string; // Grace period expiry
}

export interface GarbageCollectionResult {
  snapshotsDeleted: number;
  sizeRecoveredGb: number;
  costRecoveredMonthly: number;
  errors: Array<{ snapshotId: string; error: string }>;
}

// ============================================
// DISASTER RECOVERY ENVIRONMENT INTERFACE
// ============================================

export interface DisasterRecoveryEnvironment {
  // Droplet operations
  getDropletStatus(dropletId: string): Promise<{ status: string; region: DORegion }>;
  listDropletsByRegion(region: DORegion): Promise<string[]>; // droplet IDs

  // Snapshot operations
  createSnapshot(dropletId: string, name: string, type: SnapshotType): Promise<Snapshot>;
  transferSnapshot(snapshotId: string, targetRegion: DORegion): Promise<{ success: boolean }>;
  deleteSnapshot(snapshotId: string): Promise<{ success: boolean }>;
  listSnapshots(region?: DORegion): Promise<Snapshot[]>;

  // Restoration operations
  createDropletFromSnapshot(
    snapshotId: string,
    region: DORegion,
    name: string,
  ): Promise<{ dropletId: string; ipAddress: string }>;

  // Heartbeat monitoring
  getHeartbeatStatus(region: DORegion): Promise<HeartbeatStatus>;

  // Events
  logEvent(event: Omit<FailoverEvent, 'eventId' | 'timestamp'>): Promise<void>;
  getEvents(region?: DORegion): Promise<FailoverEvent[]>;
}

// ============================================
// CONSTANTS
// ============================================

export const DR_DEFAULTS = {
  MAX_CONCURRENT_SNAPSHOTS: 100, // DO rate limit
  MAX_CONCURRENT_TRANSFERS: 50, // Cross-region bandwidth
  MAX_CONCURRENT_RESTORATIONS: 100, // Provisioning limit
  SNAPSHOT_BATCH_WINDOW_HOURS: 6,
  HEARTBEAT_CHECK_INTERVAL_MS: 30_000, // 30 seconds
  HEARTBEAT_MISSING_THRESHOLD: 50, // 50% missing = trigger
  SNAPSHOT_COST_PER_GB_MONTHLY: 0.05,
  GRACE_PERIOD_DAYS: 7,
} as const;

export function calculateSnapshotCost(sizeGb: number): number {
  return sizeGb * DR_DEFAULTS.SNAPSHOT_COST_PER_GB_MONTHLY;
}

export function isSnapshotExpired(snapshot: Snapshot): boolean {
  return new Date(snapshot.expiresAt) < new Date();
}

export function generateSnapshotName(workspaceId: string, type: SnapshotType): string {
  const date = new Date().toISOString().split('T')[0];
  return `${type}_${date}_${workspaceId}`;
}

export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function generatePlanId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
