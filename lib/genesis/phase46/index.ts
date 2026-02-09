/**
 * GENESIS PHASE 46: SHADOW MIGRATION & PARITY TESTING
 *
 * Public exports for the Phase 46 migration system.
 */

// Types
export type {
  MigrationStatus,
  MigrationState,
  MigrationStateRow,
  CreateMigrationInput,
  DualWriteConfig,
  DualWriteResult,
  DualWriteOperation,
  DualWriteEvent,
  BackfillConfig,
  BackfillProgress,
  BackfillResult,
  BackfillBatchResult,
  BackfillError,
  ParityCheckConfig,
  ParityCheckResult,
  ParityMismatch,
  CutoverPhase,
  CutoverState,
  CutoverStep,
  CutoverPreCheck,
  CutoverResult,
  RollbackResult,
  MigrationEventType,
  MigrationEvent,
  MigrationDB,
} from './types';

export {
  VALID_TRANSITIONS,
  DEFAULT_COMPARE_FIELDS,
  PARITY_THRESHOLDS,
  MIGRATION_DEFAULTS,
  isValidTransition,
  migrationStateRowToModel,
  modelToMigrationStateRow,
} from './types';

// Services
export { MigrationStateManager, MigrationStateError } from './migration-state-manager';
export { DualWriteService, DualWriteServiceError } from './dual-write-service';
export { BackfillEngine, BackfillEngineError } from './backfill-engine';
export { ParityChecker, ParityCheckerError } from './parity-checker';
export { CutoverManager, CutoverError } from './cutover-manager';
export {
  MigrationOrchestrator,
  MigrationOrchestratorError,
  type MigrationSummary,
} from './migration-orchestrator';

// Mocks (for testing)
export { MockMigrationDB, generateTestLeads } from './mock-migration-db';
