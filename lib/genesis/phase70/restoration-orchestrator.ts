/**
 * GENESIS PHASE 70: RESTORATION ORCHESTRATOR
 *
 * Mass restoration protocol for regional failover - coordinates
 * assessment, provisioning, verification, and cleanup phases.
 */

import {
  RestorationPlan,
  RestorationTask,
  RestorationPhase,
  RestorationPriority,
  RestorationProgress,
  RestorationResult,
  Snapshot,
  DisasterRecoveryEnvironment,
  DR_DEFAULTS,
  generateTaskId,
  generatePlanId,
  getBackupRegion,
  type DORegion,
} from './types';

export class RestorationOrchestratorError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'RestorationOrchestratorError';
  }
}

export class RestorationOrchestrator {
  private currentPlan: RestorationPlan | null = null;
  private tasks: Map<string, RestorationTask> = new Map();

  constructor(private readonly env: DisasterRecoveryEnvironment) {}

  // ============================================
  // PLAN CREATION
  // ============================================

  async createRestorationPlan(
    sourceRegion: DORegion,
    trigger: string,
    workspaceIds: string[],
  ): Promise<RestorationPlan> {
    const targetRegion = getBackupRegion(sourceRegion);
    const planId = generatePlanId();

    // Estimate completion time (100 concurrent, ~30s per droplet)
    const totalMinutes = Math.ceil(
      (workspaceIds.length / DR_DEFAULTS.MAX_CONCURRENT_RESTORATIONS) * 0.5,
    );
    const estimatedCompletion = new Date();
    estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + totalMinutes);

    this.currentPlan = {
      planId,
      trigger,
      sourceRegion,
      targetRegion,
      affectedTenants: workspaceIds,
      totalTasks: workspaceIds.length,
      startedAt: new Date().toISOString(),
      estimatedCompletionAt: estimatedCompletion.toISOString(),
      concurrency: DR_DEFAULTS.MAX_CONCURRENT_RESTORATIONS,
    };

