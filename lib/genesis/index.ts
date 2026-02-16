/**
 * GENESIS ENGINE - CENTRAL EXPORTS
 * 
 * Main export file for all Genesis modules (Phases 41, 42, 52, 53).
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md
 */

// ============================================
// PHASE 41: IGNITION ORCHESTRATOR
// ============================================

export {
  IgnitionOrchestrator,
  type IgnitionStateDB,
  MockIgnitionStateDB,
  type PartitionManager,
  MockPartitionManager,
  type DropletFactory,
  MockDropletFactory,
  type SidecarClient,
  MockSidecarClient,
  type WorkflowDeployer,
  MockWorkflowDeployer,
} from './ignition-orchestrator';

export type {
  IgnitionStatus,
  CredentialType,
  CredentialConfig,
  StoredCredential,
  IgnitionConfig,
  IgnitionState,
  IgnitionResult,
  IgnitionOperation,
  CreatedResources,
  RollbackResult,
  TemplateReference,
  IgnitionEvent,
  IgnitionProgressCallback,
} from './ignition-types';

export {
  IgnitionError,
  RollbackError,
  STEP_TIMEOUTS,
  DEFAULT_TEMPLATES,
} from './ignition-types';

export {
  CredentialVault,
  encryptCredential,
  decryptCredential,
  computeFingerprint,
  createCredentialVault,
  type CredentialVaultDB,
  MockCredentialVaultDB,
} from './credential-vault';

// ============================================
// PHASE 42: ATOMIC HANDSHAKE PROTOCOL
// ============================================

export {
  HandshakeService,
  createHandshakeService,
  buildHandshakeResponse,
  validateHandshakeRequest,
} from './handshake-service';

export {
  MockHandshakeDB,
} from './handshake-db-mock';

export {
  SecureTokenGenerator,
  MockTokenGenerator,
  hashToken,
  compareHashes,
  validateToken,
  validateTokenFormat,
  getTokenType,
  getTokenMetadata,
  calculateProvisioningTokenExpiry,
  calculateSidecarTokenExpiry,
  isTokenExpired,
  getTimeUntilExpiry,
  createTokenGenerator,
  TOKEN_PREFIXES,
} from './token-manager';

export type {
  HandshakeRequest,
  HandshakeResponse,
  HandshakeResult,
  SidecarConfig,
  ProvisioningToken,
  SidecarToken,
  HandshakeDB,
  TokenGenerator,
  HandshakeEvent,
  HandshakeEventCallback,
  TokenMetadata,
  DropletHealth,
  WorkspaceWebhook,
  TokenValidationResult,
  HandshakeAttempt,
  HandshakeServiceConfig,
  DropletStatus,
} from './handshake-types';

export {
  HandshakeErrorCode,
  DEFAULT_HANDSHAKE_CONFIG,
} from './handshake-types';

export {
  generateProvisioningTokenForIgnition,
  waitForHandshake,
  generateCloudInitEnvVars,
  generateHandshakeScript,
} from './phase41-integration';

// Helper functions for testing
import { SecureTokenGenerator as TokenGen, hashToken as hash, calculateProvisioningTokenExpiry as calcExpiry } from './token-manager';
import { MockHandshakeDB } from './handshake-db-mock';

export function createTestProvisioningToken(
  db: MockHandshakeDB,
  workspaceId: string
): { token: string; hash: string } {
  const generator = new TokenGen();
  const token = `prov_${generator.generateToken()}`;
  const tokenHash = hash(token);
  
  // Register in mock DB
  (db as any)['provisioningTokens'].set(tokenHash, {
    workspace_id: workspaceId,
    token_hash: tokenHash,
    expires_at: calcExpiry(),
    used_at: null,
    max_usage: 1,
    usage_count: 0,
  });
  
  return { token, hash: tokenHash };
}

// ============================================
// PHASE 52: BULLMQ EVENT BUS
// ============================================

export {
  QueueManager,
  getQueueManager,
  resetQueueManager,
  type JobOptions,
  type QueueInterface,
  type QueueJob,
  type QueueFactory,
} from './queue-manager';

export {
  GenesisWorker,
  WorkerRegistry,
  getWorkerRegistry,
  resetWorkerRegistry,
  type WorkerJob,
  type WorkerEvents,
  type WorkerInterface,
  type BullMQProcessor,
  type WorkerFactory,
  type GenesisWorkerConfig,
} from './worker-base';

export {
  ConcurrencyGovernor,
  getConcurrencyGovernor,
  resetConcurrencyGovernor,
} from './concurrency-governor';

export {
  DeadLetterQueueManager,
  DLQReplayManager,
  getDLQManager,
  resetDLQManager,
  DEFAULT_DLQ_CONFIG,
  type DLQConfig,
  type DLQStorage,
  type ReplayResult,
  type ReplayHandler,
} from './dead-letter-queue';

