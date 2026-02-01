/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Setup State Manager
 * 
 * Manages workspace setup completion and campaign enablement
 */

import { WorkspaceOnboardingState } from './types';

/**
 * Setup completion event
 */
export interface SetupCompletionEvent {
  workspace_id: string;
  completed_by: string; // Admin user ID
  completed_at: Date;
  setup_duration_minutes: number;
}

/**
 * Campaign enablement event
 */
export interface CampaignEnablementEvent {
  workspace_id: string;
  enabled_by: string; // User ID
  enabled_at: Date;
  first_campaign_id: string;
}

/**
 * SetupStateManager class
 * Handles setup state tracking and transitions
 */
export class SetupStateManager {
  /**
   * Mark workspace setup as complete
   * Called by admin after completing manual setup tasks
   */
  static async markSetupComplete(
    workspace_id: string,
    admin_id: string,
    onboarding_started_at: Date | null
  ): Promise<SetupCompletionEvent> {
    const now = new Date();
    
    // Calculate setup duration
    let duration_minutes = 0;
    if (onboarding_started_at) {
      const duration_ms = now.getTime() - onboarding_started_at.getTime();
      duration_minutes = Math.round(duration_ms / 1000 / 60);
    }

    return {
      workspace_id,
      completed_by: admin_id,
      completed_at: now,
      setup_duration_minutes: duration_minutes,
    };
  }

  /**
   * Enable campaigns for workspace
   * Called when user activates first campaign
   */
  static async enableCampaigns(
    workspace_id: string,
    user_id: string,
    campaign_id: string
  ): Promise<CampaignEnablementEvent> {
    return {
      workspace_id,
      enabled_by: user_id,
      enabled_at: new Date(),
      first_campaign_id: campaign_id,
    };
  }

  /**
   * Check if workspace is ready for campaign creation
   */
  static canCreateCampaigns(state: WorkspaceOnboardingState): boolean {
    // Must have completed onboarding and admin setup
    return (
      state.onboarding_stage === 'complete' &&
      state.setup_complete
    );
  }

  /**
   * Check if workspace is fully operational
   */
  static isFullyOperational(state: WorkspaceOnboardingState): boolean {
    return (
      state.onboarding_stage === 'complete' &&
      state.setup_complete &&
      state.campaigns_enabled
    );
  }

  /**
   * Get setup status description for display
   */
  static getSetupStatus(state: WorkspaceOnboardingState): {
    status: 'pending_onboarding' | 'pending_setup' | 'pending_activation' | 'operational';
    message: string;
    can_create_campaigns: boolean;
  } {
    // Still onboarding
    if (state.onboarding_stage !== 'complete') {
      return {
        status: 'pending_onboarding',
        message: 'Complete onboarding to proceed',
        can_create_campaigns: false,
      };
    }

    // Onboarding done, awaiting admin setup
    if (!state.setup_complete) {
      return {
        status: 'pending_setup',
        message: 'Our team is configuring your automation workflows',
        can_create_campaigns: false,
      };
    }

    // Setup done, but no campaigns activated yet
    if (!state.campaigns_enabled) {
      return {
        status: 'pending_activation',
        message: 'Ready to create your first campaign',
        can_create_campaigns: true,
      };
    }

    // Fully operational
    return {
      status: 'operational',
      message: 'All systems operational',
      can_create_campaigns: true,
    };
  }

  /**
   * Validate setup completion requirements
   */
  static validateSetupCompletion(
    state: WorkspaceOnboardingState
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Must have completed onboarding first
    if (state.onboarding_stage !== 'complete') {
      errors.push(`Onboarding not complete. Current stage: ${state.onboarding_stage}`);
    }

    // Must have started onboarding
    if (!state.onboarding_started_at) {
      errors.push('Onboarding start time not recorded');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
