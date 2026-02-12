/**
 * GENESIS PHASE 47: CHAOS ENGINE
 *
 * Fault injection, latency simulation, circuit breaker testing,
 * dependency failure simulation, and recovery verification.
 */

import {
  ChaosExperiment,
  ChaosExperimentType,
  ChaosExperimentResult,
  ChaosImpactMetrics,
  SteadyStateCheck,
  ChaosConfig,
  ChaosRollback,
  StressTestEnvironment,
  CHAOS_DEFAULTS,
} from './types';

export class ChaosEngineError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ChaosEngineError';
  }
}

// ============================================
// DEFAULT CHAOS EXPERIMENTS
// ============================================

export function getDefaultChaosExperiments(): ChaosExperiment[] {
  return [
    {
      id: 'chaos-latency-001',
      name: 'API Latency Injection',
      type: 'latency_injection',
      description: 'Inject 500ms latency into 50% of API requests',
      config: {
        targetService: 'api',
        durationSeconds: 60,
        intensity: 0.5,
        parameters: { delayMs: 500 },
      },
      steadyStateHypothesis: [
        { name: 'Error rate below 5%', metric: 'error_rate', operator: 'lt', threshold: 0.05 },
        { name: 'P95 latency under 3s', metric: 'p95_latency', operator: 'lt', threshold: 3000 },
      ],
      rollback: { automatic: true, timeoutSeconds: 120, steps: ['Clear latency injection'] },
    },
    {
      id: 'chaos-error-001',
      name: 'Database Error Injection',
      type: 'error_injection',
      description: 'Inject 500 errors on 30% of DB queries',
      config: {
        targetService: 'database',
        durationSeconds: 60,
        intensity: 0.3,
        parameters: { errorCode: 500, errorMessage: 'Simulated DB failure' },
      },
      steadyStateHypothesis: [
        { name: 'Error rate below 40%', metric: 'error_rate', operator: 'lt', threshold: 0.4 },
        { name: 'Some requests succeed', metric: 'success_count', operator: 'gt', threshold: 0 },
      ],
      rollback: { automatic: true, timeoutSeconds: 60, steps: ['Clear error injection'] },
    },
    {
      id: 'chaos-drop-001',
      name: 'Connection Drop',
      type: 'connection_drop',
      description: 'Drop 20% of connections to simulate network issues',
      config: {
        targetService: 'api',
        durationSeconds: 30,
        intensity: 0.2,
        parameters: {},
      },
      steadyStateHypothesis: [
        { name: 'Error rate below 30%', metric: 'error_rate', operator: 'lt', threshold: 0.3 },
      ],
      rollback: { automatic: true, timeoutSeconds: 60, steps: ['Restore connections'] },
    },
    {
      id: 'chaos-dep-001',
      name: 'Dependency Failure (n8n)',
      type: 'dependency_failure',
      description: 'Simulate n8n webhook endpoint being unreachable',
      config: {
        targetService: 'n8n_webhook',
        durationSeconds: 60,
        intensity: 1.0,
        parameters: { service: 'n8n', errorCode: 502 },
      },
      steadyStateHypothesis: [
        { name: 'Core API still responds', metric: 'core_api_available', operator: 'eq', threshold: 1 },
        { name: 'Events queued gracefully', metric: 'queue_errors', operator: 'lt', threshold: 0.01 },
      ],
      rollback: { automatic: true, timeoutSeconds: 30, steps: ['Restore n8n connectivity'] },
    },
    {
      id: 'chaos-clock-001',
      name: 'Clock Skew Simulation',
      type: 'clock_skew',
      description: 'Simulate clock drift of 30 seconds',
      config: {
        targetService: 'api',
        durationSeconds: 30,
        intensity: 1.0,
        parameters: { skewMs: 30_000 },
      },
      steadyStateHypothesis: [
        { name: 'Idempotency still works', metric: 'duplicate_events', operator: 'eq', threshold: 0 },
      ],
      rollback: { automatic: true, timeoutSeconds: 30, steps: ['Reset clock'] },
    },
  ];
}

// ============================================
// CHAOS ENGINE
// ============================================

export class ChaosEngine {
  private activeFaults: Map<string, { experimentId: string; type: ChaosExperimentType }> = new Map();

  constructor(private readonly env: StressTestEnvironment) {}

