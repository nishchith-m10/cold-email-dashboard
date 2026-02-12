/**
 * GENESIS PHASE 48: DEPLOYMENT CONTROLLER
 *
 * Blue/green deployment state machine, canary traffic routing,
 * slot swapping, and deployment lifecycle management.
 */

import {
  DeploymentState,
  DeploymentStatus,
  DeploymentSlot,
  DeploymentEvent,
  CanaryConfig,
  CanaryState,
  DeploymentEnvironment,
  DEFAULT_CANARY_CONFIG,
  DEPLOYMENT_DEFAULTS,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
  generateEventId,
  generateDeploymentId,
} from './types';

export class DeploymentControllerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DeploymentControllerError';
  }
}

export class DeploymentController {
  private canaryState: CanaryState = {
    active: false,
    percentage: 0,
    startedAt: null,
    lastStepAt: null,
    stepCount: 0,
    consecutiveHealthChecks: 0,
    healthChecksPassed: 0,
    healthChecksFailed: 0,
  };

  private deploymentId: string | null = null;

  constructor(
    private readonly env: DeploymentEnvironment,
    private readonly canaryConfig: CanaryConfig = DEFAULT_CANARY_CONFIG,
  ) {}

  // ============================================
  // STATE TRANSITION ENFORCEMENT
  // ============================================

  /**
   * Validate and enforce a state transition.
   * Throws if the transition is not allowed by the state machine.
   */
  private validateTransition(currentStatus: DeploymentStatus, targetStatus: DeploymentStatus): void {
    if (!isValidStatusTransition(currentStatus, targetStatus)) {
      const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
      throw new DeploymentControllerError(
        `Invalid state transition: '${currentStatus}' → '${targetStatus}'. Allowed: [${allowed.join(', ')}]`,
        'INVALID_TRANSITION',
      );
    }
  }

  // ============================================
  // DEPLOYMENT LIFECYCLE
  // ============================================

  /**
   * Deploy a new version to the standby slot.
   */
  async deployToStandby(version: string): Promise<{ success: boolean; deploymentId: string; error?: string }> {
    const state = await this.env.getDeploymentState();

    // Enforce state transition: must be able to go to 'deploying'
    this.validateTransition(state.status, 'deploying');

    this.deploymentId = generateDeploymentId();

    // Transition to deploying
    await this.env.updateDeploymentStatus('deploying');

    await this.env.logEvent({
      type: 'deploy_started',
      slot: state.standbySlot,
      version,
      details: { deploymentId: this.deploymentId },
    });

    const result = await this.env.deployToStandby(version);

    if (result.success) {
      await this.env.logEvent({
        type: 'deploy_completed',
        slot: state.standbySlot,
        version,
        details: { deploymentId: this.deploymentId },
      });
    }

    return {
      success: result.success,
      deploymentId: this.deploymentId,
      error: result.error,
    };
  }

  /**
   * Run a health check on the specified slot.
   */
  async healthCheck(slot?: DeploymentSlot): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const state = await this.env.getDeploymentState();
    const targetSlot = slot || state.standbySlot;

    const result = await this.env.checkHealth(targetSlot);

    await this.env.logEvent({
      type: result.healthy ? 'health_check_passed' : 'health_check_failed',
      slot: targetSlot,
      version: targetSlot === state.activeSlot ? state.activeVersion : (state.standbyVersion || 'unknown'),
      details: result.details,
    });

    // Track consecutive health checks for canary
    if (this.canaryState.active) {
      if (result.healthy) {
        this.canaryState.consecutiveHealthChecks++;
        this.canaryState.healthChecksPassed++;
      } else {
        this.canaryState.consecutiveHealthChecks = 0;
        this.canaryState.healthChecksFailed++;
      }
    }

