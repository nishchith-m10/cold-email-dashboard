/**
 * GENESIS PHASE 47: PERFORMANCE BENCHMARKS
 *
 * API latency tracking, throughput measurement, percentile analysis,
 * regression detection, and memory profiling.
 */

import {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkSuite,
  BenchmarkSuiteResult,
  BenchmarkComparison,
  LatencyMetrics,
  BENCHMARK_DEFAULTS,
  calculateLatencyMetrics,
} from './types';

export class BenchmarkError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'BenchmarkError';
  }
}

// ============================================
// BENCHMARK RUNNER
// ============================================

export class BenchmarkRunner {
  /**
   * Run a single benchmark.
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    this.validateConfig(config);

    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const latencies: number[] = [];
    let errors = 0;

    // Warmup phase
    for (let i = 0; i < config.warmupIterations; i++) {
      try {
        await config.operation();
      } catch {
        // Warmup errors are ignored
      }
    }

    // Capture memory before
    const memBefore = this.getMemoryUsage();

    // Benchmark phase — run concurrently
    const batchSize = config.concurrency;
    const totalBatches = Math.ceil(config.iterations / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      const currentBatch = Math.min(batchSize, config.iterations - batch * batchSize);
      const promises: Promise<void>[] = [];

      for (let i = 0; i < currentBatch; i++) {
        promises.push(
          (async () => {
            const opStart = Date.now();
            try {
              await config.operation();
              latencies.push(Date.now() - opStart);
            } catch {
              errors++;
              latencies.push(Date.now() - opStart);
            }
          })(),
        );
      }

      await Promise.all(promises);
    }

    // Capture memory after
    const memAfter = this.getMemoryUsage();
    const totalDurationMs = Date.now() - startTime;
    const latencyMetrics = calculateLatencyMetrics(latencies);

    return {
      name: config.name,
      iterations: config.iterations,
      concurrency: config.concurrency,
      startedAt,
      completedAt: new Date().toISOString(),
      totalDurationMs,
      latency: latencyMetrics,
      throughput: Math.round((config.iterations / (totalDurationMs / 1000)) * 100) / 100,
      errors,
      errorRate: errors / config.iterations,
      memoryUsage: memBefore !== null && memAfter !== null
        ? {
            heapUsedBefore: memBefore,
            heapUsedAfter: memAfter,
            delta: memAfter - memBefore,
          }
        : undefined,
    };
  }

  /**
   * Run a full benchmark suite.
   */
  async runSuite(suite: BenchmarkSuite): Promise<BenchmarkSuiteResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const results: BenchmarkResult[] = [];

    for (const benchmark of suite.benchmarks) {
      const result = await this.runBenchmark(benchmark);
      results.push(result);
    }

    return {
      suiteName: suite.name,
      startedAt,
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startTime,
      results,
    };
  }

  /**
   * Compare current results against a baseline for regression detection.
   */
  compareWithBaseline(
    current: BenchmarkSuiteResult,
    baseline: BenchmarkSuiteResult,
    regressionThresholdPercent: number = BENCHMARK_DEFAULTS.REGRESSION_THRESHOLD_PERCENT,
  ): BenchmarkComparison[] {
    const comparisons: BenchmarkComparison[] = [];

    for (const currentResult of current.results) {
      const baselineResult = baseline.results.find(r => r.name === currentResult.name);
      if (!baselineResult) continue;

      const latencyDelta = baselineResult.latency.p95 > 0
        ? ((currentResult.latency.p95 - baselineResult.latency.p95) / baselineResult.latency.p95) * 100
        : 0;

      const throughputDelta = baselineResult.throughput > 0
        ? ((currentResult.throughput - baselineResult.throughput) / baselineResult.throughput) * 100
        : 0;

      // Regression = latency increased OR throughput decreased significantly
      const regression =
        latencyDelta > regressionThresholdPercent || throughputDelta < -regressionThresholdPercent;

      comparisons.push({
        benchmarkName: currentResult.name,
        baseline: baselineResult,
        current: currentResult,
        latencyDelta: Math.round(latencyDelta * 100) / 100,
        throughputDelta: Math.round(throughputDelta * 100) / 100,
        regression,
      });
    }

    return comparisons;
  }

  // ============================================
  // INTERNAL
  // ============================================

  private validateConfig(config: BenchmarkConfig): void {
    if (!config.name) {
      throw new BenchmarkError('Benchmark name is required', 'MISSING_NAME');
    }
    if (config.iterations <= 0) {
      throw new BenchmarkError('Iterations must be positive', 'INVALID_ITERATIONS');
    }
    if (config.concurrency <= 0) {
      throw new BenchmarkError('Concurrency must be positive', 'INVALID_CONCURRENCY');
    }
    if (!config.operation) {
      throw new BenchmarkError('Operation function is required', 'MISSING_OPERATION');
    }
  }

  private getMemoryUsage(): number | null {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
      }
    } catch {
      // Not available
    }
    return null;
  }
}

// ============================================
// PREDEFINED BENCHMARK SUITES
// ============================================

export function createApiBenchmarkSuite(
  simulateFn: () => Promise<void>,
): BenchmarkSuite {
  return {
    name: 'API Performance',
    benchmarks: [
      {
        name: 'Single Request Latency',
        iterations: BENCHMARK_DEFAULTS.ITERATIONS,
        warmupIterations: BENCHMARK_DEFAULTS.WARMUP_ITERATIONS,
        concurrency: 1,
        timeoutMs: BENCHMARK_DEFAULTS.TIMEOUT_MS,
        operation: simulateFn,
      },
      {
        name: 'Concurrent 10x',
        iterations: BENCHMARK_DEFAULTS.ITERATIONS,
        warmupIterations: BENCHMARK_DEFAULTS.WARMUP_ITERATIONS,
        concurrency: 10,
        timeoutMs: BENCHMARK_DEFAULTS.TIMEOUT_MS,
        operation: simulateFn,
      },
      {
        name: 'Concurrent 50x',
        iterations: 500,
        warmupIterations: 50,
        concurrency: 50,
        timeoutMs: BENCHMARK_DEFAULTS.TIMEOUT_MS,
        operation: simulateFn,
      },
      {
        name: 'Burst 100x',
        iterations: 200,
        warmupIterations: 20,
        concurrency: 100,
        timeoutMs: BENCHMARK_DEFAULTS.TIMEOUT_MS,
        operation: simulateFn,
      },
    ],
  };
}

export function createDatabaseBenchmarkSuite(
  simulateFn: () => Promise<void>,
): BenchmarkSuite {
  return {
    name: 'Database Performance',
    benchmarks: [
      {
        name: 'Single Query',
        iterations: BENCHMARK_DEFAULTS.ITERATIONS,
        warmupIterations: BENCHMARK_DEFAULTS.WARMUP_ITERATIONS,
        concurrency: 1,
        timeoutMs: BENCHMARK_DEFAULTS.TIMEOUT_MS,
        operation: simulateFn,
      },
      {
        name: 'Concurrent Queries 10x',
        iterations: BENCHMARK_DEFAULTS.ITERATIONS,
        warmupIterations: BENCHMARK_DEFAULTS.WARMUP_ITERATIONS,
        concurrency: 10,
        timeoutMs: BENCHMARK_DEFAULTS.TIMEOUT_MS,
        operation: simulateFn,
      },
      {
        name: 'Connection Pool Pressure',
        iterations: 500,
        warmupIterations: 50,
        concurrency: 50,
        timeoutMs: BENCHMARK_DEFAULTS.TIMEOUT_MS,
        operation: simulateFn,
      },
    ],
  };
}
