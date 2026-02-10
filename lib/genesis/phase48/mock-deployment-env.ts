/**
 * GENESIS PHASE 48: MOCK DEPLOYMENT ENVIRONMENT
 *
 * In-memory mock for DeploymentEnvironment interface,
 * simulating blue/green deployments, canary routing,
 * health checks, and metrics.
 */

import {
  DeploymentEnvironment,
  DeploymentState,
  DeploymentSlot,
  DeploymentEvent,
  generateEventId,
} from './types';

export class MockDeploymentEnvironment implements DeploymentEnvironment {
  private state: DeploymentState = {
    activeSlot: 'blue',
    standbySlot: 'green',
    canaryPercentage: 0,
    status: 'stable',
    lastDeployedAt: null,
    activeVersion: 'v1.0.0',
    standbyVersion: null,
    deploymentId: null,
    metadata: {},
  };

  private events: DeploymentEvent[] = [];
  private healthOverrides: Map<DeploymentSlot, boolean> = new Map();
  private metrics = {
    errorRate: 0.005,
    p95Latency: 200,
    p99Latency: 800,
    dbConnectionFailures: 0,
    memoryPressure: 0.3,
    cpuPressure: 0.2,
  };

  // Track calls for test assertions
  callLog: Array<{ method: string; args: any[] }> = [];

  // ============================================
  // DEPLOYMENT OPERATIONS
  // ============================================

  async getDeploymentState(): Promise<DeploymentState> {
    this.callLog.push({ method: 'getDeploymentState', args: [] });
    return { ...this.state };
  }

  async deployToStandby(version: string): Promise<{ success: boolean; error?: string }> {
    this.callLog.push({ method: 'deployToStandby', args: [version] });

    if (this.state.status !== 'stable' && this.state.status !== 'rolled_back' && this.state.status !== 'failed') {
      return { success: false, error: `Cannot deploy: status is ${this.state.status}` };
    }

    this.state.standbyVersion = version;
    this.state.status = 'deploying';
    this.state.lastDeployedAt = new Date().toISOString();

    return { success: true };
  }

  async swapSlots(): Promise<{ success: boolean; error?: string }> {
    this.callLog.push({ method: 'swapSlots', args: [] });

    const { activeSlot, standbySlot, activeVersion, standbyVersion } = this.state;
    this.state.activeSlot = standbySlot;
    this.state.standbySlot = activeSlot;
    this.state.activeVersion = standbyVersion || activeVersion;
    this.state.standbyVersion = activeVersion;
    this.state.status = 'stable';
    this.state.canaryPercentage = 0;

    return { success: true };
  }

  // ============================================
  // TRAFFIC ROUTING
  // ============================================

  async setCanaryPercentage(percentage: number): Promise<void> {
    this.callLog.push({ method: 'setCanaryPercentage', args: [percentage] });
    this.state.canaryPercentage = percentage;
    if (percentage > 0 && this.state.status === 'deploying') {
      this.state.status = 'canary';
    }
    if (percentage === 0 && this.state.status === 'canary') {
      this.state.status = 'rolling_back';
    }
  }

  // ============================================
  // HEALTH CHECKS
  // ============================================

  async checkHealth(slot: DeploymentSlot): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    this.callLog.push({ method: 'checkHealth', args: [slot] });

    const override = this.healthOverrides.get(slot);
    const healthy = override !== undefined ? override : true;

    return {
      healthy,
      details: {
        slot,
        responseTime: 50 + Math.random() * 100,
        connections: 10,
      },
    };
  }

  // ============================================
  // METRICS
  // ============================================

  async getErrorRate(): Promise<number> {
    this.callLog.push({ method: 'getErrorRate', args: [] });
    return this.metrics.errorRate;
  }

  async getP95Latency(): Promise<number> {
    this.callLog.push({ method: 'getP95Latency', args: [] });
    return this.metrics.p95Latency;
  }

  async getP99Latency(): Promise<number> {
    this.callLog.push({ method: 'getP99Latency', args: [] });
    return this.metrics.p99Latency;
  }

  async getDbConnectionFailures(): Promise<number> {
    this.callLog.push({ method: 'getDbConnectionFailures', args: [] });
    return this.metrics.dbConnectionFailures;
  }

  async getMemoryPressure(): Promise<number> {
    this.callLog.push({ method: 'getMemoryPressure', args: [] });
    return this.metrics.memoryPressure;
  }

  async getCpuPressure(): Promise<number> {
    this.callLog.push({ method: 'getCpuPressure', args: [] });
    return this.metrics.cpuPressure;
  }

  // ============================================
  // EVENTS
  // ============================================

  async logEvent(event: Omit<DeploymentEvent, 'id' | 'timestamp'>): Promise<void> {
    this.callLog.push({ method: 'logEvent', args: [event] });
    this.events.push({
      ...event,
      id: generateEventId(),
      timestamp: new Date().toISOString(),
    });
  }

  async getEvents(deploymentId?: string): Promise<DeploymentEvent[]> {
    this.callLog.push({ method: 'getEvents', args: [deploymentId] });
    return [...this.events];
  }

  // ============================================
  // TEST HELPERS
  // ============================================

  /**
   * Override health check result for a slot.
   */
  setHealthOverride(slot: DeploymentSlot, healthy: boolean): void {
    this.healthOverrides.set(slot, healthy);
  }

  /**
   * Clear health overrides.
   */
  clearHealthOverrides(): void {
    this.healthOverrides.clear();
  }

  /**
   * Set metric values for testing revert triggers.
   */
  setMetrics(metrics: Partial<typeof this.metrics>): void {
    Object.assign(this.metrics, metrics);
  }

  /**
   * Set deployment state directly (for test setup).
   */
  setState(state: Partial<DeploymentState>): void {
    Object.assign(this.state, state);
  }

  /**
   * Reset to clean state.
   */
  reset(): void {
    this.state = {
      activeSlot: 'blue',
      standbySlot: 'green',
      canaryPercentage: 0,
      status: 'stable',
      lastDeployedAt: null,
      activeVersion: 'v1.0.0',
      standbyVersion: null,
      deploymentId: null,
      metadata: {},
    };
    this.events = [];
    this.healthOverrides.clear();
    this.metrics = {
      errorRate: 0.005,
      p95Latency: 200,
      p99Latency: 800,
      dbConnectionFailures: 0,
      memoryPressure: 0.3,
      cpuPressure: 0.2,
    };
    this.callLog = [];
  }
}
