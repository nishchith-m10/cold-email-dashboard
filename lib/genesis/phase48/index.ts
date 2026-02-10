/**
 * GENESIS PHASE 48: PRODUCTION CUTOVER & REVERT PROTOCOL
 *
 * Public API for launch readiness, blue/green deployment,
 * canary management, instant revert, and cutover orchestration.
 */

// Types
export type {
  DeploymentSlot,
  DeploymentStatus,
  DeploymentState,
  DeploymentEvent,
  DeploymentEventType,
  ReadinessCheckSeverity,
  ReadinessCheckCategory,
  ReadinessCheck,
  ReadinessCheckResult,
  ReadinessReport,
  CanaryConfig,
  CanaryState,
  RevertTriggerType,
  RevertTriggerConfig,
  RevertTriggerState,
  RevertResult,
  CutoverPhaseType,
  CutoverPlan,
  CutoverProgress,
  CutoverResult,
  DeploymentEnvironment,
} from './types';

// Constants
export {
  DEFAULT_CANARY_CONFIG,
  DEFAULT_REVERT_TRIGGERS,
  DEPLOYMENT_DEFAULTS,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
  generateEventId,
  generateDeploymentId,
} from './types';

// Launch Readiness
export {
  LaunchReadinessEngine,
  LaunchReadinessError,
  getDefaultReadinessChecks,
} from './launch-readiness';

// Deployment Controller
export {
  DeploymentController,
  DeploymentControllerError,
} from './deployment-controller';

// Instant Revert
export {
  InstantRevertManager,
  InstantRevertError,
} from './instant-revert';

// Cutover Orchestrator
export {
  CutoverOrchestrator,
  CutoverOrchestratorError,
} from './cutover-orchestrator';

// Mock Environment
export {
  MockDeploymentEnvironment,
} from './mock-deployment-env';
