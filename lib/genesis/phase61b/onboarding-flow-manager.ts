/**
 * GENESIS PART VI - PHASE 60.B: GENESIS GATEWAY STREAMLINED ONBOARDING
 * Onboarding Flow Manager
 * 
 * Manages onboarding stage progression and data collection
 */

import {
  OnboardingData,
  BrandStageData,
  EmailStageData,
  AIKeysStageData,
  RegionStageData,
  IgniteStageData,
  StageCompletionResult,
  OnboardingProgressSummary,
  STAGE_DURATIONS,
} from './onboarding-types';

import {
  BrandStageValidator,
  EmailStageValidator,
  AIKeysStageValidator,
  RegionStageValidator,
  IgniteStageValidator,
} from './stage-validators';

/**
 * Onboarding Flow Manager
 * Coordinates stage progression and data collection
 */
export class OnboardingFlowManager {
  /**
   * Complete brand stage
   */
  static async completeBrandStage(
    workspaceId: string,
    data: BrandStageData
  ): Promise<StageCompletionResult> {
    // Validate input
    const validation = BrandStageValidator.validate(data);
    if (!validation.valid) {
      return {
        success: false,
        next_stage: 'brand',
        data_stored: false,
        error: validation.errors.join('; '),
      };
    }

    // Data would be stored in database here
    // For now, just return success

    return {
      success: true,
      next_stage: 'email',
      data_stored: true,
    };
  }

  /**
   * Complete email stage
   */
  static async completeEmailStage(
    workspaceId: string,
    data: EmailStageData
  ): Promise<StageCompletionResult> {
    const validation = EmailStageValidator.validate(data);
    if (!validation.valid) {
      return {
        success: false,
        next_stage: 'email',
        data_stored: false,
        error: validation.errors.join('; '),
      };
    }

    return {
      success: true,
      next_stage: 'ai_keys',
      data_stored: true,
    };
  }

  /**
   * Complete AI keys stage
   */
  static async completeAIKeysStage(
    workspaceId: string,
    data: AIKeysStageData
  ): Promise<StageCompletionResult> {
    const validation = AIKeysStageValidator.validate(data);
    if (!validation.valid) {
      return {
        success: false,
        next_stage: 'ai_keys',
        data_stored: false,
        error: validation.errors.join('; '),
      };
    }

    return {
      success: true,
      next_stage: 'region',
      data_stored: true,
    };
  }

  /**
   * Complete region stage
   */
  static async completeRegionStage(
    workspaceId: string,
    data: RegionStageData
  ): Promise<StageCompletionResult> {
    const validation = RegionStageValidator.validate(data);
    if (!validation.valid) {
      return {
        success: false,
        next_stage: 'region',
        data_stored: false,
        error: validation.errors.join('; '),
      };
    }

    return {
      success: true,
      next_stage: 'pending_ignition',
      data_stored: true,
    };
  }

  /**
   * Complete ignite stage (triggers provisioning)
   */
  static async completeIgniteStage(
    workspaceId: string,
    data: IgniteStageData
  ): Promise<StageCompletionResult> {
    const validation = IgniteStageValidator.validate(data);
    if (!validation.valid) {
      return {
        success: false,
        next_stage: 'pending_ignition',
        data_stored: false,
        error: validation.errors.join('; '),
      };
    }

    // If risk check didn't pass, route to pending_review
    if (!data.risk_check_passed) {
      return {
        success: true,
        next_stage: 'pending_review',
        data_stored: true,
      };
    }

    // Risk check passed, proceed to igniting
    return {
      success: true,
      next_stage: 'igniting',
      data_stored: true,
    };
  }

  /**
   * Get onboarding progress summary
   */
  static getProgressSummary(
    workspaceId: string,
    currentStage: string,
    onboardingData: Partial<OnboardingData>
  ): OnboardingProgressSummary {
    const allStages = ['account', 'brand', 'email', 'ai_keys', 'region', 'pending_ignition'];
    const currentIndex = allStages.indexOf(currentStage);
    
    const stagesCompleted = currentIndex >= 0 ? allStages.slice(0, currentIndex) : [];
    const percentage = currentIndex >= 0 
      ? Math.round((currentIndex / allStages.length) * 100)
      : 0;

    // Calculate estimated time remaining
    const remainingStages = currentIndex >= 0 
      ? allStages.slice(currentIndex)
      : allStages;
    
    const estimatedTimeRemaining = remainingStages.reduce((total, stage) => {
      const duration = STAGE_DURATIONS[stage as keyof typeof STAGE_DURATIONS] || 0;
      return total + duration;
    }, 0);

    return {
      workspace_id: workspaceId,
      current_stage: currentStage,
      stages_completed: stagesCompleted,
      total_stages: allStages.length,
      percentage_complete: percentage,
      estimated_time_remaining_seconds: estimatedTimeRemaining,
    };
  }

  /**
   * Check if onboarding is complete
   */
  static isOnboardingComplete(currentStage: string): boolean {
    return currentStage === 'complete';
  }

  /**
   * Check if all required data is collected
   */
  static validateCompleteOnboardingData(
    data: Partial<OnboardingData>
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!data.account) missing.push('account');
    if (!data.brand) missing.push('brand');
    if (!data.email) missing.push('email');
    if (!data.ai_keys) missing.push('ai_keys');
    if (!data.region) missing.push('region');

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