export {
  RedisConnectionManager,
  getConnectionManager,
  resetConnectionManager,
  buildRedisOptions,
  DEFAULT_REDIS_CONFIG,
  type RedisConnectionConfig,
  type RedisClient,
  type RedisClientFactory,
} from './redis-connection';

export type {
  QueueName,
  QueueConfig,
  JobResult,
  JobPayload,
  JobMetadata,
  DeadLetterEntry,
  GovernorConfig,
  BusEvent,
  WorkerStatus,
  JobProcessor,
} from './bullmq-types';

export {
  QueuePriority,
  QUEUE_NAMES,
  QUEUE_CONFIGS,
  DEFAULT_GOVERNOR_CONFIG,
} from './bullmq-types';

// ============================================
// PHASE 53: DYNAMIC UUID MAPPER
// ============================================

export {
  // Credential types
  type TemplateCredentialPlaceholder,
  type WorkspaceCredential,
  type CredentialMap,
  
  // Variable types
  type TemplateVariablePlaceholder,
  type VariableContext,
  type VariableMap,
  
  // Workflow types
  type N8nNode,
  type N8nWorkflow,
  
  // Template types
  type GoldenTemplate,
  type TemplateRequirements,
  
  // Result types
  type CredentialMappingResult,
  type VariableMappingResult,
  type MappingResult,
  type ValidationResult,
  type ValidationError,
  type NodeValidationResult,
  
  // Deployment types
  type WorkflowDeploymentRequest,
  type WorkflowDeploymentResult,
  type DeploymentLogEntry,
  
  // Options types
  type UUIDMapperOptions,
  type VariableMapperOptions,
  type ValidatorOptions,
  
  // Helper types
  type ReplacementOperation,
  type MappingStatistics,
  type CredentialDriftResult,
  type TemplateUsageStats,
  type TemplateSearchFilters,
} from './mapper-types';

// ============================================
// UUID MAPPER
// ============================================

export {
  UUIDMapper,
  mapWorkflowCredentials,
  validateCredentialMapping,
} from './uuid-mapper';

// ============================================
// VARIABLE MAPPER
// ============================================

export {
  VariableMapper,
  mapWorkflowVariables,
  validateVariableMapping,
  buildWorkspaceVariables,
  buildUserVariables,
  buildSystemVariables,
  buildVariableContext,
} from './variable-mapper';

// ============================================
// WORKFLOW VALIDATOR
// ============================================

export {
  WorkflowValidator,
  validateWorkflow,
  isWorkflowSafeForDeployment,
  getValidationSummary,
  DEFAULT_TEMPLATE_REQUIREMENTS,
} from './workflow-validator';

// ============================================
// TEMPLATE MANAGER
// ============================================

export {
  TemplateManager,
  getTemplateManager,
  resetTemplateManager,
  prepareTemplateDeployment,
  buildDeploymentContext,
} from './template-manager';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import type { N8nWorkflow as Workflow } from './mapper-types';
import { getTemplateManager as getManager } from './template-manager';

/**
 * All-in-one function to map and validate a workflow for deployment.
 * 
 * This is the recommended way to prepare workflows for deployment.
 */
export function mapAndValidateWorkflow(
  workflow: Workflow,
  credentialMap: Record<string, string>,
  variableMap: Record<string, string>,
  templateName?: string
): { success: boolean; workflow: Workflow; errors: string[]; warnings: string[] } {
  const manager = getManager();
  const result = manager.prepareDeployment(workflow, credentialMap, variableMap, templateName);

  return {
    success: result.success,
    workflow: result.workflow,
    errors: result.validation.errors.map((e: any) => e.message),
    warnings: result.validation.warnings.map((w: any) => w.message),
  };
}

/**
 * Check if a workflow is ready for deployment.
 */
export function isWorkflowReady(
  workflow: Workflow,
  credentialMap: Record<string, string>,
  variableMap: Record<string, string>,
  templateName?: string
): { ready: boolean; reason?: string } {
  const result = mapAndValidateWorkflow(workflow, credentialMap, variableMap, templateName);

  if (!result.success) {
    return {
      ready: false,
      reason: result.errors.join('; '),
    };
  }

  return { ready: true };
}

// ============================================
// PHASE 43: STATE RECONCILIATION WATCHDOG
// ============================================

export {
  StateReconciliationWatchdog,
  createWatchdogService,
  WatchdogError,
  MockWatchdogDB,
  MockN8nClient,
  createMockWatchdogDB,
  createMockN8nClient,
} from './phase43/index';

export type {
  // Core types
  DriftType,
  DriftSeverity,
  DriftResult,
  DriftDetectionResult,
  HealingResult,
  HealingStrategy,
  
  // Specific drift types
  OrphanWorkflow,
  OrphanDbRecord,
  StateMismatch,
  CredentialIssue,
  
  // Run types
  WatchdogRunConfig,
  WatchdogRunResult,
  WatchdogEvent,
  WatchdogTrigger,
  
  // Interface types
  WatchdogDB,
  N8nClient,
  WatchdogService,
} from './phase43/index';

