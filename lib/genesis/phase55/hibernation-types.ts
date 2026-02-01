/**
 * PHASE 55: HIBERNATION & WAKE PHYSICS - TYPE DEFINITIONS
 * 
 * Defines hibernation eligibility, power state management, and wake protocols
 * for the V35 Fleet Operations cost optimization system.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 55
 */

// ============================================
// TENANT TIERS
// ============================================

export type TenantTier = 'enterprise' | 'high-priority' | 'standard';

export type PreWarmingStrategy = 
  | 'never-hibernate'      // Enterprise: Always warm
  | 'predictive'           // High-priority: Pre-warm before predicted activity
  | 'hot-standby'          // High-priority: Use warm pool
  | 'standard-wake';       // Standard: Wake on demand

// ============================================
// HIBERNATION ELIGIBILITY
// ============================================

export interface HibernationCriteria {
  no_active_campaigns_days: number;        // Default: 7
  no_workflow_executions_days: number;     // Default: 7
  no_dashboard_logins_days: number;        // Default: 14
  account_status: 'active' | 'suspended';  // Must be active
  manual_hold: boolean;                    // User can prevent hibernation
}

export const DEFAULT_HIBERNATION_CRITERIA: HibernationCriteria = {
  no_active_campaigns_days: 7,
  no_workflow_executions_days: 7,
  no_dashboard_logins_days: 14,
  account_status: 'active',
  manual_hold: false,
};

export interface WorkspaceActivity {
  workspace_id: string;
  last_campaign_activity: Date | null;
  last_workflow_execution: Date | null;
  last_dashboard_login: Date | null;
  account_status: 'active' | 'suspended';
  manual_hibernation_hold: boolean;
  tier: TenantTier;
}

export interface HibernationEligibilityResult {
  workspace_id: string;
  eligible: boolean;
  reason: string;
  criteria_met: {
    campaigns: boolean;
    executions: boolean;
    logins: boolean;
    account_status: boolean;
    manual_hold: boolean;
  };
  days_inactive: number;
  estimated_savings_per_month: number;
}

// ============================================
// POWER OPERATIONS
// ============================================

export type PowerAction = 'power_on' | 'power_off' | 'power_cycle';

export type PowerStatus = 'active' | 'off' | 'unknown';

export interface PowerOperationRequest {
  workspace_id: string;
  droplet_id: string;
  action: PowerAction;
  reason: string;
  initiated_by: 'system' | 'user' | 'cron';
}

export interface PowerOperationResult {
  success: boolean;
  droplet_id: string;
  action: PowerAction;
  started_at: Date;
  completed_at: Date;
  duration_ms: number;
  error?: string;
}

// ============================================
// HIBERNATION PROCESS
// ============================================

export interface HibernationProcess {
  workspace_id: string;
  droplet_id: string;
  started_at: Date;
  step: 'notification' | 'snapshot' | 'shutdown' | 'power_off' | 'completed';
  notification_sent_at: Date | null;
  snapshot_collected_at: Date | null;
  shutdown_completed_at: Date | null;
  powered_off_at: Date | null;
  completed_at: Date | null;
  error?: string;
}

export interface MetricSnapshot {
  workspace_id: string;
  collected_at: Date;
  execution_history_summary: {
    total_executions_last_30_days: number;
    avg_execution_time_ms: number;
    success_rate: number;
  };
  workflow_versions: Record<string, string>;
  credential_fingerprints: string[];
}

// ============================================
// WAKE PROTOCOL
// ============================================

export type WakeTrigger = 
  | 'campaign_start'
  | 'scheduled_campaign'
  | 'user_login'
  | 'manual_request'
  | 'predictive';

export interface WakeRequest {
  workspace_id: string;
  droplet_id: string;
  target_time: Date;           // When the tenant needs to be awake
  priority: TenantTier;
  trigger: WakeTrigger;
  requested_by?: string;       // User ID if manual
}

export interface WakeProcess {
  workspace_id: string;
  droplet_id: string;
  started_at: Date;
  step: 'power_on' | 'booting' | 'containers_starting' | 'health_check' | 'completed';
  power_on_initiated_at: Date | null;
  droplet_booted_at: Date | null;
  containers_started_at: Date | null;
  health_check_passed_at: Date | null;
  completed_at: Date | null;
  target_wake_time_seconds: number;  // Target: 45-60s
  actual_wake_time_seconds: number | null;
  error?: string;
}

export interface WakeResult {
  success: boolean;
  workspace_id: string;
  wake_time_seconds: number;
  target_time_met: boolean;
  error?: string;
}

// ============================================
// STAGGERED WAKE
// ============================================

export interface StaggeredWakeSchedule {
  total_wakes: number;
  start_time: Date;
  end_time: Date;
  interval_ms: number;
  requests: Array<{
    workspace_id: string;
    droplet_id: string;
    scheduled_at: Date;
    priority: TenantTier;
  }>;
}

export interface StaggeredWakeResult {
  scheduled: number;
  start_time: Date;
  estimated_completion: Date;
  duration_minutes: number;
}

// ============================================
// PRE-WARMING
// ============================================

export interface PreWarmingConfig {
  tier: TenantTier;
  strategy: PreWarmingStrategy;
  enabled: boolean;
  // Predictive settings
  prediction_window_hours?: number;      // Look ahead window
  pre_warm_minutes_before?: number;      // Wake X minutes before predicted activity
  auto_hibernate_after_hours?: number;   // Re-hibernate after X hours
}

