/**
 * PHASE 52: DEAD LETTER QUEUE (DLQ) HANDLER
 * 
 * Manages jobs that have exhausted all retry attempts.
 * Provides inspection, replay, and cleanup capabilities.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 52
 */

import { v4 as uuidv4 } from 'uuid';
import {
  QueueName,
  QUEUE_NAMES,
  JobPayload,
  JobMetadata,
  DeadLetterEntry,
  BusEvent,
} from './bullmq-types';
import { RedisClient, getConnectionManager } from './redis-connection';

// ============================================
// DLQ CONFIGURATION
// ============================================

/**
 * DLQ configuration options.
 */
export interface DLQConfig {
  maxEntries: number;           // Max entries per queue
  retentionDays: number;        // Days to retain entries
  alertThreshold: number;       // Entries before alerting
}

/**
 * Default DLQ configuration.
 */
export const DEFAULT_DLQ_CONFIG: DLQConfig = {
  maxEntries: 10000,
  retentionDays: 30,
  alertThreshold: 100,
};

// ============================================
// DLQ STORAGE INTERFACE
// ============================================

/**
 * Storage interface for DLQ entries.
 * Allows both Redis and in-memory implementations.
 */
export interface DLQStorage {
  add(entry: DeadLetterEntry): Promise<void>;
  get(queue: QueueName, entryId: string): Promise<DeadLetterEntry | null>;
  list(queue: QueueName, limit: number, offset: number): Promise<DeadLetterEntry[]>;
  count(queue: QueueName): Promise<number>;
  remove(queue: QueueName, entryId: string): Promise<boolean>;
  clear(queue: QueueName): Promise<number>;
  cleanupOld(maxAgeDays: number): Promise<number>;
}

// ============================================
// IN-MEMORY DLQ STORAGE
// ============================================

/**
 * In-memory DLQ storage for testing.
 */
class InMemoryDLQStorage implements DLQStorage {
  private entries: Map<string, DeadLetterEntry> = new Map();

  private getKey(queue: QueueName, id: string): string {
    return `${queue}:${id}`;
  }

  async add(entry: DeadLetterEntry): Promise<void> {
    const key = this.getKey(entry.queue_name, entry.original_job_id);
    this.entries.set(key, entry);
  }

  async get(queue: QueueName, entryId: string): Promise<DeadLetterEntry | null> {
    const key = this.getKey(queue, entryId);
    return this.entries.get(key) || null;
  }

  async list(queue: QueueName, limit: number, offset: number): Promise<DeadLetterEntry[]> {
    const queueEntries = Array.from(this.entries.values())
      .filter((e) => e.queue_name === queue)
      .sort((a, b) => new Date(b.dead_lettered_at).getTime() - new Date(a.dead_lettered_at).getTime());

    return queueEntries.slice(offset, offset + limit);
  }

  async count(queue: QueueName): Promise<number> {
    return Array.from(this.entries.values())
      .filter((e) => e.queue_name === queue)
      .length;
  }

  async remove(queue: QueueName, entryId: string): Promise<boolean> {
    const key = this.getKey(queue, entryId);
    return this.entries.delete(key);
  }

