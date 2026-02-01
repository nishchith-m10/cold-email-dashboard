/**
 * PHASE 52: BULLMQ EVENT BUS - TYPE DEFINITIONS
 * 
 * Defines all job types, queue configurations, and type-safe interfaces
 * for the fleet orchestration event bus.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 52
 */

// ============================================
// QUEUE PRIORITY LEVELS
// ============================================

/**
 * Priority levels for job queues.
 * Lower number = higher priority.
 */
export enum QueuePriority {
  CRITICAL = 1,  // Ignition - new tenant provisioning
  HIGH = 2,      // Security, Reboot - credential rotation, patches, zombie recovery
  MEDIUM = 3,    // Template - workflow updates
  LOW = 4,       // Health, Metric - heartbeat processing, analytics
}

// ============================================
// QUEUE NAMES (Canonical)
// ============================================

/**
 * Canonical queue names for BullMQ.
 * These must match the Redis key patterns.
 */
export const QUEUE_NAMES = {
  IGNITION: 'genesis:ignition',      // New tenant provisioning
  SECURITY: 'genesis:security',      // Credential rotation, patches
  TEMPLATE: 'genesis:template',      // Workflow updates
  HEALTH: 'genesis:health',          // Heartbeat processing
  METRIC: 'genesis:metric',          // Analytics collection
  REBOOT: 'genesis:reboot',          // Zombie recovery
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// ============================================
// QUEUE CONFIGURATION
// ============================================

/**
 * Configuration for each queue including concurrency limits and rate limiting.
 * These values prevent the "Thundering Herd" scenario at 15k scale.
 */
export interface QueueConfig {
  name: QueueName;
  priority: QueuePriority;
  concurrency: number;          // Max simultaneous jobs
  rateLimitMax?: number;        // Max jobs per duration window
  rateLimitDuration?: number;   // Duration window in ms
  maxRetries: number;           // Before dead-letter
  backoffType: 'exponential' | 'fixed';
  backoffDelay: number;         // Initial delay in ms
}

/**
 * Queue configurations per the Phase 52 specification.
 * 
 * | Queue     | Purpose                   | Priority    | Concurrency |
 * |-----------|---------------------------|-------------|-------------|
 * | ignition  | New tenant provisioning   | CRITICAL(1) | 50          |
 * | security  | Credential rotation       | HIGH(2)     | 100         |
 * | template  | Workflow updates          | MEDIUM(3)   | 100         |
 * | health    | Heartbeat processing      | LOW(4)      | 500         |
 * | metric    | Analytics collection      | LOW(4)      | 200         |
 * | reboot    | Zombie recovery           | HIGH(2)     | 25          |
 */
export const QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
  [QUEUE_NAMES.IGNITION]: {
    name: QUEUE_NAMES.IGNITION,
    priority: QueuePriority.CRITICAL,
    concurrency: 50,
    rateLimitMax: 100,
    rateLimitDuration: 1000,    // 100 per second max
    maxRetries: 5,
    backoffType: 'exponential',
    backoffDelay: 5000,         // Start at 5s, exponential
  },
  [QUEUE_NAMES.SECURITY]: {
    name: QUEUE_NAMES.SECURITY,
    priority: QueuePriority.HIGH,
    concurrency: 100,
    rateLimitMax: 200,
    rateLimitDuration: 1000,
    maxRetries: 5,
    backoffType: 'exponential',
    backoffDelay: 3000,
  },
  [QUEUE_NAMES.TEMPLATE]: {
    name: QUEUE_NAMES.TEMPLATE,
    priority: QueuePriority.MEDIUM,
    concurrency: 100,
    rateLimitMax: 200,
    rateLimitDuration: 1000,
    maxRetries: 5,
    backoffType: 'exponential',
    backoffDelay: 5000,
  },
  [QUEUE_NAMES.HEALTH]: {
    name: QUEUE_NAMES.HEALTH,
    priority: QueuePriority.LOW,
    concurrency: 500,
    rateLimitMax: 1000,
    rateLimitDuration: 1000,
    maxRetries: 3,
    backoffType: 'fixed',
    backoffDelay: 1000,
  },
  [QUEUE_NAMES.METRIC]: {
    name: QUEUE_NAMES.METRIC,
    priority: QueuePriority.LOW,
    concurrency: 200,
    rateLimitMax: 500,
    rateLimitDuration: 1000,
    maxRetries: 3,
    backoffType: 'fixed',
    backoffDelay: 2000,
  },
  [QUEUE_NAMES.REBOOT]: {
    name: QUEUE_NAMES.REBOOT,
    priority: QueuePriority.HIGH,
    concurrency: 25,             // Low concurrency to prevent cascade
    rateLimitMax: 50,
    rateLimitDuration: 1000,
    maxRetries: 3,
    backoffType: 'exponential',
    backoffDelay: 10000,         // 10s initial delay for reboot
  },
};

