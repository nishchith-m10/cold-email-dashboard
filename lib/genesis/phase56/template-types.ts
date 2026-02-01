/**
 * PHASE 56: FLEET-WIDE TEMPLATE RECONCILIATION - TYPE DEFINITIONS
 * 
 * Defines template update strategies, batched rollout protocols, and blue-green deployments
 * for safely pushing updates to 15,000+ sovereign droplets.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 56
 */

// ============================================
// UPDATE SCENARIOS
// ============================================

export type UpdateRiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type UpdateStrategy = 
  | 'immediate'        // Critical: Push to all, accept failures
  | 'batched'          // High/Medium: Batched with pause on failures
  | 'canary'           // Medium: Canary rollout, gradual expansion
  | 'gradual';         // Low: Batched, no pause

export interface UpdateScenario {
  risk_level: UpdateRiskLevel;
  strategy: UpdateStrategy;
  description: string;
}

export const UPDATE_SCENARIOS: Record<string, UpdateScenario> = {
  security_patch: {
    risk_level: 'critical',
    strategy: 'immediate',
    description: 'Critical security patch',
  },
  bug_fix: {
    risk_level: 'high',
    strategy: 'batched',
    description: 'Bug fix',
  },
  new_feature: {
    risk_level: 'medium',
    strategy: 'canary',
    description: 'New feature',
  },
  config_change: {
    risk_level: 'low',
    strategy: 'gradual',
    description: 'Configuration change',
  },
};

// ============================================
// TEMPLATE VERSION
// ============================================

export interface TemplateVersion {
  version: string;
  n8n_version?: string;
  sidecar_version?: string;
  workflows: Record<string, string>;  // workflow_name -> workflow_version
  configuration: Record<string, unknown>;
  created_at: Date;
  release_notes: string;
}

export interface WorkspaceTemplateStatus {
  workspace_id: string;
  droplet_id: string;
  current_version: string | null;
  target_version: string;
  needs_update: boolean;
  last_updated_at: Date | null;
}

// ============================================
// BLUE-GREEN DEPLOYMENT
// ============================================

export type BlueGreenStep =
  | 'pull_image'
  | 'wait_quiet_period'
  | 'swap_containers'
  | 'health_check'
  | 'cleanup'
  | 'rollback';

export interface BlueGreenUpdate {
  workspace_id: string;
  droplet_id: string;
  from_version: string;
  to_version: string;
  step: BlueGreenStep;
  started_at: Date;
  pull_completed_at: Date | null;
  quiet_period_achieved_at: Date | null;
  swap_completed_at: Date | null;
  health_check_passed_at: Date | null;
  completed_at: Date | null;
  downtime_seconds: number | null;
  rollback_reason?: string;
  error?: string;
}

export interface BlueGreenConfig {
  quiet_period_timeout_seconds: number;  // Default: 300 (5 minutes)
  health_check_timeout_seconds: number;  // Default: 60
  force_swap_after_timeout: boolean;     // Default: true
}

export const DEFAULT_BLUE_GREEN_CONFIG: BlueGreenConfig = {
  quiet_period_timeout_seconds: 300,
  health_check_timeout_seconds: 60,
  force_swap_after_timeout: true,
};

// ============================================
// BATCHED ROLLOUT
// ============================================

export type RolloutStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'aborted'
  | 'failed';

export interface BatchedRolloutConfig {
  batch_size: number;                    // Default: 100
  pause_between_batches_seconds: number; // Default: 30
  failure_threshold_percent: number;     // Default: 5
  max_failures_before_abort_percent: number; // Default: 10
  verification_timeout_seconds: number;  // Default: 120
}

export const DEFAULT_BATCHED_ROLLOUT_CONFIG: BatchedRolloutConfig = {
  batch_size: 100,
  pause_between_batches_seconds: 30,
  failure_threshold_percent: 5,
  max_failures_before_abort_percent: 10,
  verification_timeout_seconds: 120,
};

export interface RolloutBatch {
  batch_number: number;
  workspace_ids: string[];
  started_at: Date | null;
  completed_at: Date | null;
  success_count: number;
  failure_count: number;
  failure_rate: number;  // 0-1
}

export interface RolloutProgress {
  rollout_id: string;
  template_version: string;
  status: RolloutStatus;
  config: BatchedRolloutConfig;
  total_workspaces: number;
  batches: RolloutBatch[];
  current_batch: number;
  total_success: number;
  total_failures: number;
  overall_failure_rate: number;
  started_at: Date;
  paused_at: Date | null;
  completed_at: Date | null;
  aborted_at: Date | null;
  abort_reason?: string;
}

export interface RolloutResult {
  rollout_id: string;
  status: RolloutStatus;
  total_attempted: number;
  total_success: number;
  total_failures: number;
  failure_rate: number;
  duration_seconds: number;
  aborted: boolean;
  abort_reason?: string;
}

// ============================================
// CANARY ROLLOUT
// ============================================

export interface CanaryRolloutConfig {
  canary_size: number;                   // Number of workspaces in canary
  canary_duration_minutes: number;       // Observation period
  success_threshold_percent: number;     // Min success rate to proceed
  gradual_expansion_factor: number;      // Multiply batch size each wave
}

export const DEFAULT_CANARY_CONFIG: CanaryRolloutConfig = {
  canary_size: 10,
  canary_duration_minutes: 60,
  success_threshold_percent: 95,
  gradual_expansion_factor: 2,
};

