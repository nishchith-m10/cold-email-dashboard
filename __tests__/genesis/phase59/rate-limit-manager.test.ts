/**
 * PHASE 59 TESTS: RATE LIMIT MANAGER
 */

import {
  RateLimitManager,
  RateLimitError,
  TokenBucket,
  RateLimitQueueManager,
  RateLimitAnalytics,
} from '@/lib/genesis/phase59/rate-limit-manager';
import { MockRateLimitStore, TestDataFactory } from '@/lib/genesis/phase59/mocks';
import { RateLimitService, RateLimitRejectionReason } from '@/lib/genesis/phase59/types';

describe('Phase 59: Rate Limit Manager', () => {
  let store: MockRateLimitStore;
  let manager: RateLimitManager;

  beforeEach(() => {
    store = new MockRateLimitStore();
    manager = new RateLimitManager(store);
  });

  describe('checkRateLimit', () => {
    test('should allow request within limit', async () => {
      const result = await manager.checkRateLimit({
        workspaceId: 'ws_1',
        service: RateLimitService.OPENAI,
      });

      expect(result.allowed).toBe(true);
      expect(result.state).toBeDefined();
    });

    test('should reject request exceeding tenant limit', async () => {
      // Set up state at limit
      const state = TestDataFactory.createRateLimitState('ws_1', RateLimitService.OPENAI, {
        currentRequests: 100,
        maxRequests: 100,
      });
      store.setState('ws_1', RateLimitService.OPENAI, state);

      const result = await manager.checkRateLimit({
        workspaceId: 'ws_1',
        service: RateLimitService.OPENAI,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(RateLimitRejectionReason.TENANT_LIMIT_EXCEEDED);
    });

    test('should reject request exceeding global limit', async () => {
      // Set up global state at limit
      const globalState = TestDataFactory.createRateLimitState('global', RateLimitService.GOOGLE_CSE, {
        currentRequests: 10000,
        maxRequests: 10000,
      });
      store.setGlobalState(RateLimitService.GOOGLE_CSE, globalState);

      const result = await manager.checkRateLimit({
        workspaceId: 'ws_1',
        service: RateLimitService.GOOGLE_CSE,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(RateLimitRejectionReason.GLOBAL_LIMIT_EXCEEDED);
    });

    test('should apply override token', async () => {
      // Set up state at normal limit
      const state = TestDataFactory.createRateLimitState('ws_1', RateLimitService.OPENAI, {
        currentRequests: 100,
        maxRequests: 100,
      });
      store.setState('ws_1', RateLimitService.OPENAI, state);

      // Apply override
      const override = TestDataFactory.createOverrideToken('ws_1', RateLimitService.OPENAI, {
        overrideLimit: 200,
      });
      await manager.applyOverride(override);

      const result = await manager.checkRateLimit({
        workspaceId: 'ws_1',
        service: RateLimitService.OPENAI,
      });

      expect(result.allowed).toBe(true); // Override allows more
    });

    test('should reject expired override token', async () => {
      const expiredOverride = TestDataFactory.createOverrideToken('ws_1', RateLimitService.OPENAI, {
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
      });

      await expect(manager.applyOverride(expiredOverride)).rejects.toThrow(
        'Override token is not valid at this time'
      );
    });
  });

  describe('consumeQuota', () => {
    test('should increment tenant counter', async () => {
      const result = await manager.consumeQuota({
        workspaceId: 'ws_1',
        service: RateLimitService.OPENAI,
      });

      expect(result.currentRequests).toBe(1);
    });

    test('should increment by custom count', async () => {
      await manager.consumeQuota({
        workspaceId: 'ws_1',
        service: RateLimitService.OPENAI,
        requestCount: 5,
      });

      const state = await manager.getState('ws_1', RateLimitService.OPENAI);
      expect(state?.currentRequests).toBe(5);
    });

    test('should increment global counter', async () => {
      await manager.consumeQuota({
        workspaceId: 'ws_1',
        service: RateLimitService.OPENAI,
      });

      const globalState = await manager.getGlobalState(RateLimitService.OPENAI);
      expect(globalState?.currentRequests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('executeWithRateLimit', () => {
    test('should execute operation if allowed', async () => {
      const operation = (jest.fn() as any).mockResolvedValue('success');

      const result = await manager.executeWithRateLimit(
        {
          workspaceId: 'ws_1',
          service: RateLimitService.OPENAI,
        },
        operation
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    test('should throw RateLimitError if not allowed', async () => {
      // Set up state at limit
      const state = TestDataFactory.createRateLimitState('ws_1', RateLimitService.OPENAI, {
        currentRequests: 100,
        maxRequests: 100,
      });
      store.setState('ws_1', RateLimitService.OPENAI, state);

      const operation = (jest.fn() as any).mockResolvedValue('success');

      await expect(
        manager.executeWithRateLimit(
          {
            workspaceId: 'ws_1',
            service: RateLimitService.OPENAI,
          },
          operation
        )
      ).rejects.toThrow(RateLimitError);

      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('resetWindow', () => {
    test('should reset rate limit window', async () => {
      // Consume some quota
      await manager.consumeQuota({
        workspaceId: 'ws_1',
        service: RateLimitService.OPENAI,
        requestCount: 50,
      });

      // Reset
      await manager.resetWindow('ws_1', RateLimitService.OPENAI);

      const state = await manager.getState('ws_1', RateLimitService.OPENAI);
      expect(state?.currentRequests).toBe(0);
    });
  });
});

describe('Phase 59: Token Bucket', () => {
  test('should allow consumption within capacity', () => {
    const bucket = new TokenBucket(100, 10); // 100 tokens, refill 10/sec

    const allowed = bucket.tryConsume(50);

    expect(allowed).toBe(true);
    expect(bucket.getTokens()).toBe(50);
  });

  test('should reject consumption exceeding capacity', () => {
    const bucket = new TokenBucket(100, 10);

    const allowed = bucket.tryConsume(150);

    expect(allowed).toBe(false);
    expect(bucket.getTokens()).toBe(100);
  });

  test('should refill tokens over time', async () => {
    const bucket = new TokenBucket(100, 10); // 10 tokens per second

    // Consume 50 tokens
    bucket.tryConsume(50);
    expect(bucket.getTokens()).toBe(50);

    // Wait 2 seconds (should refill 20 tokens)
    await new Promise((resolve) => setTimeout(resolve, 2100));

    expect(bucket.getTokens()).toBeGreaterThanOrEqual(70);
  });

  test('should not exceed capacity when refilling', async () => {
    const bucket = new TokenBucket(100, 10);

    // Wait to ensure full refill
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(bucket.getTokens()).toBeLessThanOrEqual(100);
  });

  test('should calculate time until tokens available', () => {
    const bucket = new TokenBucket(100, 10);
    bucket.tryConsume(100); // Empty bucket

    const timeMs = bucket.getTimeUntilAvailable(20);

    // Need 20 tokens at 10/sec = 2 seconds
    expect(timeMs).toBeGreaterThanOrEqual(2000);
  });

  test('should reset bucket', () => {
    const bucket = new TokenBucket(100, 10);
    bucket.tryConsume(50);

    bucket.reset();

    expect(bucket.getTokens()).toBe(100);
  });
});

describe('Phase 59: Rate Limit Queue Manager', () => {
  let queueManager: RateLimitQueueManager;

  beforeEach(() => {
    queueManager = new RateLimitQueueManager();
  });

  test('should enqueue request', () => {
    queueManager.enqueue(RateLimitService.OPENAI, {
      workspaceId: 'ws_1',
      request: { workspaceId: 'ws_1', service: RateLimitService.OPENAI },
      enqueuedAt: new Date(),
      resolver: () => {},
      rejecter: () => {},
    });

    expect(queueManager.getQueueLength(RateLimitService.OPENAI)).toBe(1);
  });

  test('should dequeue request', () => {
    queueManager.enqueue(RateLimitService.OPENAI, {
      workspaceId: 'ws_1',
      request: { workspaceId: 'ws_1', service: RateLimitService.OPENAI },
      enqueuedAt: new Date(),
      resolver: () => {},
      rejecter: () => {},
    });

    const request = queueManager.dequeue(RateLimitService.OPENAI);

    expect(request).toBeDefined();
    expect(queueManager.getQueueLength(RateLimitService.OPENAI)).toBe(0);
  });

  test('should prioritize requests by priority', () => {
    queueManager.enqueue(RateLimitService.OPENAI, {
      workspaceId: 'ws_1',
      request: { workspaceId: 'ws_1', service: RateLimitService.OPENAI, priority: 1 },
      priority: 1,
      enqueuedAt: new Date(),
      resolver: () => {},
      rejecter: () => {},
    });

    queueManager.enqueue(RateLimitService.OPENAI, {
      workspaceId: 'ws_2',
      request: { workspaceId: 'ws_2', service: RateLimitService.OPENAI, priority: 10 },
      priority: 10,
      enqueuedAt: new Date(),
      resolver: () => {},
      rejecter: () => {},
    });

    const first = queueManager.dequeue(RateLimitService.OPENAI);

    expect(first?.workspaceId).toBe('ws_2'); // Higher priority dequeued first
  });

  test('should get queue position', () => {
    queueManager.enqueue(RateLimitService.OPENAI, {
      workspaceId: 'ws_1',
      request: { workspaceId: 'ws_1', service: RateLimitService.OPENAI },
      enqueuedAt: new Date(),
      resolver: () => {},
      rejecter: () => {},
    });

    queueManager.enqueue(RateLimitService.OPENAI, {
      workspaceId: 'ws_2',
      request: { workspaceId: 'ws_2', service: RateLimitService.OPENAI },
      enqueuedAt: new Date(),
      resolver: () => {},
      rejecter: () => {},
    });

    const position = queueManager.getQueuePosition(RateLimitService.OPENAI, 'ws_2');

    expect(position).toBe(1); // Second in queue
  });

  test('should clear queue', () => {
    queueManager.enqueue(RateLimitService.OPENAI, {
      workspaceId: 'ws_1',
      request: { workspaceId: 'ws_1', service: RateLimitService.OPENAI },
      enqueuedAt: new Date(),
      resolver: () => {},
      rejecter: () => {},
    });

    queueManager.clearQueue(RateLimitService.OPENAI);

    expect(queueManager.getQueueLength(RateLimitService.OPENAI)).toBe(0);
  });
});

describe('Phase 59: Rate Limit Analytics', () => {
  let store: MockRateLimitStore;
  let analytics: RateLimitAnalytics;

  beforeEach(() => {
    store = new MockRateLimitStore();
    analytics = new RateLimitAnalytics(store);
  });

  test('should calculate utilization percentage', async () => {
    const state = TestDataFactory.createRateLimitState('ws_1', RateLimitService.OPENAI, {
      currentRequests: 50,
      maxRequests: 100,
    });
    store.setState('ws_1', RateLimitService.OPENAI, state);

    const utilization = await analytics.calculateUtilization('ws_1', RateLimitService.OPENAI);

    expect(utilization).toBe(50);
  });

  test('should predict exhaustion time', async () => {
    const state = TestDataFactory.createRateLimitState('ws_1', RateLimitService.OPENAI, {
      currentRequests: 50,
      maxRequests: 100,
    });
    store.setState('ws_1', RateLimitService.OPENAI, state);

    const prediction = await analytics.predictExhaustion(
      'ws_1',
      RateLimitService.OPENAI,
      10 // 10 requests per minute
    );

    expect(prediction.willExhaust).toBe(true);
    expect(prediction.estimatedMinutes).toBe(5); // 50 remaining / 10 per minute
  });

  test('should handle zero request rate', async () => {
    const state = TestDataFactory.createRateLimitState('ws_1', RateLimitService.OPENAI, {
      currentRequests: 50,
      maxRequests: 100,
    });
    store.setState('ws_1', RateLimitService.OPENAI, state);

    const prediction = await analytics.predictExhaustion(
      'ws_1',
      RateLimitService.OPENAI,
      0
    );

    expect(prediction.willExhaust).toBe(true);
    expect(prediction.estimatedMinutes).toBe(0);
  });
});
