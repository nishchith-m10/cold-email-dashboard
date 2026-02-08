/**
 * PHASE 44: "GOD MODE" COMMAND & CONTROL
 * 
 * Type definitions for Scale Health Monitoring, Alert Routing,
 * Metric Aggregation, and Bulk Update Engine.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md (Phase 44)
 */

// ============================================
// SCALE HEALTH TYPES
// ============================================

/** Alert severity levels matching the threshold matrix */
export type AlertSeverity = 'GREEN' | 'YELLOW' | 'RED';

/** Alert status lifecycle */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'ignored';

/** Types of scale health checks */
export type ScaleCheckType =
  | 'partition_count'
  | 'largest_partition'
  | 'query_latency'
  | 'do_account_capacity'
  | 'storage_growth'
  | 'oversized_partitions'
  | 'wallet_balance'
  | 'snapshot_garbage';

/** Result of a single health check function */
export interface HealthCheckResult {
  metric: string;
  currentValue: number | string | null;
  thresholdYellow: number | string;
  thresholdRed: number | string;
  status: AlertSeverity;
  runwayDays: number | null;
  details?: Record<string, unknown>;
}

/** Aggregated result from running all health checks */
export interface ScaleHealthSummary {
  overallStatus: AlertSeverity;
  lastCheckAt: string;
  checks: HealthCheckResult[];
  activeAlertCount: number;
  yellowCount: number;
  redCount: number;
}

// ============================================
// SCALE ALERTS
// ============================================

