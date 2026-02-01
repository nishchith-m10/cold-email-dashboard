/**
 * GENESIS PART VI - PHASE 61: CAMPAIGN ARCHITECTURE & OPERATIONS
 * Campaign Status State Machine
 * 
 * Manages campaign status transitions and lifecycle
 */

import type {
  CampaignStatus,
  CampaignStatusTransition,
} from './campaign-types';
import { CAMPAIGN_STATUS_TRANSITIONS } from './campaign-types';

/**
 * Campaign Status Machine
 * Enforces valid status transitions
 */
export class CampaignStatusMachine {
  /**
   * Check if a status transition is valid
   */
  static isValidTransition(from: CampaignStatus, to: CampaignStatus): boolean {
    if (!from || !to) {
      return false;
    }

    const allowedTransitions = CAMPAIGN_STATUS_TRANSITIONS[from];
    return allowedTransitions ? allowedTransitions.includes(to) : false;
  }

  /**
   * Get allowed next statuses from current status
   */
  static getNextStatuses(status: CampaignStatus): CampaignStatus[] {
    return CAMPAIGN_STATUS_TRANSITIONS[status] || [];
  }

  /**
   * Check if status is terminal (no transitions allowed)
   */
  static isTerminalStatus(status: CampaignStatus): boolean {
    return this.getNextStatuses(status).length === 0;
  }

  /**
   * Perform status transition with validation
   */
  static transition(
    from: CampaignStatus,
    to: CampaignStatus,
    reason?: string
  ): { success: boolean; transition?: CampaignStatusTransition; error?: string } {
    if (!this.isValidTransition(from, to)) {
      const allowed = this.getNextStatuses(from);
      return {
        success: false,
        error: `Invalid transition from ${from} to ${to}. Allowed: [${allowed.join(', ')}]`,
      };
    }

    return {
      success: true,
      transition: {
        from_status: from,
        to_status: to,
        timestamp: new Date(),
        reason,
      },
    };
  }

  /**
   * Check if campaign can be launched (transition to active)
   */
  static canLaunch(status: CampaignStatus): boolean {
    return status === 'ready';
  }

  /**
   * Check if campaign can be paused
   */
  static canPause(status: CampaignStatus): boolean {
    return status === 'active';
  }

  /**
   * Check if campaign can be resumed (from paused to active)
   */
  static canResume(status: CampaignStatus): boolean {
    return status === 'paused';
  }

  /**
   * Check if campaign can be completed
   */
  static canComplete(status: CampaignStatus): boolean {
    return status === 'active' || status === 'paused';
  }

  /**
   * Get campaign status description
   */
  static getStatusDescription(status: CampaignStatus): string {
    const descriptions: Record<CampaignStatus, string> = {
      draft: 'Campaign created, no leads added yet',
      pending_leads: 'Awaiting CSV lead import',
      pending_personalization: 'Leads imported, needs prompt customization',
      ready: 'Fully configured, ready to launch',
      active: 'Campaign running, workflows processing leads',
      paused: 'Campaign temporarily stopped',
      completed: 'All leads processed, campaign finished',
    };

    return descriptions[status] || 'Unknown status';
  }

  /**
   * Get next action for campaign based on status
   */
  static getNextAction(status: CampaignStatus): string {
    const actions: Record<CampaignStatus, string> = {
      draft: 'Import leads via CSV',
      pending_leads: 'Upload CSV file with leads',
      pending_personalization: 'Customize email templates and prompts',
      ready: 'Launch campaign to start processing',
      active: 'Monitor campaign progress',
      paused: 'Resume campaign or mark as complete',
      completed: 'Review campaign results',
    };

    return actions[status] || 'No action required';
  }

  /**
   * Check if status is valid
   */
  static isValidStatus(status: string): status is CampaignStatus {
    const validStatuses: CampaignStatus[] = [
      'draft',
      'pending_leads',
      'pending_personalization',
      'ready',
      'active',
      'paused',
      'completed',
    ];

    return validStatuses.includes(status as CampaignStatus);
  }

  /**
   * Get progress percentage based on status
   */
  static getProgressPercentage(status: CampaignStatus): number {
    const progressMap: Record<CampaignStatus, number> = {
      draft: 0,
      pending_leads: 20,
      pending_personalization: 40,
      ready: 60,
      active: 80,
      paused: 80,  // Same as active (in progress)
      completed: 100,
    };

    return progressMap[status] || 0;
  }
}
