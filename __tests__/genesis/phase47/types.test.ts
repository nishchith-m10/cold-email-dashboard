/**
 * GENESIS PHASE 47: TYPES TESTS
 *
 * Tests for helper functions, constants, and utility logic.
 */

import {
  calculateLatencyMetrics,
  calculateErrorRate,
  checkThreshold,
  LOAD_TEST_DEFAULTS,
  SECURITY_THRESHOLDS,
  BENCHMARK_DEFAULTS,
  CHAOS_DEFAULTS,
} from '../../../lib/genesis/phase47';

describe('Phase 47 Types & Helpers', () => {
  // ============================================
  // calculateLatencyMetrics
  // ============================================
  describe('calculateLatencyMetrics', () => {
    it('should return zeroes for empty array', () => {
      const result = calculateLatencyMetrics([]);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.mean).toBe(0);
      expect(result.median).toBe(0);
      expect(result.p90).toBe(0);
      expect(result.p95).toBe(0);
      expect(result.p99).toBe(0);
      expect(result.stdDev).toBe(0);
    });

    it('should handle single element', () => {
      const result = calculateLatencyMetrics([100]);
      expect(result.min).toBe(100);
      expect(result.max).toBe(100);
      expect(result.mean).toBe(100);
      expect(result.median).toBe(100);
      expect(result.stdDev).toBe(0);
    });

    it('should calculate correct metrics for typical latency distribution', () => {
      const latencies = Array.from({ length: 100 }, (_, i) => (i + 1) * 10); // 10, 20, ..., 1000
      const result = calculateLatencyMetrics(latencies);

      expect(result.min).toBe(10);
      expect(result.max).toBe(1000);
      expect(result.mean).toBeCloseTo(505, 0);
      expect(result.median).toBe(510);
      expect(result.p90).toBe(910);
      expect(result.p95).toBe(960);
      expect(result.p99).toBe(1000);
      expect(result.stdDev).toBeGreaterThan(0);
    });

    it('should handle unsorted input', () => {
      const latencies = [500, 100, 300, 200, 400];
      const result = calculateLatencyMetrics(latencies);
      expect(result.min).toBe(100);
      expect(result.max).toBe(500);
      expect(result.mean).toBe(300);
    });

    it('should handle identical values', () => {
      const latencies = [50, 50, 50, 50, 50];
      const result = calculateLatencyMetrics(latencies);
      expect(result.min).toBe(50);
      expect(result.max).toBe(50);
      expect(result.mean).toBe(50);
      expect(result.stdDev).toBe(0);
    });
  });

  // ============================================
  // calculateErrorRate
  // ============================================
  describe('calculateErrorRate', () => {
    it('should return 0 for zero total', () => {
      expect(calculateErrorRate(0, 0)).toBe(0);
    });

    it('should return 0 for no errors', () => {
      expect(calculateErrorRate(100, 0)).toBe(0);
    });

    it('should return 1 for all errors', () => {
      expect(calculateErrorRate(100, 100)).toBe(1);
    });

    it('should calculate correct rate', () => {
      expect(calculateErrorRate(1000, 5)).toBe(0.005);
    });

    it('should have 4-decimal precision', () => {
      expect(calculateErrorRate(1000, 1)).toBe(0.001);
      expect(calculateErrorRate(10000, 3)).toBe(0.0003);
    });
  });

  // ============================================
  // checkThreshold
  // ============================================
  describe('checkThreshold', () => {
    const thresholds = {
      maxP95LatencyMs: 1000,
      maxP99LatencyMs: 2000,
      maxErrorRate: 0.01,
      minThroughputRps: 10,
    };

    it('should return null when p95 is within threshold', () => {
      expect(checkThreshold('p95_latency', 500, thresholds)).toBeNull();
    });

    it('should return warning when p95 exceeds threshold', () => {
      const result = checkThreshold('p95_latency', 1200, thresholds);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('warning');
      expect(result!.actual).toBe(1200);
    });

    it('should return critical when p95 greatly exceeds threshold', () => {
      const result = checkThreshold('p95_latency', 1600, thresholds);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('critical');
    });

    it('should detect p99 violation', () => {
      const result = checkThreshold('p99_latency', 2500, thresholds);
      expect(result).not.toBeNull();
      expect(result!.metric).toBe('p99_latency');
    });

    it('should detect error rate violation', () => {
      const result = checkThreshold('error_rate', 0.05, thresholds);
      expect(result).not.toBeNull();
      expect(result!.metric).toBe('error_rate');
    });

    it('should detect throughput violation', () => {
      const result = checkThreshold('throughput', 3, thresholds);
      expect(result).not.toBeNull();
      expect(result!.metric).toBe('throughput');
    });

    it('should return null for unknown metric', () => {
      expect(checkThreshold('unknown', 999, thresholds)).toBeNull();
    });
  });

  // ============================================
  // Constants
  // ============================================
  describe('Constants', () => {
    it('should have valid LOAD_TEST_DEFAULTS', () => {
      expect(LOAD_TEST_DEFAULTS.SMOKE_VUS).toBe(5);
      expect(LOAD_TEST_DEFAULTS.LOAD_MAX_VUS).toBe(100);
      expect(LOAD_TEST_DEFAULTS.STRESS_MAX_VUS).toBe(1000);
      expect(LOAD_TEST_DEFAULTS.SPIKE_VUS).toBe(1000);
    });

    it('should have valid SECURITY_THRESHOLDS', () => {
      expect(SECURITY_THRESHOLDS.MIN_OVERALL_SCORE).toBe(95);
      expect(SECURITY_THRESHOLDS.CRITICAL_FAILURE_TOLERANCE).toBe(0);
    });

    it('should have valid BENCHMARK_DEFAULTS', () => {
      expect(BENCHMARK_DEFAULTS.ITERATIONS).toBe(1000);
      expect(BENCHMARK_DEFAULTS.CONCURRENCY).toBe(10);
      expect(BENCHMARK_DEFAULTS.REGRESSION_THRESHOLD_PERCENT).toBe(10);
    });

    it('should have valid CHAOS_DEFAULTS', () => {
      expect(CHAOS_DEFAULTS.DEFAULT_DURATION_S).toBe(60);
      expect(CHAOS_DEFAULTS.DEFAULT_INTENSITY).toBe(0.5);
      expect(CHAOS_DEFAULTS.MAX_RECOVERY_TIME_S).toBe(120);
    });
  });
});
