/**
 * PHASE 45: SANDBOX & SIMULATION ENGINE
 * 
 * Type definitions for real-time workflow execution monitoring,
 * test campaign triggering, PII sanitization, and rate limiting.
 * 
 * Architecture: Scenario A — Real n8n execution with Sidecar polling.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md (Phase 45)
 */

// ============================================
// EXECUTION EVENT TYPES
// ============================================

/** Status of a single node execution */
export type NodeExecutionStatus = 'success' | 'error' | 'skipped' | 'waiting';

/** Types of workflows that can be tested */
export type WorkflowType =
  | 'research'
  | 'email_1'
  | 'email_2'
  | 'email_3'
  | 'reply_tracker'
  | 'custom';

/** Raw database row for workflow_execution_events */
export interface ExecutionEventRow {
  id: string;
  execution_id: string;
  workspace_id: string;
  campaign_id: string | null;
  workflow_type: string | null;
  node_id: string;
  node_name: string;
  node_type: string;
  status: string;
  execution_time_ms: number | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  test_mode: boolean;
  created_at: string;
}

/** Mapped execution event (camelCase for frontend) */
export interface ExecutionEvent {
  id: string;
  executionId: string;
  workspaceId: string;
  campaignId: string | null;
  workflowType: WorkflowType | string | null;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: NodeExecutionStatus;
  executionTimeMs: number | null;
  inputData: Record<string, unknown> | null;
  outputData: Record<string, unknown> | null;
  errorMessage: string | null;
  testMode: boolean;
  createdAt: string;
}

/** Maps a DB row to camelCase ExecutionEvent */
export function mapExecutionEventRow(row: ExecutionEventRow): ExecutionEvent {
  return {
    id: row.id,
    executionId: row.execution_id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    workflowType: row.workflow_type,
    nodeId: row.node_id,
    nodeName: row.node_name,
    nodeType: row.node_type,
    status: row.status as NodeExecutionStatus,
    executionTimeMs: row.execution_time_ms,
    inputData: row.input_data,
    outputData: row.output_data,
    errorMessage: row.error_message,
    testMode: row.test_mode,
    createdAt: row.created_at,
  };
}

// ============================================
// SANDBOX TEST RUN TYPES
// ============================================

/** Raw row for sandbox_test_runs table */
export interface SandboxTestRunRow {
  id: string;
  workspace_id: string;
  execution_id: string | null;
  campaign_id: string | null;
  test_email: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  node_count: number;
  error_count: number;
  total_duration_ms: number | null;
}

/** Mapped sandbox test run */
export interface SandboxTestRun {
  id: string;
  workspaceId: string;
  executionId: string | null;
  campaignId: string | null;
  testEmail: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  nodeCount: number;
  errorCount: number;
  totalDurationMs: number | null;
}

/** Maps a DB row to camelCase SandboxTestRun */
export function mapSandboxTestRunRow(row: SandboxTestRunRow): SandboxTestRun {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    executionId: row.execution_id,
    campaignId: row.campaign_id,
    testEmail: row.test_email,
    status: row.status as SandboxTestRun['status'],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    nodeCount: row.node_count,
    errorCount: row.error_count,
    totalDurationMs: row.total_duration_ms,
  };
}

// ============================================
// TRIGGER & WORKFLOW TYPES
// ============================================

/** Request to trigger a test campaign */
export interface TriggerTestRequest {
  workspaceId: string;
  campaignId: string;
  testEmail: string;
  testLeadData?: Record<string, unknown>;
}

/** Response from triggering a test campaign */
export interface TriggerTestResponse {
  success: boolean;
  executionId: string;
  streamUrl: string;
}

/** Sidecar trigger payload */
export interface SidecarTriggerPayload {
  campaignId: string;
  testEmail: string;
  testMode: true;
  testData?: Record<string, unknown>;
}

