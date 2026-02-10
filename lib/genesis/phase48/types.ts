/**
 * GENESIS PHASE 48: PRODUCTION CUTOVER & REVERT PROTOCOL
 *
 * Type definitions for launch readiness, blue/green deployment,
 * canary routing, instant revert, and cutover orchestration.
 */

// ============================================
// DEPLOYMENT STATE
// ============================================

export type DeploymentSlot = 'blue' | 'green';

export type DeploymentStatus =
  | 'stable'
  | 'deploying'
  | 'canary'
  | 'promoting'
  | 'rolling_back'
  | 'rolled_back'
  | 'failed';

export interface DeploymentState {
  activeSlot: DeploymentSlot;
  standbySlot: DeploymentSlot;
  canaryPercentage: number; // 0-100
  status: DeploymentStatus;
  lastDeployedAt: string | null;
  activeVersion: string;
  standbyVersion: string | null;
  deploymentId: string | null;
  metadata: Record<string, unknown>;
}

export interface DeploymentEvent {
  id: string;
  type: DeploymentEventType;
  slot: DeploymentSlot;
  version: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export type DeploymentEventType =
  | 'deploy_started'
  | 'deploy_completed'
  | 'canary_started'
  | 'canary_advanced'
  | 'canary_aborted'
  | 'promote_started'
  | 'promote_completed'
  | 'rollback_started'
  | 'rollback_completed'
  | 'health_check_passed'
  | 'health_check_failed'
  | 'revert_triggered';

// ============================================
// LAUNCH READINESS
// ============================================

export type ReadinessCheckSeverity = 'blocker' | 'critical' | 'warning' | 'info';

export type ReadinessCheckCategory =
  | 'database'
  | 'schema'
  | 'security'
  | 'connectivity'
  | 'performance'
  | 'configuration';

export interface ReadinessCheck {
  id: string;
  name: string;
  description: string;
  severity: ReadinessCheckSeverity;
  category: ReadinessCheckCategory;
  check: () => Promise<ReadinessCheckResult>;
}

export interface ReadinessCheckResult {
  checkId: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: Record<string, unknown>;
}

export interface ReadinessReport {
  status: 'GO' | 'NO-GO';
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  blockers: string[];
  criticals: string[];
  warnings: string[];
  results: ReadinessCheckResult[];
  durationMs: number;
}

// ============================================
// CANARY DEPLOYMENT
// ============================================

export interface CanaryConfig {
  initialPercentage: number; // Start traffic % (e.g., 5)
  stepPercentage: number;    // Increment per step (e.g., 10)
  maxPercentage: number;     // Auto-promote threshold (e.g., 100)
  stepIntervalSeconds: number; // Time between steps
  healthCheckIntervalSeconds: number;
  rollbackOnFailure: boolean;
  requiredHealthChecks: number; // Consecutive passes needed
}

export interface CanaryState {
  active: boolean;
  percentage: number;
  startedAt: string | null;
  lastStepAt: string | null;
  stepCount: number;
  consecutiveHealthChecks: number;
  healthChecksPassed: number;
  healthChecksFailed: number;
}

// ============================================
// REVERT TRIGGERS
// ============================================

export type RevertTriggerType =
  | 'error_rate'
  | 'p95_latency'
  | 'p99_latency'
  | 'db_connection_failures'
  | 'memory_pressure'
  | 'cpu_pressure'
  | 'custom';

export interface RevertTriggerConfig {
  name: string;
  type: RevertTriggerType;
  threshold: number;
  autoRevert: boolean;
  cooldownSeconds: number; // Prevent rapid re-triggers
}

export interface RevertTriggerState {
  name: string;
  type: RevertTriggerType;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  autoRevert: boolean;
  lastTriggeredAt: string | null;
}

export interface RevertResult {
  success: boolean;
  reason: string;
  durationMs: number;
  actions: string[];
  previousVersion: string;
  revertedToVersion: string;
  error?: string;
}

// ============================================
// CUTOVER ORCHESTRATION
// ============================================

export type CutoverPhaseType =
  | 'idle'
  | 'readiness_check'
  | 'deploy_standby'
  | 'health_check'
  | 'canary_start'
  | 'canary_monitoring'
  | 'promoting'
  | 'verification'
  | 'complete'
  | 'rolled_back'
  | 'failed';

export interface CutoverPlan {
  name: string;
  version: string;
  canaryConfig: CanaryConfig;
  revertTriggers: RevertTriggerConfig[];
  skipReadinessCheck: boolean;
  skipCanary: boolean; // Direct promotion (dangerous)
  dryRun: boolean;
}

export interface CutoverProgress {
  phase: CutoverPhaseType;
  startedAt: string;
  currentPhaseStartedAt: string;
  completedPhases: string[];
  totalDurationMs: number;
  deployment: DeploymentState;
  canary: CanaryState;
  events: DeploymentEvent[];
}

export interface CutoverResult {
  success: boolean;
  phase: CutoverPhaseType;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  previousVersion: string;
  newVersion: string | null;
  events: DeploymentEvent[];
  readinessReport?: ReadinessReport;
  error?: string;
}

// ============================================
// DEPLOYMENT ENVIRONMENT INTERFACE
// ============================================

export interface DeploymentEnvironment {
  // Deployment operations
  getDeploymentState(): Promise<DeploymentState>;
  deployToStandby(version: string): Promise<{ success: boolean; error?: string }>;
  swapSlots(): Promise<{ success: boolean; error?: string }>;

