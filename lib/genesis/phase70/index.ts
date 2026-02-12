/**
 * GENESIS PHASE 70: DISASTER RECOVERY & REGIONAL FAILOVER
 *
 * Public API for cross-region snapshots, failover detection,
 * mass restoration, and disaster recovery orchestration.
 */

// Types
export type {
  FailureMode,
  FailureModeDefinition,
  DORegion,
  RegionMapping,
  SnapshotType,
  SnapshotStatus,
  SnapshotConfig,
  Snapshot,
  SnapshotRecord,
  RestorationPhase,
  RestorationPriority,
  RestorationTask,
  RestorationPlan,
  RestorationProgress,
  RestorationResult,
  FailoverTriggerType,
  FailoverTrigger,
  HeartbeatStatus,
  FailoverEvent,
  GarbageCategory,
  GarbageCollectionConfig,
  OrphanedSnapshot,
  GarbageCollectionResult,
  DisasterRecoveryEnvironment,
} from './types';

// Constants
export {
  FAILURE_MODE_CATALOG,
  CROSS_REGION_MAPPINGS,
  SNAPSHOT_CONFIGS,
  DEFAULT_FAILOVER_TRIGGERS,
  GARBAGE_COLLECTION_DEFAULTS,
  DR_DEFAULTS,
  getBackupRegion,
  calculateSnapshotCost,
  isSnapshotExpired,
  generateSnapshotName,
  generateTaskId,
  generatePlanId,
  generateEventId,
} from './types';

// Services
export {
  SnapshotManager,
  SnapshotManagerError,
} from './snapshot-manager';

export {
  FailoverDetector,
  FailoverDetectorError,
} from './failover-detector';

export {
  RestorationOrchestrator,
  RestorationOrchestratorError,
} from './restoration-orchestrator';

export {
  DisasterRecoveryController,
  DisasterRecoveryControllerError,
} from './disaster-recovery-controller';

// Mock Environment
export {
  MockDOEnvironment,
} from './mock-do-environment';