export {
  // Constants
  DRIFT_SEVERITIES,
  AUTO_HEALABLE,
  HEALING_STRATEGIES,
  DEFAULT_WATCHDOG_CONFIG,
  WATCHDOG_INTERVAL_MS,
  MAX_HEALING_ATTEMPTS,
  HEALING_BACKOFF_MS,
} from './phase43/index';

// ============================================
// PHASE 54: HEARTBEAT STATE MACHINE
// ============================================

export {
  HeartbeatStateMachine,
  createHeartbeatService,
  HeartbeatError,
  MockHeartbeatDB,
  MockRemediationClient,
  createMockHeartbeatDB,
  createMockRemediationClient,
} from './phase54/index';

export type {
  HealthState,
  N8nStatus,
  HeartbeatPayload,
  HeartbeatRecord,
  DropletHealth as Phase54DropletHealth,
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
} from './phase54/index';

export {
  DEFAULT_HEALTH_THRESHOLDS,
  STATE_DESCRIPTIONS,
  TERMINAL_STATES,
  UNHEALTHY_STATES,
  REQUIRES_IMMEDIATE_ACTION,
  HEARTBEAT_INTERVAL_SECONDS,
  STALE_HEARTBEAT_THRESHOLD_SECONDS,
} from './phase54/index';

// ============================================
// PHASE 55: HIBERNATION & WAKE PHYSICS
// ============================================

export {
  HibernationManager,
  createHibernationService,
  HibernationError,
  MockHibernationDB,
  MockPowerClient,
  createMockHibernationDB,
  createMockPowerClient,
} from './phase55/index';

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
  MetricSnapshot as Phase55MetricSnapshot,
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
} from './phase55/index';

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
} from './phase55/index';

// ============================================
// PHASE 56: FLEET-WIDE TEMPLATE RECONCILIATION
// ============================================

export {
  TemplateReconciliationManager,
  createTemplateReconciliationService,
  TemplateError,
  MockTemplateDB,
  MockUpdateClient,
  createMockTemplateDB,
  createMockUpdateClient,
} from './phase56/index';

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
} from './phase56/index';

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
} from './phase56/index';

// ============================================
// PHASE 57: MANAGED VS. BYO SERVICE MATRIX
// ============================================

export {
  // Service Matrix
  SERVICE_MATRIX,
  SERVICE_MATRIX_MAP,
  getServiceById,
  queryServiceMatrix,
  getRequiredServices,
  getManagedServices,
  getBYOServices,
  getPerUseServices,
  validateServiceId,
  getServiceDisplayNames,
} from './phase57/service-matrix';

export {
  // Cost Allocation
  CostAllocationEngine,
  ServiceCostCalculator,
  CostFormatter,
} from './phase57/cost-allocation';

export type {
  ServiceCategory,
  CostBearer,
  BillingModel,
  FrictionLevel,
  ServiceDefinition,
  ServiceCostDetails,
  PricingTier,
  CostAllocation,
  ServiceMatrixFilters,
  WorkspaceServiceConfig,
  ServiceUsageEvent,
  MarginAnalysisReport,
} from './phase57/types';

export {
  DEFAULT_MARGIN_PERCENT,
  MIN_MARGIN_PERCENT,
  MAX_MARGIN_PERCENT,
  SERVICE_MATRIX_VERSION,
} from './phase57/types';

// ============================================
// PHASE 58: COMPREHENSIVE FINANCIAL CONTROL SYSTEM
// ============================================

export {
  // Wallet Core
  WalletManager,
  WalletValidator,
  
  // Transaction Manager
  TransactionManager,
  TransactionAnalytics,
  
  // Kill-Switch
  KillSwitchManager,
  PriorityBasedDisabler,
  
  // Auto-Topup
  AutoTopupManager,
  ScheduledTopupExecutor,
  TopupStrategyRecommender,
  
  // Budget Manager
  BudgetManager,
  
  // Analytics
  FinancialAnalytics,
  
  // Invoicing
  InvoiceGenerator,
  
  // Audit Logger
  AuditLogger,
  ReconciliationEngine,
  
  // Payment Manager
  PaymentMethodManager,
  
  // Mocks
  MockWalletDB,
  MockTransactionDB,
  MockBudgetDB,
  MockInvoiceDB,
  MockPaymentMethodDB,
  MockAuditLogDB,
} from './phase58';