/** A scale alert record (maps to genesis.scale_alerts table) */
export interface ScaleAlert {
  id: string;
  alertType: ScaleCheckType;
  severity: AlertSeverity;
  metricName: string;
  currentValue: string;
  thresholdValue: string;
  runwayDays: number | null;
  workspaceId: string | null;
  partitionName: string | null;
  recommendation: string;
  remediationLink: string | null;
  status: AlertStatus;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for acknowledging an alert */
export interface AcknowledgeAlertRequest {
  alertId: string;
  userId: string;
}

/** Payload for resolving an alert */
export interface ResolveAlertRequest {
  alertId: string;
  userId: string;
  resolutionNotes: string;
}

// ============================================
// SCALE METRICS HISTORY
// ============================================

/** A daily metrics snapshot (maps to genesis.scale_metrics table) */
export interface ScaleMetricSnapshot {
  id: string;
  metricDate: string;
  partitionCount: number;
  largestPartitionRows: number | null;
  largestPartitionName: string | null;
  avgPartitionRows: number | null;
  totalSizeGb: number | null;
  indexSizeGb: number | null;
  tableSizeGb: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  slowQueryCount: number | null;
  totalDoAccounts: number | null;
  totalDropletCapacity: number | null;
  totalDropletsActive: number | null;
  doUtilizationPct: number | null;
  totalWalletBalanceUsd: number | null;
  dailyWalletBurnUsd: number | null;
  createdAt: string;
}

/** Trend data for a single metric over time */
export interface MetricTrend {
  metric: string;
  dataPoints: Array<{
    date: string;
    value: number | null;
  }>;
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat';
}

// ============================================
// ALERT ROUTING
// ============================================

/** Alert delivery channels */
export type AlertChannel = 'in_app' | 'email_urgent' | 'email_daily' | 'gmail' | 'telegram';

/** Alert notification preferences (maps to genesis.alert_preferences table) */
export interface AlertPreferences {
  id: string;
  adminUserId: string;
  enableEmail: boolean;
  enableTelegram: boolean;
  notifyYellow: boolean;
  notifyRed: boolean;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Alert history entry (maps to genesis.alert_history table) */
export interface AlertHistoryEntry {
  id: string;
  metric: string;
  level: AlertSeverity;
  message: string | null;
  channelsSent: string[];
  createdAt: string;
}

/** Result of sending an alert notification */
export interface AlertDeliveryResult {
  channel: AlertChannel;
  success: boolean;
  error?: string;
  messageId?: string;
}

// ============================================
// METRIC AGGREGATOR (Cross-Tenant Analytics)
// ============================================

/** Payload reported by a Sidecar every 15 minutes */
export interface SidecarMetricReport {
  workspaceId: string;
  sidecarToken: string;
  timestamp: string;
  metrics: {
    totalExecutions: number;
    successRate: number;
    avgDurationMs: number;
    emailSentCount: number;
    leadCountDelta: number;
    errorTypes: Record<string, number>;
  };
}

/** Per-tenant metric snapshot (maps to genesis.metric_snapshots) */
export interface TenantMetricSnapshot {
  id: string;
  workspaceId: string;
  reportedAt: string;
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  emailSentCount: number;
  leadCountDelta: number;
  errorTypes: Record<string, number>;
  createdAt: string;
}

/** Aggregated platform-wide metrics */
export interface PlatformMetrics {
  totalExecutionsToday: number;
  platformSuccessRate: number;
  avgExecutionTimeMs: number;
  emailsSentToday: number;
  activeCampaigns: number;
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  lastUpdated: string;
}

// ============================================
// BULK UPDATE ENGINE
// ============================================

/** Configuration for a fleet-wide bulk update job */
export interface BulkUpdateConfig {
  blueprintId: string;
  targetWorkspaceIds?: string[];
  rateLimit: number; // workspaces per minute
  canaryPercentage?: number;
  rollbackThreshold?: number; // failure % that halts the job
}

/** Status of a bulk update job */
export type BulkUpdateStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'halted'
  | 'cancelled'
  | 'failed';

/** A bulk update job record */
export interface BulkUpdateJob {
  id: string;
  config: BulkUpdateConfig;
  status: BulkUpdateStatus;
  totalWorkspaces: number;
  processedCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  haltReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// GOD MODE DASHBOARD (UI Types)
// ============================================

/** Tabs available in the God Mode admin dashboard */
export type GodModeTab =
  | 'fleet-overview'
  | 'scale-health'
  | 'alert-history'
  | 'bulk-update';

/** Fleet overview counts by health status */
export interface FleetOverview {
  totalWorkspaces: number;
  healthy: number;
  degraded: number;
  zombie: number;
  notProvisioned: number;
  frozen: number;
}

/** Workspace health row for the health heatmap */
export interface WorkspaceHealthRow {
  workspaceId: string;
  workspaceName: string;
  partitionName: string | null;
  leadCount: number | null;
  sizeBytes: number | null;
  campaignCount: number;
  activeWorkflows: number;
  healthStatus: 'healthy' | 'degraded' | 'not_provisioned';
}

// ============================================
// API RESPONSE SHAPES
// ============================================

export interface ScaleHealthApiResponse {
  success: true;
  summary: ScaleHealthSummary;
  fleetOverview: FleetOverview;
}

export interface ScaleAlertsApiResponse {
  success: true;
  alerts: ScaleAlert[];
  totalCount: number;
}

export interface ScaleHistoryApiResponse {
  success: true;
  snapshots: ScaleMetricSnapshot[];
  trends: MetricTrend[];
}

export interface RunChecksApiResponse {
  success: true;
  results: HealthCheckResult[];
  alertsCreated: number;
  durationMs: number;
}

export interface AlertActionApiResponse {
  success: true;
  alert: ScaleAlert;
}

// ============================================
// DATABASE ROW MAPPING HELPERS
// ============================================

/** Converts snake_case DB row to camelCase ScaleAlert */
export function mapScaleAlertRow(row: Record<string, unknown>): ScaleAlert {
  return {
    id: row.id as string,
    alertType: row.alert_type as ScaleCheckType,
    severity: row.severity as AlertSeverity,
    metricName: row.metric_name as string,
    currentValue: row.current_value as string,
    thresholdValue: row.threshold_value as string,
    runwayDays: row.runway_days as number | null,
    workspaceId: row.workspace_id as string | null,
    partitionName: row.partition_name as string | null,
    recommendation: row.recommendation as string,
    remediationLink: row.remediation_link as string | null,
    status: row.status as AlertStatus,
    acknowledgedAt: row.acknowledged_at as string | null,
    acknowledgedBy: row.acknowledged_by as string | null,
    resolvedAt: row.resolved_at as string | null,
    resolutionNotes: row.resolution_notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Converts snake_case DB row to camelCase ScaleMetricSnapshot */
export function mapScaleMetricRow(row: Record<string, unknown>): ScaleMetricSnapshot {
  return {
    id: row.id as string,
    metricDate: row.metric_date as string,
    partitionCount: row.partition_count as number,
    largestPartitionRows: row.largest_partition_rows as number | null,
    largestPartitionName: row.largest_partition_name as string | null,
    avgPartitionRows: row.avg_partition_rows as number | null,
    totalSizeGb: row.total_size_gb as number | null,
    indexSizeGb: row.index_size_gb as number | null,
    tableSizeGb: row.table_size_gb as number | null,
    p95LatencyMs: row.p95_latency_ms as number | null,
    p99LatencyMs: row.p99_latency_ms as number | null,
    slowQueryCount: row.slow_query_count as number | null,
    totalDoAccounts: row.total_do_accounts as number | null,
    totalDropletCapacity: row.total_droplet_capacity as number | null,
    totalDropletsActive: row.total_droplets_active as number | null,
    doUtilizationPct: row.do_utilization_pct as number | null,
    totalWalletBalanceUsd: row.total_wallet_balance_usd as number | null,
    dailyWalletBurnUsd: row.daily_wallet_burn_usd as number | null,
    createdAt: row.created_at as string,
  };
}

/** Converts snake_case DB row to camelCase AlertHistoryEntry */
export function mapAlertHistoryRow(row: Record<string, unknown>): AlertHistoryEntry {
  return {
    id: row.id as string,
    metric: row.metric as string,
    level: row.level as AlertSeverity,
    message: row.message as string | null,
    channelsSent: (row.channels_sent as string[]) || [],
    createdAt: row.created_at as string,
  };
}
