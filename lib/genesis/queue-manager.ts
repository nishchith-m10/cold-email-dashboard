/**
 * PHASE 52: QUEUE MANAGER
 * 
 * Central manager for all BullMQ queues with type-safe job creation,
 * priority handling, and observability.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 52
 */

import { v4 as uuidv4 } from 'uuid';
import {
  QUEUE_NAMES,
  QUEUE_CONFIGS,
  QueueName,
  QueueConfig,
  JobPayload,
  JobMetadata,
  JobResult,
  BusEvent,
  IgnitionJobPayload,
  TeardownJobPayload,
  CredentialRotationJobPayload,
  SecurityPatchJobPayload,
  WorkflowDeployJobPayload,
  FleetWorkflowUpdateJobPayload,
  HeartbeatProcessJobPayload,
  MetricCollectionJobPayload,
  MetricAggregationJobPayload,
  SoftRebootJobPayload,
  HardRebootJobPayload,
} from './bullmq-types';
import { RedisConnectionManager, getConnectionManager, RedisClient } from './redis-connection';

// ============================================
// QUEUE INTERFACE (BullMQ Abstraction)
// ============================================

/**
 * Job options for queue.add()
 */
export interface JobOptions {
  jobId?: string;               // Custom job ID (for idempotency)
  priority?: number;            // Lower = higher priority
  delay?: number;               // Delay in ms before processing
  attempts?: number;            // Max retry attempts
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;  // Remove after completion
  removeOnFail?: boolean | number;      // Remove after failure
  parent?: {
    id: string;
    queue: string;
  };
}

/**
 * Abstract queue interface for BullMQ Queue class.
 * Allows mocking in tests.
 */
export interface QueueInterface {
  name: string;
  add(jobName: string, data: unknown, opts?: JobOptions): Promise<{ id: string; name: string }>;
  getJob(jobId: string): Promise<QueueJob | null>;
  getJobCounts(): Promise<Record<string, number>>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  clean(grace: number, limit: number, type: 'completed' | 'failed'): Promise<string[]>;
  close(): Promise<void>;
}

/**
 * Job interface from queue.
 */
export interface QueueJob {
  id: string;
  name: string;
  data: unknown;
  opts: JobOptions;
  attemptsMade: number;
  finishedOn?: number;
  failedReason?: string;
}

/**
 * Factory for creating queues.
 */
export type QueueFactory = (name: string, connection: RedisClient) => QueueInterface;

// ============================================
// IN-MEMORY QUEUE (For Testing)
// ============================================

/**
 * In-memory queue implementation for testing.
 */
class InMemoryQueue implements QueueInterface {
  name: string;
  private jobs: Map<string, QueueJob> = new Map();
  private isPaused = false;
  private jobCounter = 0;

  constructor(name: string, _connection: RedisClient) {
    this.name = name;
  }

  async add(jobName: string, data: unknown, opts?: JobOptions): Promise<{ id: string; name: string }> {
    const id = opts?.jobId || `${this.name}-${++this.jobCounter}`;
    
    const job: QueueJob = {
      id,
      name: jobName,
      data,
      opts: opts || {},
      attemptsMade: 0,
    };

    this.jobs.set(id, job);
    return { id, name: jobName };
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getJobCounts(): Promise<Record<string, number>> {
    return {
      waiting: this.isPaused ? this.jobs.size : 0,
      active: this.isPaused ? 0 : this.jobs.size,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  async pause(): Promise<void> {
    this.isPaused = true;
  }

  async resume(): Promise<void> {
    this.isPaused = false;
  }

  async clean(_grace: number, _limit: number, _type: 'completed' | 'failed'): Promise<string[]> {
    return [];
  }

  async close(): Promise<void> {
    this.jobs.clear();
  }
}

// ============================================
// EVENT EMITTER
// ============================================

type EventListener = (event: BusEvent) => void;

class EventBus {
  private listeners: EventListener[] = [];

  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: BusEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[EventBus] Listener error:', error);
      }
    }
  }
}

// ============================================
// QUEUE MANAGER
// ============================================

/**
 * Central manager for all Genesis BullMQ queues.
 * Provides type-safe job creation and centralized observability.
 */
export class QueueManager {
  private connectionManager: RedisConnectionManager;
  private queueFactory: QueueFactory;
  private queues: Map<QueueName, QueueInterface> = new Map();
  private eventBus: EventBus = new EventBus();
  private isInitialized = false;
  private idempotencyCache: Map<string, { jobId: string; expiresAt: number }> = new Map();

  constructor(
    connectionManager?: RedisConnectionManager,
    queueFactory?: QueueFactory
  ) {
    this.connectionManager = connectionManager || getConnectionManager();
    this.queueFactory = queueFactory || ((name, _conn) => new InMemoryQueue(name, _conn));
  }