export type {
  // Wallet Types
  WalletType,
  WalletStatus,
  Wallet,
  SpendingLimits,
  LimitAction,
  AlertConfiguration,
  AlertChannel,
  
  // Auto-Topup Types
  AutoTopupConfiguration,
  TopupStrategy,
  TopupStrategyConfig,
  FixedAmountConfig,
  PercentageConfig,
  PredictiveConfig,
  ScheduledConfig,
  UsageBasedConfig,
  TopupResult,
  
  // Transaction Types
  Transaction,
  TransactionType,
  TransactionCategory,
  TransactionDirection,
  TransactionStatus,
  TransactionMetadata,
  TransactionFilters,
  BatchTransactionRequest,
  
  // Kill-Switch Types
  KillSwitchMode,
  KillSwitchConfiguration,
  ServiceKillSwitchConfig,
  PreFlightCheckRequest,
  PreFlightCheckResult,
  
  // Budget Types
  Budget,
  BudgetPeriod,
  BudgetStatus,
  BudgetAlertConfig,
  
  // Analytics Types
  SpendingForecast,
  SpendingAnomaly,
  AnomalyType,
  AnomalySeverity,
  BurnRateAnalysis,
  ServiceSpendingBreakdown,
  ROIMetrics,
  
  // Invoicing Types
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  TaxConfiguration,
  DunningConfiguration,
  
  // Audit Types
  WalletAuditLog,
  AuditAction,
  AuditActor,
  WalletSnapshot,
  ReconciliationReport,
  ComplianceReport,
  
  // Payment Types
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodStatus,
  PaymentMethodLimits,
  PaymentMethodMetadata,
  PaymentResult,
  FallbackChain,
  
  // Database Interfaces
  WalletDB,
  TransactionDB,
  BudgetDB,
  InvoiceDB,
  PaymentMethodDB,
  AuditLogDB,
} from './phase58';

export {
  MIN_BALANCE_CENTS,
  DEFAULT_TOPUP_THRESHOLD_CENTS,
  DEFAULT_GRACE_PERIOD_SECONDS,
  MAX_TOPUP_PER_MONTH_CENTS,
  DEFAULT_TAX_RATE,
  INVOICE_DUE_DAYS,
  MAX_RESERVED_PERCENTAGE,
} from './phase58';

// ============================================
// PHASE 59: COST MODEL & RATE LIMIT ORCHESTRATION
// ============================================

export {
  // Cost Ledger
  CostLedgerManager,
  CostValidator,
  
  // Margin Analyzer
  MarginAnalyzer,
  MarginReportFormatter,
  
  // Rate Limit Manager
  RateLimitManager,
  RateLimitError,
  TokenBucket,
  RateLimitQueueManager,
  RateLimitAnalytics,
  
  // Mocks
  MockCostLedgerDB,
  MockRateLimitStore,
  TestDataFactory,
} from './phase59';

export type {
  // Cost Types
  CostCategory,
  CostSource,
  CostEntry,
  RevenueEntry,
  RevenueSource,
  
  // Margin Types
  MarginReport,
  MarginRevenueBreakdown,
  MarginCostBreakdown,
  MarginCalculations,
  BreakEvenAnalysis,
  
  // Rate Limit Types
  RateLimitService,
  RateLimitConfig,
  RateLimitState,
  RateLimitCheckResult,
  RateLimitRequest,
  RateLimitOverrideToken,
  RateLimitRejectionReason,
  RateLimitQuota,
  RateLimitWindowType,
  RateLimitEnforcementStrategy,
  RateLimitConfigMetadata,
  
  // Database Interfaces
  CostLedgerDB,
  RateLimitStore,
} from './phase59';

export {
  DEFAULT_RATE_LIMITS,
  SHARED_OVERHEAD_ALLOCATION,
} from './phase59';

// ============================================
// PHASE 60: APPLICATION LAYER ARCHITECTURE
// ============================================

export {
  OnboardingStateMachine,
  RoutingManager,
  SetupStateManager,
} from './phase60';

export type {
  OnboardingStage,
  WorkspaceOnboardingState,
  StateTransitionResult,
  RoutingDecision,
  OnboardingProgress,
  SetupCompletionEvent,
  CampaignEnablementEvent,
} from './phase60';

export {
  ONBOARDING_STAGES,
  ApplicationLayer,
} from './phase60';

// ============================================
// PHASE 60.A: RISK-BASED WARNING SYSTEM
// ============================================

export {
  EmailDomainProvider,
  IPReputationProvider,
  SignupFrequencyProvider,
  TierAppropriatenessProvider,
  CredentialValidationProvider,
  RegionMismatchProvider,
  RiskScoringEngine,
} from './phase60a';

export type {
  RiskLevel,
  AdminAction,
  RiskSignals,
  RiskScore,
  RiskAssessmentContext,
  RiskAssessmentResult,
  SignalProviderResult,
  HighRiskNotification,
  RiskThresholds,
} from './phase60a';

export {
  RISK_SCORES,
  DEFAULT_RISK_THRESHOLDS,
  calculateRiskLevel,
  shouldNotifyAdmin,
} from './phase60a';

// ============================================
// PHASE 60.B: GENESIS GATEWAY STREAMLINED ONBOARDING
// ============================================

export {
  BrandStageValidator,
  EmailStageValidator,
  AIKeysStageValidator,
  RegionStageValidator,
  IgniteStageValidator,
  OnboardingFlowManager,
} from './phase60b';

