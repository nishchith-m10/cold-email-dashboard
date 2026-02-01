/**
 * PHASE 52: WORKER BASE CLASS
 * 
 * Provides a standardized base class for BullMQ workers with:
 * - Automatic concurrency governor integration
 * - Consistent error handling
 * - Metrics collection
 * - Graceful shutdown
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 52
 */

import {
  QueueName,
  QueueConfig,
  QUEUE_CONFIGS,
  JobPayload,
  JobMetadata,
  JobResult,
  JobProcessor,
  WorkerStatus,
  BusEvent,
} from './bullmq-types';
import { RedisClient, getConnectionManager } from './redis-connection';
import { ConcurrencyGovernor, getConcurrencyGovernor } from './concurrency-governor';

// ============================================
// WORKER INTERFACE (BullMQ Abstraction)
// ============================================

/**
 * Job interface passed to processor.
 */
export interface WorkerJob {
  id: string;
  name: string;
  data: unknown;
  opts: {
    attempts?: number;
    delay?: number;
  };
  attemptsMade: number;
  timestamp: number;
  returnValue?: unknown;
  progress(value: number): Promise<void>;
  updateData(data: unknown): Promise<void>;
  log(message: string): Promise<void>;
}

/**
 * Worker events.
 */
export interface WorkerEvents {
  completed: (job: WorkerJob, result: unknown) => void;
  failed: (job: WorkerJob | undefined, error: Error) => void;
  error: (error: Error) => void;
  active: (job: WorkerJob) => void;
}

/**
 * Abstract worker interface for BullMQ Worker class.
 */
export interface WorkerInterface {
  name: string;
  isRunning(): boolean;
  pause(doNotWaitActive?: boolean): Promise<void>;
  resume(): void;
  close(): Promise<void>;
  on<K extends keyof WorkerEvents>(event: K, listener: WorkerEvents[K]): this;
}

/**
 * Processor function type for BullMQ.
 */
export type BullMQProcessor = (job: WorkerJob) => Promise<unknown>;

/**
 * Factory for creating workers.
 */
export type WorkerFactory = (
  name: string,
  processor: BullMQProcessor,
  connection: RedisClient,
  concurrency: number
) => WorkerInterface;

// ============================================
// IN-MEMORY WORKER (For Testing)
// ============================================

/**
 * In-memory worker implementation for testing.
 */
class InMemoryWorker implements WorkerInterface {
  name: string;
  private processor: BullMQProcessor;
  private running = false;
  private listeners: Partial<WorkerEvents> = {};

  constructor(
    name: string,
    processor: BullMQProcessor,
    _connection: RedisClient,
    _concurrency: number
  ) {
    this.name = name;
    this.processor = processor;
    this.running = true;
  }

  isRunning(): boolean {
    return this.running;
  }

  async pause(): Promise<void> {
    this.running = false;
  }

  resume(): void {
    this.running = true;
  }

  async close(): Promise<void> {
    this.running = false;
  }

  on<K extends keyof WorkerEvents>(event: K, listener: WorkerEvents[K]): this {
    this.listeners[event] = listener;
    return this;
  }

  // For testing: process a job
  async processJob(job: WorkerJob): Promise<void> {
    if (!this.running) return;

    try {
      this.listeners.active?.(job);
      const result = await this.processor(job);
      this.listeners.completed?.(job, result);
    } catch (error) {
      this.listeners.failed?.(job, error as Error);
    }
  }
}

// ============================================
// GENESIS WORKER BASE
// ============================================

type EventEmitter = (event: BusEvent) => void;

/**
 * Configuration for Genesis Worker.
 */
export interface GenesisWorkerConfig {
  queue: QueueName;
  concurrencyOverride?: number;
  useGovernor?: boolean;
  doAccountExtractor?: (payload: JobPayload) => string | undefined;
}

/**
 * Base class for all Genesis BullMQ workers.
 * 
 * Features:
 * - Automatic concurrency governor integration
 * - Consistent error handling with typed results
 * - Metrics collection (jobs processed, failed, latency)
 * - Graceful shutdown with drain
 */
