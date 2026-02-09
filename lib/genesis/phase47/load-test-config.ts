/**
 * GENESIS PHASE 47: LOAD TEST CONFIGURATION
 *
 * Defines K6-style load test scenarios, endpoint configs,
 * threshold validation, and result analysis.
 */

import {
  LoadTestConfig,
  LoadTestScenario,
  LoadTestScenarioType,
  LoadTestEndpoint,
  LoadTestResult,
  LoadTestThresholds,
  LoadTestStage,
  LatencyMetrics,
  ThroughputMetrics,
  ThresholdViolation,
  StressTestEnvironment,
  LOAD_TEST_DEFAULTS,
  calculateLatencyMetrics,
  calculateErrorRate,
  checkThreshold,
} from './types';

export class LoadTestConfigError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'LoadTestConfigError';
  }
}

// ============================================
// SCENARIO FACTORIES
// ============================================

export function createSmokeScenario(overrides?: Partial<LoadTestScenario>): LoadTestScenario {
  return {
    name: 'smoke',
    type: 'smoke',
    stages: [
      { durationSeconds: LOAD_TEST_DEFAULTS.SMOKE_DURATION_S, targetVUs: LOAD_TEST_DEFAULTS.SMOKE_VUS },
    ],
    thresholds: {
      maxP95LatencyMs: 500,
      maxP99LatencyMs: 1000,
      maxErrorRate: 0,
      minThroughputRps: 1,
    },
    tags: { test_type: 'smoke' },
    startDelaySeconds: 0,
    ...overrides,
  };
}

export function createLoadScenario(overrides?: Partial<LoadTestScenario>): LoadTestScenario {
  return {
    name: 'load',
    type: 'load',
    stages: [
      { durationSeconds: 300, targetVUs: LOAD_TEST_DEFAULTS.LOAD_MAX_VUS },
      { durationSeconds: 600, targetVUs: LOAD_TEST_DEFAULTS.LOAD_MAX_VUS },
      { durationSeconds: 300, targetVUs: 0 },
    ],
    thresholds: {
      maxP95LatencyMs: 1000,
      maxP99LatencyMs: 2000,
      maxErrorRate: 0.01,
      minThroughputRps: 10,
    },
    tags: { test_type: 'load' },
    startDelaySeconds: 60,
    ...overrides,
  };
}

export function createStressScenario(overrides?: Partial<LoadTestScenario>): LoadTestScenario {
  return {
    name: 'stress',
    type: 'stress',
    stages: [
      { durationSeconds: 120, targetVUs: 200 },
      { durationSeconds: 300, targetVUs: 500 },
      { durationSeconds: 120, targetVUs: LOAD_TEST_DEFAULTS.STRESS_MAX_VUS },
      { durationSeconds: 300, targetVUs: LOAD_TEST_DEFAULTS.STRESS_MAX_VUS },
      { durationSeconds: 120, targetVUs: 0 },
    ],
    thresholds: {
      maxP95LatencyMs: 2000,
      maxP99LatencyMs: 5000,
      maxErrorRate: 0.05,
      minThroughputRps: 5,
    },
    tags: { test_type: 'stress' },
    startDelaySeconds: 0,
    ...overrides,
  };
}

export function createSpikeScenario(overrides?: Partial<LoadTestScenario>): LoadTestScenario {
  return {
    name: 'spike',
    type: 'spike',
    stages: [
      { durationSeconds: 10, targetVUs: LOAD_TEST_DEFAULTS.SPIKE_VUS },
      { durationSeconds: 60, targetVUs: LOAD_TEST_DEFAULTS.SPIKE_VUS },
      { durationSeconds: 10, targetVUs: 0 },
    ],
    thresholds: {
      maxP95LatencyMs: 3000,
      maxP99LatencyMs: 10000,
      maxErrorRate: 0.1,
      minThroughputRps: 1,
    },
    tags: { test_type: 'spike' },
    startDelaySeconds: 0,
    ...overrides,
  };
}

// ============================================
// DEFAULT ENDPOINTS
// ============================================

export function getDefaultEndpoints(): LoadTestEndpoint[] {
  return [
    {
      name: 'dashboard',
      method: 'GET',
      path: '/api/dashboard',
      weight: 30,
      expectedStatus: [200],
      latencyBudgetMs: 500,
    },
    {
      name: 'contacts',
      method: 'GET',
      path: '/api/contacts',
      weight: 25,
      expectedStatus: [200],
      latencyBudgetMs: 800,
    },
    {
      name: 'sequences',
      method: 'GET',
      path: '/api/sequences',
      weight: 20,
      expectedStatus: [200],
      latencyBudgetMs: 600,
    },
    {
      name: 'events_webhook',
      method: 'POST',
      path: '/api/events',
      headers: { 'Content-Type': 'application/json' },
      bodyTemplate: JSON.stringify({
        workspace_id: '{{workspaceId}}',
        event_type: 'email_sent',
        idempotency_key: '{{idempotencyKey}}',
        data: { email: '{{email}}', email_number: 1 },
      }),
      weight: 15,
      expectedStatus: [200, 201],
      latencyBudgetMs: 300,
    },
    {
      name: 'health',
      method: 'GET',
      path: '/api/health',
      weight: 10,
      expectedStatus: [200],
      latencyBudgetMs: 100,
    },
  ];
}

