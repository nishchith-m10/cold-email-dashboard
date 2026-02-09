/**
 * GENESIS PHASE 47: STRESS TEST ORCHESTRATOR
 *
 * Top-level orchestrator that combines load testing, security testing,
 * chaos engineering, and performance benchmarking into a unified
 * stress test plan with report generation.
 */

import {
  StressTestPlan,
  StressTestReport,
  StressTestPhase,
  LoadTestResult,
  SecurityAuditReport,
  ChaosExperimentResult,
  BenchmarkSuiteResult,
  StressTestEnvironment,
  SECURITY_THRESHOLDS,
} from './types';
import { LoadTestRunner } from './load-test-config';
import { SecurityTestRunner } from './security-test-runner';
import { ChaosEngine } from './chaos-engine';
import { BenchmarkRunner } from './performance-benchmarks';

export class StressTestOrchestratorError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'StressTestOrchestratorError';
  }
}

export class StressTestOrchestrator {
  private phase: StressTestPhase = 'idle';
  private readonly loadRunner: LoadTestRunner;
  private readonly securityRunner: SecurityTestRunner;
  private readonly chaosEngine: ChaosEngine;
  private readonly benchmarkRunner: BenchmarkRunner;

  constructor(private readonly env: StressTestEnvironment) {
    this.loadRunner = new LoadTestRunner(env);
    this.securityRunner = new SecurityTestRunner(env);
    this.chaosEngine = new ChaosEngine(env);
    this.benchmarkRunner = new BenchmarkRunner();
  }

  getPhase(): StressTestPhase { return this.phase; }

  /**
   * Execute the full stress test plan.
   */
  async execute(plan: StressTestPlan): Promise<StressTestReport> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    try {
      this.phase = 'preparing';
      this.env.resetMetrics();

      // 1. Load Tests
      this.phase = 'running';
      const loadResults = await this.runLoadTests(plan);

      // 2. Security Tests
      const securityAudit = await this.securityRunner.runSuite(plan.securityTests);

      // 3. Chaos Experiments
      const chaosResults = await this.runChaosExperiments(plan);

      // 4. Performance Benchmarks
      const benchmarkResults = await this.benchmarkRunner.runSuite(plan.benchmarks);

      // 5. Analyze
      this.phase = 'analyzing';
      const report = this.generateReport(
        plan,
        startedAt,
        startTime,
        loadResults,
        securityAudit,
        chaosResults,
        benchmarkResults,
      );

      this.phase = 'complete';
      return report;
    } catch (error) {
      this.phase = 'failed';
      this.chaosEngine.emergencyStop();
      throw new StressTestOrchestratorError(
        `Stress test failed: ${error instanceof Error ? error.message : String(error)}`,
        'EXECUTION_FAILED',
      );
    }
  }

  /**
   * Run only load tests from the plan.
   */
  async runLoadTests(plan: StressTestPlan): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];
    for (const scenario of plan.loadTests.scenarios) {
      const result = await this.loadRunner.runScenario(scenario, plan.loadTests);
      results.push(result);
    }
    return results;
  }

  /**
   * Run only security tests from the plan.
   */
  async runSecurityTests(plan: StressTestPlan): Promise<SecurityAuditReport> {
    return this.securityRunner.runSuite(plan.securityTests);
  }

  /**
   * Run only chaos experiments from the plan.
   */
  async runChaosExperiments(plan: StressTestPlan): Promise<ChaosExperimentResult[]> {
    const results: ChaosExperimentResult[] = [];
    for (const experiment of plan.chaosExperiments) {
      const result = await this.chaosEngine.runExperiment(experiment);
      results.push(result);
    }
    return results;
  }

  /**
   * Run only benchmarks from the plan.
   */
  async runBenchmarks(plan: StressTestPlan): Promise<BenchmarkSuiteResult> {
    return this.benchmarkRunner.runSuite(plan.benchmarks);
  }

  /**
   * Emergency stop — halt all running tests and clear faults.
   */
  emergencyStop(): void {
    this.chaosEngine.emergencyStop();
    this.phase = 'idle';
  }

  // ============================================
  // REPORT GENERATION
  // ============================================

  private generateReport(
    plan: StressTestPlan,
    startedAt: string,
    startTime: number,
    loadResults: LoadTestResult[],
    securityAudit: SecurityAuditReport,
    chaosResults: ChaosExperimentResult[],
    benchmarkResults: BenchmarkSuiteResult,
  ): StressTestReport {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // Load test blockers
    const failedLoadTests = loadResults.filter(r => !r.thresholdsPassed);
    if (failedLoadTests.length > 0) {
      blockers.push(
        `${failedLoadTests.length} load test(s) failed thresholds: ${failedLoadTests.map(r => r.scenario).join(', ')}`,
      );
    }

    // Security blockers
    if (securityAudit.criticalFailures > 0) {
      blockers.push(
        `${securityAudit.criticalFailures} critical security failure(s) detected`,
      );
    }
    if (securityAudit.failedTests > 0 && securityAudit.criticalFailures === 0) {
      warnings.push(
        `${securityAudit.failedTests} non-critical security test(s) failed`,
      );
    }

    // Chaos blockers
    const unrecoveredExperiments = chaosResults.filter(r => !r.recovered);
    if (unrecoveredExperiments.length > 0) {
      blockers.push(
        `${unrecoveredExperiments.length} chaos experiment(s) did not recover: ${unrecoveredExperiments.map(r => r.experimentName).join(', ')}`,
      );
    }

    // Benchmark warnings
    const highErrorBenchmarks = benchmarkResults.results.filter(r => r.errorRate > 0.05);
    if (highErrorBenchmarks.length > 0) {
      warnings.push(
        `${highErrorBenchmarks.length} benchmark(s) had >5% error rate`,
      );
    }

    // Overall score (weighted)
    const loadScore = this.calculateLoadScore(loadResults);
    const securityScore = securityAudit.summary.overallScore;
    const chaosScore = this.calculateChaosScore(chaosResults);
    const benchmarkScore = this.calculateBenchmarkScore(benchmarkResults);

    // Weights: security 40%, load 25%, chaos 20%, benchmarks 15%
    const overallScore = Math.round(
      securityScore * 0.4 +
      loadScore * 0.25 +
      chaosScore * 0.2 +
      benchmarkScore * 0.15,
    );

    const readyForProduction =
      blockers.length === 0 &&
      overallScore >= 80 &&
      securityScore >= SECURITY_THRESHOLDS.MIN_OVERALL_SCORE;

    return {
      planName: plan.name,
      startedAt,
      completedAt: new Date().toISOString(),
      phase: 'complete',
      totalDurationMs: Date.now() - startTime,
      loadTestResults: loadResults,
      securityAudit,
      chaosResults,
      benchmarkResults,
      overallScore,
      readyForProduction,
      blockers,
      warnings,
    };
  }

  private calculateLoadScore(results: LoadTestResult[]): number {
    if (results.length === 0) return 100;
    const passed = results.filter(r => r.thresholdsPassed).length;
    return Math.round((passed / results.length) * 100);
  }

  private calculateChaosScore(results: ChaosExperimentResult[]): number {
    if (results.length === 0) return 100;
    const recovered = results.filter(r => r.recovered).length;
    const maintained = results.filter(r => r.steadyStateMaintained).length;
    return Math.round(((recovered + maintained) / (results.length * 2)) * 100);
  }

  private calculateBenchmarkScore(results: BenchmarkSuiteResult): number {
    if (results.results.length === 0) return 100;
    const lowError = results.results.filter(r => r.errorRate < 0.01).length;
    return Math.round((lowError / results.results.length) * 100);
  }
}
