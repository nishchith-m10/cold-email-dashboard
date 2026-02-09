/**
 * GENESIS PHASE 47: HYPER-SCALE STRESS TEST & RED-TEAMING
 *
 * Type definitions for load testing, security testing,
 * chaos engineering, and performance benchmarking.
 */

// ============================================
// LOAD TEST TYPES
// ============================================

export type LoadTestScenarioType = 'smoke' | 'load' | 'stress' | 'spike' | 'soak' | 'breakpoint';

export interface LoadTestStage {
  durationSeconds: number;
  targetVUs: number;
}

export interface LoadTestScenario {
  name: string;
  type: LoadTestScenarioType;
  stages: LoadTestStage[];
  thresholds: LoadTestThresholds;
  tags: Record<string, string>;
  startDelaySeconds: number;
}

export interface LoadTestThresholds {
  maxP95LatencyMs: number;
  maxP99LatencyMs: number;
  maxErrorRate: number; // 0-1 (e.g., 0.01 = 1%)
  minThroughputRps: number;
}

export interface LoadTestConfig {
  baseUrl: string;
  scenarios: LoadTestScenario[];
  globalThresholds: LoadTestThresholds;
  workspaceIds: string[];
  webhookSecret?: string;
  endpoints: LoadTestEndpoint[];
}

export interface LoadTestEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  bodyTemplate?: string; // JSON template with {{variables}}
  weight: number; // 0-100, probability of being selected
  expectedStatus: number[];
  latencyBudgetMs: number;
}

export interface LoadTestResult {
  scenario: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  thresholdsPassed: boolean;
  violations: ThresholdViolation[];
}

export interface LatencyMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  bytesPerSecond: number;
  peakRps: number;
}

export interface ThresholdViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'warning' | 'critical';
}

// ============================================
// SECURITY TEST TYPES
// ============================================

export type SecurityTestCategory =
  | 'rls_bypass'
  | 'sql_injection'
  | 'cross_workspace'
  | 'null_context'
  | 'auth_bypass'
  | 'input_validation'
  | 'header_manipulation'
  | 'rate_limit_bypass'
  | 'privilege_escalation';

export type SecuritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityTestCase {
  id: string;
  name: string;
  category: SecurityTestCategory;
  severity: SecuritySeverity;
  description: string;
  attack: SecurityAttack;
  expectedOutcome: SecurityExpectedOutcome;
}

export interface SecurityAttack {
  type: 'api_call' | 'db_query' | 'header_injection' | 'parameter_tampering';
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  workspaceContext?: string | null;
  targetWorkspace?: string;
}

export interface SecurityExpectedOutcome {
  shouldBlock: boolean;
  expectedStatus?: number[];
  expectedEmptyData?: boolean;
  expectedError?: boolean;
  maxDataReturned?: number;
}

export interface SecurityTestResult {
  testId: string;
  testName: string;
  category: SecurityTestCategory;
  severity: SecuritySeverity;
  passed: boolean;
  blocked: boolean;
  details: string;
  durationMs: number;
  response?: {
    status: number;
    dataCount: number;
    hasError: boolean;
  };
}

export interface SecurityAuditReport {
  startedAt: string;
  completedAt: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  results: SecurityTestResult[];
  summary: SecuritySummary;
}

export interface SecuritySummary {
  overallScore: number; // 0-100
  categoryScores: Record<SecurityTestCategory, number>;
  recommendations: string[];
}

// ============================================
// CHAOS ENGINEERING TYPES
// ============================================

export type ChaosExperimentType =
  | 'latency_injection'
  | 'error_injection'
  | 'connection_drop'
  | 'cpu_pressure'
  | 'memory_pressure'
  | 'disk_pressure'
  | 'network_partition'
  | 'dependency_failure'
  | 'clock_skew'
  | 'data_corruption';

export interface ChaosExperiment {
  id: string;
  name: string;
  type: ChaosExperimentType;
  description: string;
  config: ChaosConfig;
  steadyStateHypothesis: SteadyStateCheck[];
  rollback: ChaosRollback;
}

export interface ChaosConfig {
  targetService: string;
  durationSeconds: number;
  intensity: number; // 0-1 (e.g., 0.5 = 50% of requests affected)
  parameters: Record<string, unknown>;
}

export interface SteadyStateCheck {
  name: string;
  metric: string;
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';
  threshold: number;
}

export interface ChaosRollback {
  automatic: boolean;
  timeoutSeconds: number;
  steps: string[];
}

export interface ChaosExperimentResult {
  experimentId: string;
  experimentName: string;
  type: ChaosExperimentType;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  steadyStateMaintained: boolean;
  steadyStateChecks: Array<SteadyStateCheck & { passed: boolean; actual: number }>;
  impactMetrics: ChaosImpactMetrics;
  recovered: boolean;
  recoveryTimeMs: number;
  error?: string;
}

export interface ChaosImpactMetrics {
  errorRateDelta: number;
  latencyDelta: number;
  throughputDelta: number;
  affectedRequests: number;
  totalRequests: number;
}

// ============================================
// PERFORMANCE BENCHMARK TYPES
// ============================================

export interface BenchmarkConfig {
  name: string;
  iterations: number;
  warmupIterations: number;
  concurrency: number;
  timeoutMs: number;
  operation: () => Promise<void>;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  concurrency: number;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  latency: LatencyMetrics;
  throughput: number; // operations per second
  errors: number;
  errorRate: number;
  memoryUsage?: {
    heapUsedBefore: number;
    heapUsedAfter: number;
    delta: number;
  };
}

export interface BenchmarkSuite {
  name: string;
  benchmarks: BenchmarkConfig[];
}

export interface BenchmarkSuiteResult {
  suiteName: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  results: BenchmarkResult[];
  comparison?: BenchmarkComparison[];
}

