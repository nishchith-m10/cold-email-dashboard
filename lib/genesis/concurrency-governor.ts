/**
 * PHASE 52: CONCURRENCY GOVERNOR
 * 
 * Prevents the "Thundering Herd" scenario by implementing:
 * - Global concurrency limits
 * - Per-account concurrency limits (DO API protection)
 * - Rate limiting with sliding window
 * - Circuit breaker pattern
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 52.1.2
 */

import {
  GovernorConfig,
  DEFAULT_GOVERNOR_CONFIG,
  QueueName,
  BusEvent,
} from './bullmq-types';
import { RedisClient, getConnectionManager } from './redis-connection';

// ============================================
// CIRCUIT BREAKER STATE
// ============================================

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
  successCount: number;
  openedAt?: number;
}

// ============================================
// RATE LIMITER
// ============================================

/**
 * Sliding window rate limiter using Redis.
 */
class SlidingWindowRateLimiter {
  private redis: RedisClient | null = null;
  private windowMs: number;
  private maxRequests: number;
  private keyPrefix: string;

  constructor(windowMs: number, maxRequests: number, keyPrefix: string = 'governor:rate:') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyPrefix = keyPrefix;
  }

  setRedis(redis: RedisClient): void {
    this.redis = redis;
  }

  /**
   * Check if request is allowed and record it.
   * Returns remaining capacity.
   */
  async checkAndRecord(key: string): Promise<{ allowed: boolean; remaining: number; retryAfterMs?: number }> {
    if (!this.redis) {
      // Fallback to allowing (in-memory mode)
      return { allowed: true, remaining: this.maxRequests };
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;
    const fullKey = `${this.keyPrefix}${key}`;

    // Lua script for atomic sliding window check
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_start = tonumber(ARGV[2])
      local max_requests = tonumber(ARGV[3])
      local window_ms = tonumber(ARGV[4])
      
      -- Remove old entries outside window
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
      
      -- Count current entries
      local count = redis.call('ZCARD', key)
      
      if count < max_requests then
        -- Add new entry with current timestamp as score
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        redis.call('PEXPIRE', key, window_ms)
        return {1, max_requests - count - 1, 0}
      else
        -- Get oldest entry to calculate retry time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local retry_after = 0
        if #oldest >= 2 then
          retry_after = tonumber(oldest[2]) + window_ms - now
        end
        return {0, 0, retry_after}
      end
    `;

    try {
      const result = await this.redis.eval(
        script,
        1,
        fullKey,
        now,
        windowStart,
        this.maxRequests,
        this.windowMs
      ) as [number, number, number];

      return {
        allowed: result[0] === 1,
        remaining: result[1],
        retryAfterMs: result[2] > 0 ? result[2] : undefined,
      };
    } catch (error) {
      // On Redis error, allow request (fail-open for availability)
      console.error('[RateLimiter] Redis error, allowing request:', error);
      return { allowed: true, remaining: this.maxRequests };
    }
  }

  /**
   * Get current rate for a key.
   */
  async getCurrentRate(key: string): Promise<number> {
    if (!this.redis) return 0;

    const now = Date.now();
    const windowStart = now - this.windowMs;
    const fullKey = `${this.keyPrefix}${key}`;

    try {
      // Count entries in current window
      const count = await this.redis.eval(
        `
        local key = KEYS[1]
        local window_start = tonumber(ARGV[1])
        redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
        return redis.call('ZCARD', key)
        `,
        1,
        fullKey,
        windowStart
      ) as number;

      return count;
    } catch {
      return 0;
    }
  }
}

// ============================================
// CONCURRENCY TRACKER
// ============================================

/**
 * Tracks concurrent operations per scope.
 */
class ConcurrencyTracker {
  private redis: RedisClient | null = null;
  private keyPrefix: string;
  private ttlMs: number;

  // In-memory fallback
  private localCounts: Map<string, Set<string>> = new Map();

  constructor(keyPrefix: string = 'governor:conc:', ttlMs: number = 60000) {
    this.keyPrefix = keyPrefix;
    this.ttlMs = ttlMs;
  }

  setRedis(redis: RedisClient): void {
    this.redis = redis;
  }

  /**
   * Acquire a concurrency slot.
   * Returns true if acquired, false if limit reached.
   */
  async acquire(scope: string, jobId: string, limit: number): Promise<boolean> {
    if (!this.redis) {
      // In-memory fallback
      const set = this.localCounts.get(scope) || new Set();
      if (set.size >= limit) return false;
      set.add(jobId);
      this.localCounts.set(scope, set);
      return true;
    }

    const key = `${this.keyPrefix}${scope}`;
    const now = Date.now();

    const script = `
      local key = KEYS[1]
      local job_id = ARGV[1]
      local limit = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local ttl_ms = tonumber(ARGV[4])
      
      -- Clean up expired entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', now - ttl_ms)
      
      -- Check current count
      local count = redis.call('ZCARD', key)
      
      if count < limit then
        -- Add job with current timestamp
        redis.call('ZADD', key, now, job_id)
        redis.call('PEXPIRE', key, ttl_ms)
        return 1
      end
      
      return 0
    `;

    try {
      const result = await this.redis.eval(script, 1, key, jobId, limit, now, this.ttlMs) as number;
      return result === 1;
    } catch (error) {
      console.error('[ConcurrencyTracker] Redis error:', error);
      return true; // Fail-open
    }
  }

  /**
   * Release a concurrency slot.
   */
  async release(scope: string, jobId: string): Promise<void> {
    if (!this.redis) {
      const set = this.localCounts.get(scope);
      if (set) set.delete(jobId);
      return;
    }

    const key = `${this.keyPrefix}${scope}`;

    try {
      await this.redis.eval(
        `redis.call('ZREM', KEYS[1], ARGV[1])`,
        1,
        key,
        jobId
      );
    } catch (error) {
      console.error('[ConcurrencyTracker] Release error:', error);
    }
  }

  /**
   * Get current count for a scope.
   */
  async getCount(scope: string): Promise<number> {
    if (!this.redis) {
      return this.localCounts.get(scope)?.size || 0;
    }

    const key = `${this.keyPrefix}${scope}`;
    const now = Date.now();

    try {
      const count = await this.redis.eval(
        `
        redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[1]) - tonumber(ARGV[2]))
        return redis.call('ZCARD', KEYS[1])
        `,
        1,
        key,
        now,
        this.ttlMs
      ) as number;
      return count;
    } catch {
      return 0;
    }
  }
}

// ============================================
// CONCURRENCY GOVERNOR
// ============================================

type EventEmitter = (event: BusEvent) => void;

/**
 * Central Concurrency Governor for the Genesis Event Bus.
 * 
 * Implements the "Leaky Bucket" pattern per Phase 52 specification:
 * - maxConcurrency: 100 (max simultaneous jobs)
 * - rateLimitMax: 200 (max jobs per second)
 * - Exponential backoff on failures
 * - Circuit breaker for cascading failure prevention
 */
export class ConcurrencyGovernor {
  private config: GovernorConfig;
  private rateLimiter: SlidingWindowRateLimiter;
  private globalConcurrency: ConcurrencyTracker;
  private accountConcurrency: ConcurrencyTracker;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private eventEmitter: EventEmitter | null = null;

  constructor(config: Partial<GovernorConfig> = {}) {
    this.config = { ...DEFAULT_GOVERNOR_CONFIG, ...config };
    
    this.rateLimiter = new SlidingWindowRateLimiter(
      this.config.rate_limit_window_ms,
      this.config.rate_limit_max_jobs
    );
    
    this.globalConcurrency = new ConcurrencyTracker('governor:global:', 120000);
    this.accountConcurrency = new ConcurrencyTracker('governor:account:', 120000);
  }

  /**
   * Initialize with Redis connection.
   */
  async initialize(): Promise<void> {
    const manager = getConnectionManager();
    await manager.initialize();
    const redis = await manager.getPrimaryConnection();
    
    this.rateLimiter.setRedis(redis);
    this.globalConcurrency.setRedis(redis);
    this.accountConcurrency.setRedis(redis);
  }

  /**
   * Set event emitter for observability.
   */
  setEventEmitter(emitter: EventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Request permission to process a job.
   * Returns a release function if granted, null if denied.
   */
  async acquire(
    queue: QueueName,
    jobId: string,
    doAccountId?: string
  ): Promise<{ granted: boolean; release?: () => Promise<void>; retryAfterMs?: number }> {
    // Check circuit breaker
    const circuit = this.getCircuitBreaker(queue);
    if (circuit.state === 'open') {
      const timeSinceOpen = Date.now() - (circuit.openedAt || 0);
      if (timeSinceOpen < this.config.circuit_breaker_reset_ms) {
        return { granted: false, retryAfterMs: this.config.circuit_breaker_reset_ms - timeSinceOpen };
      }
      // Transition to half-open
      circuit.state = 'half-open';
      circuit.successCount = 0;
    }

    // Check rate limit
    const rateResult = await this.rateLimiter.checkAndRecord(`queue:${queue}`);
    if (!rateResult.allowed) {
      this.emitEvent({
        type: 'governor:rate_limited',
        queue,
        current_rate: this.config.rate_limit_max_jobs - rateResult.remaining,
      });
      return { granted: false, retryAfterMs: rateResult.retryAfterMs };
    }

    // Check global concurrency
    const globalAcquired = await this.globalConcurrency.acquire(
      'global',
      jobId,
      this.config.global_max_concurrent
    );
    if (!globalAcquired) {
      return { granted: false, retryAfterMs: 100 }; // Quick retry
    }

    // Check per-account concurrency (for DO API calls)
    if (doAccountId) {
      const accountAcquired = await this.accountConcurrency.acquire(
        doAccountId,
        jobId,
        this.config.per_account_max_concurrent
      );
      if (!accountAcquired) {
        // Release global slot
        await this.globalConcurrency.release('global', jobId);
        return { granted: false, retryAfterMs: 200 };
      }
    }

    // Create release function
    const release = async () => {
      await this.globalConcurrency.release('global', jobId);
      if (doAccountId) {
        await this.accountConcurrency.release(doAccountId, jobId);
      }
    };

    return { granted: true, release };
  }

  /**
   * Record a successful job completion.
   */
  recordSuccess(queue: QueueName): void {
    const circuit = this.getCircuitBreaker(queue);
    
    if (circuit.state === 'half-open') {
      circuit.successCount++;
      // After 5 successes in half-open, close the circuit
      if (circuit.successCount >= 5) {
        circuit.state = 'closed';
        circuit.failureCount = 0;
        this.emitEvent({ type: 'governor:circuit_closed', queue });
      }
    } else if (circuit.state === 'closed') {
      // Reset failure count on success
      circuit.failureCount = Math.max(0, circuit.failureCount - 1);
    }
  }

  /**
   * Record a job failure.
   */
  recordFailure(queue: QueueName): void {
    const circuit = this.getCircuitBreaker(queue);
    circuit.failureCount++;
    circuit.lastFailureAt = Date.now();

    if (circuit.state === 'half-open') {
      // Any failure in half-open reopens the circuit
      circuit.state = 'open';
      circuit.openedAt = Date.now();
      this.emitEvent({
        type: 'governor:circuit_open',
        queue,
        failures: circuit.failureCount,
      });
    } else if (circuit.state === 'closed' && circuit.failureCount >= this.config.circuit_breaker_threshold) {
      // Too many failures, open the circuit
      circuit.state = 'open';
      circuit.openedAt = Date.now();
      this.emitEvent({
        type: 'governor:circuit_open',
        queue,
        failures: circuit.failureCount,
      });
    }
  }

  /**
   * Get current governor stats.
   */
  async getStats(): Promise<{
    global_concurrency: number;
    rate_per_second: Record<string, number>;
    circuit_breakers: Record<string, CircuitState>;
  }> {
    const globalCount = await this.globalConcurrency.getCount('global');

    const ratePerSecond: Record<string, number> = {};
    for (const queue of ['ignition', 'security', 'template', 'health', 'metric', 'reboot']) {
      ratePerSecond[queue] = await this.rateLimiter.getCurrentRate(`queue:genesis:${queue}`);
    }

    const circuitBreakers: Record<string, CircuitState> = {};
    for (const [queue, state] of this.circuitBreakers) {
      circuitBreakers[queue] = state.state;
    }

    return {
      global_concurrency: globalCount,
      rate_per_second: ratePerSecond,
      circuit_breakers: circuitBreakers,
    };
  }

  /**
   * Check if a queue's circuit is open.
   */
  isCircuitOpen(queue: QueueName): boolean {
    const circuit = this.circuitBreakers.get(queue);
    return circuit?.state === 'open';
  }

  /**
   * Manually reset a circuit breaker.
   */
  resetCircuit(queue: QueueName): void {
    const circuit = this.getCircuitBreaker(queue);
    circuit.state = 'closed';
    circuit.failureCount = 0;
    circuit.successCount = 0;
    this.emitEvent({ type: 'governor:circuit_closed', queue });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getCircuitBreaker(queue: QueueName): CircuitBreakerState {
    let circuit = this.circuitBreakers.get(queue);
    if (!circuit) {
      circuit = {
        state: 'closed',
        failureCount: 0,
        lastFailureAt: 0,
        successCount: 0,
      };
      this.circuitBreakers.set(queue, circuit);
    }
    return circuit;
  }

  private emitEvent(event: BusEvent): void {
    if (this.eventEmitter) {
      try {
        this.eventEmitter(event);
      } catch (error) {
        console.error('[Governor] Event emitter error:', error);
      }
    }
  }
}

// ============================================
// SINGLETON
// ============================================

let governor: ConcurrencyGovernor | null = null;

/**
 * Get the singleton Concurrency Governor.
 */
export function getConcurrencyGovernor(config?: Partial<GovernorConfig>): ConcurrencyGovernor {
  if (!governor) {
    governor = new ConcurrencyGovernor(config);
  }
  return governor;
}

/**
 * Reset the singleton (for testing).
 */
export function resetConcurrencyGovernor(): void {
  governor = null;
}
