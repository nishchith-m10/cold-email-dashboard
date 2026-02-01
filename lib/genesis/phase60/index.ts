/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Main exports
 */

// Types
export * from './types';

// Core modules
export { OnboardingStateMachine } from './onboarding-state-machine';
export { RoutingManager } from './routing-manager';
export { SetupStateManager } from './setup-state-manager';

// Re-export specific types from setup-state-manager
export type { SetupCompletionEvent, CampaignEnablementEvent } from './setup-state-manager';