export type {
  AccountStageData,
  BrandStageData,
  EmailStageData,
  AIKeysStageData,
  RegionStageData,
  IgniteStageData,
  OnboardingData,
  StageValidationResult,
  StageCompletionResult,
  OnboardingProgressSummary,
} from './phase60b';

export { STAGE_DURATIONS } from './phase60b';

// ============================================
// PHASE 60.C: ADMIN NOTIFICATION SYSTEM
// ============================================

export {
  GmailTemplates,
  TelegramTemplates,
  GmailChannel,
  TelegramChannel,
  MockNotificationChannel,
  NotificationDispatcher,
} from './phase60c';

export type {
  NotificationChannel,
  NotificationEventType,
  NotificationPayload,
  ClientFirstLoginPayload,
  DropletReadyPayload,
  HighRiskSignupPayload,
  NewCampaignPayload,
  IgnitionFailedPayload,
  SetupNotReviewedPayload,
  AnyNotificationPayload,
  NotificationRequest,
  ChannelSendResult,
  NotificationSendResult,
  NotificationLogEntry,
  RetryConfig,
  EscalationConfig,
  NotificationTemplate,
  INotificationChannel,
  GmailChannelConfig,
  TelegramChannelConfig,
} from './phase60c';

export {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_ESCALATION_CONFIG,
} from './phase60c';

// ============================================
// PHASE 60.D: N8N AUTHENTICATION & ACCESS CONTROL
// ============================================

export {
  CredentialGenerator,
  N8nAdminAccessManager,
  N8nConfigGenerator,
} from './phase60d';

export type {
  N8nOwnerCredentials,
  N8nEnvironmentConfig,
  N8nOwnerAccountStatus,
  N8nAdminAccess,
  EncryptedN8nCredentials,
  PasswordGenerationOptions,
} from './phase60d';

export { DEFAULT_N8N_PASSWORD_OPTIONS } from './phase60d';

// ============================================
// PHASE 61: CAMPAIGN ARCHITECTURE & OPERATIONS
// ============================================

export {
  CampaignStatusMachine,
  CampaignManager,
} from './phase61';

export type {
  CampaignStatus,
  CampaignTier,
  CampaignLimits,
  Campaign,
  CreateCampaignRequest,
  CreateCampaignResult,
  CampaignStatusTransition,
  CampaignStats,
} from './phase61';

export {
  CAMPAIGN_TIER_LIMITS,
  CAMPAIGN_STATUS_TRANSITIONS,
} from './phase61';

// ============================================
// PHASE 61.A: CAMPAIGN CREATION FLOW
// ============================================

export {
  CampaignCreationWizard,
} from './phase61a';

export type {
  CampaignCreationType,
  CampaignCreationStep,
  CampaignCreationState,
  CampaignNameStepData,
  LeadsStepData,
  PersonalizationStepData,
  ReviewStepData,
  StepValidationResult,
  StepCompletionResult,
  CampaignCreationProgress,
} from './phase61a';

export {
  PRODUCTION_READY_STEP_TRANSITIONS,
  STEP_DURATIONS,
} from './phase61a';

// ============================================
// PHASE 61.B: CSV LEAD IMPORT SYSTEM
// ============================================

export {
  CsvParser,
  CsvValidator,
  CsvImporter,
} from './phase61b';

export type {
  CsvLeadColumns,
  CsvRow,
  ValidatedLead,
  ImportValidationError,
  CsvImportRequest,
  CsvImportResult,
  ImportStats,
  CsvParseOptions,
  CsvValidationResult,
} from './phase61b';

export {
  REQUIRED_CSV_COLUMNS,
  OPTIONAL_CSV_COLUMNS,
  ALL_CSV_COLUMNS,
  MAX_CSV_ROWS,
  MAX_CSV_FILE_SIZE_BYTES,
} from './phase61b';

// ============================================
// PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
// ============================================

export {
  WorkflowNamer,
  WorkflowCloner,
  WorkflowQueryGenerator,
} from './phase61c';

export type {
  WorkflowType,
  N8nWorkflow as Phase61cN8nWorkflow,
  N8nNode as Phase61cN8nNode,
  CampaignWorkflowSet,
  CampaignWorkflow,
  CampaignCloneRequest,
  CampaignCloneResponse,
  WorkflowReplacementContext,
  WorkflowQueryParams,
} from './phase61c';

export {
  ALL_WORKFLOW_TYPES,
  WORKFLOW_TYPE_NAMES,
  MAX_WORKFLOWS_PER_CAMPAIGN,
  MAX_CAMPAIGNS_BEFORE_WARNING,
  MAX_CAMPAIGNS_PER_WORKSPACE,
} from './phase61c';

// ============================================
// PHASE 62.A: PAYMENT-FIRST MODEL
// ============================================

export {
  WalletBalanceChecker,
  CostBreakdownCalculator,
} from './phase62a';

export type {
  WalletState,
  WalletBalance,
  IgnitionValidation,
  CostItem,
  CostBreakdown,
  WalletTransactionType,
  WalletTransaction,
} from './phase62a';