export interface CanaryWave {
  wave_number: number;
  workspace_count: number;
  workspace_ids: string[];
  started_at: Date | null;
  completed_at: Date | null;
  success_count: number;
  failure_count: number;
  success_rate: number;
}

export interface CanaryRollout {
  rollout_id: string;
  template_version: string;
  config: CanaryRolloutConfig;
  waves: CanaryWave[];
  current_wave: number;
  status: RolloutStatus;
  canary_success_rate: number | null;
  proceed_to_full_rollout: boolean;
}

// ============================================
// UPDATE EXECUTION
// ============================================

export interface UpdateRequest {
  workspace_id: string;
  droplet_id: string;
  from_version: string;
  to_version: string;
  update_type: 'n8n' | 'sidecar' | 'workflow' | 'config';
  priority: 'critical' | 'high' | 'normal';
}

export interface UpdateResult {
  workspace_id: string;
  success: boolean;
  from_version: string;
  to_version: string;
  started_at: Date;
  completed_at: Date;
  duration_seconds: number;
  verification_passed: boolean;
  error?: string;
  rollback_performed: boolean;
}

// ============================================
// VERSION VERIFICATION
// ============================================

export interface VersionReport {
  workspace_id: string;
  droplet_id: string;
  n8n_version: string;
  sidecar_version: string;
  workflow_versions: Record<string, string>;
  reported_at: Date;
}

export interface VersionMismatch {
  workspace_id: string;
  expected_version: string;
  actual_version: string;
  component: 'n8n' | 'sidecar' | 'workflow';
  detected_at: Date;
}

// ============================================
// DATABASE INTERFACES
// ============================================

export interface TemplateDB {
  // Template versions
  getLatestTemplateVersion(): Promise<TemplateVersion | null>;
  getTemplateVersion(version: string): Promise<TemplateVersion | null>;
  createTemplateVersion(template: TemplateVersion): Promise<void>;
  
  // Workspace status
  getWorkspaceTemplateStatus(workspaceId: string): Promise<WorkspaceTemplateStatus | null>;
  updateWorkspaceTemplateVersion(workspaceId: string, version: string): Promise<void>;
  findWorkspacesNeedingUpdate(targetVersion: string): Promise<WorkspaceTemplateStatus[]>;
  
  // Rollout tracking
  createRollout(progress: RolloutProgress): Promise<void>;
  updateRollout(rolloutId: string, updates: Partial<RolloutProgress>): Promise<void>;
  getRollout(rolloutId: string): Promise<RolloutProgress | null>;
  
  // Version reports
  recordVersionReport(report: VersionReport): Promise<void>;
  findVersionMismatches(expectedVersion: string): Promise<VersionMismatch[]>;
  
  // Update results
  recordUpdateResult(result: UpdateResult): Promise<void>;
  getUpdateResults(rolloutId: string): Promise<UpdateResult[]>;
}

export interface UpdateClient {
  // Trigger updates
  triggerUpdate(request: UpdateRequest): Promise<UpdateResult>;
  
  // Blue-green operations
  pullImage(dropletId: string, image: string): Promise<void>;
  swapContainers(dropletId: string, newVersion: string): Promise<void>;
  rollbackContainer(dropletId: string, oldVersion: string): Promise<void>;
  
  // Health checks
  checkHealth(dropletId: string): Promise<boolean>;
  waitForQuietPeriod(dropletId: string, timeoutSeconds: number): Promise<boolean>;
  
  // Verification
  verifyVersion(dropletId: string, expectedVersion: string): Promise<boolean>;
}

// ============================================
// TEMPLATE SERVICE
// ============================================

export interface TemplateReconciliationService {
  // Version management
  detectVersionMismatches(): Promise<VersionMismatch[]>;
  
  // Update execution
  executeBlueGreenUpdate(
    workspaceId: string,
    dropletId: string,
    targetVersion: string,
    config?: BlueGreenConfig
  ): Promise<BlueGreenUpdate>;
  
  // Rollout strategies
  startBatchedRollout(
    targetVersion: string,
    workspaceIds: string[],
    config?: BatchedRolloutConfig
  ): Promise<RolloutProgress>;
  
  startCanaryRollout(
    targetVersion: string,
    config?: CanaryRolloutConfig
  ): Promise<CanaryRollout>;
  
  // Rollout control
  pauseRollout(rolloutId: string): Promise<void>;
  resumeRollout(rolloutId: string): Promise<void>;
  abortRollout(rolloutId: string, reason: string): Promise<void>;
  
  // Status queries
  getRolloutStatus(rolloutId: string): Promise<RolloutProgress | null>;
  getFleetVersionSummary(): Promise<{
    total_workspaces: number;
    by_version: Record<string, number>;
    needs_update: number;
  }>;
}

// ============================================
// CONSTANTS
// ============================================

// Timeouts
export const QUIET_PERIOD_TIMEOUT_SECONDS = 300;  // 5 minutes
export const HEALTH_CHECK_TIMEOUT_SECONDS = 60;
export const VERIFICATION_TIMEOUT_SECONDS = 120;

// Batch defaults
export const DEFAULT_BATCH_SIZE = 100;
export const PAUSE_BETWEEN_BATCHES_SECONDS = 30;

// Failure thresholds
export const FAILURE_THRESHOLD_PERCENT = 5;
export const MAX_FAILURES_BEFORE_ABORT_PERCENT = 10;

// Downtime target
export const TARGET_DOWNTIME_SECONDS = 5;
