/**
 * PHASE 69: CREDENTIAL ROTATION & WEBHOOK SECURITY - TYPE DEFINITIONS
 * 
 * Defines all types for credential rotation, webhook signature verification,
 * and dead letter queue management.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69
 */

// ============================================
// CREDENTIAL ROTATION TYPES
// ============================================

/**
 * Credential type enum matching Phase 64 workspace_credentials
 */
export type CredentialType =
  | 'gmail_oauth'
  | 'google_sheets_oauth'
  | 'openai_api_key'
  | 'anthropic_api_key'
  | 'webhook_secret'
  | 'sidecar_token';

/**
 * Credential rotation status
 */
export type CredentialRotationStatus =
  | 'valid'            // Healthy credential
  | 'expiring_soon'    // Within 14 days of expiry
  | 'invalid'          // Failed rotation, needs user action
  | 'needs_review';    // Unknown error, admin review required

/**
 * Credential rotation trigger reason
 */
export type RotationReason =
  | 'scheduled'           // Auto-rotation per schedule
  | 'expiring'            // OAuth token expiring soon
  | 'compromise_detected' // Security incident
  | 'user_request'        // User manually rotated
  | 'admin_action';       // Admin forced rotation

/**
 * OAuth refresh failure types
 */
export type OAuthFailureType =
  | 'revoked_consent'     // User revoked OAuth access
  | 'expired_refresh_token' // Refresh token no longer valid
  | 'rate_limit'          // Google API rate limited (429)
  | 'network_error'       // Timeout / 5xx
  | 'unknown';            // Other errors

/**
 * Credential record from database (snake_case)
 */
