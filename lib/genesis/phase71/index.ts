/**
 * GENESIS PHASE 71: API HEALTH MONITOR & SANITY CHECK
 *
 * Centralised API health monitoring with automatic checks, diagnostics,
 * and alerting for all external service dependencies.
 */

// Core services
export { CheckRegistry, createDefaultRegistry } from './check-registry';
export { HealthRunner } from './health-runner';
export { DiagnosticEngine } from './diagnostic-engine';
export { AlertManager } from './alert-manager';
export {
  HealthCheckScheduler,
  InMemoryHealthStore,
} from './health-scheduler';

// Health checks
export { openAIHealthCheck } from './checks/openai';
export { anthropicHealthCheck } from './checks/anthropic';
export { relevanceAIHealthCheck } from './checks/relevance-ai';
export { apifyHealthCheck } from './checks/apify';
export { googleCSEHealthCheck } from './checks/google-cse';
export { gmailHealthCheck } from './checks/gmail';
export { digitalOceanHealthCheck } from './checks/digitalocean';
export { supabaseHealthCheck } from './checks/supabase';
export { redisHealthCheck } from './checks/redis';

// Types
export type {
  HealthStatus,
  ServiceCategory,
  CriticalityLevel,
  HealthCheckResult,
  HealthCheck,
  ServiceHealth,
  HealthReport,
  DiagnosticStep,
  DiagnosticGuide,
  AlertSeverity,
  AlertChannel,
  Alert,
  AlertRule,
  AlertCondition,
  HealthSnapshot,
  ServiceHistoryEntry,
  QuotaInfo,
  HealthMonitorConfig,
} from './types';

// Error classes
export {
  HealthCheckError,
  HealthCheckTimeoutError,
  AlertDeliveryError,
} from './types';

// Constants
export { HEALTH_CHECK_DEFAULTS, ALERT_THRESHOLDS } from './types';

// Storage interface
export type { HealthSnapshotStore } from './health-scheduler';

// Alert dispatcher interface
export type { AlertDispatcher } from './alert-manager';