export {
  MINIMUM_IGNITION_BALANCE,
  LOW_BALANCE_WARNING,
  HEALTHY_BALANCE,
  DROPLET_MONTHLY_COST,
  AI_USAGE_MIN,
  AI_USAGE_MAX,
  AI_USAGE_AVERAGE,
} from './phase62a';

// ============================================
// PHASE 62.B: ONBOARDING RATE LIMITING
// ============================================

export {
  RateLimitKeyGenerator,
  RateLimitChecker,
} from './phase62b';

export type {
  RateLimitScope,
  RateLimitWindow,
  RateLimitType,
  RateLimitConfig as Phase62bRateLimitConfig,
  RateLimitCheckRequest,
  RateLimitCheckResult as Phase62bRateLimitCheckResult,
  RateLimitCounter,
  RateLimitEnforcementResult,
} from './phase62b';

export {
  RATE_LIMIT_CONFIGS,
} from './phase62b';

// ============================================
// PHASE 63: ADMIN ONBOARDING QUEUE & TRACKING
// ============================================

export {
  ChecklistManager,
  ChecklistProgressTracker,
} from './phase63';

export {
  CHECKLIST_ITEMS,
  getChecklistItemsByCategory,
  getItemsByDetection,
  getPerCampaignItems,
  getTotalItemCount,
  getItemById,
} from './phase63';

export type {
  ChecklistCategory,
  DetectionMethod,
  ChecklistItemStatus,
  ChecklistItemDef,
  ChecklistItem,
  ChecklistProgress,
  CategoryProgress,
  SetupTimeLog,
  AdminQueueItem,
  ChecklistUpdateRequest,
  AutoDetectionResult,
} from './phase63';

export {
  CATEGORY_NAMES,
  CATEGORY_TIME_ESTIMATES,
} from './phase63';

// ============================================
// PHASE 64: GENESIS GATEWAY OAUTH PROXY
// ============================================

export {
  EncryptionService,
  CredentialVaultService,
  CredentialValidationService,
  GmailOAuthService,
  OAuthStateManager,
  DropletConfigurationService,
  OnboardingProgressService as Phase64OnboardingProgressService,
  BrandVaultService,
  GMAIL_OAUTH_CONFIG,
  DROPLET_REGIONS,
  DROPLET_SIZES,
  DEFAULT_REGION,
  DEFAULT_SIZE,
  ONBOARDING_STAGES as GENESIS_ONBOARDING_STAGES,
  STAGE_INFO as GENESIS_STAGE_INFO,
} from './phase64';

export type {
  CredentialType as Phase64CredentialType,
  CredentialStatus,
  Credential,
  OAuthCredential,
  ApiKeyCredential,
  CalendlyCredential,
  ValidationResult as CredentialValidationResult,
  OAuthConfig,
  OAuthTokenResponse,
  OAuthState,
  DropletRegion,
  DropletSize,
  DropletRegionInfo,
  DropletSizeInfo,
  WorkspaceInfrastructureConfig,
  OnboardingStage as GenesisOnboardingStage,
  OnboardingProgress as GenesisOnboardingProgress,
  BrandInfo,
  ApifyMode,
} from './phase64';

// ============================================
// PHASE 64.B: EMAIL PROVIDER ABSTRACTION
// ============================================

export {
  EmailProviderValidator,
  EmailProviderService,
} from './phase64b';

export type {
  EmailProvider,
  SMTPEncryption,
  BaseEmailConfig,
  GmailConfig,
  SMTPConfig,
  SendGridConfig,
  MailgunConfig,
  SESConfig,
  PostmarkConfig,
  EmailProviderConfig,
  SaveEmailConfigRequest,
  DecryptedEmailConfig,
  TestEmailRequest,
  TestEmailResponse,
  ValidationResult as EmailValidationResult,
  IEmailProviderService,
  IEmailProviderValidator,
  EmailProviderConfigRow,
} from './phase64b/email-provider-types';

export {
  DEFAULT_SMTP_PORTS,
  PROVIDER_DAILY_LIMITS,
  EMAIL_REGEX,
  PROVIDER_NAMES,
} from './phase64b/email-provider-types';

// ============================================
// PHASE 44: "GOD MODE" COMMAND & CONTROL
// ============================================

export {
  // Services
  ScaleHealthService,
  AlertRoutingService,
  MetricAggregatorService,
  BulkUpdateService,
  BulkUpdateError,
  
  // Defaults
  defaultEmailTransport,
  defaultTelegramTransport,
  defaultTokenValidator,
  
  // Mappers
  mapScaleAlertRow,
  mapScaleMetricRow,
  mapAlertHistoryRow,
} from './phase44';

