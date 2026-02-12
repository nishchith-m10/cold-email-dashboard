/**
 * GENESIS PHASE 70.B: DEPLOYMENT TRACKER
 *
 * Tracks infrastructure deployment changes, parses Terraform plans,
 * and monitors deployment history for Dashboard infrastructure.
 * Provides change analysis, risk assessment, and rollback guidance.
 */

import {
  DeploymentPlan,
  DeploymentResult,
  ResourceChange,
  DeploymentAction,
  ResourceType,
  InfrastructureEnvironment,
  InfrastructureError,
} from './types';
import { TerraformStateManager } from './terraform-state-manager';

export interface TerraformPlanJson {
  format_version: string;
  terraform_version: string;
  resource_changes: TerraformResourceChange[];
  output_changes?: Record<string, { actions: string[]; before: unknown; after: unknown }>;
  prior_state?: {
    values: {
      root_module: {
        resources: Array<{ address: string; values: Record<string, unknown> }>;
      };
    };
  };
}

export interface TerraformResourceChange {
  address: string;
  mode: 'managed' | 'data';
  type: ResourceType;
  name: string;
  change: {
    actions: string[];
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    before_sensitive?: Record<string, boolean>;
    after_sensitive?: Record<string, boolean>;
  };
}

export class DeploymentTracker {
  private deploymentHistory: DeploymentResult[] = [];

  constructor(private readonly stateManager: TerraformStateManager) {}

  // ============================================
  // PLAN ANALYSIS
  // ============================================

  /**
   * Parse and analyze a Terraform plan JSON to understand proposed changes.
   * Returns a deployment plan with risk assessment.
   */
  async analyzePlan(
    planJson: TerraformPlanJson,
    environment: InfrastructureEnvironment,
  ): Promise<DeploymentPlan> {
    const changes: ResourceChange[] = [];
    const warnings: string[] = [];

    // Parse each resource change
    for (const resourceChange of planJson.resource_changes || []) {
      const change = this.parseResourceChange(resourceChange);
      changes.push(change);

      // Add warnings for risky operations
      if (change.requiresRecreate) {
        warnings.push(
          `⚠️ ${change.resourceType}.${change.resourceName} will be recreated (downtime expected)`,
        );
      }

      if (change.action === 'delete') {
        warnings.push(
          `⚠️ ${change.resourceType}.${change.resourceName} will be DELETED (irreversible)`,
        );
      }

      if (change.affectedDependencies.length > 0) {
        warnings.push(
          `⚠️ ${change.resourceType}.${change.resourceName} change affects ${change.affectedDependencies.length} dependent resource(s)`,
        );
      }
    }

    // Check for critical changes
    const hasDeletions = changes.some((c) => c.action === 'delete');
    const hasRecreates = changes.some((c) => c.requiresRecreate);
    const hasDropletChanges = changes.some(
      (c) => c.resourceType === 'digitalocean_droplet' && c.action !== 'no_change',
    );

    if (hasDeletions) {
      warnings.push('🔴 Plan includes DELETIONS - review carefully before applying');
    }

    if (hasDropletChanges) {
      warnings.push('🔴 Plan modifies droplets - may cause service interruption');
    }

    // Determine if safe to apply
    const safeToApply =
      !hasDeletions &&
      !hasRecreates &&
      changes.every((c) => c.action === 'create' || c.action === 'update' || c.action === 'no_change');

    return {
      environment,
      createdAt: new Date().toISOString(),
      changes,
      totalChanges: changes.filter((c) => c.action !== 'no_change').length,
      safeToApply,
      warnings,
    };
  }

