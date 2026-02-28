/**
 * PHASE 64: Onboarding Progress Service
 * 
 * Tracks user progress through the 11-stage Genesis Gateway onboarding flow.
 * Manages stage transitions and completion validation.
 */

import {
  OnboardingStage,
  OnboardingProgress,
  CredentialType,
} from './credential-vault-types';

// ============================================
// STAGE CONFIGURATION
// ============================================

export const ONBOARDING_STAGES: OnboardingStage[] = [
  'region_selection',
  'brand_info',
  'email_provider_selection',  // Phase 64.B: Choose email provider
  'gmail_oauth',               // Conditional: Only if provider = Gmail
  'smtp_configuration',        // Conditional: Only if provider = SMTP
  'openai_key',
  'anthropic_key',
  'google_cse_key',
  'relevance_key',
  'apify_selection',
  'calendly_url',
  'dns_setup',
  'ignition',
];

// Stages that are conditional based on email provider selection
export const CONDITIONAL_EMAIL_STAGES: OnboardingStage[] = ['gmail_oauth', 'smtp_configuration'];

export interface StageInfo {
  stage: OnboardingStage;
  title: string;
  description: string;
  estimatedDuration: number; // seconds
  required: boolean;
  credentialType?: CredentialType;
}

export const STAGE_INFO: Record<OnboardingStage, StageInfo> = {
  region_selection: {
    stage: 'region_selection',
    title: 'Infrastructure Configuration',
    description: 'Select your data region and droplet size',
    estimatedDuration: 60,
    required: true,
  },
  brand_info: {
    stage: 'brand_info',
    title: 'Brand Information',
    description: 'Tell us about your company',
    estimatedDuration: 60,
    required: true,
  },
  email_provider_selection: {
    stage: 'email_provider_selection',
    title: 'Email Provider',
    description: 'Choose your email sending method',
    estimatedDuration: 30,
    required: true,
  },
  gmail_oauth: {
    stage: 'gmail_oauth',
    title: 'Connect Gmail',
    description: 'Authorize Gmail for sending emails',
    estimatedDuration: 120,
    required: false,  // Conditional: only if provider = Gmail
    credentialType: 'gmail_oauth',
  },
  smtp_configuration: {
    stage: 'smtp_configuration',
    title: 'SMTP Configuration',
    description: 'Configure your custom SMTP server',
    estimatedDuration: 120,
    required: false,  // Conditional: only if provider = SMTP
  },
  openai_key: {
    stage: 'openai_key',
    title: 'OpenAI API Key',
    description: 'Provide your OpenAI API key',
    estimatedDuration: 60,
    required: true,
    credentialType: 'openai_api_key',
  },
  anthropic_key: {
    stage: 'anthropic_key',
    title: 'Anthropic API Key',
    description: 'Provide your Claude API key',
    estimatedDuration: 60,
    required: true,
    credentialType: 'anthropic_api_key',
  },
  google_cse_key: {
    stage: 'google_cse_key',
    title: 'Google Custom Search',
    description: 'Provide your Google CSE API key and Engine ID',
    estimatedDuration: 60,
    required: true,
    credentialType: 'google_cse_api_key',
  },
  relevance_key: {
    stage: 'relevance_key',
    title: 'Relevance AI Configuration',
    description: 'Configure Relevance AI for LinkedIn research',
    estimatedDuration: 180, // More time for full config + tool import
    required: true,
    credentialType: 'relevance_config',
  },
  apify_selection: {
    stage: 'apify_selection',
    title: 'Google Reviews Scraper',
    description: 'Apify fetches 1–3 star Google Maps reviews to personalise your outreach',
    estimatedDuration: 60,
    required: false,
  },
  calendly_url: {
    stage: 'calendly_url',
    title: 'Booking Link',
    description: 'Enter your Calendly or Cal.com URL',
    estimatedDuration: 30,
    required: true,
    credentialType: 'calendly_url',
  },
  dns_setup: {
    stage: 'dns_setup',
    title: 'DNS Configuration',
    description: 'Setup SPF, DKIM, DMARC records',
    estimatedDuration: 180,
    required: true,
  },
  ignition: {
    stage: 'ignition',
    title: 'Start Engine',
    description: 'Provision your automation engine',
    estimatedDuration: 60,
    required: true,
  },
};

// ============================================
// ONBOARDING PROGRESS SERVICE
// ============================================

export interface OnboardingProgressServiceConfig {
  supabaseClient: any;
}