export class GenesisWorker<T extends JobPayload> {
  protected queueName: QueueName;
  protected config: QueueConfig;
  protected processor: JobProcessor<T>;
  protected governor: ConcurrencyGovernor;
  protected worker: WorkerInterface | null = null;
  protected workerFactory: WorkerFactory;
  protected eventEmitter: EventEmitter | null = null;

  // Metrics
  protected jobsProcessed = 0;
  protected jobsFailed = 0;
  protected startTime = Date.now();
  protected lastJobAt: string | undefined;

  // Configuration
  protected useGovernor: boolean;
  protected doAccountExtractor?: (payload: JobPayload) => string | undefined;

  constructor(
    config: GenesisWorkerConfig,
    processor: JobProcessor<T>,
    workerFactory?: WorkerFactory
  ) {
    this.queueName = config.queue;
    this.config = QUEUE_CONFIGS[config.queue];
    this.processor = processor;
    this.governor = getConcurrencyGovernor();
    this.useGovernor = config.useGovernor ?? true;
    this.doAccountExtractor = config.doAccountExtractor;

    // Override concurrency if provided
    if (config.concurrencyOverride) {
      this.config = { ...this.config, concurrency: config.concurrencyOverride };
    }

    // Default factory creates in-memory worker
    this.workerFactory = workerFactory || ((name, proc, conn, conc) => 
      new InMemoryWorker(name, proc, conn, conc)
    );
  }

