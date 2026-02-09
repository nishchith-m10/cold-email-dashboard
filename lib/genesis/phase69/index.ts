/**
 * PHASE 69: CREDENTIAL ROTATION & WEBHOOK SECURITY - BARREL EXPORT
 * 
 * Central export file for all Phase 69 services and types.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69
 */

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  // Credential types
  CredentialType,
  CredentialRotationStatus,
  RotationReason,
  OAuthFailureType,
  CredentialRecord,
  Credential,
  OAuthRefreshResponse,
  CredentialRotationResult,
  CredentialRotationAuditRecord,
  
  // Webhook signature types
  WebhookSignatureHeaders,
  WebhookVerificationResult,
  WebhookVerificationError,
  WebhookSecretRecord,
  WebhookSecret,
  WebhookSecretRotationRequest,
  
  // DLQ types
  DLQStatus,
  WebhookDLQRecord,
  WebhookDLQEntry,
  WebhookDeliveryFailure,
  DLQRetryResult,
  DLQRetryBatchResult,
  
  // Request ID types
  WebhookRequestIdRecord,
  RequestIdCheckResult,
  
  // Notification types
  CredentialFailureNotification,
} from './types';

// Mapper functions
export {
  mapCredentialFromDb,
  mapWebhookSecretFromDb,
  mapDLQEntryFromDb,
} from './types';

// ============================================
// WEBHOOK SIGNATURE SERVICE
// ============================================

export {
  generateWebhookSignature,
  generateWebhookHeaders,
  verifyWebhookSignature,
  extractWebhookHeaders,
  verifyWebhookRequest,
  isTimestampValid,
  getVerificationErrorMessage,
} from './webhook-signature-service';

// ============================================
// REQUEST ID DEDUPLICATION
// ============================================

export {
  checkRequestIdDuplicate,
  requestIdExists,
  cleanOldRequestIds,
  getRequestIdStats,
  clearAllRequestIds,
} from './request-id-deduplicator';

// ============================================
// WEBHOOK DLQ SERVICE
// ============================================

export {
  addToDLQ,
  getDLQEntriesForRetry,
  getDLQEntry,
  getDLQEntriesForWorkspace,
  retryWebhookDelivery,
  processDLQBatch,
  getDLQStats,
  cleanOldDLQEntries,
} from './webhook-dlq-service';

// ============================================
// OAUTH REFRESH HANDLER
// ============================================

export {
  refreshOAuthToken,
  rotateCredentialWithRetry,
  extractRefreshToken,
  buildUpdatedCredentialValue,
  calculateRotationDate,
  isExpiringSoon,
  isExpired,
} from './oauth-refresh-handler';

// ============================================
// CREDENTIAL ROTATION SERVICE
// ============================================

export {
  getExpiringCredentials,
  queueCredentialRotation,
  processCredentialRotation,
  queueExpiringCredentials,
} from './credential-rotation-service';

// ============================================
// WEBHOOK SECRET ROTATION SERVICE
// ============================================

export {
  generateWebhookSecret,
  getWebhookSecret,
  initializeWebhookSecret,
  rotateWebhookSecret,
  cleanupExpiredPreviousSecrets,
  getSecretsNeedingRotation,
  rotateScheduledSecrets,
} from './webhook-secret-rotation-service';
