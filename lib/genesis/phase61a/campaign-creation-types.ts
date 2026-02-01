/**
 * GENESIS PART VI - PHASE 61.A: CAMPAIGN CREATION FLOW
 * Type definitions for campaign creation
 */

/**
 * Campaign creation type
 */
export type CampaignCreationType = 'empty_shell' | 'production_ready';

/**
 * Campaign creation step (for production ready flow)
 */
export type CampaignCreationStep = 
  | 'name'              // Step 1: Enter campaign name
  | 'leads'             // Step 2: Upload CSV (leads import)
  | 'personalization'   // Step 3: Customize email templates/prompts
  | 'review'            // Step 4: Review & activate
  | 'complete';         // Creation complete

/**
 * Campaign creation wizard state
 */
export interface CampaignCreationState {
  type: CampaignCreationType;
  current_step: CampaignCreationStep;
  campaign_id?: string;
  campaign_name?: string;
  lead_count?: number;
  personalization_complete?: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Campaign name step data
 */
export interface CampaignNameStepData {
  name: string;
}

/**
 * Leads step data
 */
export interface LeadsStepData {
  leads_imported: number;
  csv_file_name?: string;
}

/**
 * Personalization step data
 */
export interface PersonalizationStepData {
  prompts_customized: boolean;
  templates_configured: boolean;
}

/**
 * Review step data
 */
export interface ReviewStepData {
  ready_to_launch: boolean;
}

/**
 * Step validation result
 */
export interface StepValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Step completion result
 */
export interface StepCompletionResult {
  success: boolean;
  next_step?: CampaignCreationStep;
  error?: string;
}

/**
 * Campaign creation progress
 */
export interface CampaignCreationProgress {
  current_step: CampaignCreationStep;
  steps_completed: CampaignCreationStep[];
  steps_remaining: CampaignCreationStep[];
  progress_percentage: number;
  estimated_time_remaining_minutes: number;
}

/**
 * Valid step transitions for production ready flow
 */
export const PRODUCTION_READY_STEP_TRANSITIONS: Record<CampaignCreationStep, CampaignCreationStep[]> = {
  name: ['leads'],
  leads: ['personalization', 'name'],  // Can go back to name
  personalization: ['review', 'leads'], // Can go back to leads
  review: ['complete', 'personalization'], // Can go back to personalization
  complete: [], // Terminal state
};

/**
 * Step duration estimates (in seconds)
 */
export const STEP_DURATIONS: Record<CampaignCreationStep, number> = {
  name: 30,              // 30 seconds to enter name
  leads: 120,            // 2 minutes to upload and process CSV
  personalization: 300,  // 5 minutes to customize prompts
  review: 60,            // 1 minute to review
  complete: 0,           // No time (done)
};
