/**
 * PHASE 72: ZERO-DOWNTIME FLEET UPDATE PROTOCOL — Barrel Export
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68
 */

// ============================================
// TYPES
// ============================================
export type {
  FleetComponent,
  RolloutStrategy,
  TenantVersionRecord,
  TenantUpdateStatus,
  WorkflowTemplateRecord,
  UpdateHistoryRecord,
  UpdateHistoryStatus,
  FleetRolloutRecord,
  FleetRolloutStatus,
  FleetUpdateQueueRecord,
  QueueJobStatus,
  RolloutWaveConfig,
  InitiateRolloutInput,
  WaveProgressSummary,
  RolloutProgressSnapshot,
  PublishTemplateInput,
  PromoteTemplateInput,
  EmergencyRollbackInput,
  EmergencyRollbackResult,
  RollbackScope,
  SidecarUpdateState,
  SidecarUpdateStep,
  SidecarUpdateConfig,
  RolloutHealthMetrics,
  FleetVersionSummary,
  ActiveRolloutStatus,
  VersionCompatibilityRule,
  ComponentRiskProfile,
  MigrationAction,
} from './types';

export {
  DEFAULT_ROLLOUT_WAVES,
  DEFAULT_SIDECAR_UPDATE_CONFIG,
  VERSION_COMPATIBILITY_MATRIX,
  CANARY_PERCENTAGE,
  CANARY_MONITOR_MINUTES,
  CANARY_ERROR_THRESHOLD,
  STAGED_ERROR_THRESHOLD,
  WAVE_MONITOR_MINUTES,
  SIDECAR_TARGET_DOWNTIME_SECONDS,
  MAX_QUEUE_ATTEMPTS,
  EMERGENCY_PRIORITY,
  NORMAL_PRIORITY,
  ALLOWED_MIGRATION_ACTIONS,
  FORBIDDEN_MIGRATION_ACTIONS,
} from './types';

// Re-export Phase 56 types used in Phase 72
export type {
  UpdateRiskLevel,
  UpdateStrategy,
  RolloutStatus,
  BlueGreenConfig,
  BlueGreenStep,
} from './types';

// ============================================
// DB SERVICE
// ============================================
export {
  getTenantVersion,
  upsertTenantVersion,
  updateTenantComponentVersion,
  setTenantUpdateStatus,
  getTenantsByComponentVersion,
  getTenantsNeedingUpdate,
  getFleetVersionSummary,
  getCurrentTemplate,
  getTemplateVersion,
  listTemplateVersions,
  insertTemplate,
  promoteTemplate,
  setTemplateCanary,
  logUpdateHistory,
  getUpdateHistoryByRollout,
  getRecentUpdateHistory,
  createFleetRollout,
  getFleetRollout,
  updateFleetRollout,
  getActiveRollouts,
  getRecentRollouts,
  enqueueUpdateJobs,
  claimQueuedJobs,
  completeQueueJob,
  failQueueJob,
  getQueueStats,
  getQueueJobsByWave,
  rollbackQueueJobs,
} from './db-service';

// ============================================
// VERSION REGISTRY
// ============================================
export {
  getComponentVersion,
  ensureTenantVersionRecord,
  getVersionSummary,
  detectVersionDrift,
  checkVersionCompatibility,
  getTemplateHistory,
  recordVersionUpdate,
} from './version-registry';

// ============================================
// UPDATE QUEUE
// ============================================
export {
  enqueueWave,
  enqueueEmergencyRollback,
  claimBatch,
  reportJobSuccess,
  reportJobFailure,
  cancelRolloutJobs,
  getRolloutQueueStats,
  getWaveProgress,
} from './update-queue';

// ============================================
// ROLLOUT ENGINE
// ============================================
export {
  initiateRollout,
  advanceRollout,
  pauseRollout,
  resumeRollout,
  abortRollout,
  getRolloutProgress,
  shouldAutoHalt,
  isWaveComplete,
} from './rollout-engine';

// ============================================
// TEMPLATE MANAGER
// ============================================
export {
  MANAGED_WORKFLOWS,
  publishTemplateVersion,
  promoteToCurrentVersion,
  markAsCanary,
  unmarkCanary,
  getCurrentTemplateVersion,
  getSpecificVersion,
  getVersionHistory,
  getAllCurrentTemplates,
  compareTemplateVersions,
} from './template-manager';

// ============================================
// EMERGENCY ROLLBACK
// ============================================
export {
  executeEmergencyRollback,
  estimateRollbackTime,
} from './emergency-rollback';

// ============================================
// SIDECAR UPDATE PROTOCOL
// ============================================
export {
  executeSidecarUpdate,
  getSidecarImageTag,
  isValidSidecarVersion,
} from './sidecar-update-protocol';

// ============================================
// UPDATE MONITOR
// ============================================
export {
  getActiveRolloutStatuses,
  getRolloutStatus,
  getFleetOverview,
  getComponentVersionDistribution,
  getRolloutHistory,
  getUpdateEventHistory,
  getDashboardData,
} from './update-monitor';
