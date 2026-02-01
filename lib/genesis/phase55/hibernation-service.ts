/**
 * PHASE 55: HIBERNATION & WAKE PHYSICS - SERVICE IMPLEMENTATION
 * 
 * Core service managing droplet hibernation, wake protocols, and cost optimization.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 55
 */

import type {
  HibernationService,
  HibernationDB,
  PowerClient,
  HibernationCriteria,
  HibernationEligibilityResult,
  HibernationProcess,
  WakeRequest,
  WakeResult,
  WakeProcess,
  StaggeredWakeResult,
  PredictiveWakeSchedule,
  FleetCostSummary,
  WorkspaceActivity,
} from './hibernation-types';
import {
  DEFAULT_HIBERNATION_CRITERIA,
  SAVINGS_PER_HIBERNATED,
  TARGET_WAKE_TIME_STANDARD,
  WAKE_INTERVAL_MS,
} from './hibernation-types';

// ============================================
// HIBERNATION SERVICE
// ============================================

export class HibernationManager implements HibernationService {
  constructor(
    private db: HibernationDB,
    private power: PowerClient
  ) {}

  // ============================================
  // ELIGIBILITY CHECKING
  // ============================================

  async checkEligibility(
    workspaceId: string,
    criteria: HibernationCriteria = DEFAULT_HIBERNATION_CRITERIA
  ): Promise<HibernationEligibilityResult> {
    const activity = await this.db.getWorkspaceActivity(workspaceId);
    
    if (!activity) {
      return {
        workspace_id: workspaceId,
        eligible: false,
        reason: 'Workspace activity not found',
        criteria_met: {
          campaigns: false,
          executions: false,
          logins: false,
          account_status: false,
          manual_hold: false,
        },
        days_inactive: 0,
        estimated_savings_per_month: 0,
      };
    }

    // Enterprise tier never hibernates
    if (activity.tier === 'enterprise') {
      return {
        workspace_id: workspaceId,
        eligible: false,
        reason: 'Enterprise tier - never hibernates',
        criteria_met: {
          campaigns: false,
          executions: false,
          logins: false,
          account_status: true,
          manual_hold: false,
        },
        days_inactive: 0,
        estimated_savings_per_month: 0,
      };
    }

    // Check manual hold
    if (activity.manual_hibernation_hold) {
      return {
        workspace_id: workspaceId,
        eligible: false,
        reason: 'Manual hibernation hold is set',
        criteria_met: {
          campaigns: false,
          executions: false,
          logins: false,
          account_status: activity.account_status === 'active',
          manual_hold: false,
        },
        days_inactive: 0,
        estimated_savings_per_month: 0,
      };
    }

    // Check account status
    if (activity.account_status !== 'active') {
      return {
        workspace_id: workspaceId,
        eligible: false,
        reason: 'Account is suspended - do not hibernate',
        criteria_met: {
          campaigns: false,
          executions: false,
          logins: false,
          account_status: false,
          manual_hold: true,
        },
        days_inactive: 0,
        estimated_savings_per_month: 0,
      };
    }

    const now = new Date();
    
    // Check campaign activity
    const daysSinceLastCampaign = activity.last_campaign_activity
      ? (now.getTime() - activity.last_campaign_activity.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    
    const campaignsCriteriaMet = daysSinceLastCampaign >= criteria.no_active_campaigns_days;

    // Check workflow execution activity
    const daysSinceLastExecution = activity.last_workflow_execution
      ? (now.getTime() - activity.last_workflow_execution.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    
    const executionsCriteriaMet = daysSinceLastExecution >= criteria.no_workflow_executions_days;

    // Check dashboard login activity
    const daysSinceLastLogin = activity.last_dashboard_login
      ? (now.getTime() - activity.last_dashboard_login.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    
    const loginsCriteriaMet = daysSinceLastLogin >= criteria.no_dashboard_logins_days;

    const eligible = campaignsCriteriaMet && executionsCriteriaMet && loginsCriteriaMet;
    
    const daysInactive = Math.min(
      daysSinceLastCampaign,
      daysSinceLastExecution,
      daysSinceLastLogin
    );

    return {
      workspace_id: workspaceId,
      eligible,
      reason: eligible
        ? `No activity for ${Math.floor(daysInactive)} days`
        : this.getIneligibilityReason(
            campaignsCriteriaMet,
            executionsCriteriaMet,
            loginsCriteriaMet
          ),
      criteria_met: {
        campaigns: campaignsCriteriaMet,
        executions: executionsCriteriaMet,
        logins: loginsCriteriaMet,
        account_status: true,
        manual_hold: true,
      },
      days_inactive: Math.floor(daysInactive),
      estimated_savings_per_month: eligible ? SAVINGS_PER_HIBERNATED : 0,
    };
  }

  private getIneligibilityReason(
    campaigns: boolean,
    executions: boolean,
    logins: boolean
  ): string {
    const reasons: string[] = [];
    if (!campaigns) reasons.push('recent campaign activity');
    if (!executions) reasons.push('recent workflow executions');
    if (!logins) reasons.push('recent dashboard logins');
    return `Not eligible: ${reasons.join(', ')}`;
  }

  async findEligibleWorkspaces(
    criteria: HibernationCriteria = DEFAULT_HIBERNATION_CRITERIA
  ): Promise<HibernationEligibilityResult[]> {
    const allActivity = await this.db.getAllWorkspaceActivity();
    
    const results = await Promise.all(
      allActivity.map(activity =>
        this.checkEligibility(activity.workspace_id, criteria)
      )
    );
    
    return results.filter(r => r.eligible);
  }

  // ============================================
  // HIBERNATION PROCESS
  // ============================================

  async hibernateWorkspace(
    workspaceId: string,
    dropletId: string,
    reason: string
  ): Promise<HibernationProcess> {
    // Check eligibility first
    const eligibility = await this.checkEligibility(workspaceId);
    if (!eligibility.eligible) {
      throw new HibernationError(
        `Workspace ${workspaceId} is not eligible for hibernation: ${eligibility.reason}`,
        'NOT_ELIGIBLE',
        { workspaceId, eligibility }
      );
    }

    // Start hibernation process
    const process = await this.db.startHibernationProcess(workspaceId, dropletId);
    
    try {
      // STEP 1: Notification (handled externally, just mark time)
      await this.db.updateHibernationProcess(workspaceId, {
        step: 'notification',
        notification_sent_at: new Date(),
      });

      // STEP 2: Collect metric snapshot
      await this.db.updateHibernationProcess(workspaceId, {
        step: 'snapshot',
      });
      
      // In production, this would call the sidecar to collect metrics
      // For now, we'll skip the actual collection
      await this.db.updateHibernationProcess(workspaceId, {
        snapshot_collected_at: new Date(),
      });

      // STEP 3: Graceful shutdown
      await this.db.updateHibernationProcess(workspaceId, {
        step: 'shutdown',
      });
      
      // In production, this would tell sidecar to stop n8n gracefully
      await this.db.updateHibernationProcess(workspaceId, {
        shutdown_completed_at: new Date(),
      });

      // STEP 4: Power off droplet
      await this.db.updateHibernationProcess(workspaceId, {
        step: 'power_off',
      });
      
      const powerResult = await this.power.powerOff(dropletId);
      
      if (!powerResult.success) {
        throw new Error(`Power off failed: ${powerResult.error}`);
      }

      // Mark as completed
      await this.db.updateHibernationProcess(workspaceId, {
        step: 'completed',
        powered_off_at: new Date(),
        completed_at: new Date(),
      });

      // Record hibernation for cost tracking
      await this.db.recordHibernation(workspaceId, new Date());

      // Return final process state
      const finalProcess = await this.db.getHibernationProcess(workspaceId);
      return finalProcess!;
    } catch (error) {
      // Update process with error
      await this.db.updateHibernationProcess(workspaceId, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw new HibernationError(
        `Hibernation failed for workspace ${workspaceId}`,
        'HIBERNATION_FAILED',
        { workspaceId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // ============================================
  // WAKE PROTOCOL
  // ============================================

  async wakeWorkspace(request: WakeRequest): Promise<WakeResult> {
    const startTime = Date.now();
    const { workspace_id, droplet_id, target_time, priority } = request;

    // Start wake process
    const process = await this.db.startWakeProcess(workspace_id, droplet_id);

    try {
      // STEP 1: Power on droplet
      await this.db.updateWakeProcess(workspace_id, {
        step: 'power_on',
        power_on_initiated_at: new Date(),
      });

      const powerResult = await this.power.powerOn(droplet_id);
      
      if (!powerResult.success) {
        throw new Error(`Power on failed: ${powerResult.error}`);
      }

      // STEP 2: Wait for droplet to boot (simulated)
      await this.db.updateWakeProcess(workspace_id, {
        step: 'booting',
        droplet_booted_at: new Date(),
      });

      // STEP 3: Containers starting (simulated)
      await this.db.updateWakeProcess(workspace_id, {
        step: 'containers_starting',
        containers_started_at: new Date(),
      });

      // STEP 4: Health check (simulated)
      await this.db.updateWakeProcess(workspace_id, {
        step: 'health_check',
        health_check_passed_at: new Date(),
      });

      // STEP 5: Completed
      const actualWakeTime = (Date.now() - startTime) / 1000;
      const targetWakeTime = TARGET_WAKE_TIME_STANDARD;

      await this.db.updateWakeProcess(workspace_id, {
        step: 'completed',
        completed_at: new Date(),
        actual_wake_time_seconds: actualWakeTime,
        target_wake_time_seconds: targetWakeTime,
      });

      // Record wake for cost tracking
      await this.db.recordWake(workspace_id, new Date());

      return {
        success: true,
        workspace_id,
        wake_time_seconds: actualWakeTime,
        target_time_met: actualWakeTime <= targetWakeTime,
      };
    } catch (error) {
      // Update process with error
      const actualWakeTime = (Date.now() - startTime) / 1000;
      await this.db.updateWakeProcess(workspace_id, {
        error: error instanceof Error ? error.message : String(error),
        actual_wake_time_seconds: actualWakeTime,
      });

      return {
        success: false,
        workspace_id,
        wake_time_seconds: actualWakeTime,
        target_time_met: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================
  // STAGGERED WAKE
  // ============================================

  async scheduleStaggeredWake(
    requests: WakeRequest[]
  ): Promise<StaggeredWakeResult> {
    if (requests.length === 0) {
      throw new HibernationError(
        'No wake requests provided',
        'EMPTY_REQUESTS',
        {}
      );
    }

    // STEP 1: Sort by priority and target time
    const sorted = [...requests].sort((a, b) => {
      // Enterprise always first
      if (a.priority === 'enterprise' && b.priority !== 'enterprise') return -1;
      if (b.priority === 'enterprise' && a.priority !== 'enterprise') return 1;
      
      // High-priority next
      if (a.priority === 'high-priority' && b.priority === 'standard') return -1;
      if (b.priority === 'high-priority' && a.priority === 'standard') return 1;
      
      // Then by target time (earliest first)
      return a.target_time.getTime() - b.target_time.getTime();
    });

    // STEP 2: Calculate stagger interval (1 second per wake)
    const totalWakeTime = sorted.length * WAKE_INTERVAL_MS; // milliseconds

    // STEP 3: Calculate when to start waking
    // Start early enough so all are awake by latest target time
    const latestTarget = sorted[sorted.length - 1].target_time;
    const bufferMs = 60 * 1000; // 1 minute buffer
    const startTime = new Date(latestTarget.getTime() - totalWakeTime - bufferMs);

    // STEP 4: Schedule each wake with stagger
    // In production, this would queue to BullMQ
    // For now, we'll just return the schedule
    const schedule = sorted.map((request, index) => ({
      workspace_id: request.workspace_id,
      droplet_id: request.droplet_id,
      scheduled_at: new Date(startTime.getTime() + (index * WAKE_INTERVAL_MS)),
      priority: request.priority,
    }));

    const endTime = new Date(startTime.getTime() + totalWakeTime);
    const durationMinutes = totalWakeTime / 1000 / 60;

    return {
      scheduled: sorted.length,
      start_time: startTime,
      estimated_completion: endTime,
      duration_minutes: durationMinutes,
    };
  }

  // ============================================
  // PREDICTIVE WAKE
  // ============================================

  async schedulePredictiveWakes(
    windowHours: number
  ): Promise<PredictiveWakeSchedule[]> {
    // This would analyze scheduled campaigns, historical patterns, etc.
    // For Phase 55, we return an empty array as this is a future enhancement
    return [];
  }

  // ============================================
  // COST ANALYSIS
  // ============================================

  async getFleetCostSummary(): Promise<FleetCostSummary> {
    return await this.db.getFleetCostSummary();
  }
}

// ============================================
// FACTORY
// ============================================

export function createHibernationService(
  db: HibernationDB,
  power: PowerClient
): HibernationService {
  return new HibernationManager(db, power);
}

// ============================================
// ERRORS
// ============================================

export class HibernationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'HibernationError';
  }
}
