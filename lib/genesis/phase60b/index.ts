/**
 * GENESIS PART VI - PHASE 60.B: GENESIS GATEWAY STREAMLINED ONBOARDING
 * Main exports
 */

// Types
export * from './onboarding-types';

// Validators
export {
  BrandStageValidator,
  EmailStageValidator,
  AIKeysStageValidator,
  RegionStageValidator,
  IgniteStageValidator,
} from './stage-validators';

// Flow Manager
export { OnboardingFlowManager } from './onboarding-flow-manager';