export interface CredentialRecord {
  id: string;
  workspace_id: string;
  type: CredentialType;
  provider: string;
  encrypted_value: string;
  expires_at?: string; // ISO 8601
  rotation_status: CredentialRotationStatus;
  last_rotated_at?: string;
  next_rotation_at?: string;
  rotation_failure_count: number;
  last_rotation_error?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Credential (camelCase for TypeScript)
 */
export interface Credential {
  id: string;
  workspaceId: string;
  type: CredentialType;
  provider: string;
  encryptedValue: string;
  expiresAt?: Date;
  rotationStatus: CredentialRotationStatus;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  rotationFailureCount: number;
  lastRotationError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth refresh token response from Google
 */
export interface OAuthRefreshResponse {
  access_token: string;
  refresh_token?: string; // Sometimes Google returns a new refresh token
  expires_in: number; // Seconds until expiry
  scope: string;
  token_type: string;
}

/**
 * Credential rotation job result
 */
export interface CredentialRotationResult {
  success: boolean;
  credentialId: string;
  newExpiresAt?: Date;
  error?: {
    type: OAuthFailureType;
    message: string;
    retryable: boolean;
  };
  executionTimeMs: number;
}

/**
 * Credential rotation audit entry (snake_case)
 */
export interface CredentialRotationAuditRecord {
  id: string;
  workspace_id: string;
  credential_id: string;
  credential_type: CredentialType;
  rotation_type: string;
  rotation_result: 'success' | 'failed' | 'skipped';
  failure_reason?: string;
  failure_code?: string;
  retry_attempt: number;
  initiated_by?: string;
  rotated_at: string;
  execution_time_ms?: number;
  created_at: string;
}

// ============================================
// WEBHOOK SIGNATURE TYPES
// ============================================

/**
 * Webhook signature headers
 */
export interface WebhookSignatureHeaders {
  'x-genesis-signature': string;  // HMAC-SHA256 signature
  'x-genesis-timestamp': string;  // Unix timestamp
  'x-genesis-request-id': string; // UUID for idempotency
}

/**
 * Webhook signature verification result
 */
export interface WebhookVerificationResult {
  valid: boolean;
  error?: WebhookVerificationError;
}

/**
 * Webhook verification error types
 */
export type WebhookVerificationError =
  | 'missing_signature'       // No X-Genesis-Signature header
  | 'missing_timestamp'       // No X-Genesis-Timestamp header
  | 'missing_request_id'      // No X-Genesis-Request-Id header
  | 'signature_mismatch'      // HMAC verification failed
  | 'timestamp_too_old'       // Timestamp > 5 minutes old (replay attack)
  | 'duplicate_request_id'    // Request ID already seen
  | 'invalid_timestamp_format' // Timestamp not a valid integer
  | 'unknown_error';

/**
 * Webhook secret record from database (snake_case)
 */
export interface WebhookSecretRecord {
  id: string;
  workspace_id: string;
  secret_active: string;      // Encrypted
  secret_previous?: string;    // Encrypted
  rotated_at: string;
  rotation_initiated_by?: string;
  rotation_reason?: string;
  next_rotation_at: string;
  grace_period_ends_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Webhook secret (camelCase for TypeScript)
 */
export interface WebhookSecret {
  id: string;
  workspaceId: string;
  secretActive: string;        // Decrypted
  secretPrevious?: string;      // Decrypted
  rotatedAt: Date;
  rotationInitiatedBy?: string;
  rotationReason?: string;
  nextRotationAt: Date;
  gracePeriodEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook secret rotation request
 */
export interface WebhookSecretRotationRequest {
  workspaceId: string;
  reason: RotationReason;
  initiatedBy?: string;
  gracePeriodDays?: number; // Default 1 day
}

// ============================================
// DEAD LETTER QUEUE TYPES
// ============================================

/**
 * DLQ entry status
 */
export type DLQStatus = 'pending' | 'retrying' | 'resolved' | 'abandoned';

/**
 * DLQ entry record from database (snake_case)
 */
export interface WebhookDLQRecord {
  id: string;
  workspace_id: string;
  webhook_url: string;
  http_method: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  error_message?: string;
  error_code?: string;
  error_stack?: string;
  attempt_count: number;
  max_attempts: number;
  first_attempt_at: string;
  last_attempt_at?: string;
  next_retry_at?: string;
  status: DLQStatus;
  resolved_at?: string;
  abandoned_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * DLQ entry (camelCase for TypeScript)
 */
export interface WebhookDLQEntry {
  id: string;
  workspaceId: string;
  webhookUrl: string;
  httpMethod: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  errorMessage?: string;
  errorCode?: string;
  errorStack?: string;
  attemptCount: number;
  maxAttempts: number;
  firstAttemptAt: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  status: DLQStatus;
  resolvedAt?: Date;
  abandonedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook delivery failure
 */
export interface WebhookDeliveryFailure {
  workspaceId: string;
  url: string;
  method?: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  error: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * DLQ retry result
 */
export interface DLQRetryResult {
  success: boolean;
  entryId: string;
  attemptCount: number;
  error?: {
    message: string;
    code?: string;
    retryable: boolean;
  };
  executionTimeMs: number;
}

/**
 * DLQ retry batch result
 */
export interface DLQRetryBatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  abandoned: number;
  results: DLQRetryResult[];
}

// ============================================
// REQUEST ID DEDUPLICATION TYPES
// ============================================

/**
 * Webhook request ID record from database
 */
export interface WebhookRequestIdRecord {
  request_id: string;
  seen_at: string;
  source: string;
  endpoint: string;
}

/**
 * Request ID check result
 */
export interface RequestIdCheckResult {
  isDuplicate: boolean;
  seenAt?: Date;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

/**
 * Credential rotation failure notification
 */
export interface CredentialFailureNotification {
  workspaceId: string;
  credentialType: CredentialType;
  failureType: OAuthFailureType;
  userEmails: string[];
  reconnectUrl: string;
}

// ============================================
// MAPPER FUNCTIONS (snake_case ↔ camelCase)
// ============================================

/**
 * Convert credential from database format to TypeScript format
 */
export function mapCredentialFromDb(record: CredentialRecord): Credential {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    type: record.type,
    provider: record.provider,
    encryptedValue: record.encrypted_value,
    expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
    rotationStatus: record.rotation_status,
    lastRotatedAt: record.last_rotated_at ? new Date(record.last_rotated_at) : undefined,
    nextRotationAt: record.next_rotation_at ? new Date(record.next_rotation_at) : undefined,
    rotationFailureCount: record.rotation_failure_count,
    lastRotationError: record.last_rotation_error,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

/**
 * Convert webhook secret from database format to TypeScript format
 */
export function mapWebhookSecretFromDb(record: WebhookSecretRecord): WebhookSecret {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    secretActive: record.secret_active,
    secretPrevious: record.secret_previous,
    rotatedAt: new Date(record.rotated_at),
    rotationInitiatedBy: record.rotation_initiated_by,
    rotationReason: record.rotation_reason,
    nextRotationAt: new Date(record.next_rotation_at),
    gracePeriodEndsAt: record.grace_period_ends_at ? new Date(record.grace_period_ends_at) : undefined,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

/**
 * Convert DLQ entry from database format to TypeScript format
 */
export function mapDLQEntryFromDb(record: WebhookDLQRecord): WebhookDLQEntry {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    webhookUrl: record.webhook_url,
    httpMethod: record.http_method,
    payload: record.payload,
    headers: record.headers,
    errorMessage: record.error_message,
    errorCode: record.error_code,
    errorStack: record.error_stack,
    attemptCount: record.attempt_count,
    maxAttempts: record.max_attempts,
    firstAttemptAt: new Date(record.first_attempt_at),
    lastAttemptAt: record.last_attempt_at ? new Date(record.last_attempt_at) : undefined,
    nextRetryAt: record.next_retry_at ? new Date(record.next_retry_at) : undefined,
    status: record.status,
    resolvedAt: record.resolved_at ? new Date(record.resolved_at) : undefined,
    abandonedAt: record.abandoned_at ? new Date(record.abandoned_at) : undefined,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}
