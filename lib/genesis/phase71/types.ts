/**
 * GENESIS PHASE 71: API HEALTH MONITOR TYPES
 *
 * Type definitions for comprehensive API health monitoring,
 * validation, and alerting system.
 */

// ============================================
// HEALTH CHECK CORE TYPES
// ============================================

export type HealthStatus = 'ok' | 'degraded' | 'error';

export type ServiceCategory = 'ai' | 'integration' | 'infrastructure' | 'email';

export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface HealthCheckResult {
  status: HealthStatus;
  latencyMs?: number;
  quotaUsed?: number;
  quotaLimit?: number;
  message?: string;
  error?: string;
  expiresAt?: Date;
  checkedAt: string;
}

export interface HealthCheck {
  id: string;
  name: string;
  category: ServiceCategory;
  criticalLevel: CriticalityLevel;
  fixPath: string;
  check: () => Promise<HealthCheckResult>;
  enabled: boolean;
  timeoutMs: number;
}

// ============================================
// HEALTH REPORT TYPES
// ============================================

export interface ServiceHealth {
  id: string;
  name: string;
  category: ServiceCategory;
  criticalLevel: CriticalityLevel;
  status: HealthStatus;
  result: HealthCheckResult;
  fixPath: string;
}

export interface HealthReport {
  id: string;
  timestamp: string;
  overallStatus: HealthStatus;
  services: ServiceHealth[];
  issueCount: number;
  degradedCount: number;
  errorCount: number;
  totalLatencyMs: number;
  slowestService?: string;
}

// ============================================
// DIAGNOSTIC TYPES
// ============================================

export interface DiagnosticStep {
  step: number;
  action: string;
  description: string;
  automated: boolean;
}

export interface DiagnosticGuide {
  serviceId: string;
  serviceName: string;
  issue: string;
  severity: CriticalityLevel;
  impact: string;
  diagnosticSteps: DiagnosticStep[];
  fixPath: string;
  estimatedFixTime: string;
  preventionTips: string[];
}

// ============================================
// ALERTING TYPES
// ============================================

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertChannel = 'email' | 'slack' | 'webhook';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  services: string[];
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: AlertCondition[];
  channels: AlertChannel[];
  cooldownMinutes: number;
  lastTriggeredAt?: string;
}

export interface AlertCondition {
  type: 'status' | 'latency' | 'quota' | 'consecutive_failures';
  operator: '=' | '>' | '<' | '>=' | '<=';
  value: string | number;
  durationMinutes?: number;
}

// ============================================
// STORAGE TYPES
// ============================================

export interface HealthSnapshot {
  id: string;
  timestamp: string;
  overall_status: HealthStatus;
  services: Record<string, HealthCheckResult>;
  issue_count: number;
  degraded_count: number;
  error_count: number;
  total_latency_ms: number;
  created_at: string;
}

export interface ServiceHistoryEntry {
  timestamp: string;
  status: HealthStatus;
  latency_ms: number;
  error?: string;
}

// ============================================
// QUOTA & LIMITS
// ============================================

export interface QuotaInfo {
  service: string;
  used: number;
  limit: number;
  percentage: number;
  resetAt?: Date;
  unit: 'requests' | 'tokens' | 'compute_units' | 'credits';
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface HealthMonitorConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  checkTimeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  storeHistoryDays: number;
  alertThresholds: {
    degradedServices: number;
    errorServices: number;
    consecutiveFailures: number;
  };
}

// ============================================
// API-SPECIFIC TYPES
// ============================================

export interface OpenAIHealthData {
  models_available: string[];
  rate_limit_remaining: number;
  rate_limit_reset: Date;
}

export interface RelevanceAIHealthData {
  agents_count: number;
  api_version: string;
}

export interface ApifyHealthData {
  compute_units_used: number;
  compute_units_limit: number;
  actors_count: number;
}

export interface GmailHealthData {
  token_valid: boolean;
  token_expires_at: Date;
  quota_remaining: number;
}

export interface DigitalOceanHealthData {
  accounts_total: number;
  accounts_active: number;
  accounts_failed: string[];
}

// ============================================
// CONSTANTS
// ============================================

export const HEALTH_CHECK_DEFAULTS = {
  CHECK_INTERVAL_MINUTES: 15,
  CHECK_TIMEOUT_MS: 30000,
  RETRY_COUNT: 2,
  RETRY_DELAY_MS: 1000,
  STORE_HISTORY_DAYS: 30,
  ALERT_COOLDOWN_MINUTES: 60,
} as const;

export const ALERT_THRESHOLDS = {
  DEGRADED_SERVICES: 2,
  ERROR_SERVICES: 1,
  CONSECUTIVE_FAILURES: 3,
  LATENCY_WARNING_MS: 5000,
  LATENCY_ERROR_MS: 15000,
  QUOTA_WARNING_PERCENT: 80,
  QUOTA_ERROR_PERCENT: 95,
} as const;

// ============================================
// ERROR CLASSES
// ============================================

export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly serviceId: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
}

export class HealthCheckTimeoutError extends HealthCheckError {
  constructor(serviceId: string, timeoutMs: number) {
    super(`Health check timed out after ${timeoutMs}ms`, serviceId);
    this.name = 'HealthCheckTimeoutError';
  }
}

export class AlertDeliveryError extends Error {
  constructor(
    message: string,
    public readonly channel: AlertChannel,
    public readonly alert: Alert,
  ) {
    super(message);
    this.name = 'AlertDeliveryError';
  }
}
