/**
 * PHASE 56: FLEET-WIDE TEMPLATE RECONCILIATION - EXPORTS
 */

export {
  TemplateReconciliationManager,
  createTemplateReconciliationService,
  TemplateError,
} from './template-service';

export type {
  UpdateRiskLevel,
  UpdateStrategy,
  UpdateScenario,
  TemplateVersion,
  WorkspaceTemplateStatus,
  BlueGreenStep,
  BlueGreenUpdate,
  BlueGreenConfig,
  RolloutStatus,
  BatchedRolloutConfig,
  RolloutBatch,
  RolloutProgress,
  RolloutResult,
  CanaryRolloutConfig,
  CanaryWave,
  CanaryRollout,
  UpdateRequest,
  UpdateResult,
  VersionReport,
  VersionMismatch,
  TemplateDB,
  UpdateClient,
  TemplateReconciliationService,
} from './template-types';

export {
  UPDATE_SCENARIOS,
  DEFAULT_BLUE_GREEN_CONFIG,
  DEFAULT_BATCHED_ROLLOUT_CONFIG,
  DEFAULT_CANARY_CONFIG,
  QUIET_PERIOD_TIMEOUT_SECONDS,
  HEALTH_CHECK_TIMEOUT_SECONDS,
  VERIFICATION_TIMEOUT_SECONDS,
  DEFAULT_BATCH_SIZE,
  PAUSE_BETWEEN_BATCHES_SECONDS,
  FAILURE_THRESHOLD_PERCENT,
  MAX_FAILURES_BEFORE_ABORT_PERCENT,
  TARGET_DOWNTIME_SECONDS,
} from './template-types';

export {
  MockTemplateDB,
  MockUpdateClient,
  createMockTemplateDB,
  createMockUpdateClient,
} from './template-mocks';