  /**
   * Parse a single Terraform resource change.
   */
  private parseResourceChange(resourceChange: TerraformResourceChange): ResourceChange {
    const actions = resourceChange.change.actions || [];
    const before = resourceChange.change.before;
    const after = resourceChange.change.after;

    // Determine action type
    const action = this.determineAction(actions);

    // Check if requires recreate (delete + create in same operation)
    const requiresRecreate = actions.includes('delete') && actions.includes('create');

    // Extract affected dependencies (resources that depend on this one)
    const affectedDependencies: string[] = [];
    // In real implementation, would parse the dependency graph from plan
    // For now, use heuristics based on resource type
    if (resourceChange.type === 'digitalocean_droplet' && action !== 'no_change') {
      // Droplet changes might affect load balancers
      affectedDependencies.push('digitalocean_loadbalancer');
    }
    if (resourceChange.type === 'digitalocean_database_cluster' && action !== 'no_change') {
      // Redis changes affect all services
      affectedDependencies.push('services_using_redis');
    }

    return {
      action,
      resourceType: resourceChange.type,
      resourceName: resourceChange.name,
      before: before || undefined,
      after: after || undefined,
      requiresRecreate,
      affectedDependencies,
    };
  }

  /**
   * Determine the deployment action from Terraform action array.
   */
  private determineAction(actions: string[]): DeploymentAction {
    if (actions.length === 0) return 'no_change';
    if (actions.includes('delete') && actions.includes('create')) return 'recreate';
    if (actions.includes('create')) return 'create';
    if (actions.includes('update')) return 'update';
    if (actions.includes('delete')) return 'delete';
    return 'no_change';
  }

  // ============================================
  // DEPLOYMENT EXECUTION TRACKING
  // ============================================

  /**
   * Record the start of a deployment.
   */
  startDeployment(): { deploymentId: string; startedAt: string } {
    const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const startedAt = new Date().toISOString();

    return { deploymentId, startedAt };
  }

  /**
   * Record the completion of a deployment.
   */
  async recordDeployment(
    deploymentId: string,
    startedAt: string,
    success: boolean,
    appliedChanges: number,
    failedChanges: number = 0,
    error?: string,
  ): Promise<DeploymentResult> {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    // Get current outputs from state
    const outputs = success ? await this.stateManager.getOutputs().catch(() => ({})) : {};

    const result: DeploymentResult = {
      success,
      startedAt,
      completedAt,
      durationMs,
      appliedChanges,
      failedChanges,
      outputs,
      error,
    };

    this.deploymentHistory.push(result);

    return result;
  }

  // ============================================
  // HISTORY & ANALYTICS
  // ============================================