export type {
  // Core types
  AlertSeverity,
  AlertStatus,
  ScaleCheckType,
  HealthCheckResult,
  ScaleHealthSummary,
  ScaleAlert,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  ScaleMetricSnapshot,
  MetricTrend,
  AlertChannel as Phase44AlertChannel,
  AlertPreferences,
  AlertHistoryEntry,
  AlertDeliveryResult,
  SidecarMetricReport,
  TenantMetricSnapshot,
  PlatformMetrics,
  BulkUpdateConfig,
  BulkUpdateStatus,
  BulkUpdateJob,
  GodModeTab,
  FleetOverview,
  WorkspaceHealthRow,
  
  // API response shapes
  ScaleHealthApiResponse,
  ScaleAlertsApiResponse,
  ScaleHistoryApiResponse,
  RunChecksApiResponse,
  AlertActionApiResponse,
  
  // DB interfaces
  ScaleHealthDB,
  AlertRoutingConfig,
  AlertRoutingDB,
  EmailTransport,
  TelegramTransport,
  MetricAggregatorDB,
  SidecarTokenValidator,
  BulkUpdateDB,
  BulkUpdateEvent,
  BulkUpdateEventCallback,
  BulkUpdateErrorCode,
} from './phase44';

// ============================================
// PHASE 45: SANDBOX & SIMULATION ENGINE
// ============================================

export {
  // Services
  ExecutionEventService,
  PiiSanitizer,
  createPiiSanitizer,
  SandboxRateLimiter,
  InMemoryRateLimitDB,
  createSupabaseRateLimitDB,
  WorkflowTriggerService,
  HttpSidecarClient,
  WorkflowTriggerError,
  MockWorkspaceLookupDB,
  MockSidecarClient as Phase45MockSidecarClient,
  
  // Mock n8n
  executeMockWorkflow,
  getMockResponseFn,
  getSupportedMockNodeTypes,
  
  // Mappers + Constants
  mapExecutionEventRow,
  mapSandboxTestRunRow,
  DEFAULT_PII_FIELDS,
  DEFAULT_PII_CONFIG,
  SANDBOX_RATE_LIMIT,
} from './phase45';

export type {
  // Core types
  NodeExecutionStatus,
  WorkflowType as Phase45WorkflowType,
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
  
  // API response shapes
  ExecutionStreamResponse,
  TestCampaignApiResponse,
  ExecutionEventApiResponse,
  SandboxHistoryApiResponse,
  ExecutionDetailApiResponse,
  
  // DB interfaces
  ExecutionEventDB,
  SandboxRateLimitDB,
  WorkspaceLookupDB,
  Phase45SidecarClient,
  WorkflowTriggerErrorCode,
} from './phase45';

// ============================================
// PHASE 46: SHADOW MIGRATION & PARITY TESTING
// ============================================

export {
  // Types
  type MigrationStatus,
  type MigrationState as Phase46MigrationState,
  type MigrationStateRow,
  type CreateMigrationInput,
  type DualWriteConfig,
  type DualWriteResult,
  type DualWriteOperation,
  type DualWriteEvent,
  type BackfillConfig,
  type BackfillProgress,
  type BackfillResult,
  type BackfillBatchResult,
  type BackfillError as Phase46BackfillError,
  type ParityCheckConfig,
  type ParityCheckResult,
  type ParityMismatch,
  type CutoverPhase,
  type CutoverState,
  type CutoverStep,
  type CutoverPreCheck,
  type CutoverResult,
  type RollbackResult as Phase46RollbackResult,
  type MigrationEventType,
  type MigrationEvent,
  type MigrationDB,

  // Constants
  VALID_TRANSITIONS,
  DEFAULT_COMPARE_FIELDS,
  PARITY_THRESHOLDS,
  MIGRATION_DEFAULTS,
  isValidTransition,
  migrationStateRowToModel,
  modelToMigrationStateRow,

  // Services
  MigrationStateManager,
  MigrationStateError,
  DualWriteService,
  DualWriteServiceError,
  BackfillEngine,
  BackfillEngineError,
  ParityChecker,
  ParityCheckerError,
  CutoverManager,
  CutoverError,
  MigrationOrchestrator,
  MigrationOrchestratorError,
  type MigrationSummary,

  // Mocks
  MockMigrationDB,
  generateTestLeads,
} from './phase46';

// ============================================
// PHASE 47: HYPER-SCALE STRESS TEST & RED-TEAMING
// ============================================