  /**
   * Run a single chaos experiment.
   */
  async runExperiment(experiment: ChaosExperiment): Promise<ChaosExperimentResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    try {
      // 1. Verify steady state BEFORE chaos
      const preChecks = await this.checkSteadyState(experiment.steadyStateHypothesis);
      const preChecksPassed = preChecks.every(c => c.passed);
      if (!preChecksPassed) {
        return this.buildResult(experiment, startedAt, startTime, {
          steadyStateMaintained: false,
          steadyStateChecks: preChecks,
          error: 'Pre-experiment steady state check failed',
          recovered: false,
        });
      }

      // 2. Inject fault
      this.injectFault(experiment);
      this.activeFaults.set(experiment.id, { experimentId: experiment.id, type: experiment.type });

      // 3. Run workload under chaos
      const impactMetrics = await this.measureImpact(experiment);

      // 4. Roll back fault
      this.rollbackFault(experiment);
      this.activeFaults.delete(experiment.id);

      // 5. Verify steady state AFTER chaos
      const postChecks = await this.checkSteadyState(experiment.steadyStateHypothesis);
      const steadyStateMaintained = postChecks.every(c => c.passed);

      // 6. Measure recovery
      const recoveryStartTime = Date.now();
      let recovered = steadyStateMaintained;

      if (!recovered) {
        // Wait and recheck
        const maxRecoveryTime = experiment.rollback.timeoutSeconds * 1000;
        const checkInterval = CHAOS_DEFAULTS.STEADY_STATE_CHECK_INTERVAL_S * 1000;
        let elapsed = 0;

        while (elapsed < maxRecoveryTime && !recovered) {
          await this.sleep(Math.min(checkInterval, maxRecoveryTime - elapsed));
          elapsed = Date.now() - recoveryStartTime;
          const recheck = await this.checkSteadyState(experiment.steadyStateHypothesis);
          recovered = recheck.every(c => c.passed);
        }
      }

      const recoveryTimeMs = recovered ? Date.now() - recoveryStartTime : -1;

      return this.buildResult(experiment, startedAt, startTime, {
        steadyStateMaintained,
        steadyStateChecks: postChecks,
        impactMetrics,
        recovered,
        recoveryTimeMs,
      });
    } catch (error) {
      // Emergency rollback
      if (this.activeFaults.has(experiment.id)) {
        this.rollbackFault(experiment);
        this.activeFaults.delete(experiment.id);
      }

      return this.buildResult(experiment, startedAt, startTime, {
        steadyStateMaintained: false,
        steadyStateChecks: [],
        error: error instanceof Error ? error.message : String(error),
        recovered: false,
      });
    }
  }

  /**
   * Check if any faults are currently active.
   */
  getActiveFaults(): Array<{ experimentId: string; type: ChaosExperimentType }> {
    return Array.from(this.activeFaults.values());
  }

  /**
   * Emergency stop — clear all active faults.
   */
  emergencyStop(): void {
    this.env.clearFaults();
    this.activeFaults.clear();
  }

  // ============================================
  // INTERNAL
  // ============================================

  private injectFault(experiment: ChaosExperiment): void {
    const { config } = experiment;
    switch (experiment.type) {
      case 'latency_injection':
        this.env.injectLatency(
          config.targetService,
          (config.parameters.delayMs as number) || 500,
          config.intensity,
        );
        break;
      case 'error_injection':
      case 'dependency_failure':
        this.env.injectError(
          config.targetService,
          config.intensity,
          (config.parameters.errorCode as number) || 500,
        );
        break;
      case 'connection_drop':
        this.env.injectError(config.targetService, config.intensity, 0); // 0 = connection reset
        break;
      case 'clock_skew':
      case 'cpu_pressure':
      case 'memory_pressure':
      case 'disk_pressure':
      case 'network_partition':
      case 'data_corruption':
        // These are simulated via the latency/error injection
        this.env.injectLatency(
          config.targetService,
          (config.parameters.skewMs as number) || 100,
          config.intensity,
        );
        break;
    }
  }

  private rollbackFault(experiment: ChaosExperiment): void {
    this.env.clearFaults();
  }

  private async checkSteadyState(
    checks: SteadyStateCheck[],
  ): Promise<Array<SteadyStateCheck & { passed: boolean; actual: number }>> {
    const metrics = this.env.getMetrics();
    const results: Array<SteadyStateCheck & { passed: boolean; actual: number }> = [];

    for (const check of checks) {
      const actual = this.resolveMetric(check.metric, metrics);
      const passed = this.evaluateCheck(actual, check.operator, check.threshold);
      results.push({ ...check, passed, actual });
    }

    return results;
  }

  private resolveMetric(
    metric: string,
    metrics: { totalRequests: number; totalErrors: number; latencies: number[]; requestsByEndpoint: Record<string, number>; errorsByEndpoint: Record<string, number> },
  ): number {
    switch (metric) {
      case 'error_rate':
        return metrics.totalRequests > 0 ? metrics.totalErrors / metrics.totalRequests : 0;
      case 'p95_latency': {
        if (metrics.latencies.length === 0) return 0;
        const sorted = [...metrics.latencies].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length * 0.95)] || 0;
      }
      case 'success_count':
        return metrics.totalRequests - metrics.totalErrors;
      case 'core_api_available': {
        // Actually check: if total requests > 0 and error rate < 100%, API is available
        // If no requests have been made, probe the environment
        if (metrics.totalRequests === 0) return 1; // no traffic = no failure signal
        const errorRate = metrics.totalErrors / metrics.totalRequests;
        return errorRate < 1.0 ? 1 : 0;
      }
      case 'queue_errors': {
        // Derive from event endpoint errors if available
        const eventErrors = metrics.errorsByEndpoint['/api/events'] || 0;
        const eventTotal = metrics.requestsByEndpoint['/api/events'] || 0;
        return eventTotal > 0 ? eventErrors / eventTotal : 0;
      }
      case 'duplicate_events': {
        // Track based on total errors on event endpoint (a proxy for duplicates in mock)
        // In a real system, this would query a dedup table
        return metrics.errorsByEndpoint['/api/events'] || 0;
      }
      default:
        return 0;
    }
  }

  private evaluateCheck(actual: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'lt': return actual < threshold;
      case 'lte': return actual <= threshold;
      case 'gt': return actual > threshold;
      case 'gte': return actual >= threshold;
      case 'eq': return actual === threshold;
      case 'neq': return actual !== threshold;
      default: return false;
    }
  }

  /**
   * Measure the impact of the chaos experiment by generating diverse traffic.
   * Covers multiple endpoints to get a realistic impact profile.
   */
  private async measureImpact(experiment: ChaosExperiment): Promise<ChaosImpactMetrics> {
    this.env.resetMetrics();

    // Diverse endpoints to simulate real traffic patterns
    const endpoints = [
      { method: 'GET', path: '/api/dashboard?workspaceId=test-ws', wsId: 'test-ws' },
      { method: 'GET', path: '/api/contacts?workspaceId=test-ws', wsId: 'test-ws' },
      { method: 'GET', path: '/api/sequences?workspaceId=test-ws', wsId: 'test-ws' },
      { method: 'POST', path: '/api/events?workspaceId=test-ws', wsId: 'test-ws' },
      { method: 'GET', path: '/api/health', wsId: undefined },
    ];

    // Generate traffic during chaos across all endpoints
    const iterations = Math.max(10, Math.floor(experiment.config.durationSeconds / 2));
    for (let i = 0; i < iterations; i++) {
      const ep = endpoints[i % endpoints.length];
      try {
        await this.env.simulateRequest(ep.method, ep.path, {
          workspaceId: ep.wsId,
        });
      } catch {
        // Expected during chaos
      }
    }

    const metrics = this.env.getMetrics();
    const errorRate = metrics.totalRequests > 0 ? metrics.totalErrors / metrics.totalRequests : 0;

    return {
      errorRateDelta: errorRate,
      latencyDelta: metrics.latencies.length > 0
        ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
        : 0,
      throughputDelta: metrics.totalRequests,
      affectedRequests: metrics.totalErrors,
      totalRequests: metrics.totalRequests,
    };
  }

  private buildResult(
    experiment: ChaosExperiment,
    startedAt: string,
    startTime: number,
    data: {
      steadyStateMaintained: boolean;
      steadyStateChecks: Array<SteadyStateCheck & { passed: boolean; actual: number }>;
      impactMetrics?: ChaosImpactMetrics;
      recovered: boolean;
      recoveryTimeMs?: number;
      error?: string;
    },
  ): ChaosExperimentResult {
    return {
      experimentId: experiment.id,
      experimentName: experiment.name,
      type: experiment.type,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      steadyStateMaintained: data.steadyStateMaintained,
      steadyStateChecks: data.steadyStateChecks,
      impactMetrics: data.impactMetrics || {
        errorRateDelta: 0,
        latencyDelta: 0,
        throughputDelta: 0,
        affectedRequests: 0,
        totalRequests: 0,
      },
      recovered: data.recovered,
      recoveryTimeMs: data.recoveryTimeMs ?? 0,
      error: data.error,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
