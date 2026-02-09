/**
 * GENESIS PHASE 47: HYPER-SCALE STRESS TEST & RED-TEAMING
 *
 * Public API for load testing, security testing,
 * chaos engineering, and performance benchmarking.
 */

// Types
export type {
  // Load test types
  LoadTestScenarioType,
  LoadTestStage,
  LoadTestScenario,
  LoadTestThresholds,
  LoadTestConfig,
  LoadTestEndpoint,
  LoadTestResult,
  LatencyMetrics,
  ThroughputMetrics,
  ThresholdViolation,

  // Security types
  SecurityTestCategory,
  SecuritySeverity,
  SecurityTestCase,
  SecurityAttack,
  SecurityExpectedOutcome,
  SecurityTestResult,
  SecurityAuditReport,
  SecuritySummary,

  // Chaos types
  ChaosExperimentType,
  ChaosExperiment,
  ChaosConfig,
  SteadyStateCheck,
  ChaosRollback,
  ChaosExperimentResult,
  ChaosImpactMetrics,

  // Benchmark types
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkSuite,
  BenchmarkSuiteResult,
  BenchmarkComparison,

  // Orchestrator types
  StressTestPhase,
  StressTestPlan,
  StressTestReport,

  // Environment types
  StressTestEnvironment,
  SimulatedResponse,
  SimulatedQueryResult,
  EnvironmentMetrics,
} from './types';

// Constants
export {
  LOAD_TEST_DEFAULTS,
  SECURITY_THRESHOLDS,
  BENCHMARK_DEFAULTS,
  CHAOS_DEFAULTS,
  calculateLatencyMetrics,
  calculateErrorRate,
  checkThreshold,
} from './types';

// Load test
export {
  LoadTestRunner,
  LoadTestConfigError,
  createSmokeScenario,
  createLoadScenario,
  createStressScenario,
  createSpikeScenario,
  getDefaultEndpoints,
  createDefaultLoadTestConfig,
  validateLoadTestConfig,
} from './load-test-config';

// Security
export {
  SecurityTestRunner,
  SecurityTestError,
  getDefaultSecurityTests,
} from './security-test-runner';

// Chaos
export {
  ChaosEngine,
  ChaosEngineError,
  getDefaultChaosExperiments,
} from './chaos-engine';

// Benchmarks
export {
  BenchmarkRunner,
  BenchmarkError,
  createApiBenchmarkSuite,
  createDatabaseBenchmarkSuite,
} from './performance-benchmarks';

// Orchestrator
export {
  StressTestOrchestrator,
  StressTestOrchestratorError,
} from './stress-test-orchestrator';

// Mock environment
export {
  MockTestEnvironment,
} from './mock-test-environment';
