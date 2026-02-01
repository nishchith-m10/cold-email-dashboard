/**
 * GENESIS PART VI - PHASE 61.A: CAMPAIGN CREATION FLOW
 * Campaign Creation Wizard
 * 
 * Manages the multi-step campaign creation process
 */

import type {
  CampaignCreationType,
  CampaignCreationStep,
  CampaignCreationState,
  CampaignNameStepData,
  LeadsStepData,
  PersonalizationStepData,
  ReviewStepData,
  StepValidationResult,
  StepCompletionResult,
  CampaignCreationProgress,
} from './campaign-creation-types';
import {
  PRODUCTION_READY_STEP_TRANSITIONS,
  STEP_DURATIONS,
} from './campaign-creation-types';

/**
 * Campaign Creation Wizard
 * Handles the step-by-step campaign creation flow
 */
export class CampaignCreationWizard {
  /**
   * Initialize a new campaign creation wizard
   */
  static initializeWizard(type: CampaignCreationType): CampaignCreationState {
    const now = new Date();
    
    return {
      type,
      current_step: 'name',
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Check if a step transition is valid
   */
  static isValidTransition(
    from: CampaignCreationStep,
    to: CampaignCreationStep
  ): boolean {
    if (!from || !to) {
      return false;
    }

    const allowedTransitions = PRODUCTION_READY_STEP_TRANSITIONS[from];
    return allowedTransitions ? allowedTransitions.includes(to) : false;
  }

  /**
   * Get next step
   */
  static getNextStep(current: CampaignCreationStep): CampaignCreationStep | null {
    const transitions = PRODUCTION_READY_STEP_TRANSITIONS[current];
    return transitions && transitions.length > 0 ? transitions[0] : null;
  }

  /**
   * Complete name step
   */
  static completeNameStep(
    state: CampaignCreationState,
    data: CampaignNameStepData
  ): StepCompletionResult {
    // Validate name
    const validation = this.validateNameStep(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // For empty shell, we're done after name step
    if (state.type === 'empty_shell') {
      return {
        success: true,
        next_step: 'complete',
      };
    }

    // For production ready, move to leads step
    return {
      success: true,
      next_step: 'leads',
    };
  }

  /**
   * Complete leads step
   */
  static completeLeadsStep(
    state: CampaignCreationState,
    data: LeadsStepData
  ): StepCompletionResult {
    // Validate leads
    const validation = this.validateLeadsStep(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    return {
      success: true,
      next_step: 'personalization',
    };
  }

  /**
   * Complete personalization step
   */
  static completePersonalizationStep(
    state: CampaignCreationState,
    data: PersonalizationStepData
  ): StepCompletionResult {
    // Validate personalization
    const validation = this.validatePersonalizationStep(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    return {
      success: true,
      next_step: 'review',
    };
  }

  /**
   * Complete review step
   */
  static completeReviewStep(
    state: CampaignCreationState,
    data: ReviewStepData
  ): StepCompletionResult {
    // Validate review
    const validation = this.validateReviewStep(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    return {
      success: true,
      next_step: 'complete',
    };
  }

  /**
   * Validate name step
   */
  static validateNameStep(data: CampaignNameStepData): StepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Campaign name is required');
    } else if (data.name.trim().length < 3) {
      errors.push('Campaign name must be at least 3 characters');
    } else if (data.name.trim().length > 100) {
      errors.push('Campaign name must not exceed 100 characters');
    }

    // Check for special characters
    if (data.name && !/^[a-zA-Z0-9\s\-_&()]+$/.test(data.name)) {
      errors.push('Campaign name contains invalid characters');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate leads step
   */
  static validateLeadsStep(data: LeadsStepData): StepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.leads_imported === undefined || data.leads_imported < 0) {
      errors.push('Invalid lead count');
    } else if (data.leads_imported === 0) {
      errors.push('At least one lead must be imported');
    }

    if (data.leads_imported > 5000) {
      warnings.push('Large lead count may take longer to process');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate personalization step
   */
  static validatePersonalizationStep(data: PersonalizationStepData): StepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.prompts_customized) {
      errors.push('Email prompts must be customized');
    }

    if (!data.templates_configured) {
      errors.push('Email templates must be configured');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate review step
   */
  static validateReviewStep(data: ReviewStepData): StepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.ready_to_launch) {
      errors.push('Campaign must be confirmed as ready to launch');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get creation progress
   */
  static getProgress(state: CampaignCreationState): CampaignCreationProgress {
    const allSteps: CampaignCreationStep[] = ['name', 'leads', 'personalization', 'review', 'complete'];
    const currentIndex = allSteps.indexOf(state.current_step);

    // For empty shell, only name and complete steps
    if (state.type === 'empty_shell') {
      const simpleSteps: CampaignCreationStep[] = ['name', 'complete'];
      const simpleIndex = simpleSteps.indexOf(state.current_step);
      
      return {
        current_step: state.current_step,
        steps_completed: simpleSteps.slice(0, simpleIndex),
        steps_remaining: simpleSteps.slice(simpleIndex + 1),
        progress_percentage: (simpleIndex / (simpleSteps.length - 1)) * 100,
        estimated_time_remaining_minutes: Math.ceil(
          simpleSteps.slice(simpleIndex).reduce((sum, step) => sum + STEP_DURATIONS[step], 0) / 60
        ),
      };
    }

    // For production ready, all steps
    return {
      current_step: state.current_step,
      steps_completed: allSteps.slice(0, currentIndex),
      steps_remaining: allSteps.slice(currentIndex + 1),
      progress_percentage: (currentIndex / (allSteps.length - 1)) * 100,
      estimated_time_remaining_minutes: Math.ceil(
        allSteps.slice(currentIndex).reduce((sum, step) => sum + STEP_DURATIONS[step], 0) / 60
      ),
    };
  }

  /**
   * Check if creation is complete
   */
  static isComplete(state: CampaignCreationState): boolean {
    return state.current_step === 'complete';
  }

  /**
   * Get step description
   */
  static getStepDescription(step: CampaignCreationStep): string {
    const descriptions: Record<CampaignCreationStep, string> = {
      name: 'Enter campaign name and details',
      leads: 'Upload CSV file with lead contacts',
      personalization: 'Customize email templates and prompts',
      review: 'Review campaign settings and launch',
      complete: 'Campaign created successfully',
    };

    return descriptions[step] || 'Unknown step';
  }

  /**
   * Get step title
   */
  static getStepTitle(step: CampaignCreationStep): string {
    const titles: Record<CampaignCreationStep, string> = {
      name: 'Campaign Name',
      leads: 'Import Leads',
      personalization: 'Customize Templates',
      review: 'Review & Launch',
      complete: 'Complete',
    };

    return titles[step] || 'Unknown';
  }

  /**
   * Check if step is valid
   */
  static isValidStep(step: string): step is CampaignCreationStep {
    const validSteps: CampaignCreationStep[] = [
      'name',
      'leads',
      'personalization',
      'review',
      'complete',
    ];

    return validSteps.includes(step as CampaignCreationStep);
  }
}
