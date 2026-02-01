/**
 * PHASE 59: RATE LIMIT MANAGER
 * 
 * Manages external API rate limits with token bucket algorithm, queuing, and overrides.
 */

import {
  RateLimitService,
  RateLimitConfig,
  RateLimitState,
  RateLimitCheckResult,
  RateLimitRequest,
  RateLimitOverrideToken,
  RateLimitRejectionReason,
  RateLimitStore,
  RateLimitWindowType,
  RateLimitEnforcementStrategy,
  DEFAULT_RATE_LIMITS,
} from './types';

/**
 * Rate Limit Manager
 * 
 * Enforces rate limits for external APIs to prevent quota exhaustion.
 */
export class RateLimitManager {
  private configs: Map<RateLimitService, RateLimitConfig>;

  constructor(private store: RateLimitStore) {
    // Load default configurations
    this.configs = new Map();
    Object.entries(DEFAULT_RATE_LIMITS).forEach(([service, config]) => {
      this.configs.set(service as RateLimitService, config);
    });
  }

  /**
   * Check if request is allowed (pre-flight check)
   */
  async checkRateLimit(request: RateLimitRequest): Promise<RateLimitCheckResult> {
    const config = this.configs.get(request.service);
    if (!config) {
      throw new Error(`No rate limit configuration found for service: ${request.service}`);
    }

    // Check for active overrides
    const overrides = await this.store.getActiveOverrides(request.workspaceId);
    const override = overrides.find((o) => o.service === request.service);

    // Get current tenant state
    const tenantState = await this.store.getState(request.workspaceId, request.service);
    const now = new Date();

    // Initialize state if doesn't exist
    const currentTenantState = tenantState || this.initializeState(
      request.workspaceId,
      request.service,
      config,
      now
    );

    // Check if window has expired and needs reset
    if (now >= currentTenantState.windowEnd) {
      await this.store.resetWindow(request.workspaceId, request.service);
      currentTenantState.currentRequests = 0;
      currentTenantState.windowStart = now;
      currentTenantState.windowEnd = this.calculateWindowEnd(now, config.perTenantDefault);
    }

    // Apply override if exists
    const effectiveLimit = override 
      ? override.overrideLimit 
      : config.perTenantDefault.maxRequests;

    // Check tenant limit
    if (currentTenantState.currentRequests >= effectiveLimit) {
      return {
        allowed: false,
        reason: RateLimitRejectionReason.TENANT_LIMIT_EXCEEDED,
        state: currentTenantState,
        retryAfter: currentTenantState.windowEnd,
      };
    }

    // Check concurrent limit if applicable
    if (config.perTenantDefault.maxConcurrent) {
      if ((currentTenantState.currentConcurrent || 0) >= config.perTenantDefault.maxConcurrent) {
        return {
          allowed: false,
          reason: RateLimitRejectionReason.CONCURRENT_LIMIT_EXCEEDED,
          state: currentTenantState,
        };
      }
    }

    // Check global limit
    const globalState = await this.store.getGlobalState(request.service);
    if (globalState) {
      // Reset global window if expired
      if (now >= globalState.windowEnd) {
        // Global resets are handled at the store level
        globalState.currentRequests = 0;
      }

      if (globalState.currentRequests >= config.globalLimit.maxRequests) {
        // Apply enforcement strategy
        if (config.enforcementStrategy === RateLimitEnforcementStrategy.REJECT) {
          return {
            allowed: false,
            reason: RateLimitRejectionReason.GLOBAL_LIMIT_EXCEEDED,
            state: currentTenantState,
            retryAfter: globalState.windowEnd,
          };
        } else if (config.enforcementStrategy === RateLimitEnforcementStrategy.QUEUE) {
          // Estimate queue wait time
          const estimatedWaitMs = this.estimateQueueWait(globalState, config);
          return {
            allowed: false,
            reason: RateLimitRejectionReason.GLOBAL_LIMIT_EXCEEDED,
            state: currentTenantState,
            estimatedWaitMs,
            queuePosition: 0, // Would be calculated from actual queue
          };
        }
      }
    }

    // Request is allowed
    return {
      allowed: true,
      state: currentTenantState,
    };
  }

