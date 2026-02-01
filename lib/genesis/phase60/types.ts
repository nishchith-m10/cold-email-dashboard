/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Type definitions for onboarding state management
 */

/**
 * Onboarding stages in Genesis Gateway flow
 */
export type OnboardingStage =
  | 'account'           // Just created
  | 'brand'             // Entered brand info
  | 'email'             // Connected Gmail
  | 'ai_keys'           // Provided API keys
  | 'region'            // Selected region/tier
  | 'pending_ignition'  // Clicked ignite, awaiting risk check
  | 'pending_review'    // High risk, waiting for admin
  | 'igniting'          // Droplet provisioning
  | 'complete';         // Fully onboarded

/**
 * All valid onboarding stages as a const array
 */
export const ONBOARDING_STAGES: readonly OnboardingStage[] = [
  'account',
  'brand',
  'email',
  'ai_keys',
  'region',
  'pending_ignition',
  'pending_review',
  'igniting',
  'complete',
] as const;

/**
 * Workspace onboarding state
 */
export interface WorkspaceOnboardingState {
  workspace_id: string;
  onboarding_stage: OnboardingStage;
  setup_complete: boolean;
  campaigns_enabled: boolean;
  onboarding_started_at: Date | null;
  onboarding_completed_at: Date | null;
}

/**
 * State transition result
 */
export interface StateTransitionResult {
  success: boolean;
  from_stage: OnboardingStage;
  to_stage: OnboardingStage;
  timestamp: Date;
  error?: string;
}

/**
 * Routing decision based on workspace state
 */
export interface RoutingDecision {
  target_route: string;
  reason: string;
  should_block: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Layer definitions in the application architecture
 */
export enum ApplicationLayer {
  Authentication = 1,       // /sign-in, /sign-up
  WorkspaceSelection = 2,   // /join
  GenesisGateway = 2.5,     // /onboarding/*
  EngineStarting = 2.75,    // /ignition/[workspaceId]
  OnboardingTips = 3,       // (modal)
  MainDashboard = 4,        // /dashboard, /contacts, etc.
}

/**
 * Onboarding progress metrics
 */
export interface OnboardingProgress {
  workspace_id: string;
  current_stage: OnboardingStage;
  stages_completed: OnboardingStage[];
  percentage_complete: number;
  estimated_time_remaining_seconds: number;
}