export const DEFAULT_PREWARMING_CONFIGS: Record<TenantTier, PreWarmingConfig> = {
  enterprise: {
    tier: 'enterprise',
    strategy: 'never-hibernate',
    enabled: true,
  },
  'high-priority': {
    tier: 'high-priority',
    strategy: 'predictive',
    enabled: true,
    prediction_window_hours: 24,
    pre_warm_minutes_before: 5,
    auto_hibernate_after_hours: 2,
  },
  standard: {
    tier: 'standard',
    strategy: 'standard-wake',
    enabled: true,
  },
};

export interface PredictiveWakeSchedule {
  workspace_id: string;
  predicted_activity_time: Date;
  wake_time: Date;
  prediction_signals: {
    scheduled_campaign?: Date;
    historical_login_pattern?: string;
    calendar_event?: Date;
  };
  confidence: number;  // 0-1
}

// ============================================
// COST TRACKING
// ============================================

export interface HibernationCostSavings {
  workspace_id: string;
  hibernated_at: Date;
  woken_at: Date | null;
  hibernation_duration_hours: number;
  estimated_savings_usd: number;
}

export interface FleetCostSummary {
  total_droplets: number;
  active_droplets: number;
  hibernating_droplets: number;
  hibernation_rate: number;  // 0-1
  monthly_active_cost: number;
  monthly_hibernation_cost: number;
  total_monthly_savings: number;
  estimated_annual_savings: number;
}

// ============================================
// DATABASE INTERFACES
// ============================================

export interface HibernationDB {
  // Eligibility checks
  getWorkspaceActivity(workspaceId: string): Promise<WorkspaceActivity | null>;
  getAllWorkspaceActivity(): Promise<WorkspaceActivity[]>;
  
  // Hibernation process
  startHibernationProcess(workspaceId: string, dropletId: string): Promise<HibernationProcess>;
  updateHibernationProcess(workspaceId: string, updates: Partial<HibernationProcess>): Promise<void>;
  getHibernationProcess(workspaceId: string): Promise<HibernationProcess | null>;
  
  // Metric snapshots
  storeMetricSnapshot(snapshot: MetricSnapshot): Promise<void>;
  getLatestSnapshot(workspaceId: string): Promise<MetricSnapshot | null>;
  
  // Wake process
  startWakeProcess(workspaceId: string, dropletId: string): Promise<WakeProcess>;
  updateWakeProcess(workspaceId: string, updates: Partial<WakeProcess>): Promise<void>;
  getWakeProcess(workspaceId: string): Promise<WakeProcess | null>;
  
  // Cost tracking
  recordHibernation(workspaceId: string, hibernatedAt: Date): Promise<void>;
  recordWake(workspaceId: string, wokenAt: Date): Promise<void>;
  getFleetCostSummary(): Promise<FleetCostSummary>;
}

export interface PowerClient {
  // Power operations
  powerOn(dropletId: string): Promise<PowerOperationResult>;
  powerOff(dropletId: string): Promise<PowerOperationResult>;
  powerCycle(dropletId: string): Promise<PowerOperationResult>;
  
  // Status checks
  getPowerStatus(dropletId: string): Promise<PowerStatus>;
}

// ============================================
// HIBERNATION SERVICE
// ============================================

export interface HibernationService {
  // Eligibility
  checkEligibility(
    workspaceId: string,
    criteria?: HibernationCriteria
  ): Promise<HibernationEligibilityResult>;
  
  findEligibleWorkspaces(
    criteria?: HibernationCriteria
  ): Promise<HibernationEligibilityResult[]>;
  
  // Hibernation
  hibernateWorkspace(
    workspaceId: string,
    dropletId: string,
    reason: string
  ): Promise<HibernationProcess>;
  
  // Wake
  wakeWorkspace(
    request: WakeRequest
  ): Promise<WakeResult>;
  
  // Staggered wake
  scheduleStaggeredWake(
    requests: WakeRequest[]
  ): Promise<StaggeredWakeResult>;
  
  // Predictive
  schedulePredictiveWakes(
    windowHours: number
  ): Promise<PredictiveWakeSchedule[]>;
  
  // Cost analysis
  getFleetCostSummary(): Promise<FleetCostSummary>;
}

// ============================================
// CONSTANTS
// ============================================

// Cost constants (USD per month)
export const COST_RUNNING_DROPLET = 6.00;
export const COST_HIBERNATING_DROPLET = 0.50;
export const SAVINGS_PER_HIBERNATED = COST_RUNNING_DROPLET - COST_HIBERNATING_DROPLET;  // $5.50

// Wake time targets (seconds)
export const TARGET_WAKE_TIME_STANDARD = 60;
export const TARGET_WAKE_TIME_HIGH_PRIORITY = 5;
export const TARGET_WAKE_TIME_ENTERPRISE = 0;  // Always warm

// Staggered wake settings
export const WAKE_INTERVAL_MS = 1000;  // 1 second between wakes
export const DO_API_RATE_LIMIT_PER_SECOND = 1.4;  // DigitalOcean limit

// Notification delays
export const PRE_HIBERNATION_NOTIFICATION_HOURS = 24;
