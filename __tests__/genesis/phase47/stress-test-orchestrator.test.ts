/**
 * GENESIS PHASE 47: STRESS TEST ORCHESTRATOR TESTS
 */

import {
  StressTestOrchestrator,
  StressTestOrchestratorError,
  MockTestEnvironment,
  createDefaultLoadTestConfig,
  getDefaultSecurityTests,
  type StressTestPlan,
  type ChaosExperiment,
  type LoadTestScenario,
} from '../../../lib/genesis/phase47';

// Minimal smoke scenario with very few iterations
function createFastSmokeScenario(): LoadTestScenario {
  return {
    name: 'fast-smoke',
    type: 'smoke',
    stages: [{ durationSeconds: 1, targetVUs: 1 }], // 1 VU * 1s / 10 -> 1 iteration minimum
    thresholds: {
      maxP95LatencyMs: 5000,
      maxP99LatencyMs: 10000,
      maxErrorRate: 0.5,
      minThroughputRps: 0.01,
    },
    tags: { test_type: 'smoke' },
    startDelaySeconds: 0,
  };
}

// Minimal chaos experiment for fast testing
function createMinimalChaosExperiment(): ChaosExperiment {
  return {
    id: 'chaos-test-mini',
    name: 'Mini Latency Test',
    type: 'latency_injection',
    description: 'Minimal chaos for unit testing',
    config: {
      targetService: 'api',
      durationSeconds: 2,
      intensity: 0.01, // Very low = almost no faults
      parameters: { delayMs: 1 },
    },
    steadyStateHypothesis: [
      { name: 'Low errors', metric: 'error_rate', operator: 'lt', threshold: 1.0 },
    ],
    rollback: { automatic: true, timeoutSeconds: 1, steps: ['Clear'] },
  };
}

describe('Phase 47 Stress Test Orchestrator', () => {
  let env: MockTestEnvironment;
  let orchestrator: StressTestOrchestrator;

  function createTestPlan(): StressTestPlan {
    return {
      name: 'Test Plan',
      description: 'Unit test stress plan',
      loadTests: {
        baseUrl: 'http://localhost:3000',
        scenarios: [createFastSmokeScenario()],
        globalThresholds: {
          maxP95LatencyMs: 5000,
          maxP99LatencyMs: 10000,
          maxErrorRate: 0.5,
          minThroughputRps: 0.01,
        },
        workspaceIds: ['test-workspace-1'],
        endpoints: [
          {
            name: 'health',
            method: 'GET',
            path: '/api/health',
            weight: 100,
            expectedStatus: [200],
            latencyBudgetMs: 5000,
          },
        ],
      },
      securityTests: getDefaultSecurityTests().slice(0, 3),
      chaosExperiments: [createMinimalChaosExperiment()],
      benchmarks: {
        name: 'Test Benchmarks',
        benchmarks: [
          {
            name: 'Simple Op',
            iterations: 5,
            warmupIterations: 1,
            concurrency: 1,
            timeoutMs: 5000,
            operation: async () => {},
          },
        ],
      },
    };
  }

  beforeEach(() => {
    env = new MockTestEnvironment();
    orchestrator = new StressTestOrchestrator(env);
  });

  // ============================================
  // FULL EXECUTION
  // ============================================
  describe('Full Execution', () => {
    it('should execute full stress test plan', async () => {
      const plan = createTestPlan();
      const report = await orchestrator.execute(plan);

      expect(report.planName).toBe('Test Plan');
      expect(report.phase).toBe('complete');
      expect(report.loadTestResults.length).toBeGreaterThan(0);
      expect(report.securityAudit.totalTests).toBeGreaterThan(0);
      expect(report.chaosResults.length).toBeGreaterThan(0);
      expect(report.benchmarkResults.results.length).toBeGreaterThan(0);
    }, 15000);

    it('should calculate overall score', async () => {
      const plan = createTestPlan();
      const report = await orchestrator.execute(plan);

      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    }, 15000);

    it('should determine production readiness', async () => {
      const plan = createTestPlan();
      const report = await orchestrator.execute(plan);

      expect(typeof report.readyForProduction).toBe('boolean');
    }, 15000);

    it('should track timestamps', async () => {
      const plan = createTestPlan();
      const report = await orchestrator.execute(plan);

      expect(report.startedAt).toBeTruthy();
      expect(report.completedAt).toBeTruthy();
      expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('should transition through phases', async () => {
      expect(orchestrator.getPhase()).toBe('idle');

      const plan = createTestPlan();
      await orchestrator.execute(plan);

      expect(orchestrator.getPhase()).toBe('complete');
    }, 15000);
  });

  // ============================================
  // INDIVIDUAL TEST TYPES
  // ============================================
  describe('Individual Test Types', () => {
    it('should run only load tests', async () => {
      const plan = createTestPlan();
      const results = await orchestrator.runLoadTests(plan);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].scenario).toBe('fast-smoke');
    });

    it('should run only security tests', async () => {
      const plan = createTestPlan();
      const report = await orchestrator.runSecurityTests(plan);
      expect(report.totalTests).toBeGreaterThan(0);
    });

    it('should run only chaos experiments', async () => {
      const plan = createTestPlan();
      const results = await orchestrator.runChaosExperiments(plan);
      expect(results.length).toBeGreaterThan(0);
    }, 15000);

    it('should run only benchmarks', async () => {
      const plan = createTestPlan();
      const results = await orchestrator.runBenchmarks(plan);
      expect(results.results.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // REPORTING
  // ============================================
  describe('Reporting', () => {
    it('should report load test failures as blockers', async () => {
      const plan = createTestPlan();
      plan.loadTests.scenarios[0].thresholds.maxP95LatencyMs = 0.0001;

      const report = await orchestrator.execute(plan);
      expect(report.blockers.some(b => b.includes('load test'))).toBe(true);
    }, 15000);

    it('should report blockers and warnings separately', async () => {
      const plan = createTestPlan();
      const report = await orchestrator.execute(plan);

      expect(Array.isArray(report.blockers)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
    }, 15000);
  });

  // ============================================
  // EMERGENCY STOP
  // ============================================
  describe('Emergency Stop', () => {
    it('should clear faults and reset phase', () => {
      orchestrator.emergencyStop();
      expect(orchestrator.getPhase()).toBe('idle');
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================
  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const plan: StressTestPlan = {
        name: 'Error Plan',
        description: 'Plan that causes errors',
        loadTests: {
          baseUrl: 'http://localhost:3000',
          scenarios: [createFastSmokeScenario()],
          globalThresholds: {
            maxP95LatencyMs: 5000,
            maxP99LatencyMs: 10000,
            maxErrorRate: 0.5,
            minThroughputRps: 0.01,
          },
          workspaceIds: ['test-workspace-1'],
          endpoints: [
            { name: 'health', method: 'GET', path: '/api/health', weight: 100, expectedStatus: [200], latencyBudgetMs: 5000 },
          ],
        },
        securityTests: [],
        chaosExperiments: [],
        benchmarks: {
          name: 'Broken',
          benchmarks: [{
            name: 'Broken Benchmark',
            iterations: 0,
            warmupIterations: 0,
            concurrency: 1,
            timeoutMs: 5000,
            operation: async () => {},
          }],
        },
      };

      await expect(orchestrator.execute(plan)).rejects.toThrow(StressTestOrchestratorError);
      expect(orchestrator.getPhase()).toBe('failed');
    }, 15000);
  });
});
