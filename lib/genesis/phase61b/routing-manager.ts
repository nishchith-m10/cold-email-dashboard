/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Routing Manager
 * 
 * Determines where users should be routed based on workspace state
 */

import {
  WorkspaceOnboardingState,
  RoutingDecision,
  ApplicationLayer,
} from './types';
import { OnboardingStateMachine } from './onboarding-state-machine';

/**
 * RoutingManager class
 * Handles routing decisions based on workspace and user state
 */
export class RoutingManager {
  /**
   * Determine target route for user after sign-in
   */
  static determineRoute(
    hasWorkspaces: boolean,
    workspaceState: WorkspaceOnboardingState | null,
    isFirstSession: boolean
  ): RoutingDecision {
    // No workspaces - go to workspace selection
    if (!hasWorkspaces) {
      return {
        target_route: '/join',
        reason: 'No workspaces found, user must create or join',
        should_block: false,
        metadata: {
          layer: ApplicationLayer.WorkspaceSelection,
        },
      };
    }

    // Has workspaces but no state provided - error case
    if (!workspaceState) {
      return {
        target_route: '/join',
        reason: 'Workspace state unavailable, fallback to selection',
        should_block: false,
        metadata: {
          layer: ApplicationLayer.WorkspaceSelection,
        },
      };
    }

    // Check if onboarding is incomplete
    if (workspaceState.onboarding_stage !== 'complete') {
      return this.getOnboardingRoute(workspaceState);
    }

    // Onboarding complete - check if setup is complete
    if (!workspaceState.setup_complete) {
      return {
        target_route: '/dashboard',
        reason: 'Onboarding complete, awaiting admin setup',
        should_block: false,
        metadata: {
          layer: ApplicationLayer.MainDashboard,
          campaigns_disabled: true,
          show_setup_banner: true,
        },
      };
    }

    // Setup complete - check first session
    if (isFirstSession) {
      return {
        target_route: '/dashboard',
        reason: 'First session, show onboarding tips',
        should_block: false,
        metadata: {
          layer: ApplicationLayer.MainDashboard,
          show_onboarding_tips: true,
        },
      };
    }

    // Normal dashboard access
    return {
      target_route: '/dashboard',
      reason: 'Full access granted',
      should_block: false,
      metadata: {
        layer: ApplicationLayer.MainDashboard,
        campaigns_enabled: workspaceState.campaigns_enabled,
      },
    };
  }

  /**
   * Get route for incomplete onboarding
   */
  private static getOnboardingRoute(
    state: WorkspaceOnboardingState
  ): RoutingDecision {
    const stage = state.onboarding_stage;

    // Pending review - show waiting state
    if (stage === 'pending_review') {
      return {
        target_route: '/onboarding/pending-review',
        reason: 'High-risk signup, awaiting admin review',
        should_block: true,
        metadata: {
          layer: ApplicationLayer.GenesisGateway,
          message: 'Your account is under review. You will be notified within 24 hours.',
        },
      };
    }

    // Igniting - show progress page
    if (stage === 'igniting') {
      return {
        target_route: `/ignition/${state.workspace_id}`,
        reason: 'Droplet provisioning in progress',
        should_block: true,
        metadata: {
          layer: ApplicationLayer.EngineStarting,
          show_progress: true,
        },
      };
    }

    // Resume onboarding at current stage
    return {
      target_route: `/onboarding/${stage}`,
      reason: `Resume onboarding at stage: ${stage}`,
      should_block: true,
      metadata: {
        layer: ApplicationLayer.GenesisGateway,
        current_stage: stage,
        resumable: true,
      },
    };
  }

  /**
   * Check if user should be blocked from accessing dashboard
   */
  static shouldBlockDashboard(state: WorkspaceOnboardingState): boolean {
    return !OnboardingStateMachine.canAccessDashboard(state);
  }

  /**
   * Check if campaigns should be accessible
   */
  static areCampaignsEnabled(state: WorkspaceOnboardingState): boolean {
    return OnboardingStateMachine.shouldEnableCampaigns(state);
  }

  /**
   * Get redirect URL for workspace creation flow
   */
  static getWorkspaceCreationRoute(): RoutingDecision {
    return {
      target_route: '/onboarding/account',
      reason: 'New workspace creation, start Genesis Gateway',
      should_block: true,
      metadata: {
        layer: ApplicationLayer.GenesisGateway,
        flow_type: 'create_new',
      },
    };
  }

  /**
   * Get redirect URL for workspace join flow
   */
  static getWorkspaceJoinRoute(): RoutingDecision {
    return {
      target_route: '/dashboard',
      reason: 'Joining existing workspace, skip onboarding',
      should_block: false,
      metadata: {
        layer: ApplicationLayer.MainDashboard,
        flow_type: 'join_existing',
      },
    };
  }
}
