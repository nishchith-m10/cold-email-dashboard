/**
 * GENESIS PART VI - PHASE 60.A: RISK-BASED WARNING SYSTEM
 * Main exports
 */

// Types
export * from './risk-types';

// Signal Providers
export {
  EmailDomainProvider,
  IPReputationProvider,
  SignupFrequencyProvider,
  TierAppropriatenessProvider,
  CredentialValidationProvider,
  RegionMismatchProvider,
} from './signal-providers';

// Risk Scoring Engine
export { RiskScoringEngine } from './risk-scoring-engine';

// Type exports for convenience
export type {
  RiskLevel,
  AdminAction,
  RiskSignals,
  RiskScore,
  RiskAssessmentContext,
  RiskAssessmentResult,
  SignalProviderResult,
  HighRiskNotification,
  RiskThresholds,
} from './risk-types';
