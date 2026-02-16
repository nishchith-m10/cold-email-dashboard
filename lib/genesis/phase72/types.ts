/**
 * PHASE 72: ZERO-DOWNTIME FLEET UPDATE PROTOCOL — TYPE DEFINITIONS
 *
 * Defines all types for fleet-wide update orchestration:
 *   - Version registry (tenant_versions, workflow_templates, update_history)
 *   - Rollout engine (canary → staged → 100%)
 *   - Template management
 *   - Emergency rollback
 *   - Sidecar update protocol (blue-green swap)
 *   - Supabase-backed job queue (replaces BullMQ)
 *   - Update monitoring
 *
 * Extends Phase 56 template reconciliation types where applicable.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68
 * @see lib/genesis/phase56/template-types.ts
 */

import type {
  UpdateRiskLevel,
  UpdateStrategy,
  RolloutStatus,
  BlueGreenConfig,
  BlueGreenStep,
} from '../phase56/template-types';

// Re-export Phase 56 types used across Phase 72
export type { UpdateRiskLevel, UpdateStrategy, RolloutStatus, BlueGreenConfig, BlueGreenStep };

// ============================================
// UPDATE COMPONENTS (spec 68.2)
// ============================================

/**
 * Component types that can be updated across the fleet.
 * Maps to the columns on genesis.tenant_versions.
 */
export type FleetComponent =
  | 'dashboard'
  | 'workflow_email_1'
  | 'workflow_email_2'
  | 'workflow_email_3'
  | 'workflow_email_1_smtp'
  | 'workflow_email_2_smtp'
  | 'workflow_email_3_smtp'
  | 'workflow_email_preparation'
  | 'workflow_reply_tracker'
  | 'workflow_research'
  | 'workflow_opt_out'
  | 'sidecar';

/**
 * Risk profile for each component type (spec 68.2 table).
 */
export interface ComponentRiskProfile {
  component: FleetComponent;
  update_mechanism: string;
  risk_level: UpdateRiskLevel;
  rollback_time_estimate: string;
  default_strategy: RolloutStrategy;
}

/** Rollout strategy for the rollout engine (spec 68.4) */
export type RolloutStrategy = 'canary' | 'staged' | 'immediate';

// ============================================
// VERSION REGISTRY — DB ROW TYPES (spec 68.3)
// ============================================

/**
 * Row in genesis.tenant_versions.
 * Tracks what version each tenant is currently running.
 */
export interface TenantVersionRecord {
  workspace_id: string;
  dashboard_version: string;
  workflow_email_1: string;
  workflow_email_2: string;
  workflow_email_3: string;
  workflow_email_1_smtp: string;
  workflow_email_2_smtp: string;
  workflow_email_3_smtp: string;
  workflow_email_preparation: string;
  workflow_reply_tracker: string;
  workflow_research: string;
  workflow_opt_out: string;
  sidecar_version: string;
  last_update_at: string | null;
  update_status: TenantUpdateStatus;
  created_at: string;
  updated_at: string;
}

export type TenantUpdateStatus = 'current' | 'updating' | 'failed' | 'rollback';

/**
 * Row in genesis.workflow_templates.
 * Golden template repository with versioned JSON storage.
 */
export interface WorkflowTemplateRecord {
  id: string;
  workflow_name: string;
  version: string;
  workflow_json: Record<string, unknown>;
  changelog: string | null;
  is_current: boolean;
  is_canary: boolean;
  created_at: string;
  created_by: string | null;
}

/**
 * Row in genesis.update_history.
 * Audit trail for all updates.
 */
export interface UpdateHistoryRecord {
  id: string;
  workspace_id: string | null;
  component: string;
  from_version: string;
  to_version: string;
  status: UpdateHistoryStatus;
  error_message: string | null;
  executed_at: string;
  executed_by: string | null;
  rollout_strategy: RolloutStrategy;
  affected_tenants: number;
  rollout_id: string | null;
  wave_number: number | null;
  metadata: Record<string, unknown>;
}

export type UpdateHistoryStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'rolled_back';

/**
 * Row in genesis.fleet_rollouts.
 * Tracks active and historical rollout sessions.
 */
export interface FleetRolloutRecord {
  id: string;
  component: string;
  from_version: string;
  to_version: string;
  strategy: RolloutStrategy;
  status: FleetRolloutStatus;
  total_tenants: number;
  updated_tenants: number;
  failed_tenants: number;
  error_threshold: number;
  canary_percentage: number;
  initiated_by: string;
  started_at: string;
  completed_at: string | null;
  paused_at: string | null;
  abort_reason: string | null;
  metadata: Record<string, unknown>;
}