  // Traffic routing
  setCanaryPercentage(percentage: number): Promise<void>;

  // Health checks
  checkHealth(slot: DeploymentSlot): Promise<{ healthy: boolean; details: Record<string, unknown> }>;

  // Metrics
  getErrorRate(): Promise<number>;
  getP95Latency(): Promise<number>;
  getP99Latency(): Promise<number>;
  getDbConnectionFailures(): Promise<number>;
  getMemoryPressure(): Promise<number>;
  getCpuPressure(): Promise<number>;

  // Events
  logEvent(event: Omit<DeploymentEvent, 'id' | 'timestamp'>): Promise<void>;
  getEvents(deploymentId?: string): Promise<DeploymentEvent[]>;
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_CANARY_CONFIG: CanaryConfig = {
  initialPercentage: 5,
  stepPercentage: 10,
  maxPercentage: 100,
  stepIntervalSeconds: 300, // 5 min
  healthCheckIntervalSeconds: 30,
  rollbackOnFailure: true,
  requiredHealthChecks: 3,
};

export const DEFAULT_REVERT_TRIGGERS: RevertTriggerConfig[] = [
  { name: 'Error Rate', type: 'error_rate', threshold: 0.05, autoRevert: true, cooldownSeconds: 300 },
  { name: 'P95 Latency', type: 'p95_latency', threshold: 3000, autoRevert: true, cooldownSeconds: 300 },
  { name: 'DB Failures', type: 'db_connection_failures', threshold: 5, autoRevert: true, cooldownSeconds: 60 },
];

export const DEPLOYMENT_DEFAULTS = {
  MAX_DEPLOY_WAIT_MS: 300_000, // 5 min
  HEALTH_CHECK_TIMEOUT_MS: 10_000,
  MAX_CANARY_DURATION_MS: 3_600_000, // 1 hour
  SLOT_SWAP_TIMEOUT_MS: 30_000,
} as const;

export const VALID_STATUS_TRANSITIONS: Record<DeploymentStatus, DeploymentStatus[]> = {
  stable: ['deploying'],
  deploying: ['canary', 'stable', 'failed'],
  canary: ['promoting', 'rolling_back', 'failed'],
  promoting: ['stable', 'rolling_back', 'failed'],
  rolling_back: ['rolled_back', 'failed'],
  rolled_back: ['stable', 'deploying'],
  failed: ['stable', 'deploying'],
};

export function isValidStatusTransition(from: DeploymentStatus, to: DeploymentStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function generateDeploymentId(): string {
  return `dep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