  /**
   * Get deployment history (most recent first).
   */
  getHistory(limit?: number): DeploymentResult[] {
    const sorted = [...this.deploymentHistory].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get deployment statistics.
   */
  getStatistics(): {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    successRate: number;
    averageDurationMs: number;
    lastDeploymentAt: string | null;
  } {
    const total = this.deploymentHistory.length;
    const successful = this.deploymentHistory.filter((d) => d.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const totalDuration = this.deploymentHistory.reduce((sum, d) => sum + d.durationMs, 0);
    const averageDurationMs = total > 0 ? Math.round(totalDuration / total) : 0;

    const lastDeployment = this.getHistory(1)[0];
    const lastDeploymentAt = lastDeployment ? lastDeployment.startedAt : null;

    return {
      totalDeployments: total,
      successfulDeployments: successful,
      failedDeployments: failed,
      successRate: Math.round(successRate * 100) / 100,
      averageDurationMs,
      lastDeploymentAt,
    };
  }

  /**
   * Get the last successful deployment.
   */
  getLastSuccessfulDeployment(): DeploymentResult | null {
    const successful = this.deploymentHistory.filter((d) => d.success);
    const sorted = successful.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    return sorted[0] || null;
  }

  /**
   * Check if a deployment is currently in progress (recently started, no completion recorded).
   */
  isDeploymentInProgress(): boolean {
    if (this.deploymentHistory.length === 0) return false;

    const last = this.deploymentHistory[this.deploymentHistory.length - 1];
    const timeSinceStart = Date.now() - new Date(last.startedAt).getTime();

    // Consider in progress if started within last 30 minutes and not completed
    return timeSinceStart < 30 * 60 * 1000 && !last.completedAt;
  }

  // ============================================
  // CHANGE DIFF UTILITIES
  // ============================================

  /**
   * Generate a human-readable diff for a resource change.
   */
  generateChangeDiff(change: ResourceChange): string {
    const lines: string[] = [];

    lines.push(`Resource: ${change.resourceType}.${change.resourceName}`);
    lines.push(`Action: ${change.action.toUpperCase()}`);

    if (change.requiresRecreate) {
      lines.push('⚠️ REQUIRES RECREATE (resource will be destroyed and recreated)');
    }

    if (change.before && change.after) {
      lines.push('\nChanges:');
      const beforeKeys = Object.keys(change.before);
      const afterKeys = Object.keys(change.after);
      const allKeys = new Set([...beforeKeys, ...afterKeys]);

      for (const key of allKeys) {
        const beforeVal = change.before[key];
        const afterVal = change.after[key];

        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
          lines.push(
            `  ${key}: ${this.formatValue(beforeVal)} → ${this.formatValue(afterVal)}`,
          );
        }
      }
    } else if (change.after && change.action === 'create') {
      lines.push('\nNew Resource Attributes:');
      for (const [key, value] of Object.entries(change.after)) {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      }
    } else if (change.before && change.action === 'delete') {
      lines.push('\nResource Will Be Deleted');
    }

    if (change.affectedDependencies.length > 0) {
      lines.push(`\n⚠️ Affects: ${change.affectedDependencies.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Format a value for diff display.
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '(not set)';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  // ============================================
  // ROLLBACK GUIDANCE
  // ============================================

  /**
   * Generate rollback guidance for a failed deployment.
   */
  generateRollbackGuidance(failedDeployment: DeploymentResult): {
    canRollback: boolean;
    steps: string[];
    warnings: string[];
  } {
    const lastSuccessful = this.getLastSuccessfulDeployment();
    const steps: string[] = [];
    const warnings: string[] = [];

    if (!lastSuccessful) {
      return {
        canRollback: false,
        steps: ['No previous successful deployment found'],
        warnings: ['Cannot automatically rollback - manual intervention required'],
      };
    }

    steps.push('1. Review the error from the failed deployment');
    steps.push(`2. Revert to previous state (deployed at ${lastSuccessful.completedAt})`);
    steps.push('3. Run: terraform apply -target=<failed_resources>');
    steps.push('4. Verify infrastructure health after rollback');

    warnings.push('⚠️ Rollback may cause brief service interruption');
    warnings.push('⚠️ Any data changes since last deployment may be lost');

    if (failedDeployment.failedChanges > 5) {
      warnings.push(
        `⚠️ ${failedDeployment.failedChanges} resources failed - review each one carefully`,
      );
    }

    return {
      canRollback: true,
      steps,
      warnings,
    };
  }

  // ============================================
  // STATE COMPARISON
  // ============================================

  /**
   * Compare current state against expected state to detect drift.
   */
  async detectDrift(expectedResourceCount: number): Promise<{
    hasDrift: boolean;
    driftSummary: string;
    actualResourceCount: number;
  }> {
    try {
      const state = await this.stateManager.loadState();
      const actualResourceCount = state.resources.length;
      const hasDrift = actualResourceCount !== expectedResourceCount;

      const driftSummary = hasDrift
        ? `Expected ${expectedResourceCount} resources, found ${actualResourceCount} (drift detected)`
        : 'No drift detected';

      return {
        hasDrift,
        driftSummary,
        actualResourceCount,
      };
    } catch (error) {
      throw new InfrastructureError(
        `Failed to detect drift: ${error instanceof Error ? error.message : String(error)}`,
        'DRIFT_DETECTION_FAILED',
      );
    }
  }

  /**
   * Clear deployment history (useful for testing or reset).
   */
  clearHistory(): void {
    this.deploymentHistory = [];
  }
}
