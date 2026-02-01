/**
 * GENESIS PART VI - PHASE 60.B: GENESIS GATEWAY STREAMLINED ONBOARDING
 * Type definitions for onboarding data collection
 */

/**
 * Onboarding stage data interfaces
 */

// Stage 1: Account (handled by Clerk, no additional data)
export interface AccountStageData {
  user_id: string;
  email: string;
  created_at: Date;
}

// Stage 2: Brand
export interface BrandStageData {
  company_name: string;
  website_url: string;
}

// Stage 3: Email (Gmail OAuth)
export interface EmailStageData {
  gmail_email: string;
  oauth_tokens_encrypted: string;
  connected_at: Date;
}

// Stage 4: AI Keys
export interface AIKeysStageData {
  openai_key_encrypted?: string;
  claude_key_encrypted?: string;
}

// Stage 5: Region
export interface RegionStageData {
  region: string;
  tier: 'starter' | 'professional' | 'scale' | 'enterprise';
}

// Stage 6: Ignite (triggers provisioning)
export interface IgniteStageData {
  user_confirmed: boolean;
  risk_check_passed: boolean;
}

/**
 * Complete onboarding data collected across all stages
 */
export interface OnboardingData {
  workspace_id: string;
  account: AccountStageData;
  brand?: BrandStageData;
  email?: EmailStageData;
  ai_keys?: AIKeysStageData;
  region?: RegionStageData;
  ignite?: IgniteStageData;
}

/**
 * Stage validation result
 */
export interface StageValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Stage completion result
 */
export interface StageCompletionResult {
  success: boolean;
  next_stage: string;
  data_stored: boolean;
  error?: string;
}

/**
 * Onboarding progress summary
 */
export interface OnboardingProgressSummary {
  workspace_id: string;
  current_stage: string;
  stages_completed: string[];
  total_stages: number;
  percentage_complete: number;
  estimated_time_remaining_seconds: number;
}

/**
 * Stage timing estimates (in seconds)
 */
export const STAGE_DURATIONS = {
  account: 15,
  brand: 30,
  email: 45,
  ai_keys: 60,
  region: 20,
  pending_ignition: 5,
} as const;