export class OnboardingProgressService {
  private supabase: any;

  constructor(config: OnboardingProgressServiceConfig) {
    this.supabase = config.supabaseClient;
  }

  // ============================================
  // PROGRESS TRACKING
  // ============================================

  /**
   * Initialize onboarding progress for a workspace
   */
  async initializeProgress(
    workspaceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.supabase
        .from('genesis.onboarding_progress')
        .insert({
          workspace_id: workspaceId,
          current_stage: ONBOARDING_STAGES[0],
          completed_stages: [],
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize progress',
      };
    }
  }

  /**
   * Get current onboarding progress
   */
  async getProgress(
    workspaceId: string
  ): Promise<{
    success: boolean;
    progress?: OnboardingProgress;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('genesis.onboarding_progress')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - initialize
          await this.initializeProgress(workspaceId);
          return this.getProgress(workspaceId);
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        progress: {
          workspaceId: data.workspace_id,
          currentStage: data.current_stage,
          completedStages: data.completed_stages || [],
          startedAt: new Date(data.started_at),
          updatedAt: new Date(data.updated_at),
          completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get progress',
      };
    }
  }

  /**
   * Mark a stage as complete and advance
   */
  async completeStage(
    workspaceId: string,
    stage: OnboardingStage
  ): Promise<{ success: boolean; nextStage?: OnboardingStage; error?: string }> {
    try {
      const progressResult = await this.getProgress(workspaceId);
      if (!progressResult.success || !progressResult.progress) {
        return { success: false, error: 'Failed to get current progress' };
      }

      const progress = progressResult.progress;
      
      // Add to completed stages if not already there
      const completedStages = new Set(progress.completedStages);
      completedStages.add(stage);
      
      // Determine next stage
      const currentIndex = ONBOARDING_STAGES.indexOf(stage);
      const nextStage = currentIndex < ONBOARDING_STAGES.length - 1 
        ? ONBOARDING_STAGES[currentIndex + 1]
        : null;
      
      const isFullyComplete = currentIndex === ONBOARDING_STAGES.length - 1;
      
      const updateData: any = {
        completed_stages: Array.from(completedStages),
        updated_at: new Date().toISOString(),
      };
      
      if (nextStage) {
        updateData.current_stage = nextStage;
      }
      
      if (isFullyComplete) {
        updateData.completed_at = new Date().toISOString();
      }
      
      const result = await this.supabase
        .from('genesis.onboarding_progress')
        .update(updateData)
        .eq('workspace_id', workspaceId);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return {
        success: true,
        nextStage: nextStage || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete stage',
      };
    }
  }

  /**
   * Go back to a previous stage
   */
  async goToStage(
    workspaceId: string,
    stage: OnboardingStage
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.supabase
        .from('genesis.onboarding_progress')
        .update({
          current_stage: stage,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stage',
      };
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Check if all required stages are complete
   */
  async isOnboardingComplete(
    workspaceId: string
  ): Promise<{ complete: boolean; missingStages: OnboardingStage[] }> {
    const progressResult = await this.getProgress(workspaceId);
    
    if (!progressResult.success || !progressResult.progress) {
      return {
        complete: false,
        missingStages: ONBOARDING_STAGES,
      };
    }

    const completedSet = new Set(progressResult.progress.completedStages);
    const missingStages = ONBOARDING_STAGES.filter(
      stage => STAGE_INFO[stage].required && !completedSet.has(stage)
    );

    return {
      complete: missingStages.length === 0,
      missingStages,
    };
  }

  /**
   * Get onboarding completion percentage
   */
  async getCompletionPercentage(workspaceId: string): Promise<number> {
    const progressResult = await this.getProgress(workspaceId);
    
    if (!progressResult.success || !progressResult.progress) {
      return 0;
    }

    const totalStages = ONBOARDING_STAGES.filter(s => STAGE_INFO[s].required).length;
    const completedStages = progressResult.progress.completedStages.filter(
      s => STAGE_INFO[s].required
    ).length;

    return Math.round((completedStages / totalStages) * 100);
  }

  // ============================================
  // RESET
  // ============================================

  /**
   * Reset onboarding progress (for testing/debugging)
   */
  async resetProgress(
    workspaceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.supabase
        .from('genesis.onboarding_progress')
        .update({
          current_stage: ONBOARDING_STAGES[0],
          completed_stages: [],
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset progress',
      };
    }
  }
}