    return this.currentPlan;
  }

  // ============================================
  // PHASE 1: ASSESSMENT
  // ============================================

  async assessAndCreateTasks(plan: RestorationPlan, snapshots: Snapshot[]): Promise<RestorationTask[]> {
    const tasks: RestorationTask[] = [];

    for (const workspaceId of plan.affectedTenants) {
      // Find most recent snapshot for workspace
      const snapshot = snapshots
        .filter(s => s.workspaceId === workspaceId && s.status === 'completed')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!snapshot) {
        // No snapshot available - log error
        continue;
      }

      const task: RestorationTask = {
        taskId: generateTaskId(),
        workspaceId,
        dropletId: snapshot.dropletId,
        snapshotId: snapshot.id,
        sourceRegion: plan.sourceRegion,
        targetRegion: plan.targetRegion,
        priority: this.determinePriority(workspaceId),
        status: 'assessment',
        startedAt: new Date().toISOString(),
      };

      tasks.push(task);
      this.tasks.set(task.taskId, task);
    }

    // Sort by priority
    return tasks.sort((a, b) => this.priorityOrder(a.priority) - this.priorityOrder(b.priority));
  }

  // ============================================
  // PHASE 2: PROVISIONING
  // ============================================

  async provisionDroplet(task: RestorationTask): Promise<void> {
    this.updateTaskStatus(task.taskId, 'provisioning');

    try {
      const result = await this.env.createDropletFromSnapshot(
        task.snapshotId,
        task.targetRegion,
        `restore_${task.workspaceId}`,
      );

      task.newDropletId = result.dropletId;
      task.newIpAddress = result.ipAddress;
      this.updateTaskStatus(task.taskId, 'verification');
    } catch (error) {
      task.error = error instanceof Error ? error.message : String(error);
      this.updateTaskStatus(task.taskId, 'failed');
    }
  }

  async provisionBatch(
    tasks: RestorationTask[],
    concurrency: number = DR_DEFAULTS.MAX_CONCURRENT_RESTORATIONS,
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      await Promise.all(batch.map(task => this.provisionDroplet(task)));

      // Count results
      for (const task of batch) {
        if (task.status === 'verification') succeeded++;
        else failed++;
      }
    }

    return { succeeded, failed };
  }

  // ============================================
  // PHASE 3: VERIFICATION
  // ============================================

  async verifyDroplet(task: RestorationTask): Promise<boolean> {
    if (!task.newDropletId) return false;

    try {
      const status = await this.env.getDropletStatus(task.newDropletId);
      return status.status === 'active';
    } catch {
      return false;
    }
  }

  async verifyAll(): Promise<{ verified: number; failed: number }> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.status === 'verification');
    let verified = 0;
    let failed = 0;

    for (const task of tasks) {
      const isHealthy = await this.verifyDroplet(task);
      if (isHealthy) {
        this.updateTaskStatus(task.taskId, 'complete');
        verified++;
      } else {
        task.error = 'Health check failed';
        this.updateTaskStatus(task.taskId, 'failed');
        failed++;
      }
    }

    return { verified, failed };
  }

  // ============================================
  // FULL RESTORATION FLOW
  // ============================================

  async executeRestoration(
    sourceRegion: DORegion,
    trigger: string,
    workspaceIds: string[],
    snapshots: Snapshot[],
  ): Promise<RestorationResult> {
    const startTime = Date.now();

    // Phase 1: Create plan and assess
    const plan = await this.createRestorationPlan(sourceRegion, trigger, workspaceIds);
    const tasks = await this.assessAndCreateTasks(plan, snapshots);

    if (tasks.length === 0) {
      throw new RestorationOrchestratorError('No tasks created - no snapshots available', 'NO_SNAPSHOTS');
    }

    // Phase 2: Provision droplets
    const provisionResult = await this.provisionBatch(tasks, plan.concurrency);

    // Phase 3: Verify
    const verifyResult = await this.verifyAll();

    // Calculate RTO/RPO
    const totalDurationMs = Date.now() - startTime;
    const rtoMinutes = Math.ceil(totalDurationMs / (60 * 1000));

    // RPO = time since last snapshot (assume 24h)
    const rpoMinutes = 24 * 60;

    return {
      planId: plan.planId,
      success: verifyResult.verified > 0,
      tenantsRestored: verifyResult.verified,
      tenantsFailed: verifyResult.failed,
      totalDurationMs,
      rto: rtoMinutes,
      rpo: rpoMinutes,
      tasks: Array.from(this.tasks.values()),
    };
  }

  // ============================================
  // PROGRESS TRACKING
  // ============================================

  getProgress(): RestorationProgress | null {
    if (!this.currentPlan) return null;

    const allTasks = Array.from(this.tasks.values());
    const completed = allTasks.filter(t => t.status === 'complete').length;
    const failed = allTasks.filter(t => t.status === 'failed').length;
    const inProgress = allTasks.filter(
      t => t.status !== 'complete' && t.status !== 'failed' && t.status !== 'assessment',
    ).length;

    const elapsedMs = Date.now() - new Date(this.currentPlan.startedAt).getTime();
    const avgTimePerTask = completed > 0 ? elapsedMs / completed : 30000; // 30s default
    const remainingTasks = this.currentPlan.totalTasks - completed - failed;
    const estimatedRemainingMs = remainingTasks * avgTimePerTask;

    return {
      planId: this.currentPlan.planId,
      phase: this.determineOverallPhase(),
      tasksTotal: this.currentPlan.totalTasks,
      tasksCompleted: completed,
      tasksFailed: failed,
      tasksInProgress: inProgress,
      elapsedMs,
      estimatedRemainingMs,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private updateTaskStatus(taskId: string, status: RestorationPhase): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      if (status === 'complete' || status === 'failed') {
        task.completedAt = new Date().toISOString();
      }
    }
  }

  private determinePriority(workspaceId: string): RestorationPriority {
    // In real implementation, would query DB for subscription tier
    return 'paying';
  }

  private priorityOrder(priority: RestorationPriority): number {
    const order: Record<RestorationPriority, number> = {
      critical: 0,
      paying: 1,
      free: 2,
      trial: 3,
    };
    return order[priority];
  }

  private determineOverallPhase(): RestorationPhase {
    const allTasks = Array.from(this.tasks.values());
    const hasProvisioning = allTasks.some(t => t.status === 'provisioning');
    const hasVerification = allTasks.some(t => t.status === 'verification');
    const allComplete = allTasks.every(t => t.status === 'complete' || t.status === 'failed');

    if (hasProvisioning) return 'provisioning';
    if (hasVerification) return 'verification';
    if (allComplete) return 'complete';
    return 'assessment';
  }

  getTasks(): RestorationTask[] {
    return Array.from(this.tasks.values());
  }

  getCurrentPlan(): RestorationPlan | null {
    return this.currentPlan;
  }

  clearState(): void {
    this.currentPlan = null;
    this.tasks.clear();
  }
}