    return result;
  }

  // ============================================
  // CANARY MANAGEMENT
  // ============================================

  /**
   * Start canary deployment with initial traffic percentage.
   */
  async startCanary(): Promise<CanaryState> {
    const state = await this.env.getDeploymentState();
    // Canary requires deploying → canary transition
    this.validateTransition(state.status, 'canary');

    const initial = this.canaryConfig.initialPercentage;
    await this.env.setCanaryPercentage(initial);

    // Update deployment status to canary (controller owns the state machine)
    await this.env.updateDeploymentStatus('canary');

    this.canaryState = {
      active: true,
      percentage: initial,
      startedAt: new Date().toISOString(),
      lastStepAt: new Date().toISOString(),
      stepCount: 0,
      consecutiveHealthChecks: 0,
      healthChecksPassed: 0,
      healthChecksFailed: 0,
    };

    await this.env.logEvent({
      type: 'canary_started',
      slot: state.standbySlot,
      version: state.standbyVersion || 'unknown',
      details: { percentage: initial, config: this.canaryConfig },
    });

    return { ...this.canaryState };
  }

  /**
   * Advance canary to next step.
   */
  async advanceCanary(): Promise<CanaryState> {
    if (!this.canaryState.active) {
      throw new DeploymentControllerError('No active canary to advance', 'NO_ACTIVE_CANARY');
    }

    if (this.canaryState.consecutiveHealthChecks < this.canaryConfig.requiredHealthChecks) {
      throw new DeploymentControllerError(
        `Need ${this.canaryConfig.requiredHealthChecks} consecutive health checks, have ${this.canaryState.consecutiveHealthChecks}`,
        'INSUFFICIENT_HEALTH_CHECKS',
      );
    }

    const newPercentage = Math.min(
      this.canaryState.percentage + this.canaryConfig.stepPercentage,
      this.canaryConfig.maxPercentage,
    );

    await this.env.setCanaryPercentage(newPercentage);

    this.canaryState.percentage = newPercentage;
    this.canaryState.stepCount++;
    this.canaryState.lastStepAt = new Date().toISOString();
    this.canaryState.consecutiveHealthChecks = 0;

    const state = await this.env.getDeploymentState();
    await this.env.logEvent({
      type: 'canary_advanced',
      slot: state.standbySlot,
      version: state.standbyVersion || 'unknown',
      details: { percentage: newPercentage, step: this.canaryState.stepCount },
    });

    return { ...this.canaryState };
  }

  /**
   * Abort the canary and revert traffic.
   */
  async abortCanary(reason: string): Promise<void> {
    if (!this.canaryState.active) return;

    await this.env.setCanaryPercentage(0);

    const state = await this.env.getDeploymentState();
    await this.env.logEvent({
      type: 'canary_aborted',
      slot: state.standbySlot,
      version: state.standbyVersion || 'unknown',
      details: { reason, finalPercentage: this.canaryState.percentage },
    });

    this.canaryState = {
      active: false,
      percentage: 0,
      startedAt: null,
      lastStepAt: null,
      stepCount: 0,
      consecutiveHealthChecks: 0,
      healthChecksPassed: this.canaryState.healthChecksPassed,
      healthChecksFailed: this.canaryState.healthChecksFailed,
    };
  }

  /**
   * Check if canary is ready for promotion.
   */
  isCanaryReadyForPromotion(): boolean {
    return (
      this.canaryState.active &&
      this.canaryState.percentage >= this.canaryConfig.maxPercentage &&
      this.canaryState.consecutiveHealthChecks >= this.canaryConfig.requiredHealthChecks
    );
  }

  /**
   * Get current canary state.
   */
  getCanaryState(): CanaryState {
    return { ...this.canaryState };
  }

  // ============================================
  // PROMOTION & ROLLBACK
  // ============================================

  /**
   * Promote standby to active (swap slots).
   */
  async promote(): Promise<{ success: boolean; error?: string }> {
    const state = await this.env.getDeploymentState();

    // Enforce: canary → promoting or deploying → stable (for direct promotion)
    if (state.status === 'canary') {
      this.validateTransition(state.status, 'promoting');
    } else if (state.status === 'promoting') {
      this.validateTransition(state.status, 'stable');
    }

    // Transition to promoting
    if (state.status === 'canary') {
      this.validateTransition(state.status, 'promoting');
      await this.env.updateDeploymentStatus('promoting');
    }

    await this.env.logEvent({
      type: 'promote_started',
      slot: state.standbySlot,
      version: state.standbyVersion || 'unknown',
      details: {},
    });

    // Set canary to 100% before swap
    if (this.canaryState.active && this.canaryState.percentage < 100) {
      await this.env.setCanaryPercentage(100);
    }

    const result = await this.env.swapSlots();

    if (result.success) {
      // Transition to stable
      await this.env.updateDeploymentStatus('stable');

      await this.env.logEvent({
        type: 'promote_completed',
        slot: state.standbySlot,
        version: state.standbyVersion || 'unknown',
        details: { previousActive: state.activeVersion },
      });

      this.canaryState = {
        active: false,
        percentage: 0,
        startedAt: null,
        lastStepAt: null,
        stepCount: 0,
        consecutiveHealthChecks: 0,
        healthChecksPassed: 0,
        healthChecksFailed: 0,
      };
    }

    return result;
  }

  /**
   * Rollback: revert traffic and mark as rolled back.
   */
  async rollback(reason: string): Promise<{ success: boolean; error?: string }> {
    const currentState = await this.env.getDeploymentState();

    // Validate rollback is allowed from current state
    // rolling_back is the intermediate state; rolled_back is the terminal
    if (currentState.status !== 'rolling_back') {
      this.validateTransition(currentState.status, 'rolling_back');
    }

    // Transition to rolling_back
    await this.env.updateDeploymentStatus('rolling_back');

    await this.env.logEvent({
      type: 'rollback_started',
      slot: currentState.activeSlot,
      version: currentState.activeVersion,
      details: { reason },
    });

    // Abort canary if active
    if (this.canaryState.active) {
      await this.abortCanary(reason);
    }

    // Set traffic to 0 on standby
    await this.env.setCanaryPercentage(0);

    // Transition to rolled_back
    await this.env.updateDeploymentStatus('rolled_back');

    await this.env.logEvent({
      type: 'rollback_completed',
      slot: currentState.activeSlot,
      version: currentState.activeVersion,
      details: { reason },
    });

    return { success: true };
  }

  /**
   * Get current deployment ID.
   */
  getDeploymentId(): string | null {
    return this.deploymentId;
  }
}
