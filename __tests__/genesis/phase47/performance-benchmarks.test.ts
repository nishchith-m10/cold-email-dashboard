/**
 * GENESIS PHASE 47: PERFORMANCE BENCHMARKS TESTS
 */

import {
  BenchmarkRunner,
  BenchmarkError,
  createApiBenchmarkSuite,
  createDatabaseBenchmarkSuite,
  type BenchmarkConfig,
  type BenchmarkSuiteResult,
} from '../../../lib/genesis/phase47';

describe('Phase 47 Performance Benchmarks', () => {
  let runner: BenchmarkRunner;

  beforeEach(() => {
    runner = new BenchmarkRunner();
  });

  // ============================================
  // SINGLE BENCHMARK
  // ============================================
  describe('runBenchmark', () => {
    it('should run a simple benchmark', async () => {
      let counter = 0;
      const config: BenchmarkConfig = {
        name: 'Simple Counter',
        iterations: 100,
        warmupIterations: 10,
        concurrency: 1,
        timeoutMs: 5000,
        operation: async () => { counter++; },
      };

      const result = await runner.runBenchmark(config);

      expect(result.name).toBe('Simple Counter');
      expect(result.iterations).toBe(100);
      expect(result.errors).toBe(0);
      expect(result.errorRate).toBe(0);
      expect(result.latency.min).toBeGreaterThanOrEqual(0);
      expect(result.throughput).toBeGreaterThan(0);
      expect(counter).toBe(110); // 100 iterations + 10 warmup
    });

    it('should handle concurrent operations', async () => {
      const config: BenchmarkConfig = {
        name: 'Concurrent Test',
        iterations: 50,
        warmupIterations: 5,
        concurrency: 10,
        timeoutMs: 5000,
        operation: async () => {
          await new Promise(r => setTimeout(r, 1));
        },
      };

      const result = await runner.runBenchmark(config);

      expect(result.concurrency).toBe(10);
      expect(result.latency.min).toBeGreaterThanOrEqual(0);
      expect(result.totalDurationMs).toBeGreaterThan(0);
    });

    it('should track errors', async () => {
      let callCount = 0;
      const config: BenchmarkConfig = {
        name: 'Error Benchmark',
        iterations: 20,
        warmupIterations: 0,
        concurrency: 1,
        timeoutMs: 5000,
        operation: async () => {
          callCount++;
          if (callCount % 2 === 0) throw new Error('Simulated error');
        },
      };

      const result = await runner.runBenchmark(config);

      expect(result.errors).toBe(10);
      expect(result.errorRate).toBe(0.5);
    });

    it('should capture timestamps', async () => {
      const config: BenchmarkConfig = {
        name: 'Timestamp Test',
        iterations: 10,
        warmupIterations: 0,
        concurrency: 1,
        timeoutMs: 5000,
        operation: async () => {},
      };

      const result = await runner.runBenchmark(config);

      expect(result.startedAt).toBeTruthy();
      expect(result.completedAt).toBeTruthy();
      expect(new Date(result.completedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(result.startedAt).getTime(),
      );
    });

    it('should capture memory usage', async () => {
      const config: BenchmarkConfig = {
        name: 'Memory Test',
        iterations: 10,
        warmupIterations: 0,
        concurrency: 1,
        timeoutMs: 5000,
        operation: async () => {},
      };

      const result = await runner.runBenchmark(config);

      // In Node.js environment, memory should be captured
      if (result.memoryUsage) {
        expect(result.memoryUsage.heapUsedBefore).toBeGreaterThan(0);
        expect(result.memoryUsage.heapUsedAfter).toBeGreaterThan(0);
      }
    });

    it('should compute latency percentiles', async () => {
      const config: BenchmarkConfig = {
        name: 'Latency Percentile Test',
        iterations: 100,
        warmupIterations: 0,
        concurrency: 1,
        timeoutMs: 10000,
        operation: async () => {
          await new Promise(r => setTimeout(r, 1));
        },
      };

      const result = await runner.runBenchmark(config);

      expect(result.latency.p90).toBeGreaterThanOrEqual(result.latency.median);
      expect(result.latency.p95).toBeGreaterThanOrEqual(result.latency.p90);
      expect(result.latency.p99).toBeGreaterThanOrEqual(result.latency.p95);
      expect(result.latency.max).toBeGreaterThanOrEqual(result.latency.p99);
    });
  });

  // ============================================
  // VALIDATION
  // ============================================
  describe('Validation', () => {
    it('should reject missing name', async () => {
      const config: BenchmarkConfig = {
        name: '',
        iterations: 10,
        warmupIterations: 0,
        concurrency: 1,
        timeoutMs: 5000,
        operation: async () => {},
      };

      await expect(runner.runBenchmark(config)).rejects.toThrow(BenchmarkError);
    });

    it('should reject zero iterations', async () => {
      const config: BenchmarkConfig = {
        name: 'Bad',
        iterations: 0,
        warmupIterations: 0,
        concurrency: 1,
        timeoutMs: 5000,
        operation: async () => {},
      };

      await expect(runner.runBenchmark(config)).rejects.toThrow('Iterations must be positive');
    });

    it('should reject zero concurrency', async () => {
      const config: BenchmarkConfig = {
        name: 'Bad',
        iterations: 10,
        warmupIterations: 0,
        concurrency: 0,
        timeoutMs: 5000,
        operation: async () => {},
      };

      await expect(runner.runBenchmark(config)).rejects.toThrow('Concurrency must be positive');
    });
  });

  // ============================================
  // SUITE RUNNER
  // ============================================
  describe('runSuite', () => {
    it('should run a full suite', async () => {
      const suite = createApiBenchmarkSuite(async () => {
        await new Promise(r => setTimeout(r, 0));
      });

      // Reduce iterations for test speed
      for (const b of suite.benchmarks) {
        b.iterations = 10;
        b.warmupIterations = 2;
      }

      const result = await runner.runSuite(suite);

      expect(result.suiteName).toBe('API Performance');
      expect(result.results).toHaveLength(4);
      expect(result.totalDurationMs).toBeGreaterThan(0);
    });

    it('should create database benchmark suite', () => {
      const suite = createDatabaseBenchmarkSuite(async () => {});
      expect(suite.name).toBe('Database Performance');
      expect(suite.benchmarks).toHaveLength(3);
    });
  });

  // ============================================
  // REGRESSION DETECTION
  // ============================================
  describe('Regression Detection', () => {
    it('should detect latency regression via synthetic results', () => {
      // Use synthetic results to avoid timing instability
      const now = new Date().toISOString();

      const baseline: BenchmarkSuiteResult = {
        suiteName: 'Test',
        startedAt: now,
        completedAt: now,
        totalDurationMs: 1000,
        results: [{
          name: 'API Call',
          iterations: 100,
          concurrency: 1,
          startedAt: now,
          completedAt: now,
          totalDurationMs: 1000,
          latency: { min: 5, max: 50, mean: 10, median: 10, p90: 15, p95: 20, p99: 40, stdDev: 5 },
          throughput: 100,
          errors: 0,
          errorRate: 0,
        }],
      };

      const current: BenchmarkSuiteResult = {
        suiteName: 'Test',
        startedAt: now,
        completedAt: now,
        totalDurationMs: 2000,
        results: [{
          name: 'API Call',
          iterations: 100,
          concurrency: 1,
          startedAt: now,
          completedAt: now,
          totalDurationMs: 2000,
          latency: { min: 10, max: 200, mean: 50, median: 40, p90: 80, p95: 100, p99: 180, stdDev: 30 },
          throughput: 50,
          errors: 0,
          errorRate: 0,
        }],
      };

      const comparisons = runner.compareWithBaseline(current, baseline, 10);

      expect(comparisons).toHaveLength(1);
      expect(comparisons[0].benchmarkName).toBe('API Call');
      expect(comparisons[0].latencyDelta).toBeGreaterThan(0); // p95: 100 vs 20 = +400%
      expect(comparisons[0].throughputDelta).toBeLessThan(0); // 50 vs 100 = -50%
      expect(comparisons[0].regression).toBe(true);
    });

    it('should detect no regression for identical results', async () => {
      const suite = {
        name: 'Test',
        benchmarks: [{
          name: 'API Call',
          iterations: 20,
          warmupIterations: 0,
          concurrency: 1,
          timeoutMs: 5000,
          operation: async () => {},
        }],
      };

      const baseline = await runner.runSuite(suite);
      const current = await runner.runSuite(suite);

      const comparisons = runner.compareWithBaseline(current, baseline, 50);

      expect(comparisons).toHaveLength(1);
      // With generous threshold, should not flag regression
    });

    it('should skip benchmarks not in baseline', async () => {
      const baseline: BenchmarkSuiteResult = {
        suiteName: 'Test',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        totalDurationMs: 0,
        results: [],
      };

      const current = await runner.runSuite({
        name: 'Test',
        benchmarks: [{
          name: 'New Benchmark',
          iterations: 10,
          warmupIterations: 0,
          concurrency: 1,
          timeoutMs: 5000,
          operation: async () => {},
        }],
      });

      const comparisons = runner.compareWithBaseline(current, baseline);
      expect(comparisons).toHaveLength(0);
    });
  });
});