export interface BenchmarkComparison {
  benchmarkName: string;
  baseline: BenchmarkResult;
  current: BenchmarkResult;
  latencyDelta: number; // percentage change
  throughputDelta: number;
  regression: boolean;
}

// ============================================
// STRESS TEST ORCHESTRATOR TYPES
// ============================================

export type StressTestPhase = 'idle' | 'preparing' | 'running' | 'analyzing' | 'complete' | 'failed';

export interface StressTestPlan {
  name: string;
  description: string;
  loadTests: LoadTestConfig;
  securityTests: SecurityTestCase[];
  chaosExperiments: ChaosExperiment[];
  benchmarks: BenchmarkSuite;
}

export interface StressTestReport {
  planName: string;
  startedAt: string;
  completedAt: string;
  phase: StressTestPhase;
  totalDurationMs: number;
  loadTestResults: LoadTestResult[];
  securityAudit: SecurityAuditReport;
  chaosResults: ChaosExperimentResult[];
  benchmarkResults: BenchmarkSuiteResult;
  overallScore: number; // 0-100
  readyForProduction: boolean;
  blockers: string[];
  warnings: string[];
}

// ============================================
// TEST ENVIRONMENT INTERFACE
// ============================================

export interface StressTestEnvironment {
  // HTTP simulation
  simulateRequest(
    method: string,
    path: string,
    options?: {
      headers?: Record<string, string>;
      body?: unknown;
      workspaceId?: string;
    }
  ): Promise<SimulatedResponse>;

  // DB simulation
  simulateQuery(
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    workspaceContext: string | null,
    params?: Record<string, unknown>,
  ): Promise<SimulatedQueryResult>;

  // Fault injection
  injectLatency(targetService: string, delayMs: number, probability: number): void;
  injectError(targetService: string, errorRate: number, errorCode: number): void;
  clearFaults(): void;

  // Metrics
  getMetrics(): EnvironmentMetrics;
  resetMetrics(): void;
}

export interface SimulatedResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  latencyMs: number;
}

export interface SimulatedQueryResult {
  data: Array<Record<string, unknown>>;
  error: string | null;
  rowCount: number;
  latencyMs: number;
}

export interface EnvironmentMetrics {
  totalRequests: number;
  totalErrors: number;
  latencies: number[];
  requestsByEndpoint: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
}

// ============================================
// CONSTANTS
// ============================================

export const LOAD_TEST_DEFAULTS = {
  SMOKE_VUS: 5,
  SMOKE_DURATION_S: 60,
  LOAD_MAX_VUS: 100,
  LOAD_DURATION_S: 1200, // 20 min
  STRESS_MAX_VUS: 1000,
  STRESS_DURATION_S: 960, // 16 min
  SPIKE_VUS: 1000,
  SPIKE_DURATION_S: 80,
} as const;

export const SECURITY_THRESHOLDS = {
  MIN_OVERALL_SCORE: 95,
  CRITICAL_FAILURE_TOLERANCE: 0,
  HIGH_FAILURE_TOLERANCE: 0,
  MEDIUM_FAILURE_TOLERANCE: 2,
} as const;

export const BENCHMARK_DEFAULTS = {
  ITERATIONS: 1000,
  WARMUP_ITERATIONS: 100,
  CONCURRENCY: 10,
  TIMEOUT_MS: 30_000,
  REGRESSION_THRESHOLD_PERCENT: 10,
} as const;

export const CHAOS_DEFAULTS = {
  DEFAULT_DURATION_S: 60,
  DEFAULT_INTENSITY: 0.5,
  MAX_RECOVERY_TIME_S: 120,
  STEADY_STATE_CHECK_INTERVAL_S: 5,
} as const;

// ============================================
// HELPERS
// ============================================

export function calculateLatencyMetrics(latencies: number[]): LatencyMetrics {
  if (latencies.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p90: 0, p95: 0, p99: 0, stdDev: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean: Math.round(mean * 100) / 100,
    median: sorted[Math.floor(n * 0.5)],
    p90: sorted[Math.floor(n * 0.9)],
    p95: sorted[Math.floor(n * 0.95)],
    p99: sorted[Math.min(Math.floor(n * 0.99), n - 1)],
    stdDev: Math.round(stdDev * 100) / 100,
  };
}

export function calculateErrorRate(total: number, errors: number): number {
  if (total === 0) return 0;
  return Math.round((errors / total) * 10000) / 10000; // 4 decimal precision
}

export function checkThreshold(
  metric: string,
  value: number,
  thresholds: LoadTestThresholds,
): ThresholdViolation | null {
  switch (metric) {
    case 'p95_latency':
      if (value > thresholds.maxP95LatencyMs) {
        return {
          metric, threshold: thresholds.maxP95LatencyMs, actual: value,
          severity: value > thresholds.maxP95LatencyMs * 1.5 ? 'critical' : 'warning',
        };
      }
      break;
    case 'p99_latency':
      if (value > thresholds.maxP99LatencyMs) {
        return {
          metric, threshold: thresholds.maxP99LatencyMs, actual: value,
          severity: value > thresholds.maxP99LatencyMs * 1.5 ? 'critical' : 'warning',
        };
      }
      break;
    case 'error_rate':
      if (value > thresholds.maxErrorRate) {
        return {
          metric, threshold: thresholds.maxErrorRate, actual: value,
          severity: value > thresholds.maxErrorRate * 2 ? 'critical' : 'warning',
        };
      }
      break;
    case 'throughput':
      if (value < thresholds.minThroughputRps) {
        return {
          metric, threshold: thresholds.minThroughputRps, actual: value,
          severity: value < thresholds.minThroughputRps * 0.5 ? 'critical' : 'warning',
        };
      }
      break;
  }
  return null;
}
