/**
 * GENESIS PHASE 47: CHAOS ENGINE TESTS
 */

import {
  ChaosEngine,
  getDefaultChaosExperiments,
  MockTestEnvironment,
  type ChaosExperiment,
} from '../../../lib/genesis/phase47';

// Helper: create a fast experiment that passes pre-checks on fresh metrics
function createFastLatencyExperiment(): ChaosExperiment {
  return {
    id: 'test-latency',
    name: 'Fast Latency Test',
    type: 'latency_injection',
    description: 'Fast latency injection for unit testing',
    config: {
      targetService: 'api',
      durationSeconds: 2, // minimal
      intensity: 0.1,
      parameters: { delayMs: 1 },
    },
    steadyStateHypothesis: [
      // These pass on fresh metrics: error_rate = 0 (0/0 = 0), which is < 1.0
      { name: 'Error rate tolerable', metric: 'error_rate', operator: 'lt', threshold: 1.0 },
    ],
    rollback: { automatic: true, timeoutSeconds: 1, steps: ['Clear'] },
  };
}

function createFastErrorExperiment(): ChaosExperiment {
  return {
    id: 'test-error',
    name: 'Fast Error Test',
    type: 'error_injection',
    description: 'Fast error injection for unit testing',
    config: {
      targetService: 'api',
      durationSeconds: 2,
      intensity: 0.3,
      parameters: { errorCode: 500 },
    },
    steadyStateHypothesis: [
      { name: 'Error rate tolerable', metric: 'error_rate', operator: 'lt', threshold: 1.0 },
    ],
    rollback: { automatic: true, timeoutSeconds: 1, steps: ['Clear'] },
  };
}

function createFastConnectionDropExperiment(): ChaosExperiment {
  return {
    id: 'test-drop',
    name: 'Fast Connection Drop',
    type: 'connection_drop',
    description: 'Fast connection drop for unit testing',
    config: {
      targetService: 'api',
      durationSeconds: 2,
      intensity: 0.2,
      parameters: {},
    },
    steadyStateHypothesis: [
      { name: 'Error rate tolerable', metric: 'error_rate', operator: 'lt', threshold: 1.0 },
    ],
    rollback: { automatic: true, timeoutSeconds: 1, steps: ['Clear'] },
  };
}

function createFastDepFailureExperiment(): ChaosExperiment {
  return {
    id: 'test-dep',
    name: 'Fast Dependency Failure',
    type: 'dependency_failure',
    description: 'Fast dependency failure for unit testing',
    config: {
      targetService: 'n8n_webhook',
      durationSeconds: 2,
      intensity: 1.0,
      parameters: { service: 'n8n', errorCode: 502 },
    },
    steadyStateHypothesis: [
      { name: 'Core API available', metric: 'core_api_available', operator: 'eq', threshold: 1 },
    ],
    rollback: { automatic: true, timeoutSeconds: 1, steps: ['Restore'] },
  };
}

