/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Onboarding State Machine
 * 
 * Manages transitions between onboarding stages with validation
 */

import {
  OnboardingStage,
  ONBOARDING_STAGES,
  StateTransitionResult,
  WorkspaceOnboardingState,
} from './types';

/**
 * Valid state transitions map
 * Each stage can only transition to specific next stages
 */
const VALID_TRANSITIONS: Record<OnboardingStage, OnboardingStage[]> = {
  account: ['brand'],
  brand: ['email'],
  email: ['ai_keys'],
  ai_keys: ['region'],
  region: ['pending_ignition'],
  pending_ignition: ['pending_review', 'igniting'],
  pending_review: ['igniting'],
  igniting: ['complete'],
  complete: [],
};

/**
 * OnboardingStateMachine class
 * Handles state transitions with validation and error handling
 */
export class OnboardingStateMachine {
  /**
   * Validate if a stage transition is allowed
   */
  static isValidTransition(
    from: OnboardingStage,
    to: OnboardingStage
  ): boolean {
    // Handle null/undefined gracefully
    if (!from || !to) return false;
    
    const allowedTransitions = VALID_TRANSITIONS[from];
    if (!allowedTransitions) return false;
    
    return allowedTransitions.includes(to);
  }

  /**
   * Get next valid stages from current stage
   */
  static getNextStages(current: OnboardingStage): OnboardingStage[] {
    return VALID_TRANSITIONS[current] || [];
  }

  /**
   * Check if stage is terminal (no further transitions)
   */
  static isTerminalStage(stage: OnboardingStage): boolean {
    return VALID_TRANSITIONS[stage].length === 0;
  }

  /**
   * Transition to next stage with validation
   */
  static async transition(
    currentState: WorkspaceOnboardingState,
    targetStage: OnboardingStage
  ): Promise<StateTransitionResult> {
    const from = currentState.onboarding_stage;
    const to = targetStage;

    // Validate transition
    if (!this.isValidTransition(from, to)) {
      return {
        success: false,
        from_stage: from,
        to_stage: to,
        timestamp: new Date(),
        error: `Invalid transition from '${from}' to '${to}'. Allowed: ${VALID_TRANSITIONS[from].join(', ')}`,
      };
    }

    // Transition is valid
    return {
      success: true,
      from_stage: from,
      to_stage: to,
      timestamp: new Date(),
    };
  }

  /**
   * Get the sequence of stages from start to target
   */
  static getStageSequence(
    target: OnboardingStage
  ): OnboardingStage[] {
    const targetIndex = ONBOARDING_STAGES.indexOf(target);
    if (targetIndex === -1) return [];
    
    return ONBOARDING_STAGES.slice(0, targetIndex + 1) as OnboardingStage[];
  }

  /**
   * Calculate progress percentage based on current stage
   */
  static calculateProgress(current: OnboardingStage): number {
    const currentIndex = ONBOARDING_STAGES.indexOf(current);
    const totalStages = ONBOARDING_STAGES.length;
    
    return Math.round((currentIndex / (totalStages - 1)) * 100);
  }

  /**
   * Check if workspace can proceed to dashboard
   */
  static canAccessDashboard(state: WorkspaceOnboardingState): boolean {
    // Can access dashboard after igniting or if setup is complete
    return (
      state.onboarding_stage === 'igniting' ||
      state.onboarding_stage === 'complete' ||
      state.setup_complete
    );
  }

  /**
   * Check if campaigns should be enabled
   */
  static shouldEnableCampaigns(state: WorkspaceOnboardingState): boolean {
    return state.setup_complete && state.campaigns_enabled;
  }

  /**
   * Validate onboarding stage value
   */
  static isValidStage(stage: string): stage is OnboardingStage {
    return ONBOARDING_STAGES.includes(stage as OnboardingStage);
  }
}
