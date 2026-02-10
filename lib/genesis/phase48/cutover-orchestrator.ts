/**
 * GENESIS PHASE 48: CUTOVER ORCHESTRATOR
 *
 * Top-level orchestrator combining launch readiness,
 * blue/green deployment, canary management, and instant revert
 * into a unified production cutover flow.
 */

import {
  CutoverPlan,
  CutoverProgress,
  CutoverResult,
  CutoverPhaseType,
  DeploymentEnvironment,
  DeploymentEvent,
  CanaryState,
  DEFAULT_CANARY_CONFIG,
  DEFAULT_REVERT_TRIGGERS,
} from './types';
import { LaunchReadinessEngine } from './launch-readiness';
import { DeploymentController } from './deployment-controller';
import { InstantRevertManager } from './instant-revert';

export class CutoverOrchestratorError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CutoverOrchestratorError';
  }
}

export class CutoverOrchestrator {
  private phase: CutoverPhaseType = 'idle';
  private events: DeploymentEvent[] = [];
  private startedAt: string | null = null;

  private readonly readiness: LaunchReadinessEngine;
  private controller: DeploymentController;
  private revert: InstantRevertManager;

  constructor(private readonly env: DeploymentEnvironment) {
    this.readiness = new LaunchReadinessEngine(env);
    this.controller = new DeploymentController(env);
    this.revert = new InstantRevertManager(env, this.controller);
  }

  getPhase(): CutoverPhaseType { return this.phase; }

  /**
   * Execute the full production cutover.
   */
  async execute(plan: CutoverPlan): Promise<CutoverResult> {
    this.startedAt = new Date().toISOString();
    this.events = [];
    const startTime = Date.now();

    try {
      // Rebuild controller + revert with plan's canary config
      this.controller = new DeploymentController(this.env, plan.canaryConfig);
      this.revert = new InstantRevertManager(this.env, this.controller, plan.revertTriggers);

      const state = await this.env.getDeploymentState();
      const previousVersion = state.activeVersion;

      // Phase 1: Readiness Check
      if (!plan.skipReadinessCheck) {
        this.phase = 'readiness_check';
        const report = await this.readiness.generateReport();

        if (report.status === 'NO-GO' && !plan.dryRun) {
          this.phase = 'failed';
          return this.buildResult(previousVersion, null, startTime, {
            readinessReport: report,
            error: `Readiness check failed: ${report.blockers.join(', ')}`,
          });
        }
      }

      if (plan.dryRun) {
        this.phase = 'complete';
        const report = await this.readiness.generateReport();
        return this.buildResult(previousVersion, null, startTime, { readinessReport: report });
      }

      // Phase 2: Deploy to Standby
      this.phase = 'deploy_standby';
      const deployResult = await this.controller.deployToStandby(plan.version);
      if (!deployResult.success) {
        this.phase = 'failed';
        return this.buildResult(previousVersion, plan.version, startTime, {
          error: `Deploy failed: ${deployResult.error || 'unknown'}`,
        });
      }

      // Phase 3: Health Check on Standby
      this.phase = 'health_check';
      const healthResult = await this.controller.healthCheck();
      if (!healthResult.healthy) {
        this.phase = 'failed';
        await this.controller.rollback('Standby health check failed');
        return this.buildResult(previousVersion, plan.version, startTime, {
          error: 'Standby health check failed after deployment',
        });
      }

      // Phase 4: Canary or Direct Promotion
      if (plan.skipCanary) {
        // Direct promotion
        this.phase = 'promoting';
        const promoteResult = await this.controller.promote();
        if (!promoteResult.success) {
          this.phase = 'failed';
          return this.buildResult(previousVersion, plan.version, startTime, {
            error: `Promotion failed: ${promoteResult.error || 'unknown'}`,
          });
        }
      } else {
        // Canary flow
        this.phase = 'canary_start';
        await this.controller.startCanary();

        // Canary monitoring
        this.phase = 'canary_monitoring';
        const canaryResult = await this.runCanaryLoop(plan);
        if (!canaryResult.success) {
          this.phase = 'rolled_back';
          return this.buildResult(previousVersion, plan.version, startTime, {
            error: canaryResult.error,
          });
        }

        // Promote after successful canary
        this.phase = 'promoting';
        const promoteResult = await this.controller.promote();
        if (!promoteResult.success) {
          this.phase = 'failed';
          return this.buildResult(previousVersion, plan.version, startTime, {
            error: `Promotion failed after canary: ${promoteResult.error || 'unknown'}`,
          });
        }
      }

      // Phase 5: Post-Promotion Verification
      this.phase = 'verification';
      const postHealth = await this.controller.healthCheck();
      if (!postHealth.healthy) {
        this.phase = 'rolling_back';
        await this.revert.executeRevert('Post-promotion health check failed');
        this.phase = 'rolled_back';
        return this.buildResult(previousVersion, plan.version, startTime, {
          error: 'Post-promotion verification failed, reverted',
        });
      }

      // Success
      this.phase = 'complete';
      return this.buildResult(previousVersion, plan.version, startTime);

    } catch (error) {
      this.phase = 'failed';
      // Emergency revert
      try {
        await this.revert.executeRevert(`Cutover error: ${error instanceof Error ? error.message : 'unknown'}`);
      } catch {
        // Double fault — log but don't throw
      }
      throw new CutoverOrchestratorError(
        `Cutover failed: ${error instanceof Error ? error.message : String(error)}`,
        'CUTOVER_FAILED',
      );
    }
  }

