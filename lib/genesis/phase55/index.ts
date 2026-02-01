/**
 * PHASE 55: HIBERNATION & WAKE PHYSICS - EXPORTS
 */

export {
  HibernationManager,
  createHibernationService,
  HibernationError,
} from './hibernation-service';

export type {
  TenantTier,
  PreWarmingStrategy,
  HibernationCriteria,
  WorkspaceActivity,
  HibernationEligibilityResult,
  PowerAction,
  PowerStatus,
  PowerOperationRequest,
  PowerOperationResult,
  HibernationProcess,
  MetricSnapshot,
  WakeTrigger,
  WakeRequest,
  WakeProcess,
  WakeResult,
  StaggeredWakeSchedule,
  StaggeredWakeResult,
  PreWarmingConfig,
  PredictiveWakeSchedule,
  HibernationCostSavings,
  FleetCostSummary,
  HibernationDB,
  PowerClient,
  HibernationService,
} from './hibernation-types';

export {
  DEFAULT_HIBERNATION_CRITERIA,
  DEFAULT_PREWARMING_CONFIGS,
  COST_RUNNING_DROPLET,
  COST_HIBERNATING_DROPLET,
  SAVINGS_PER_HIBERNATED,
  TARGET_WAKE_TIME_STANDARD,
  TARGET_WAKE_TIME_HIGH_PRIORITY,
  TARGET_WAKE_TIME_ENTERPRISE,
  WAKE_INTERVAL_MS,
  DO_API_RATE_LIMIT_PER_SECOND,
  PRE_HIBERNATION_NOTIFICATION_HOURS,
} from './hibernation-types';

export {
  MockHibernationDB,
  MockPowerClient,
  createMockHibernationDB,
  createMockPowerClient,
} from './hibernation-mocks';
