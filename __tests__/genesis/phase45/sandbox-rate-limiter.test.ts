/**
 * PHASE 45: SANDBOX RATE LIMITER TESTS
 */

import {
  SandboxRateLimiter,
  InMemoryRateLimitDB,
} from '@/lib/genesis/phase45/sandbox-rate-limiter';

describe('SandboxRateLimiter', () => {
  let db: InMemoryRateLimitDB;
  let limiter: SandboxRateLimiter;

  beforeEach(() => {
    db = new InMemoryRateLimitDB();
    limiter = new SandboxRateLimiter(db, { maxRunsPerHour: 3, windowSeconds: 3600 });
  });

  describe('checkLimit', () => {
    it('allows first request', async () => {
      const result = await limiter.checkLimit('ws-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
      expect(result.limit).toBe(3);
    });

    it('allows requests up to the limit', async () => {
      db.recordRun('ws-1');
      db.recordRun('ws-1');

      const result = await limiter.checkLimit('ws-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('blocks requests at the limit', async () => {
      db.recordRun('ws-1');
      db.recordRun('ws-1');
      db.recordRun('ws-1');

      const result = await limiter.checkLimit('ws-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBe(3600);
    });

    it('isolates limits per workspace', async () => {
      db.recordRun('ws-1');
      db.recordRun('ws-1');
      db.recordRun('ws-1');

      const ws1 = await limiter.checkLimit('ws-1');
      const ws2 = await limiter.checkLimit('ws-2');

      expect(ws1.allowed).toBe(false);
      expect(ws2.allowed).toBe(true);
      expect(ws2.remaining).toBe(3);
    });

    it('returns reset time in the future', async () => {
      const result = await limiter.checkLimit('ws-1');
      const resetTime = new Date(result.resetAt).getTime();
      expect(resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('getUsage', () => {
    it('returns zero for new workspace', async () => {
      const usage = await limiter.getUsage('ws-new');
      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(3);
      expect(usage.remaining).toBe(3);
    });

    it('reflects recorded runs', async () => {
      db.recordRun('ws-1');
      db.recordRun('ws-1');

      const usage = await limiter.getUsage('ws-1');
      expect(usage.used).toBe(2);
      expect(usage.remaining).toBe(1);
    });
  });

  describe('InMemoryRateLimitDB', () => {
    it('counts recent runs only', async () => {
      // Record a run "in the past" by manipulating internals
      const timestamps = [Date.now() - 7200000]; // 2 hours ago
      (db as any).runs.set('ws-1', timestamps);

      const count = await db.countRunsInWindow('ws-1', 3600);
      expect(count).toBe(0); // Should be pruned
    });

    it('reset clears all data', async () => {
      db.recordRun('ws-1');
      db.recordRun('ws-2');
      db.reset();

      const count1 = await db.countRunsInWindow('ws-1', 3600);
      const count2 = await db.countRunsInWindow('ws-2', 3600);
      expect(count1).toBe(0);
      expect(count2).toBe(0);
    });
  });

  describe('configurable limits', () => {
    it('uses custom maxRunsPerHour', async () => {
      const customLimiter = new SandboxRateLimiter(db, { maxRunsPerHour: 1 });
      db.recordRun('ws-1');

      const result = await customLimiter.checkLimit('ws-1');
      expect(result.allowed).toBe(false);
    });

    it('defaults to 10 runs per hour', async () => {
      const defaultLimiter = new SandboxRateLimiter(db);
      const result = await defaultLimiter.checkLimit('ws-1');
      expect(result.limit).toBe(10);
    });
  });
});