// ============================================
// CONFIG BUILDER
// ============================================

export function createDefaultLoadTestConfig(
  baseUrl: string,
  workspaceIds: string[],
  options?: {
    webhookSecret?: string;
    scenarios?: LoadTestScenarioType[];
  },
): LoadTestConfig {
  const scenarioTypes = options?.scenarios || ['smoke', 'load', 'stress', 'spike'];
  const scenarios: LoadTestScenario[] = [];

  for (const type of scenarioTypes) {
    switch (type) {
      case 'smoke': scenarios.push(createSmokeScenario()); break;
      case 'load': scenarios.push(createLoadScenario()); break;
      case 'stress': scenarios.push(createStressScenario()); break;
      case 'spike': scenarios.push(createSpikeScenario()); break;
    }
  }

  return {
    baseUrl,
    scenarios,
    globalThresholds: {
      maxP95LatencyMs: 1000,
      maxP99LatencyMs: 2000,
      maxErrorRate: 0.01,
      minThroughputRps: 10,
    },
    workspaceIds,
    webhookSecret: options?.webhookSecret,
    endpoints: getDefaultEndpoints(),
  };
}

// ============================================
// VALIDATION
// ============================================

export function validateLoadTestConfig(config: LoadTestConfig): string[] {
  const errors: string[] = [];

  if (!config.baseUrl) errors.push('baseUrl is required');
  if (!config.scenarios.length) errors.push('At least one scenario is required');
  if (!config.workspaceIds.length) errors.push('At least one workspaceId is required');
  if (!config.endpoints.length) errors.push('At least one endpoint is required');

  for (const scenario of config.scenarios) {
    if (!scenario.stages.length) {
      errors.push(`Scenario '${scenario.name}' has no stages`);
    }
    for (const stage of scenario.stages) {
      if (stage.durationSeconds <= 0) {
        errors.push(`Scenario '${scenario.name}' has invalid stage duration: ${stage.durationSeconds}`);
      }
      if (stage.targetVUs < 0) {
        errors.push(`Scenario '${scenario.name}' has negative VUs: ${stage.targetVUs}`);
      }
    }
  }

  const totalWeight = config.endpoints.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight !== 100) {
    errors.push(`Endpoint weights must sum to 100, got ${totalWeight}`);
  }

  return errors;
}

// ============================================
// LOAD TEST RUNNER (Simulated)
// ============================================

export class LoadTestRunner {
  constructor(private readonly env: StressTestEnvironment) {}

  /**
   * Run a single load test scenario against the simulated environment.
   */
  async runScenario(
    scenario: LoadTestScenario,
    config: LoadTestConfig,
  ): Promise<LoadTestResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;

    // Simulate running through stages
    for (const stage of scenario.stages) {
      const iterations = Math.max(1, Math.floor(stage.targetVUs * stage.durationSeconds / 10));

      for (let i = 0; i < iterations; i++) {
        const endpoint = this.selectEndpoint(config.endpoints);
        const wsId = config.workspaceIds[Math.floor(Math.random() * config.workspaceIds.length)];

        const response = await this.env.simulateRequest(
          endpoint.method,
          `${endpoint.path}?workspaceId=${wsId}`,
          {
            headers: endpoint.headers,
            workspaceId: wsId,
          },
        );

        latencies.push(response.latencyMs);
        if (endpoint.expectedStatus.includes(response.status)) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    const totalRequests = successCount + failCount;
    const durationMs = Date.now() - startTime;
    const errorRate = calculateErrorRate(totalRequests, failCount);
    const latencyMetrics = calculateLatencyMetrics(latencies);

    // Check thresholds
    const violations: ThresholdViolation[] = [];
    const v1 = checkThreshold('p95_latency', latencyMetrics.p95, scenario.thresholds);
    if (v1) violations.push(v1);
    const v2 = checkThreshold('p99_latency', latencyMetrics.p99, scenario.thresholds);
    if (v2) violations.push(v2);
    const v3 = checkThreshold('error_rate', errorRate, scenario.thresholds);
    if (v3) violations.push(v3);
    const rps = totalRequests / (durationMs / 1000);
    const v4 = checkThreshold('throughput', rps, scenario.thresholds);
    if (v4) violations.push(v4);

    return {
      scenario: scenario.name,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs,
      totalRequests,
      successfulRequests: successCount,
      failedRequests: failCount,
      errorRate,
      latency: latencyMetrics,
      throughput: {
        requestsPerSecond: Math.round(rps * 100) / 100,
        bytesPerSecond: 0,
        peakRps: Math.round(rps * 1.2 * 100) / 100,
      },
      thresholdsPassed: violations.length === 0,
      violations,
    };
  }

  /**
   * Select an endpoint based on weighted probability.
   */
  private selectEndpoint(endpoints: LoadTestEndpoint[]): LoadTestEndpoint {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const ep of endpoints) {
      cumulative += ep.weight;
      if (rand <= cumulative) return ep;
    }
    return endpoints[endpoints.length - 1];
  }
}
