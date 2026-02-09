/**
 * PHASE 45: SANDBOX & SIMULATION ENGINE
 * 
 * Barrel export for all Phase 45 modules.
 */

// Types
export type {
  NodeExecutionStatus,
  WorkflowType,
  ExecutionEventRow,
  ExecutionEvent,
  SandboxTestRunRow,
  SandboxTestRun,
  TriggerTestRequest,
  TriggerTestResponse,
  SidecarTriggerPayload,
  SidecarTriggerResponse,
  MockExecutionResult,
  MockNodeResult,
  MockWorkflowDefinition,
  SanitizationResult,
  PiiSanitizationConfig,
  SandboxRateLimitResult,
  SSEMessageType,
  SSEMessage,
  IncomingExecutionEvent,
  ExecutionSummary,
  ExecutionStreamResponse,
  TestCampaignApiResponse,
  ExecutionEventApiResponse,
  SandboxHistoryApiResponse,
  ExecutionDetailApiResponse,
} from './types';

export {
  mapExecutionEventRow,
  mapSandboxTestRunRow,
  DEFAULT_PII_FIELDS,
  DEFAULT_PII_CONFIG,
  SANDBOX_RATE_LIMIT,
} from './types';

// PII Sanitizer
export { PiiSanitizer, createPiiSanitizer } from './pii-sanitizer';

// Mock n8n
export {
  executeMockWorkflow,
  getMockResponseFn,
  getSupportedMockNodeTypes,
} from './mock-n8n';

// Sandbox Rate Limiter
export {
  SandboxRateLimiter,
  InMemoryRateLimitDB,
  createSupabaseRateLimitDB,
} from './sandbox-rate-limiter';
export type { SandboxRateLimitDB } from './sandbox-rate-limiter';

// Workflow Trigger
export {
  WorkflowTriggerService,
  HttpSidecarClient,
  WorkflowTriggerError,
  MockWorkspaceLookupDB,
  MockSidecarClient,
} from './workflow-trigger';
export type {
  WorkspaceLookupDB,
  SidecarClient as Phase45SidecarClient,
  WorkflowTriggerErrorCode,
} from './workflow-trigger';

// Execution Event Service
export { ExecutionEventService } from './execution-event-service';
export type { ExecutionEventDB } from './execution-event-service';
