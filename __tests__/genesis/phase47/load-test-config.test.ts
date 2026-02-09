/**
 * GENESIS PHASE 47: LOAD TEST CONFIG TESTS
 */

import {
  LoadTestRunner,
  createSmokeScenario,
  createLoadScenario,
  createStressScenario,
  createSpikeScenario,
  getDefaultEndpoints,
  createDefaultLoadTestConfig,
  validateLoadTestConfig,
  MockTestEnvironment,
} from '../../../lib/genesis/phase47';

describe('Phase 47 Load Test Config', () => {
  // ============================================
  // SCENARIO FACTORIES
  // ============================================
  describe('Scenario Factories', () => {
    it('should create smoke scenario with defaults', () => {
      const scenario = createSmokeScenario();
      expect(scenario.name).toBe('smoke');
      expect(scenario.type).toBe('smoke');
      expect(scenario.stages).toHaveLength(1);
      expect(scenario.stages[0].targetVUs).toBe(5);
      expect(scenario.thresholds.maxErrorRate).toBe(0);
    });

    it('should create load scenario with ramp stages', () => {
      const scenario = createLoadScenario();
      expect(scenario.name).toBe('load');
      expect(scenario.stages).toHaveLength(3); // ramp up, sustain, ramp down
      expect(scenario.stages[0].targetVUs).toBe(100);
    });

    it('should create stress scenario with 5 stages', () => {
      const scenario = createStressScenario();
      expect(scenario.name).toBe('stress');
      expect(scenario.stages).toHaveLength(5);
      expect(scenario.stages[2].targetVUs).toBe(1000);
    });

    it('should create spike scenario', () => {
      const scenario = createSpikeScenario();
      expect(scenario.name).toBe('spike');
      expect(scenario.stages[0].durationSeconds).toBe(10); // rapid spike
      expect(scenario.stages[0].targetVUs).toBe(1000);
    });

    it('should accept overrides', () => {
      const scenario = createSmokeScenario({ name: 'custom-smoke' });
      expect(scenario.name).toBe('custom-smoke');
      expect(scenario.type).toBe('smoke');
    });
  });

  // ============================================
  // DEFAULT ENDPOINTS
  // ============================================
  describe('Default Endpoints', () => {
    it('should return 5 default endpoints', () => {
      const endpoints = getDefaultEndpoints();
      expect(endpoints).toHaveLength(5);
    });

    it('should have weights summing to 100', () => {
      const endpoints = getDefaultEndpoints();
      const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
      expect(totalWeight).toBe(100);
    });

    it('should include dashboard, contacts, sequences, events, health', () => {
      const endpoints = getDefaultEndpoints();
      const names = endpoints.map(e => e.name);
      expect(names).toContain('dashboard');
      expect(names).toContain('contacts');
      expect(names).toContain('events_webhook');
      expect(names).toContain('health');
    });

    it('should have valid HTTP methods', () => {
      const endpoints = getDefaultEndpoints();
      for (const ep of endpoints) {
        expect(['GET', 'POST', 'PUT', 'DELETE']).toContain(ep.method);
      }
    });
  });

  // ============================================
  // CONFIG BUILDER
  // ============================================
  describe('createDefaultLoadTestConfig', () => {
    it('should create config with all scenarios by default', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['ws-1']);
      expect(config.scenarios).toHaveLength(4);
      expect(config.baseUrl).toBe('http://localhost:3000');
      expect(config.workspaceIds).toEqual(['ws-1']);
    });

    it('should create config with selected scenarios', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['ws-1'], {
        scenarios: ['smoke', 'load'],
      });
      expect(config.scenarios).toHaveLength(2);
      expect(config.scenarios[0].type).toBe('smoke');
      expect(config.scenarios[1].type).toBe('load');
    });

    it('should set webhook secret', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['ws-1'], {
        webhookSecret: 'test-secret',
      });
      expect(config.webhookSecret).toBe('test-secret');
    });
  });

  // ============================================
  // VALIDATION
  // ============================================
  describe('validateLoadTestConfig', () => {
    it('should pass for valid config', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['ws-1']);
      const errors = validateLoadTestConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty baseUrl', () => {
      const config = createDefaultLoadTestConfig('', ['ws-1']);
      config.baseUrl = '';
      const errors = validateLoadTestConfig(config);
      expect(errors).toContainEqual(expect.stringContaining('baseUrl'));
    });

    it('should reject no scenarios', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['ws-1']);
      config.scenarios = [];
      const errors = validateLoadTestConfig(config);
      expect(errors).toContainEqual(expect.stringContaining('scenario'));
    });

    it('should reject no workspaceIds', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', []);
      const errors = validateLoadTestConfig(config);
      expect(errors).toContainEqual(expect.stringContaining('workspaceId'));
    });

    it('should reject invalid stage duration', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['ws-1']);
      config.scenarios[0].stages[0].durationSeconds = -1;
      const errors = validateLoadTestConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject unbalanced endpoint weights', () => {
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['ws-1']);
      config.endpoints[0].weight = 10; // break the sum
      const errors = validateLoadTestConfig(config);
      expect(errors).toContainEqual(expect.stringContaining('weights'));
    });
  });

  // ============================================
  // LOAD TEST RUNNER
  // ============================================
  describe('LoadTestRunner', () => {
    let env: MockTestEnvironment;
    let runner: LoadTestRunner;

    beforeEach(() => {
      env = new MockTestEnvironment();
      runner = new LoadTestRunner(env);
    });

    it('should run a smoke scenario', async () => {
      const scenario = createSmokeScenario();
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['test-workspace-1']);

      const result = await runner.runScenario(scenario, config);

      expect(result.scenario).toBe('smoke');
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.latency.min).toBeGreaterThanOrEqual(0);
      expect(result.latency.max).toBeGreaterThanOrEqual(0);
      expect(result.throughput.requestsPerSecond).toBeGreaterThan(0);
    });

    it('should detect threshold violations', async () => {
      // Create a scenario with very tight thresholds
      const scenario = createSmokeScenario({
        thresholds: {
          maxP95LatencyMs: 0.001, // Impossibly tight
          maxP99LatencyMs: 0.001,
          maxErrorRate: 0,
          minThroughputRps: 999999,
        },
      });
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['test-workspace-1']);

      const result = await runner.runScenario(scenario, config);

      expect(result.thresholdsPassed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should report error rates under fault injection', async () => {
      env.injectError('api', 0.5, 500);
      const scenario = createSmokeScenario();
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['test-workspace-1']);

      const result = await runner.runScenario(scenario, config);

      expect(result.failedRequests).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThan(0);
    });

    it('should calculate timestamps', async () => {
      const scenario = createSmokeScenario();
      const config = createDefaultLoadTestConfig('http://localhost:3000', ['test-workspace-1']);

      const result = await runner.runScenario(scenario, config);

      expect(result.startedAt).toBeTruthy();
      expect(result.completedAt).toBeTruthy();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