export {
  // Types
  type LoadTestScenarioType,
  type LoadTestStage,
  type LoadTestScenario,
  type LoadTestThresholds,
  type LoadTestConfig,
  type LoadTestEndpoint,
  type LoadTestResult,
  type LatencyMetrics as Phase47LatencyMetrics,
  type ThroughputMetrics,
  type ThresholdViolation,
  type SecurityTestCategory,
  type SecuritySeverity,
  type SecurityTestCase,
  type SecurityAttack,
  type SecurityExpectedOutcome,
  type SecurityTestResult,
  type SecurityAuditReport,
  type SecuritySummary,
  type ChaosExperimentType,
  type ChaosExperiment,
  type ChaosConfig as Phase47ChaosConfig,
  type SteadyStateCheck,
  type ChaosRollback,
  type ChaosExperimentResult,
  type ChaosImpactMetrics,
  type BenchmarkConfig as Phase47BenchmarkConfig,
  type BenchmarkResult as Phase47BenchmarkResult,
  type BenchmarkSuite,
  type BenchmarkSuiteResult,
  type BenchmarkComparison,
  type StressTestPhase,
  type StressTestPlan,
  type StressTestReport,
  type StressTestEnvironment,
  type SimulatedResponse,
  type SimulatedQueryResult,
  type EnvironmentMetrics,

  // Constants
  LOAD_TEST_DEFAULTS,
  SECURITY_THRESHOLDS as PHASE47_SECURITY_THRESHOLDS,
  BENCHMARK_DEFAULTS,
  CHAOS_DEFAULTS,
  calculateLatencyMetrics,
  calculateErrorRate,
  checkThreshold,

  // Services
  LoadTestRunner,
  LoadTestConfigError,
  createSmokeScenario,
  createLoadScenario,
  createStressScenario,
  createSpikeScenario,
  getDefaultEndpoints,
  createDefaultLoadTestConfig,
  validateLoadTestConfig,
  SecurityTestRunner,
  SecurityTestError,
  getDefaultSecurityTests,
  ChaosEngine,
  ChaosEngineError,
  getDefaultChaosExperiments,
  BenchmarkRunner,
  BenchmarkError as Phase47BenchmarkError,
  createApiBenchmarkSuite,
  createDatabaseBenchmarkSuite,
  StressTestOrchestrator,
  StressTestOrchestratorError,

  // Mock
  MockTestEnvironment,
} from './phase47';

// ============================================
// PHASE 48: PRODUCTION CUTOVER & REVERT PROTOCOL
// ============================================

export {
  // Types
  type DeploymentSlot,
  type DeploymentStatus,
  type DeploymentState as Phase48DeploymentState,
  type DeploymentEvent as Phase48DeploymentEvent,
  type DeploymentEventType,
  type ReadinessCheckSeverity,
  type ReadinessCheckCategory,
  type ReadinessCheck,
  type ReadinessCheckResult,
  type ReadinessReport,
  type CanaryConfig,
  type CanaryState,
  type RevertTriggerType,
  type RevertTriggerConfig,
  type RevertTriggerState,
  type RevertResult as Phase48RevertResult,
  type CutoverPhaseType as Phase48CutoverPhaseType,
  type CutoverPlan as Phase48CutoverPlan,
  type CutoverProgress,
  type CutoverResult as Phase48CutoverResult,
  type DeploymentEnvironment,

  // Constants
  DEFAULT_CANARY_CONFIG as Phase48DefaultCanaryConfig,
  DEFAULT_REVERT_TRIGGERS,
  DEPLOYMENT_DEFAULTS,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
  generateEventId,
  generateDeploymentId,

  // Services
  LaunchReadinessEngine,
  LaunchReadinessError,
  getDefaultReadinessChecks,
  DeploymentController,
  DeploymentControllerError,
  InstantRevertManager,
  InstantRevertError,
  CutoverOrchestrator as Phase48CutoverOrchestrator,
  CutoverOrchestratorError as Phase48CutoverOrchestratorError,

  // Mock
  MockDeploymentEnvironment,
} from './phase48';

// ============================================
// PHASE 70: DISASTER RECOVERY & REGIONAL FAILOVER
// ============================================

export {
  // Types
  type FailureMode,
  type FailureModeDefinition,
  type DORegion,
  type RegionMapping,
  type SnapshotType,
  type SnapshotStatus,
  type SnapshotConfig,
  type Snapshot as Phase70Snapshot,
  type SnapshotRecord,
  type RestorationPhase,
  type RestorationPriority,
  type RestorationTask,
  type RestorationPlan,
  type RestorationProgress,
  type RestorationResult as Phase70RestorationResult,
  type FailoverTriggerType,
  type FailoverTrigger,
  type HeartbeatStatus,
  type FailoverEvent as Phase70FailoverEvent,
  type GarbageCategory,
  type GarbageCollectionConfig,
  type OrphanedSnapshot,
  type GarbageCollectionResult,
  type DisasterRecoveryEnvironment,

  // Constants
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
  generateTaskId as Phase70GenerateTaskId,
  generatePlanId as Phase70GeneratePlanId,
  generateEventId as Phase70GenerateEventId,

  // Services
  SnapshotManager,
  SnapshotManagerError,
  FailoverDetector,
  FailoverDetectorError,
  RestorationOrchestrator as Phase70RestorationOrchestrator,
  RestorationOrchestratorError as Phase70RestorationOrchestratorError,
  DisasterRecoveryController,
  DisasterRecoveryControllerError,

  // DigitalOcean API Client (production)
  DOClient,
  createDOClient,

  // Mock (testing only)
  MockDOEnvironment,
} from './phase70';