  /**
   * Set event emitter for observability.
   */
  setEventEmitter(emitter: EventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Start the worker.
   */
  async start(): Promise<void> {
    const manager = getConnectionManager();
    await manager.initialize();
    const connection = await manager.getPrimaryConnection();

    // Create the worker with our wrapped processor
    this.worker = this.workerFactory(
      this.queueName,
      this.createWrappedProcessor(),
      connection,
      this.config.concurrency
    );

    // Set up event handlers
    this.worker.on('completed', (job, result) => {
      this.jobsProcessed++;
      this.lastJobAt = new Date().toISOString();
      this.governor.recordSuccess(this.queueName);

      this.emitEvent({
        type: 'job:completed',
        queue: this.queueName,
        job_id: job.id,
        result: result as JobResult,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.jobsFailed++;
      this.lastJobAt = new Date().toISOString();
      this.governor.recordFailure(this.queueName);

      this.emitEvent({
        type: 'job:failed',
        queue: this.queueName,
        job_id: job?.id || 'unknown',
        error: error.message,
        attempt: job?.attemptsMade || 0,
      });
    });

    this.worker.on('active', (job) => {
      this.emitEvent({
        type: 'job:active',
        queue: this.queueName,
        job_id: job.id,
      });
    });

    this.worker.on('error', (error) => {
      console.error(`[Worker:${this.queueName}] Error:`, error);
    });

    console.log(`[Worker:${this.queueName}] Started with concurrency ${this.config.concurrency}`);
  }

  /**
   * Create the wrapped processor with governor integration.
   */
  private createWrappedProcessor(): BullMQProcessor {
    return async (job: WorkerJob): Promise<unknown> => {
      const startTime = Date.now();
      const payload = job.data as T;

      // Build metadata
      const metadata: JobMetadata = {
        job_id: job.id,
        queue_name: this.queueName,
        created_at: new Date(job.timestamp).toISOString(),
        attempt_number: job.attemptsMade + 1,
        max_attempts: job.opts.attempts || this.config.maxRetries,
      };

      // Acquire governor permission if enabled
      let release: (() => Promise<void>) | undefined;
      
      if (this.useGovernor) {
        const doAccountId = this.doAccountExtractor?.(payload);
        const result = await this.governor.acquire(this.queueName, job.id, doAccountId);

        if (!result.granted) {
          // Throw to trigger retry with backoff
          throw new Error(`Governor denied: retry after ${result.retryAfterMs}ms`);
        }

        release = result.release;
      }

      try {
        // Execute the processor
        const result = await this.processor(payload, metadata);

        // Log progress for long-running jobs
        await job.log(`Completed in ${Date.now() - startTime}ms`);

        return result;
      } finally {
        // Always release governor slot
        if (release) {
          await release();
        }
      }
    };
  }

  /**
   * Pause the worker.
   */
  async pause(): Promise<void> {
    if (this.worker) {
      await this.worker.pause();
      console.log(`[Worker:${this.queueName}] Paused`);
    }
  }

  /**
   * Resume the worker.
   */
  resume(): void {
    if (this.worker) {
      this.worker.resume();
      console.log(`[Worker:${this.queueName}] Resumed`);
    }
  }

  /**
   * Get worker status.
   */
  getStatus(): WorkerStatus {
    return {
      queue_name: this.queueName,
      is_running: this.worker?.isRunning() ?? false,
      jobs_processed: this.jobsProcessed,
      jobs_failed: this.jobsFailed,
      current_concurrency: this.config.concurrency,
      uptime_ms: Date.now() - this.startTime,
      last_job_at: this.lastJobAt,
    };
  }

  /**
   * Gracefully shutdown the worker.
   */
  async shutdown(): Promise<void> {
    if (this.worker) {
      // Wait for active jobs to complete
      await this.worker.close();
      this.worker = null;
      console.log(`[Worker:${this.queueName}] Shutdown complete`);
    }
  }

  protected emitEvent(event: BusEvent): void {
    if (this.eventEmitter) {
      try {
        this.eventEmitter(event);
      } catch (error) {
        console.error(`[Worker:${this.queueName}] Event emitter error:`, error);
      }
    }
  }
}

// ============================================
// WORKER REGISTRY
// ============================================

/**
 * Registry for managing multiple workers.
 */
export class WorkerRegistry {
  private workers: Map<QueueName, GenesisWorker<JobPayload>> = new Map();

  /**
   * Register a worker.
   */
  register<T extends JobPayload>(worker: GenesisWorker<T>): void {
    const status = worker.getStatus();
    this.workers.set(status.queue_name, worker as GenesisWorker<JobPayload>);
  }

  /**
   * Start all registered workers.
   */
  async startAll(): Promise<void> {
    const startPromises: Promise<void>[] = [];
    
    for (const [name, worker] of this.workers) {
      console.log(`[Registry] Starting worker: ${name}`);
      startPromises.push(worker.start());
    }

    await Promise.all(startPromises);
    console.log(`[Registry] All ${this.workers.size} workers started`);
  }

  /**
   * Get all worker statuses.
   */
  getAllStatuses(): WorkerStatus[] {
    return Array.from(this.workers.values()).map((w) => w.getStatus());
  }

  /**
   * Pause all workers.
   */
  async pauseAll(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.pause();
      console.log(`[Registry] Paused: ${name}`);
    }
  }

  /**
   * Resume all workers.
   */
  resumeAll(): void {
    for (const [name, worker] of this.workers) {
      worker.resume();
      console.log(`[Registry] Resumed: ${name}`);
    }
  }

  /**
   * Gracefully shutdown all workers.
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];
    
    for (const [name, worker] of this.workers) {
      console.log(`[Registry] Shutting down: ${name}`);
      shutdownPromises.push(worker.shutdown());
    }

    await Promise.all(shutdownPromises);
    this.workers.clear();
    console.log('[Registry] All workers shutdown');
  }
}

// ============================================
// SINGLETON
// ============================================

let registry: WorkerRegistry | null = null;

/**
 * Get the singleton worker registry.
 */
export function getWorkerRegistry(): WorkerRegistry {
  if (!registry) {
    registry = new WorkerRegistry();
  }
  return registry;
}

/**
 * Reset the singleton (for testing).
 */
export function resetWorkerRegistry(): void {
  if (registry) {
    registry.shutdownAll().catch(console.error);
    registry = null;
  }
}