  async clear(queue: QueueName): Promise<number> {
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.queue_name === queue) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  async cleanupOld(maxAgeDays: number): Promise<number> {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [key, entry] of this.entries) {
      if (new Date(entry.dead_lettered_at).getTime() < cutoff) {
        this.entries.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// ============================================
// REDIS DLQ STORAGE
// ============================================

/**
 * Redis-backed DLQ storage.
 */
class RedisDLQStorage implements DLQStorage {
  private redis: RedisClient;
  private keyPrefix: string;

  constructor(redis: RedisClient, keyPrefix: string = 'genesis:dlq:') {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  private getListKey(queue: QueueName): string {
    return `${this.keyPrefix}list:${queue}`;
  }

  private getDataKey(queue: QueueName, id: string): string {
    return `${this.keyPrefix}data:${queue}:${id}`;
  }

  async add(entry: DeadLetterEntry): Promise<void> {
    const listKey = this.getListKey(entry.queue_name);
    const dataKey = this.getDataKey(entry.queue_name, entry.original_job_id);
    const score = new Date(entry.dead_lettered_at).getTime();

    // Store entry data
    await this.redis.set(dataKey, JSON.stringify(entry));

    // Add to sorted set for ordering
    await this.redis.eval(
      `
      redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
      redis.call('EXPIRE', KEYS[1], ARGV[3])
      redis.call('EXPIRE', KEYS[2], ARGV[3])
      `,
      2,
      listKey,
      dataKey,
      score,
      entry.original_job_id,
      30 * 24 * 60 * 60 // 30 days TTL
    );
  }

  async get(queue: QueueName, entryId: string): Promise<DeadLetterEntry | null> {
    const dataKey = this.getDataKey(queue, entryId);
    const data = await this.redis.get(dataKey);
    return data ? JSON.parse(data) : null;
  }

  async list(queue: QueueName, limit: number, offset: number): Promise<DeadLetterEntry[]> {
    const listKey = this.getListKey(queue);

    // Get job IDs from sorted set (most recent first)
    const ids = await this.redis.eval(
      `return redis.call('ZREVRANGE', KEYS[1], ARGV[1], ARGV[2])`,
      1,
      listKey,
      offset,
      offset + limit - 1
    ) as string[];

    if (!ids || ids.length === 0) return [];

    // Fetch all entries
    const entries: DeadLetterEntry[] = [];
    for (const id of ids) {
      const dataKey = this.getDataKey(queue, id);
      const data = await this.redis.get(dataKey);
      if (data) {
        entries.push(JSON.parse(data));
      }
    }

    return entries;
  }

  async count(queue: QueueName): Promise<number> {
    const listKey = this.getListKey(queue);
    return await this.redis.eval(
      `return redis.call('ZCARD', KEYS[1])`,
      1,
      listKey
    ) as number;
  }

  async remove(queue: QueueName, entryId: string): Promise<boolean> {
    const listKey = this.getListKey(queue);
    const dataKey = this.getDataKey(queue, entryId);

    const result = await this.redis.eval(
      `
      local removed = redis.call('ZREM', KEYS[1], ARGV[1])
      redis.call('DEL', KEYS[2])
      return removed
      `,
      2,
      listKey,
      dataKey,
      entryId
    ) as number;

    return result > 0;
  }

  async clear(queue: QueueName): Promise<number> {
    const listKey = this.getListKey(queue);

    // Get all IDs first
    const ids = await this.redis.eval(
      `return redis.call('ZRANGE', KEYS[1], 0, -1)`,
      1,
      listKey
    ) as string[];

    if (!ids || ids.length === 0) return 0;

    // Delete all data keys
    for (const id of ids) {
      const dataKey = this.getDataKey(queue, id);
      await this.redis.del(dataKey);
    }

    // Clear the sorted set
    await this.redis.del(listKey);

    return ids.length;
  }

  async cleanupOld(maxAgeDays: number): Promise<number> {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let totalRemoved = 0;

    for (const queue of Object.values(QUEUE_NAMES)) {
      const listKey = this.getListKey(queue);

      // Get old entries
      const oldIds = await this.redis.eval(
        `return redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])`,
        1,
        listKey,
        cutoff
      ) as string[];

      if (oldIds && oldIds.length > 0) {
        for (const id of oldIds) {
          const dataKey = this.getDataKey(queue, id);
          await this.redis.del(dataKey);
        }

        await this.redis.eval(
          `redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])`,
          1,
          listKey,
          cutoff
        );

        totalRemoved += oldIds.length;
      }
    }

    return totalRemoved;
  }
}

// ============================================
// DLQ MANAGER
// ============================================

type EventEmitter = (event: BusEvent) => void;
type AlertHandler = (queue: QueueName, count: number) => void;

/**
 * Dead Letter Queue Manager.
 * 
 * Handles jobs that have exhausted all retry attempts:
 * - Stores failed jobs for inspection
 * - Provides replay capability
 * - Sends alerts when threshold exceeded
 * - Cleans up old entries
 */
export class DeadLetterQueueManager {
  private config: DLQConfig;
  private storage: DLQStorage;
  private eventEmitter: EventEmitter | null = null;
  private alertHandler: AlertHandler | null = null;
  private useRedis: boolean;
  private redisStorage: RedisDLQStorage | null = null;

  constructor(config: Partial<DLQConfig> = {}, storage?: DLQStorage) {
    this.config = { ...DEFAULT_DLQ_CONFIG, ...config };
    this.storage = storage || new InMemoryDLQStorage();
    this.useRedis = false;
  }

  /**
   * Initialize with Redis storage.
   */
  async initializeWithRedis(): Promise<void> {
    const manager = getConnectionManager();
    await manager.initialize();
    const redis = await manager.getPrimaryConnection();
    
    this.redisStorage = new RedisDLQStorage(redis);
    this.storage = this.redisStorage;
    this.useRedis = true;
  }

  /**
   * Set event emitter for observability.
   */
  setEventEmitter(emitter: EventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Set alert handler for threshold alerts.
   */
  setAlertHandler(handler: AlertHandler): void {
    this.alertHandler = handler;
  }

  /**
   * Add a failed job to the DLQ.
   */
  async addFailedJob(
    queue: QueueName,
    jobId: string,
    payload: JobPayload,
    metadata: JobMetadata,
    failureReason: string,
    failureStack?: string
  ): Promise<void> {
    const entry: DeadLetterEntry = {
      original_job_id: jobId,
      queue_name: queue,
      payload,
      metadata,
      failure_reason: failureReason,
      failure_stack: failureStack,
      attempts_made: metadata.attempt_number,
      first_attempt_at: metadata.created_at,
      last_attempt_at: new Date().toISOString(),
      dead_lettered_at: new Date().toISOString(),
    };

    await this.storage.add(entry);

    // Emit event
    this.emitEvent({
      type: 'job:dead_lettered',
      queue,
      job_id: jobId,
      reason: failureReason,
    });

    // Check alert threshold
    const count = await this.storage.count(queue);
    if (count >= this.config.alertThreshold && this.alertHandler) {
      this.alertHandler(queue, count);
    }

    console.log(`[DLQ:${queue}] Added job ${jobId}: ${failureReason}`);
  }

  /**
   * Get a specific DLQ entry.
   */
  async getEntry(queue: QueueName, jobId: string): Promise<DeadLetterEntry | null> {
    return this.storage.get(queue, jobId);
  }

  /**
   * List DLQ entries for a queue.
   */
  async listEntries(
    queue: QueueName,
    limit: number = 50,
    offset: number = 0
  ): Promise<DeadLetterEntry[]> {
    return this.storage.list(queue, limit, offset);
  }

  /**
   * Get count of DLQ entries for a queue.
   */
  async getCount(queue: QueueName): Promise<number> {
    return this.storage.count(queue);
  }

  /**
   * Get counts for all queues.
   */
  async getAllCounts(): Promise<Record<QueueName, number>> {
    const counts: Partial<Record<QueueName, number>> = {};

    for (const queue of Object.values(QUEUE_NAMES)) {
      counts[queue] = await this.storage.count(queue);
    }

    return counts as Record<QueueName, number>;
  }

  /**
   * Remove an entry from the DLQ (after replay or manual resolution).
   */
  async removeEntry(queue: QueueName, jobId: string): Promise<boolean> {
    const removed = await this.storage.remove(queue, jobId);
    if (removed) {
      console.log(`[DLQ:${queue}] Removed entry: ${jobId}`);
    }
    return removed;
  }

  /**
   * Clear all entries for a queue.
   */
  async clearQueue(queue: QueueName): Promise<number> {
    const count = await this.storage.clear(queue);
    console.log(`[DLQ:${queue}] Cleared ${count} entries`);
    return count;
  }

  /**
   * Cleanup old entries across all queues.
   */
  async cleanup(): Promise<number> {
    const removed = await this.storage.cleanupOld(this.config.retentionDays);
    console.log(`[DLQ] Cleanup removed ${removed} old entries`);
    return removed;
  }

  /**
   * Get summary statistics for all DLQs.
   */
  async getSummary(): Promise<{
    total_entries: number;
    by_queue: Record<QueueName, number>;
    alert_status: Record<QueueName, boolean>;
  }> {
    const counts = await this.getAllCounts();
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    const alertStatus: Record<string, boolean> = {};
    for (const [queue, count] of Object.entries(counts)) {
      alertStatus[queue] = count >= this.config.alertThreshold;
    }

    return {
      total_entries: total,
      by_queue: counts,
      alert_status: alertStatus as Record<QueueName, boolean>,
    };
  }

  private emitEvent(event: BusEvent): void {
    if (this.eventEmitter) {
      try {
        this.eventEmitter(event);
      } catch (error) {
        console.error('[DLQ] Event emitter error:', error);
      }
    }
  }
}

// ============================================
// REPLAY MANAGER
// ============================================

/**
 * Replays failed jobs from the DLQ back to their original queues.
 */
export interface ReplayResult {
  job_id: string;
  success: boolean;
  new_job_id?: string;
  error?: string;
}

/**
 * Replay handler function type.
 * Must be provided to replay jobs back to their queues.
 */
export type ReplayHandler = (
  queue: QueueName,
  payload: JobPayload,
  metadata: JobMetadata
) => Promise<string>;

/**
 * Replays DLQ entries back to their original queues.
 */
export class DLQReplayManager {
  private dlqManager: DeadLetterQueueManager;
  private replayHandler: ReplayHandler;

  constructor(dlqManager: DeadLetterQueueManager, replayHandler: ReplayHandler) {
    this.dlqManager = dlqManager;
    this.replayHandler = replayHandler;
  }

  /**
   * Replay a single DLQ entry.
   */
  async replayOne(queue: QueueName, jobId: string): Promise<ReplayResult> {
    const entry = await this.dlqManager.getEntry(queue, jobId);

    if (!entry) {
      return { job_id: jobId, success: false, error: 'Entry not found' };
    }

    try {
      // Reset attempt count in metadata
      const metadata: JobMetadata = {
        ...entry.metadata,
        attempt_number: 0,
        parent_job_id: entry.original_job_id, // Track original job
      };

      const newJobId = await this.replayHandler(queue, entry.payload, metadata);

      // Remove from DLQ on successful replay
      await this.dlqManager.removeEntry(queue, jobId);

      console.log(`[DLQ:${queue}] Replayed ${jobId} -> ${newJobId}`);

      return { job_id: jobId, success: true, new_job_id: newJobId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DLQ:${queue}] Replay failed for ${jobId}:`, message);
      return { job_id: jobId, success: false, error: message };
    }
  }

  /**
   * Replay multiple DLQ entries.
   */
  async replayMany(
    queue: QueueName,
    jobIds: string[]
  ): Promise<{ results: ReplayResult[]; success_count: number; failure_count: number }> {
    const results: ReplayResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const jobId of jobIds) {
      const result = await this.replayOne(queue, jobId);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      results,
      success_count: successCount,
      failure_count: failureCount,
    };
  }

  /**
   * Replay all entries in a queue.
   */
  async replayAll(
    queue: QueueName,
    batchSize: number = 50
  ): Promise<{ total_replayed: number; total_failed: number }> {
    let totalReplayed = 0;
    let totalFailed = 0;
    let offset = 0;

    while (true) {
      const entries = await this.dlqManager.listEntries(queue, batchSize, offset);

      if (entries.length === 0) break;

      const jobIds = entries.map((e) => e.original_job_id);
      const { success_count, failure_count } = await this.replayMany(queue, jobIds);

      totalReplayed += success_count;
      totalFailed += failure_count;

      // If we replayed successfully, don't increment offset
      // because we're removing entries
      if (failure_count > 0) {
        offset += failure_count;
      }

      // If all failed, we're stuck - break to prevent infinite loop
      if (success_count === 0) break;
    }

    return { total_replayed: totalReplayed, total_failed: totalFailed };
  }
}

// ============================================
// SINGLETON
// ============================================

let dlqManager: DeadLetterQueueManager | null = null;

/**
 * Get the singleton DLQ manager.
 */
export function getDLQManager(config?: Partial<DLQConfig>): DeadLetterQueueManager {
  if (!dlqManager) {
    dlqManager = new DeadLetterQueueManager(config);
  }
  return dlqManager;
}

/**
 * Reset the singleton (for testing).
 */
export function resetDLQManager(): void {
  dlqManager = null;
}