  /**
   * Consume rate limit quota (record actual usage)
   */
  async consumeQuota(request: RateLimitRequest): Promise<RateLimitState> {
    const count = request.requestCount || 1;

    // Increment tenant counter
    const tenantState = await this.store.incrementRequests(
      request.workspaceId,
      request.service,
      count
    );

    // Increment global counter
    await this.store.incrementGlobalRequests(request.service, count);

    return tenantState;
  }

  /**
   * Execute request with rate limit check and consumption
   */
  async executeWithRateLimit<T>(
    request: RateLimitRequest,
    operation: () => Promise<T>
  ): Promise<T> {
    // Pre-flight check
    const check = await this.checkRateLimit(request);

    if (!check.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded: ${check.reason}`,
        check.reason!,
        check.retryAfter,
        check.estimatedWaitMs
      );
    }

    // Execute operation
    const result = await operation();

    // Consume quota
    await this.consumeQuota(request);

    return result;
  }

  /**
   * Register custom rate limit configuration
   */
  registerConfig(config: RateLimitConfig): void {
    this.configs.set(config.service, config);
  }

  /**
   * Get current rate limit state
   */
  async getState(workspaceId: string, service: RateLimitService): Promise<RateLimitState | null> {
    return this.store.getState(workspaceId, service);
  }

  /**
   * Get global rate limit state
   */
  async getGlobalState(service: RateLimitService): Promise<RateLimitState | null> {
    return this.store.getGlobalState(service);
  }

  /**
   * Apply rate limit override token
   */
  async applyOverride(token: RateLimitOverrideToken): Promise<void> {
    // Validate token
    const now = new Date();
    if (now < token.validFrom || now > token.validUntil) {
      throw new Error('Override token is not valid at this time');
    }

    await this.store.applyOverride(token);
  }

  /**
   * Get active overrides for workspace
   */
  async getActiveOverrides(workspaceId: string): Promise<RateLimitOverrideToken[]> {
    return this.store.getActiveOverrides(workspaceId);
  }

  /**
   * Reset rate limit window (for testing or manual reset)
   */
  async resetWindow(workspaceId: string, service: RateLimitService): Promise<void> {
    await this.store.resetWindow(workspaceId, service);
  }

  /**
   * Initialize state for new workspace/service
   */
  private initializeState(
    workspaceId: string,
    service: RateLimitService,
    config: RateLimitConfig,
    now: Date
  ): RateLimitState {
    const windowEnd = this.calculateWindowEnd(now, config.perTenantDefault);

    return {
      workspaceId,
      service,
      currentRequests: 0,
      maxRequests: config.perTenantDefault.maxRequests,
      windowStart: now,
      windowEnd,
      remainingRequests: config.perTenantDefault.maxRequests,
      currentConcurrent: 0,
      maxConcurrent: config.perTenantDefault.maxConcurrent,
      isThrottled: false,
    };
  }

  /**
   * Calculate window end time
   */
  private calculateWindowEnd(start: Date, quota: { windowSeconds: number }): Date {
    return new Date(start.getTime() + quota.windowSeconds * 1000);
  }

  /**
   * Estimate queue wait time
   */
  private estimateQueueWait(globalState: RateLimitState, config: RateLimitConfig): number {
    // Simple estimation: time until next window
    const now = new Date();
    const timeUntilReset = globalState.windowEnd.getTime() - now.getTime();
    return Math.max(0, timeUntilReset);
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public reason: RateLimitRejectionReason,
    public retryAfter?: Date,
    public estimatedWaitMs?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Rate Limit Queue Manager
 * 
 * Manages queued requests when global limits are exceeded.
 */
export class RateLimitQueueManager {
  private queues: Map<RateLimitService, QueuedRequest[]>;

  constructor() {
    this.queues = new Map();
  }

  /**
   * Add request to queue
   */
  enqueue(service: RateLimitService, request: QueuedRequest): void {
    if (!this.queues.has(service)) {
      this.queues.set(service, []);
    }

    const queue = this.queues.get(service)!;
    queue.push(request);

    // Sort by priority (higher priority first)
    queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Dequeue next request
   */
  dequeue(service: RateLimitService): QueuedRequest | undefined {
    const queue = this.queues.get(service);
    if (!queue || queue.length === 0) {
      return undefined;
    }

    return queue.shift();
  }

  /**
   * Get queue length
   */
  getQueueLength(service: RateLimitService): number {
    const queue = this.queues.get(service);
    return queue ? queue.length : 0;
  }

  /**
   * Get queue position for workspace
   */
  getQueuePosition(service: RateLimitService, workspaceId: string): number {
    const queue = this.queues.get(service);
    if (!queue) {
      return -1;
    }

    return queue.findIndex((req) => req.workspaceId === workspaceId);
  }

  /**
   * Clear queue
   */
  clearQueue(service: RateLimitService): void {
    this.queues.delete(service);
  }

  /**
   * Get all queues status
   */
  getQueuesStatus(): Record<RateLimitService, number> {
    const status: Partial<Record<RateLimitService, number>> = {};

    this.queues.forEach((queue, service) => {
      status[service] = queue.length;
    });

    return status as Record<RateLimitService, number>;
  }
}

/**
 * Queued Request
 */
interface QueuedRequest {
  workspaceId: string;
  request: RateLimitRequest;
  priority?: number;
  enqueuedAt: Date;
  resolver: (result: any) => void;
  rejecter: (error: any) => void;
}

/**
 * Token Bucket Implementation
 * 
 * Classic token bucket algorithm for rate limiting.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: Date;

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
    private currentTokens?: number
  ) {
    this.tokens = currentTokens !== undefined ? currentTokens : capacity;
    this.lastRefill = new Date();
  }

  /**
   * Try to consume tokens
   */
  tryConsume(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get time until tokens are available
   */
  getTimeUntilAvailable(count: number): number {
    this.refill();

    if (this.tokens >= count) {
      return 0;
    }

    const tokensNeeded = count - this.tokens;
    const secondsNeeded = tokensNeeded / this.refillRate;

    return Math.ceil(secondsNeeded * 1000); // Convert to milliseconds
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = new Date();
    const elapsedSeconds = (now.getTime() - this.lastRefill.getTime()) / 1000;

    const tokensToAdd = elapsedSeconds * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Reset bucket
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = new Date();
  }
}

/**
 * Rate Limit Analytics
 * 
 * Analyzes rate limit usage patterns.
 */
export class RateLimitAnalytics {
  constructor(private store: RateLimitStore) {}

  /**
   * Calculate utilization percentage for workspace
   */
  async calculateUtilization(
    workspaceId: string,
    service: RateLimitService
  ): Promise<number> {
    const state = await this.store.getState(workspaceId, service);

    if (!state) {
      return 0;
    }

    return state.maxRequests > 0
      ? Math.round((state.currentRequests / state.maxRequests) * 10000) / 100
      : 0;
  }

  /**
   * Get workspaces approaching limit
   */
  async getWorkspacesApproachingLimit(
    service: RateLimitService,
    threshold: number = 80 // Percentage
  ): Promise<Array<{
    workspaceId: string;
    utilizationPercent: number;
    remainingRequests: number;
  }>> {
    // This would query all workspaces from store
    // Simplified implementation
    return [];
  }

  /**
   * Predict time until limit exhaustion
   */
  async predictExhaustion(
    workspaceId: string,
    service: RateLimitService,
    requestRatePerMinute: number
  ): Promise<{
    willExhaust: boolean;
    estimatedMinutes?: number;
  }> {
    const state = await this.store.getState(workspaceId, service);

    if (!state) {
      return { willExhaust: false };
    }

    const remainingRequests = state.maxRequests - state.currentRequests;

    if (requestRatePerMinute <= 0 || remainingRequests <= 0) {
      return { willExhaust: true, estimatedMinutes: 0 };
    }

    const estimatedMinutes = Math.floor(remainingRequests / requestRatePerMinute);

    return {
      willExhaust: true,
      estimatedMinutes,
    };
  }
}