/** Sidecar trigger response */
export interface SidecarTriggerResponse {
  executionId: string;
  workflowId?: string;
  status: 'triggered' | 'error';
  error?: string;
}

// ============================================
// MOCK N8N TYPES
// ============================================

/** Mock execution result from the mock n8n service */
export interface MockExecutionResult {
  executionId: string;
  status: 'success' | 'error';
  startedAt: string;
  completedAt: string;
  nodeResults: MockNodeResult[];
}

/** Individual mock node result */
export interface MockNodeResult {
  nodeName: string;
  nodeType: string;
  output: unknown;
  duration: number;
}

/** Mock workflow definition (simplified) */
export interface MockWorkflowDefinition {
  nodes: Array<{
    name: string;
    type: string;
    parameters?: Record<string, unknown>;
  }>;
}

// ============================================
// PII SANITIZATION TYPES
// ============================================

/** Default PII fields to redact */
export const DEFAULT_PII_FIELDS: readonly string[] = [
  'email_address',
  'email',
  'phone',
  'first_name',
  'last_name',
  'phone_number',
  'address',
  'ssn',
  'social_security',
] as const;

/** Sanitization result */
export interface SanitizationResult {
  data: Record<string, unknown>;
  fieldsRedacted: number;
  wasSanitized: boolean;
}

/** PII sanitization config */
export interface PiiSanitizationConfig {
  fields: readonly string[];
  maxDataSizeBytes: number;
  placeholder: string;
}

export const DEFAULT_PII_CONFIG: PiiSanitizationConfig = {
  fields: DEFAULT_PII_FIELDS,
  maxDataSizeBytes: 10240, // 10KB
  placeholder: '***REDACTED***',
};

// ============================================
// RATE LIMITING TYPES
// ============================================

/** Sandbox rate limit check result */
export interface SandboxRateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  retryAfterSeconds?: number;
}

/** Default sandbox rate limit: 10 test runs per workspace per hour */
export const SANDBOX_RATE_LIMIT = {
  maxRunsPerHour: 10,
  windowSeconds: 3600,
} as const;

// ============================================
// SSE STREAM TYPES
// ============================================

/** SSE message types */
export type SSEMessageType = 'node_event' | 'complete' | 'error' | 'heartbeat';

/** SSE message payload */
export interface SSEMessage {
  type: SSEMessageType;
  data?: ExecutionEvent | Record<string, unknown>;
  timestamp: string;
}

// ============================================
// EXECUTION INGESTION TYPES
// ============================================

/** Incoming event from Sidecar */
export interface IncomingExecutionEvent {
  executionId: string;
  campaignId?: string;
  workflowType?: WorkflowType | string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: NodeExecutionStatus;
  executionTime?: number;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  testMode?: boolean;
}

// ============================================
// EXECUTION SUMMARY TYPES
// ============================================

/** Summary of an execution (for history lists) */
export interface ExecutionSummary {
  executionId: string;
  workspaceId: string;
  campaignId: string | null;
  workflowType: string | null;
  testMode: boolean;
  nodeCount: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
}

// ============================================
// API RESPONSE TYPES
// ============================================

/** Response from GET /api/sandbox/execution-stream/:executionId (SSE) */
export type ExecutionStreamResponse = SSEMessage;

/** Response from POST /api/sandbox/test-campaign */
export interface TestCampaignApiResponse {
  success: boolean;
  executionId?: string;
  streamUrl?: string;
  error?: string;
}

/** Response from POST /api/n8n/execution-event */
export interface ExecutionEventApiResponse {
  success: boolean;
  error?: string;
}

/** Response from GET /api/sandbox/history */
export interface SandboxHistoryApiResponse {
  success: boolean;
  runs: SandboxTestRun[];
  total: number;
}

/** Response from GET /api/sandbox/execution/:executionId */
export interface ExecutionDetailApiResponse {
  success: boolean;
  events: ExecutionEvent[];
  summary: ExecutionSummary;
}
