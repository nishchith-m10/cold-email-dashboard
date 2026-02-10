/**
 * GENESIS PHASE 48: INSTANT REVERT
 *
 * Auto-revert triggers, revert execution, monitoring loop,
 * and cooldown management.
 */

import {
  RevertTriggerConfig,
  RevertTriggerState,
  RevertResult,
  DeploymentEnvironment,
  DEFAULT_REVERT_TRIGGERS,
} from './types';
import { DeploymentController } from './deployment-controller';

export class InstantRevertError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'InstantRevertError';
  }
}

export class InstantRevertManager {
  private triggers: RevertTriggerConfig[];
  private lastTriggerTimes: Map<string, number> = new Map();
  private revertCount = 0;

  constructor(
    private readonly env: DeploymentEnvironment,
    private readonly controller: DeploymentController,
    triggers?: RevertTriggerConfig[],
  ) {
    this.triggers = triggers || [...DEFAULT_REVERT_TRIGGERS];
  }

  // ============================================
  // TRIGGER MANAGEMENT
  // ============================================

  /**
   * Add a revert trigger.
   */
  addTrigger(trigger: RevertTriggerConfig): void {
    const idx = this.triggers.findIndex(t => t.name === trigger.name);
    if (idx >= 0) {
      this.triggers[idx] = trigger;
    } else {
      this.triggers.push(trigger);
    }
  }

  /**
   * Remove a trigger by name.
   */
  removeTrigger(name: string): boolean {
    const idx = this.triggers.findIndex(t => t.name === name);
    if (idx >= 0) {
      this.triggers.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all configured triggers.
   */
  getTriggers(): RevertTriggerConfig[] {
    return [...this.triggers];
  }

  // ============================================
  // TRIGGER EVALUATION
  // ============================================

  /**
   * Check all triggers against current metrics.
   */
  async checkTriggers(): Promise<RevertTriggerState[]> {
    const results: RevertTriggerState[] = [];

    for (const trigger of this.triggers) {
      const currentValue = await this.getMetricValue(trigger.type);
      const triggered = currentValue > trigger.threshold;

      results.push({
        name: trigger.name,
        type: trigger.type,
        threshold: trigger.threshold,
        currentValue,
        triggered,
        autoRevert: trigger.autoRevert,
        lastTriggeredAt: triggered ? new Date().toISOString() : null,
      });
    }

    return results;
  }

  /**
   * Check triggers and auto-revert if any fire.
   * Returns the revert result if a revert happened, null otherwise.
   */
  async monitorAndAutoRevert(): Promise<RevertResult | null> {
    const triggerStates = await this.checkTriggers();
    const fired = triggerStates.find(t => t.triggered && t.autoRevert);

    if (!fired) return null;

    // Check cooldown
    const lastTime = this.lastTriggerTimes.get(fired.name) || 0;
    const triggerConfig = this.triggers.find(t => t.name === fired.name)!;
    const cooldownMs = triggerConfig.cooldownSeconds * 1000;
    const now = Date.now();

    if (now - lastTime < cooldownMs) {
      return null; // Still in cooldown
    }

    // Execute revert
    this.lastTriggerTimes.set(fired.name, now);
    return this.executeRevert(
      `Auto-revert: ${fired.name} = ${fired.currentValue} (threshold: ${fired.threshold})`,
    );
  }

  // ============================================
  // REVERT EXECUTION
  // ============================================

  /**
   * Execute an instant revert.
   */
  async executeRevert(reason: string): Promise<RevertResult> {
    const startTime = Date.now();
    const actions: string[] = [];

    try {
      const state = await this.env.getDeploymentState();
      const previousVersion = state.standbyVersion || state.activeVersion;

      // 1. Abort canary if active
      const canary = this.controller.getCanaryState();
      if (canary.active) {
        await this.controller.abortCanary(reason);
        actions.push('Aborted active canary deployment');
      }

      // 2. Rollback via controller
      const rollbackResult = await this.controller.rollback(reason);
      if (rollbackResult.success) {
        actions.push('Rolled back deployment');
      } else {
        actions.push(`Rollback warning: ${rollbackResult.error || 'unknown'}`);
      }

      // 3. Log the revert event
      await this.env.logEvent({
        type: 'revert_triggered',
        slot: state.activeSlot,
        version: state.activeVersion,
        details: { reason, actions, revertCount: ++this.revertCount },
      });
      actions.push('Logged revert event');

      return {
        success: true,
        reason,
        durationMs: Date.now() - startTime,
        actions,
        previousVersion,
        revertedToVersion: state.activeVersion,
      };
    } catch (error) {
      return {
        success: false,
        reason,
        durationMs: Date.now() - startTime,
        actions,
        previousVersion: 'unknown',
        revertedToVersion: 'unknown',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get total revert count.
   */
  getRevertCount(): number {
    return this.revertCount;
  }

  /**
   * Reset cooldowns (useful after deployment stabilizes).
   */
  resetCooldowns(): void {
    this.lastTriggerTimes.clear();
  }

  // ============================================
  // INTERNAL
  // ============================================

  private async getMetricValue(type: string): Promise<number> {
    switch (type) {
      case 'error_rate':
        return this.env.getErrorRate();
      case 'p95_latency':
        return this.env.getP95Latency();
      case 'p99_latency':
        return this.env.getP99Latency();
      case 'db_connection_failures':
        return this.env.getDbConnectionFailures();
      case 'memory_pressure':
        return this.env.getMemoryPressure();
      case 'cpu_pressure':
        return this.env.getCpuPressure();
      default:
        return 0;
    }
  }
}
