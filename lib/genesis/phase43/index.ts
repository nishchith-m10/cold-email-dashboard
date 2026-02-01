/**
 * PHASE 43: STATE RECONCILIATION WATCHDOG - EXPORTS
 * 
 * Central export file for the Watchdog service and related types.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 43
 */

// ============================================
// SERVICE
// ============================================

export {
  StateReconciliationWatchdog,
  createWatchdogService,
  WatchdogError,
} from './watchdog-service';

// ============================================
// TYPES
// ============================================

export type {
  // Core types
  DriftType,
  DriftSeverity,
  DriftResult,
  DriftDetectionResult,
  HealingResult,
  HealingStrategy,
  
  // Specific drift types
  OrphanWorkflow,
  OrphanDbRecord,
  StateMismatch,
  CredentialIssue,
  
  // Run types
  WatchdogRunConfig,
  WatchdogRunResult,
  WatchdogEvent,
  WatchdogTrigger,
  
  // Interface types
  WatchdogDB,
  N8nClient,
  WatchdogService,
} from './watchdog-types';

export {
  // Constants
  DRIFT_SEVERITIES,
  AUTO_HEALABLE,
  HEALING_STRATEGIES,
  DEFAULT_WATCHDOG_CONFIG,
  WATCHDOG_INTERVAL_MS,
  MAX_HEALING_ATTEMPTS,
  HEALING_BACKOFF_MS,
} from './watchdog-types';

// ============================================
// MOCKS
// ============================================

export {
  MockWatchdogDB,
  MockN8nClient,
  createMockWatchdogDB,
  createMockN8nClient,
} from './watchdog-mocks';
