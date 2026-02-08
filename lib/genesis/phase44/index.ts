/**
 * PHASE 44: "GOD MODE" COMMAND & CONTROL
 * 
 * Barrel export for all Phase 44 modules.
 */

// Types
export type {
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
  AlertChannel,
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
  ScaleHealthApiResponse,
  ScaleAlertsApiResponse,
  ScaleHistoryApiResponse,
  RunChecksApiResponse,
  AlertActionApiResponse,
} from './types';

export {
  mapScaleAlertRow,
  mapScaleMetricRow,
  mapAlertHistoryRow,
} from './types';

// Scale Health Service
export { ScaleHealthService } from './scale-health-service';
export type { ScaleHealthDB } from './scale-health-service';

// Alert Routing
export {
  AlertRoutingService,
  defaultEmailTransport,
  defaultTelegramTransport,
} from './alert-routing';
export type {
  AlertRoutingConfig,
  AlertRoutingDB,
  EmailTransport,
  TelegramTransport,
} from './alert-routing';

// Metric Aggregator
export {
  MetricAggregatorService,
  defaultTokenValidator,
} from './metric-aggregator';
export type {
  MetricAggregatorDB,
  SidecarTokenValidator,
} from './metric-aggregator';

// Bulk Update
export {
  BulkUpdateService,
  BulkUpdateError,
} from './bulk-update';
export type {
  BulkUpdateDB,
  BulkUpdateEvent,
  BulkUpdateEventCallback,
  BulkUpdateErrorCode,
} from './bulk-update';