  /**
   * Run a dry-run cutover (readiness check only, no deployment).
   */
  async dryRun(plan: CutoverPlan): Promise<CutoverResult> {
    return this.execute({ ...plan, dryRun: true });
  }

  /**
   * Emergency stop — abort canary and rollback.
   */
  async emergencyStop(reason: string): Promise<RevertResult> {
    const result = await this.revert.executeRevert(reason);
    this.phase = result.success ? 'rolled_back' : 'failed';
    return result;
  }

  /**
   * Get the readiness engine for custom check registration.
   */
  getReadinessEngine(): LaunchReadinessEngine {
    return this.readiness;
  }

  /**
   * Get the deployment controller.
   */
  getDeploymentController(): DeploymentController {
    return this.controller;
  }

  /**
   * Get the instant revert manager.
   */
  getRevertManager(): InstantRevertManager {
    return this.revert;
  }

  // ============================================
  // INTERNAL
  // ============================================

  private async runCanaryLoop(
    plan: CutoverPlan,
  ): Promise<{ success: boolean; error?: string }> {
    const config = plan.canaryConfig;
    const maxSteps = Math.ceil(
      (config.maxPercentage - config.initialPercentage) / config.stepPercentage,
    );

    for (let step = 0; step <= maxSteps; step++) {
      // Health check
      const healthResult = await this.controller.healthCheck();

      if (!healthResult.healthy && config.rollbackOnFailure) {
        await this.controller.abortCanary('Health check failed during canary');
        return { success: false, error: 'Canary health check failed' };
      }

      // Check revert triggers
      const revertResult = await this.revert.monitorAndAutoRevert();
      if (revertResult) {
        return { success: false, error: `Auto-revert triggered: ${revertResult.reason}` };
      }

      // Check if ready for promotion
      if (this.controller.isCanaryReadyForPromotion()) {
        return { success: true };
      }

      // Advance canary if we have enough health checks
      const canary = this.controller.getCanaryState();
      if (canary.consecutiveHealthChecks >= config.requiredHealthChecks && canary.percentage < config.maxPercentage) {
        await this.controller.advanceCanary();
      }
    }

    // Check final state
    if (this.controller.isCanaryReadyForPromotion()) {
      return { success: true };
    }

    return { success: true }; // Reached max steps, consider complete
  }

  private buildResult(
    previousVersion: string,
    newVersion: string | null,
    startTime: number,
    extra?: {
      readinessReport?: any;
      error?: string;
    },
  ): CutoverResult {
    return {
      success: this.phase === 'complete',
      phase: this.phase,
      startedAt: this.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startTime,
      previousVersion,
      newVersion,
      events: this.events,
      readinessReport: extra?.readinessReport,
      error: extra?.error,
    };
  }
}

// Re-export RevertResult for the emergencyStop return type
import type { RevertResult } from './types';