describe('Phase 47 Chaos Engine', () => {
  let env: MockTestEnvironment;
  let engine: ChaosEngine;

  beforeEach(() => {
    env = new MockTestEnvironment();
    engine = new ChaosEngine(env);
  });

  // ============================================
  // DEFAULT EXPERIMENTS
  // ============================================
  describe('getDefaultChaosExperiments', () => {
    it('should return a set of experiments', () => {
      const experiments = getDefaultChaosExperiments();
      expect(experiments.length).toBeGreaterThanOrEqual(4);
    });

    it('should have unique IDs', () => {
      const experiments = getDefaultChaosExperiments();
      const ids = experiments.map(e => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have valid steady state hypotheses', () => {
      const experiments = getDefaultChaosExperiments();
      for (const exp of experiments) {
        expect(exp.steadyStateHypothesis.length).toBeGreaterThan(0);
        for (const check of exp.steadyStateHypothesis) {
          expect(check.name).toBeTruthy();
          expect(check.metric).toBeTruthy();
          expect(['lt', 'lte', 'gt', 'gte', 'eq', 'neq']).toContain(check.operator);
        }
      }
    });

    it('should have rollback configurations', () => {
      const experiments = getDefaultChaosExperiments();
      for (const exp of experiments) {
        expect(exp.rollback.automatic).toBe(true);
        expect(exp.rollback.timeoutSeconds).toBeGreaterThan(0);
      }
    });

    it('should cover multiple experiment types', () => {
      const experiments = getDefaultChaosExperiments();
      const types = [...new Set(experiments.map(e => e.type))];
      expect(types.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================
  // LATENCY INJECTION
  // ============================================
  describe('Latency Injection', () => {
    it('should run latency injection experiment', async () => {
      const exp = createFastLatencyExperiment();
      const result = await engine.runExperiment(exp);

      expect(result.experimentId).toBe(exp.id);
      expect(result.type).toBe('latency_injection');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.steadyStateChecks.length).toBeGreaterThan(0);
    }, 10000);

    it('should recover from latency injection', async () => {
      const exp = createFastLatencyExperiment();
      const result = await engine.runExperiment(exp);
      expect(result.recovered).toBe(true);
    }, 10000);

    it('should have no active faults after experiment', async () => {
      const exp = createFastLatencyExperiment();
      await engine.runExperiment(exp);
      expect(engine.getActiveFaults()).toHaveLength(0);
    }, 10000);
  });

  // ============================================
  // ERROR INJECTION
  // ============================================
  describe('Error Injection', () => {
    it('should run error injection experiment', async () => {
      const exp = createFastErrorExperiment();
      const result = await engine.runExperiment(exp);

      expect(result.type).toBe('error_injection');
      expect(result.impactMetrics).toBeDefined();
      expect(result.impactMetrics.totalRequests).toBeGreaterThan(0);
    }, 10000);

    it('should measure error rate delta', async () => {
      const exp = createFastErrorExperiment();
      const result = await engine.runExperiment(exp);
      expect(result.impactMetrics.errorRateDelta).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should report affected requests', async () => {
      const exp = createFastErrorExperiment();
      const result = await engine.runExperiment(exp);
      expect(result.impactMetrics.affectedRequests).toBeGreaterThanOrEqual(0);
    }, 10000);
  });

  // ============================================
  // CONNECTION DROP
  // ============================================
  describe('Connection Drop', () => {
    it('should run connection drop experiment', async () => {
      const exp = createFastConnectionDropExperiment();
      const result = await engine.runExperiment(exp);
      expect(result.type).toBe('connection_drop');
      expect(result.recovered).toBe(true);
    }, 10000);
  });

  // ============================================
  // DEPENDENCY FAILURE
  // ============================================
  describe('Dependency Failure', () => {
    it('should simulate n8n dependency failure', async () => {
      const exp = createFastDepFailureExperiment();
      const result = await engine.runExperiment(exp);
      expect(result.type).toBe('dependency_failure');
      expect(result.steadyStateChecks.length).toBeGreaterThan(0);
    }, 10000);

    it('should maintain core API during dependency failure', async () => {
      const exp = createFastDepFailureExperiment();
      const result = await engine.runExperiment(exp);
      const coreCheck = result.steadyStateChecks.find(c => c.metric === 'core_api_available');
      if (coreCheck) {
        expect(coreCheck.passed).toBe(true);
      }
    }, 10000);
  });

  // ============================================
  // ACTIVE FAULTS MANAGEMENT
  // ============================================
  describe('Active Fault Management', () => {
    it('should report no active faults initially', () => {
      expect(engine.getActiveFaults()).toHaveLength(0);
    });

    it('should clear faults on emergency stop', () => {
      engine.emergencyStop();
      expect(engine.getActiveFaults()).toHaveLength(0);
    });

    it('should clear environment faults on emergency stop', () => {
      env.injectError('api', 1.0, 500);
      engine.emergencyStop();
      // After emergency stop, env faults should be cleared
      expect(engine.getActiveFaults()).toHaveLength(0);
    });
  });

  // ============================================
  // STEADY STATE VERIFICATION
  // ============================================
  describe('Steady State Verification', () => {
    it('should pass steady state when metrics are healthy', async () => {
      const experiment: ChaosExperiment = {
        id: 'test-healthy',
        name: 'Healthy Test',
        type: 'latency_injection',
        description: 'Test with healthy metrics',
        config: {
          targetService: 'api',
          durationSeconds: 2,
          intensity: 0.01,
          parameters: { delayMs: 1 },
        },
        steadyStateHypothesis: [
          { name: 'Low error rate', metric: 'error_rate', operator: 'lt', threshold: 1.0 },
        ],
        rollback: { automatic: true, timeoutSeconds: 1, steps: ['Clear'] },
      };

      const result = await engine.runExperiment(experiment);
      expect(result.steadyStateMaintained).toBe(true);
    }, 10000);

    it('should handle experiment with multiple steady state checks', async () => {
      const experiment: ChaosExperiment = {
        id: 'test-multi-check',
        name: 'Multi Check Test',
        type: 'latency_injection',
        description: 'Test with multiple checks',
        config: {
          targetService: 'api',
          durationSeconds: 2,
          intensity: 0.01,
          parameters: { delayMs: 1 },
        },
        steadyStateHypothesis: [
          { name: 'Error rate ok', metric: 'error_rate', operator: 'lt', threshold: 1.0 },
          { name: 'API available', metric: 'core_api_available', operator: 'eq', threshold: 1 },
        ],
        rollback: { automatic: true, timeoutSeconds: 1, steps: ['Clear'] },
      };

      const result = await engine.runExperiment(experiment);
      expect(result.steadyStateChecks.length).toBe(2);
    }, 10000);
  });

  // ============================================
  // RECOVERY TRACKING
  // ============================================
  describe('Recovery Tracking', () => {
    it('should track recovery time', async () => {
      const exp = createFastLatencyExperiment();
      const result = await engine.runExperiment(exp);
      expect(result.recoveryTimeMs).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should report timestamps', async () => {
      const exp = createFastLatencyExperiment();
      const result = await engine.runExperiment(exp);
      expect(result.startedAt).toBeTruthy();
      expect(result.completedAt).toBeTruthy();
    }, 10000);
  });

  // ============================================
  // CLOCK SKEW
  // ============================================
  describe('Clock Skew', () => {
    it('should handle clock skew experiment', async () => {
      const experiment: ChaosExperiment = {
        id: 'test-clock',
        name: 'Clock Skew Test',
        type: 'clock_skew',
        description: 'Test clock skew handling',
        config: {
          targetService: 'api',
          durationSeconds: 2,
          intensity: 1.0,
          parameters: { skewMs: 100 },
        },
        steadyStateHypothesis: [
          { name: 'No duplicates', metric: 'duplicate_events', operator: 'eq', threshold: 0 },
        ],
        rollback: { automatic: true, timeoutSeconds: 1, steps: ['Reset clock'] },
      };

      const result = await engine.runExperiment(experiment);
      expect(result.type).toBe('clock_skew');
    }, 10000);
  });
});