export type FleetRolloutStatus =
  | 'pending'
  | 'canary'
  | 'wave_1'
  | 'wave_2'
  | 'wave_3'
  | 'wave_4'
  | 'completed'
  | 'paused'
  | 'aborted'
  | 'rolled_back';

/**
 * Row in genesis.fleet_update_queue.
 * Supabase-backed job queue for update commands.
 */
export interface FleetUpdateQueueRecord {
  id: string;
  rollout_id: string;
  workspace_id: string;
  component: string;
  from_version: string;
  to_version: string;
  priority: number;
  status: QueueJobStatus;
  attempt_count: number;
  max_attempts: number;
  error_message: string | null;
  wave_number: number;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export type QueueJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rolled_back';

// ============================================
// ROLLOUT ENGINE (spec 68.4)
// ============================================

/**
 * Rollout wave configuration.
 * Canary → Wave 1 (10%) → Wave 2 (25%) → Wave 3 (50%) → Wave 4 (100%)
 */
export interface RolloutWaveConfig {
  wave_name: string;
  percentage: number;
  monitor_duration_minutes: number;
  error_threshold_percent: number;
}

/**
 * Default wave configuration per spec 68.4.
 */
export const DEFAULT_ROLLOUT_WAVES: RolloutWaveConfig[] = [
  {
    wave_name: 'canary',
    percentage: 1,
    monitor_duration_minutes: 60,
    error_threshold_percent: 0.1,
  },
  {
    wave_name: 'wave_1',
    percentage: 10,
    monitor_duration_minutes: 30,
    error_threshold_percent: 0.5,
  },
  {
    wave_name: 'wave_2',
    percentage: 25,
    monitor_duration_minutes: 30,
    error_threshold_percent: 0.5,
  },
  {
    wave_name: 'wave_3',
    percentage: 50,
    monitor_duration_minutes: 30,
    error_threshold_percent: 0.5,
  },
  {
    wave_name: 'wave_4',
    percentage: 100,
    monitor_duration_minutes: 0,
    error_threshold_percent: 0.5,
  },
];

/**
 * Input for initiating a new rollout.
 */
export interface InitiateRolloutInput {
  component: FleetComponent;
  from_version: string;
  to_version: string;
  strategy: RolloutStrategy;
  initiated_by: string;
  error_threshold?: number;
  canary_percentage?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Summary of a rollout wave's progress.
 */
export interface WaveProgressSummary {
  wave_name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  error_rate: number;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Full rollout progress snapshot for monitoring.
 */
export interface RolloutProgressSnapshot {
  rollout: FleetRolloutRecord;
  waves: WaveProgressSummary[];
  current_wave: string | null;
  overall_progress_percent: number;
  overall_error_rate: number;
  estimated_completion: string | null;
}

// ============================================
// TEMPLATE MANAGEMENT (spec 68.5)
// ============================================

/**
 * Input for publishing a new workflow template version.
 */
export interface PublishTemplateInput {
  workflow_name: string;
  version: string;
  workflow_json: Record<string, unknown>;
  changelog: string;
  created_by: string;
  is_canary?: boolean;
}

/**
 * Input for promoting a template version to current.
 */
export interface PromoteTemplateInput {
  workflow_name: string;
  version: string;
  promoted_by: string;
}

// ============================================
// EMERGENCY ROLLBACK (spec 68.6)
// ============================================

export type RollbackScope = 'all_tenants' | 'affected_only' | 'specific_tenant';

/**
 * Input for executing an emergency rollback.
 */
export interface EmergencyRollbackInput {
  component: FleetComponent;
  rollback_to_version: string;
  scope: RollbackScope;
  specific_workspace_id?: string;
  initiated_by: string;
  reason: string;
}

/**
 * Result of an emergency rollback operation.
 */
export interface EmergencyRollbackResult {
  rollout_id: string;
  component: string;
  from_version: string;
  rollback_to_version: string;
  scope: RollbackScope;
  total_affected: number;
  rolled_back: number;
  failed: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

// ============================================
// SIDECAR UPDATE PROTOCOL (spec 68.7)
// ============================================

export type SidecarUpdateStep =
  | 'preparing'
  | 'pulling_image'
  | 'completing_operations'
  | 'saving_checkpoint'
  | 'ready_for_swap'
  | 'swapping'
  | 'health_checking'
  | 'completed'
  | 'failed'
  | 'rolled_back';

/**
 * Tracks the state of a blue-green sidecar container swap.
 */
export interface SidecarUpdateState {
  workspace_id: string;
  from_version: string;
  to_version: string;
  step: SidecarUpdateStep;
  started_at: string;
  image_pulled_at: string | null;
  operations_completed_at: string | null;
  checkpoint_saved_at: string | null;
  swap_started_at: string | null;
  swap_completed_at: string | null;
  health_check_passed_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  downtime_seconds: number | null;
}

/**
 * Configuration for sidecar update behavior.
 */
export interface SidecarUpdateConfig {
  health_check_timeout_seconds: number;
  max_operation_completion_wait_seconds: number;
  auto_rollback_on_health_failure: boolean;
}

export const DEFAULT_SIDECAR_UPDATE_CONFIG: SidecarUpdateConfig = {
  health_check_timeout_seconds: 60,
  max_operation_completion_wait_seconds: 300,
  auto_rollback_on_health_failure: true,
};

// ============================================
// UPDATE MONITORING (spec 68.9)
// ============================================

/**
 * Health metrics for an active rollout — displayed in the monitoring dashboard.
 */
export interface RolloutHealthMetrics {
  error_rate: number;
  execution_success_rate: number;
  avg_update_time_seconds: number;
  failed_updates: number;
  retried_updates: number;
  stuck_updates: number;
  is_healthy: boolean;
}

/**
 * Fleet version summary — how many tenants are on each version.
 */
export interface FleetVersionSummary {
  component: FleetComponent;
  total_tenants: number;
  by_version: Record<string, number>;
  needs_update: number;
  currently_updating: number;
  failed: number;
}

/**
 * Active rollout status for the monitoring dashboard.
 */
export interface ActiveRolloutStatus {
  rollout: FleetRolloutRecord;
  progress: RolloutProgressSnapshot;
  health: RolloutHealthMetrics;
}

// ============================================
// VERSION COMPATIBILITY (spec 68.10)
// ============================================

/**
 * A compatibility rule between component versions.
 */
export interface VersionCompatibilityRule {
  dashboard_range: string;
  sidecar_range: string;
  workflow_range: string;
  status: 'stable' | 'current' | 'future' | 'deprecated';
}

/**
 * Default compatibility matrix per spec 68.10.
 */
export const VERSION_COMPATIBILITY_MATRIX: VersionCompatibilityRule[] = [
  {
    dashboard_range: '2.0.x',
    sidecar_range: '1.0.x - 1.2.x',
    workflow_range: '1.0.x - 1.1.x',
    status: 'stable',
  },
  {
    dashboard_range: '2.1.x',
    sidecar_range: '1.2.x - 1.3.x',
    workflow_range: '1.0.x - 1.2.x',
    status: 'current',
  },
  {
    dashboard_range: '2.2.x',
    sidecar_range: '1.3.x+',
    workflow_range: '1.2.x+',
    status: 'future',
  },
];

// ============================================
// DATABASE MIGRATION RULES (spec 68.8)
// ============================================

export type MigrationAction =
  | 'add_column'
  | 'add_table'
  | 'add_index'
  | 'add_constraint'
  | 'drop_column'
  | 'rename_column'
  | 'change_type'
  | 'drop_table'
  | 'remove_constraint';

/**
 * Which migration actions are allowed during a staged rollout.
 */
export const ALLOWED_MIGRATION_ACTIONS: MigrationAction[] = [
  'add_column',
  'add_table',
  'add_index',
  'add_constraint',
];

export const FORBIDDEN_MIGRATION_ACTIONS: MigrationAction[] = [
  'drop_column',
  'rename_column',
  'change_type',
  'drop_table',
  'remove_constraint',
];

// ============================================
// CONSTANTS (from spec)
// ============================================

/** Default canary size: 1% (~150 tenants at 15,000 scale) */
export const CANARY_PERCENTAGE = 0.01;

/** Canary monitoring period in minutes */
export const CANARY_MONITOR_MINUTES = 60;

/** Canary auto-rollback threshold */
export const CANARY_ERROR_THRESHOLD = 0.001;

/** Staged rollout error halt threshold */
export const STAGED_ERROR_THRESHOLD = 0.005;

/** Staged rollout wave monitoring period in minutes */
export const WAVE_MONITOR_MINUTES = 30;

/** Sidecar per-droplet downtime target in seconds */
export const SIDECAR_TARGET_DOWNTIME_SECONDS = 5;

/** Max queue job retry attempts */
export const MAX_QUEUE_ATTEMPTS = 3;

/** Priority level for emergency rollback jobs */
export const EMERGENCY_PRIORITY = 1000;

/** Priority for normal update jobs */
export const NORMAL_PRIORITY = 0;