// ============================================
// JOB PAYLOADS - IGNITION QUEUE
// ============================================

/**
 * Payload for provisioning a new tenant droplet.
 */
export interface IgnitionJobPayload {
  workspace_id: string;
  workspace_slug: string;
  droplet_size: 'starter' | 'professional' | 'scale' | 'enterprise';
  region: string;
  requested_by_user_id: string;
  priority_override?: number;
}

/**
 * Payload for de-provisioning (teardown) a tenant droplet.
 */
export interface TeardownJobPayload {
  workspace_id: string;
  droplet_id: string;
  reason: 'user_request' | 'payment_failure' | 'admin_action' | 'orphan_cleanup';
  force: boolean;
}

// ============================================
// JOB PAYLOADS - SECURITY QUEUE
// ============================================

/**
 * Payload for rotating credentials on a droplet.
 */
export interface CredentialRotationJobPayload {
  workspace_id: string;
  droplet_id: string;
  credential_type: string;
  credential_id: string;
  reason: 'scheduled' | 'compromise_detected' | 'user_request';
}

/**
 * Payload for security patch deployment.
 */
export interface SecurityPatchJobPayload {
  workspace_id: string;
  droplet_id: string;
  patch_id: string;
  patch_type: 'os' | 'docker' | 'n8n' | 'sidecar';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================
// JOB PAYLOADS - TEMPLATE QUEUE
// ============================================

/**
 * Payload for deploying/updating a workflow on a droplet.
 */
export interface WorkflowDeployJobPayload {
  workspace_id: string;
  droplet_id: string;
  workflow_name: string;
  workflow_json: Record<string, unknown>;
  credential_map?: Record<string, string>;
  activate_after_deploy: boolean;
}

/**
 * Payload for bulk workflow update across fleet.
 */
export interface FleetWorkflowUpdateJobPayload {
  rollout_id: string;
  workspace_id: string;
  droplet_id: string;
  workflow_name: string;
  workflow_version: string;
  workflow_json: Record<string, unknown>;
  credential_map?: Record<string, string>;
}

// ============================================
// JOB PAYLOADS - HEALTH QUEUE
// ============================================

/**
 * Payload for processing a Sidecar heartbeat.
 */
export interface HeartbeatProcessJobPayload {
  workspace_id: string;
  droplet_id: string;
  sidecar_ip: string;
  timestamp: string;           // ISO 8601
  metrics: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    n8n_status: 'running' | 'stopped' | 'error';
    active_workflows: number;
  };
}

// ============================================
// JOB PAYLOADS - METRIC QUEUE
// ============================================

/**
 * Payload for collecting metrics from a droplet.
 */
export interface MetricCollectionJobPayload {
  workspace_id: string;
  droplet_id: string;
  collection_type: 'full' | 'incremental';
  since?: string;              // ISO 8601 for incremental
}

/**
 * Payload for aggregating metrics into analytics.
 */
export interface MetricAggregationJobPayload {
  aggregation_id: string;
  workspace_ids: string[];
  period_start: string;
  period_end: string;
  granularity: '15m' | '1h' | '1d';
}

// ============================================
// JOB PAYLOADS - REBOOT QUEUE
// ============================================

/**
 * Payload for soft reboot (container restart).
 */
export interface SoftRebootJobPayload {
  workspace_id: string;
  droplet_id: string;
  target: 'n8n' | 'sidecar' | 'all';
  reason: 'health_degraded' | 'user_request' | 'memory_exceeded';
}

/**
 * Payload for hard reboot (VM reboot via DO API).
 */
export interface HardRebootJobPayload {
  workspace_id: string;
  droplet_id: string;
  reason: 'zombie_detected' | 'unresponsive' | 'kernel_panic' | 'admin_action';
  escalated_from_soft_reboot: boolean;
}

// ============================================
// UNION TYPES FOR QUEUE-SPECIFIC PAYLOADS
// ============================================

