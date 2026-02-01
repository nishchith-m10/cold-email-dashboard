/**
 * PHASE 54: HEARTBEAT STATE MACHINE - EXPORTS
 */

export {
  HeartbeatStateMachine,
  createHeartbeatService,
  HeartbeatError,
} from './heartbeat-service';

export type {
  HealthState,
  N8nStatus,
  HeartbeatPayload,
  HeartbeatRecord,
  DropletHealth,
  StateTransition,
  StateTransitionRule,
  HealthThresholds,
  MetricSnapshot,
  MetricHistory,
  WatchdogScanResult,
  StaleHeartbeat,
  HeartbeatDB,
  RemediationClient,
  HeartbeatService,
} from './heartbeat-types';

export {
  DEFAULT_HEALTH_THRESHOLDS,
  STATE_DESCRIPTIONS,
  TERMINAL_STATES,
  UNHEALTHY_STATES,
  REQUIRES_IMMEDIATE_ACTION,
  HEARTBEAT_INTERVAL_SECONDS,
  STALE_HEARTBEAT_THRESHOLD_SECONDS,
} from './heartbeat-types';

export {
  MockHeartbeatDB,
  MockRemediationClient,
  createMockHeartbeatDB,
  createMockRemediationClient,
} from './heartbeat-mocks';