  /**
   * Initialize all queues.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.connectionManager.initialize();
    const connection = await this.connectionManager.getPrimaryConnection();

    // Create all queues
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = this.queueFactory(queueName, connection);
      this.queues.set(queueName, queue);
    }

    this.isInitialized = true;
    console.log('[QueueManager] Initialized with queues:', Object.values(QUEUE_NAMES));
  }

  /**
   * Subscribe to event bus events.
   */
  subscribe(listener: EventListener): () => void {
    return this.eventBus.subscribe(listener);
  }

  /**
   * Get a queue by name.
   */
  getQueue(name: QueueName): QueueInterface {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue not found: ${name}. Did you call initialize()?`);
    }
    return queue;
  }

  /**
   * Get queue configuration.
   */
  getConfig(name: QueueName): QueueConfig {
    return QUEUE_CONFIGS[name];
  }

  // ============================================
  // IGNITION QUEUE METHODS
  // ============================================

  /**
   * Add an ignition (provisioning) job.
   */
  async addIgnitionJob(
    payload: IgnitionJobPayload,
    options?: { idempotencyKey?: string }
  ): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.IGNITION];
    
    // Check idempotency
    if (options?.idempotencyKey) {
      const existing = this.checkIdempotency(options.idempotencyKey);
      if (existing) return existing;
    }

    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.IGNITION);

    await queue.add('provision', payload, {
      jobId,
      priority: payload.priority_override ?? config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
      removeOnComplete: 1000,  // Keep last 1000
      removeOnFail: 5000,      // Keep last 5000 failures
    });

    if (options?.idempotencyKey) {
      this.setIdempotency(options.idempotencyKey, jobId);
    }

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.IGNITION,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  /**
   * Add a teardown job.
   */
  async addTeardownJob(payload: TeardownJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.IGNITION];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.IGNITION);

    await queue.add('teardown', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.IGNITION,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  // ============================================
  // SECURITY QUEUE METHODS
  // ============================================

  /**
   * Add a credential rotation job.
   */
  async addCredentialRotationJob(payload: CredentialRotationJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.SECURITY];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.SECURITY);

    await queue.add('rotate-credential', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.SECURITY,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  /**
   * Add a security patch job.
   */
  async addSecurityPatchJob(payload: SecurityPatchJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.SECURITY];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.SECURITY);

    // Critical patches get highest priority
    const priority = payload.severity === 'critical' ? 1 : config.priority;

    await queue.add('apply-patch', payload, {
      jobId,
      priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.SECURITY,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  // ============================================
  // TEMPLATE QUEUE METHODS
  // ============================================

  /**
   * Add a workflow deploy job.
   */
  async addWorkflowDeployJob(payload: WorkflowDeployJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.TEMPLATE];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.TEMPLATE);

    await queue.add('deploy-workflow', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.TEMPLATE,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  /**
   * Add fleet-wide workflow update jobs.
   * Creates a parent job and child jobs for each droplet.
   */
  async addFleetWorkflowUpdateJobs(
    droplets: Array<{ workspace_id: string; droplet_id: string }>,
    workflowName: string,
    workflowVersion: string,
    workflowJson: Record<string, unknown>,
    credentialMap?: Record<string, string>
  ): Promise<{ rolloutId: string; jobIds: string[] }> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.TEMPLATE];
    const queue = this.getQueue(QUEUE_NAMES.TEMPLATE);
    const rolloutId = uuidv4();
    const jobIds: string[] = [];

    for (const droplet of droplets) {
      const jobId = uuidv4();
      const payload: FleetWorkflowUpdateJobPayload = {
        rollout_id: rolloutId,
        workspace_id: droplet.workspace_id,
        droplet_id: droplet.droplet_id,
        workflow_name: workflowName,
        workflow_version: workflowVersion,
        workflow_json: workflowJson,
        credential_map: credentialMap,
      };

      await queue.add('fleet-update', payload, {
        jobId,
        priority: config.priority,
        attempts: config.maxRetries,
        backoff: {
          type: config.backoffType,
          delay: config.backoffDelay,
        },
      });

      jobIds.push(jobId);

      this.eventBus.emit({
        type: 'job:added',
        queue: QUEUE_NAMES.TEMPLATE,
        job_id: jobId,
        payload,
      });
    }

    return { rolloutId, jobIds };
  }

  // ============================================
  // HEALTH QUEUE METHODS
  // ============================================

  /**
   * Add a heartbeat processing job.
   */
  async addHeartbeatJob(payload: HeartbeatProcessJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.HEALTH];
    const jobId = `hb-${payload.droplet_id}-${Date.now()}`;
    const queue = this.getQueue(QUEUE_NAMES.HEALTH);

    await queue.add('process-heartbeat', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
      removeOnComplete: 100,   // Keep minimal for health jobs
      removeOnFail: 500,
    });

    // Don't emit events for high-volume heartbeats
    return jobId;
  }

  // ============================================
  // METRIC QUEUE METHODS
  // ============================================

  /**
   * Add a metric collection job.
   */
  async addMetricCollectionJob(payload: MetricCollectionJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.METRIC];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.METRIC);

    await queue.add('collect-metrics', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    return jobId;
  }

  /**
   * Add a metric aggregation job.
   */
  async addMetricAggregationJob(payload: MetricAggregationJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.METRIC];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.METRIC);

    await queue.add('aggregate-metrics', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.METRIC,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  // ============================================
  // REBOOT QUEUE METHODS
  // ============================================

  /**
   * Add a soft reboot job.
   */
  async addSoftRebootJob(payload: SoftRebootJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.REBOOT];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.REBOOT);

    await queue.add('soft-reboot', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.REBOOT,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  /**
   * Add a hard reboot job.
   */
  async addHardRebootJob(payload: HardRebootJobPayload): Promise<string> {
    const config = QUEUE_CONFIGS[QUEUE_NAMES.REBOOT];
    const jobId = uuidv4();
    const queue = this.getQueue(QUEUE_NAMES.REBOOT);

    await queue.add('hard-reboot', payload, {
      jobId,
      priority: config.priority,
      attempts: config.maxRetries,
      backoff: {
        type: config.backoffType,
        delay: config.backoffDelay,
      },
    });

    this.eventBus.emit({
      type: 'job:added',
      queue: QUEUE_NAMES.REBOOT,
      job_id: jobId,
      payload,
    });

    return jobId;
  }

  // ============================================
  // IDEMPOTENCY HELPERS
  // ============================================

  private checkIdempotency(key: string): string | null {
    const entry = this.idempotencyCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.jobId;
    }
    if (entry) {
      this.idempotencyCache.delete(key);
    }
    return null;
  }

  private setIdempotency(key: string, jobId: string): void {
    // 5 minute idempotency window
    this.idempotencyCache.set(key, {
      jobId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  }

  // ============================================
  // MANAGEMENT METHODS
  // ============================================

  /**
   * Get job counts for all queues.
   */
  async getAllJobCounts(): Promise<Record<QueueName, Record<string, number>>> {
    const counts: Partial<Record<QueueName, Record<string, number>>> = {};

    for (const [name, queue] of this.queues) {
      counts[name] = await queue.getJobCounts();
    }

    return counts as Record<QueueName, Record<string, number>>;
  }

  /**
   * Pause a specific queue.
   */
  async pauseQueue(name: QueueName): Promise<void> {
    const queue = this.getQueue(name);
    await queue.pause();
    console.log(`[QueueManager] Paused queue: ${name}`);
  }

  /**
   * Resume a specific queue.
   */
  async resumeQueue(name: QueueName): Promise<void> {
    const queue = this.getQueue(name);
    await queue.resume();
    console.log(`[QueueManager] Resumed queue: ${name}`);
  }

  /**
   * Pause all queues.
   */
  async pauseAll(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.pause();
      console.log(`[QueueManager] Paused queue: ${name}`);
    }
  }

  /**
   * Resume all queues.
   */
  async resumeAll(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.resume();
      console.log(`[QueueManager] Resumed queue: ${name}`);
    }
  }

  /**
   * Clean old jobs from queues.
   */
  async cleanOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.clean(maxAgeMs, 1000, 'completed');
      await queue.clean(maxAgeMs * 7, 1000, 'failed'); // Keep failures longer
      console.log(`[QueueManager] Cleaned old jobs from: ${name}`);
    }
  }

  /**
   * Gracefully shutdown all queues.
   */
  async shutdown(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`[QueueManager] Closed queue: ${name}`);
    }

    await this.connectionManager.shutdown();
    this.queues.clear();
    this.isInitialized = false;
    
    console.log('[QueueManager] Shutdown complete');
  }
}

// ============================================
// SINGLETON
// ============================================

let queueManager: QueueManager | null = null;

/**
 * Get the singleton queue manager.
 */
export function getQueueManager(): QueueManager {
  if (!queueManager) {
    queueManager = new QueueManager();
  }
  return queueManager;
}

/**
 * Reset the singleton (for testing).
 */
export function resetQueueManager(): void {
  if (queueManager) {
    queueManager.shutdown().catch(console.error);
    queueManager = null;
  }
}