export type IgnitionQueuePayload = IgnitionJobPayload | TeardownJobPayload;
export type SecurityQueuePayload = CredentialRotationJobPayload | SecurityPatchJobPayload;
export type TemplateQueuePayload = WorkflowDeployJobPayload | FleetWorkflowUpdateJobPayload;
export type HealthQueuePayload = HeartbeatProcessJobPayload;
export type MetricQueuePayload = MetricCollectionJobPayload | MetricAggregationJobPayload;
export type RebootQueuePayload = SoftRebootJobPayload | HardRebootJobPayload;

/**
 * Union of all job payload types.
 */
export type JobPayload =
  | IgnitionQueuePayload
  | SecurityQueuePayload
  | TemplateQueuePayload
  | HealthQueuePayload
  | MetricQueuePayload
  | RebootQueuePayload;

// ============================================
// JOB METADATA
// ============================================

/**
 * Standard metadata attached to every job.
 */
export interface JobMetadata {
  job_id: string;              // BullMQ job ID
  queue_name: QueueName;
  created_at: string;          // ISO 8601
  attempt_number: number;
  max_attempts: number;
  parent_job_id?: string;      // For child jobs (e.g., fleet updates)
  rollout_id?: string;         // For batch operations
  idempotency_key?: string;    // For deduplication
}

// ============================================
// JOB RESULT TYPES
// ============================================

/**
 * Standard job result wrapper.
 */
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  execution_time_ms: number;
  metrics?: {
    api_calls_made: number;
    bytes_transferred: number;
  };
}

// ============================================
// DEAD LETTER QUEUE
// ============================================

/**
 * Dead letter entry for failed jobs.
 */
export interface DeadLetterEntry {
  original_job_id: string;
  queue_name: QueueName;
  payload: JobPayload;
  metadata: JobMetadata;
  failure_reason: string;
  failure_stack?: string;
  attempts_made: number;
  first_attempt_at: string;
  last_attempt_at: string;
  dead_lettered_at: string;
}

// ============================================
// CONCURRENCY GOVERNOR TYPES
// ============================================

/**
 * Configuration for the Concurrency Governor.
 */
export interface GovernorConfig {
  global_max_concurrent: number;     // Max across all queues (default 100)
  per_account_max_concurrent: number; // Max per DO account (default 10)
  rate_limit_window_ms: number;      // Sliding window duration
  rate_limit_max_jobs: number;       // Max jobs in window
  circuit_breaker_threshold: number; // Failures before circuit opens
  circuit_breaker_reset_ms: number;  // Time before retry after circuit open
}

/**
 * Default governor configuration (per Phase 52 spec).
 */
export const DEFAULT_GOVERNOR_CONFIG: GovernorConfig = {
  global_max_concurrent: 100,
  per_account_max_concurrent: 10,
  rate_limit_window_ms: 1000,
  rate_limit_max_jobs: 200,
  circuit_breaker_threshold: 10,
  circuit_breaker_reset_ms: 30000,
};

// ============================================
// EVENT TYPES (For Pub/Sub)
// ============================================

/**
 * Events emitted by the event bus for observability.
 */
export type BusEvent =
  | { type: 'job:added'; queue: QueueName; job_id: string; payload: JobPayload }
  | { type: 'job:active'; queue: QueueName; job_id: string }
  | { type: 'job:completed'; queue: QueueName; job_id: string; result: JobResult }
  | { type: 'job:failed'; queue: QueueName; job_id: string; error: string; attempt: number }
  | { type: 'job:dead_lettered'; queue: QueueName; job_id: string; reason: string }
  | { type: 'governor:rate_limited'; queue: QueueName; current_rate: number }
  | { type: 'governor:circuit_open'; queue: QueueName; failures: number }
  | { type: 'governor:circuit_closed'; queue: QueueName };

// ============================================
// WORKER TYPES
// ============================================

/**
 * Worker status for health checks.
 */
export interface WorkerStatus {
  queue_name: QueueName;
  is_running: boolean;
  jobs_processed: number;
  jobs_failed: number;
  current_concurrency: number;
  uptime_ms: number;
  last_job_at?: string;
}

/**
 * Processor function signature for BullMQ workers.
 */
export type JobProcessor<T extends JobPayload> = (
  payload: T,
  metadata: JobMetadata
) => Promise<JobResult>;
