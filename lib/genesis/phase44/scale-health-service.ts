/**
 * PHASE 44: Scale Health Service
 * 
 * Core service for running health checks, managing alerts,
 * and querying scale metrics history.
 * 
 * All database operations go through the injected SupabaseClient
 * (supabaseAdmin in production, mock in tests).
 */

import type {
  HealthCheckResult,
  ScaleHealthSummary,
  ScaleAlert,
  ScaleMetricSnapshot,
  MetricTrend,
  AlertSeverity,
  AlertStatus,
  FleetOverview,
  WorkspaceHealthRow,
  ScaleCheckType,
  mapScaleAlertRow,
  mapScaleMetricRow,
} from './types';

// Re-import as values (the mapper functions)
import { mapScaleAlertRow as toAlert, mapScaleMetricRow as toMetric } from './types';

// ============================================
// TYPES
// ============================================

/** Minimal Supabase client interface for testability */
export interface ScaleHealthDB {
  rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown[]; error: unknown }>;
  from(table: string): {
    select(columns?: string): ScaleHealthQuery;
    insert(row: Record<string, unknown>): { select(): { single(): Promise<{ data: unknown; error: unknown }> } };
    update(vals: Record<string, unknown>): { eq(col: string, val: unknown): Promise<{ data: unknown; error: unknown }> };
    upsert(row: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  };
  schema(name: string): ScaleHealthDB;
}

/** Chainable query builder that resolves to { data, error } */
export interface ScaleHealthQuery extends PromiseLike<{ data: unknown[] | null; error: unknown }> {
  eq(col: string, val: unknown): ScaleHealthQuery;
  in(col: string, vals: unknown[]): ScaleHealthQuery;
  order(col: string, opts?: { ascending?: boolean }): ScaleHealthQuery;
  limit(n: number): ScaleHealthQuery;
  gte(col: string, val: unknown): ScaleHealthQuery;
  lte(col: string, val: unknown): ScaleHealthQuery;
  single(): PromiseLike<{ data: unknown | null; error: unknown }>;
}

// ============================================
// SCALE HEALTH SERVICE
// ============================================

export class ScaleHealthService {
  constructor(private db: ScaleHealthDB) {}

  /**
   * Run all health checks via the DB function, return structured summary.
   */
  async runHealthChecks(): Promise<{ results: HealthCheckResult[]; alertsCreated: number; durationMs: number }> {
    const genesisDb = this.db.schema('genesis');

    // Run individual check functions and collect results
    const checks: HealthCheckResult[] = [];

    const [partitionRes, largestRes, latencyRes, storageRes] = await Promise.all([
      genesisDb.rpc('check_partition_count'),
      genesisDb.rpc('check_largest_partition'),
      genesisDb.rpc('check_query_latency'),
      genesisDb.rpc('check_storage_growth'),
    ]);

    const startMs = Date.now();

    if (partitionRes.data?.[0]) {
      const r = partitionRes.data[0] as any;
      checks.push({
        metric: 'partition_count',
        currentValue: r.current_value,
        thresholdYellow: r.threshold_yellow,
        thresholdRed: r.threshold_red,
        status: r.status as AlertSeverity,
        runwayDays: r.days_until_red,
      });
    }

    if (largestRes.data?.[0]) {
      const r = largestRes.data[0] as any;
      checks.push({
        metric: 'largest_partition',
        currentValue: r.row_count,
        thresholdYellow: r.threshold_yellow,
        thresholdRed: r.threshold_red,
        status: r.status as AlertSeverity,
        runwayDays: null,
        details: { partitionName: r.partition_name, sizeGb: r.size_gb },
      });
    }

    if (latencyRes.data?.[0]) {
      const r = latencyRes.data[0] as any;
      checks.push({
        metric: 'query_p95_latency',
        currentValue: r.p95_latency_ms,
        thresholdYellow: r.threshold_yellow,
        thresholdRed: r.threshold_red,
        status: r.status as AlertSeverity,
        runwayDays: null,
        details: { p99: r.p99_latency_ms, slowQueryCount: r.slow_query_count },
      });
    }

    if (storageRes.data?.[0]) {
      const r = storageRes.data[0] as any;
      checks.push({
        metric: 'storage_growth',
        currentValue: r.current_size_gb,
        thresholdYellow: r.threshold_yellow,
        thresholdRed: r.threshold_red,
        status: r.status as AlertSeverity,
        runwayDays: r.days_until_1tb,
        details: { growthRateGbPerDay: r.growth_rate_gb_per_day },
      });
    }

    // Also run the snapshot recorder
    await genesisDb.rpc('run_scale_health_checks');

    // Process alerts for any non-GREEN checks
    let alertsCreated = 0;
    for (const check of checks) {
      if (check.status !== 'GREEN') {
        const created = await this.processAlert(check);
        if (created) alertsCreated++;
      } else {
        await this.resolveAlertIfExists(check.metric);
      }
    }

    const durationMs = Date.now() - startMs;
    return { results: checks, alertsCreated, durationMs };
  }

  /**
   * Get current scale health summary (latest data + active alerts).
   */
  async getHealthSummary(): Promise<ScaleHealthSummary> {
    const genesisDb = this.db.schema('genesis');

    // Run checks to get current data
    const { results: checks } = await this.runHealthChecks();

    // Get active alert counts
    const { data: alerts } = await genesisDb
      .from('scale_alerts')
      .select('severity')
      .eq('status', 'active');

    const alertList = (alerts || []) as any[];
    const yellowCount = alertList.filter((a: any) => a.severity === 'YELLOW').length;
    const redCount = alertList.filter((a: any) => a.severity === 'RED').length;

    const overallStatus: AlertSeverity = redCount > 0 ? 'RED' : yellowCount > 0 ? 'YELLOW' : 'GREEN';

    return {
      overallStatus,
      lastCheckAt: new Date().toISOString(),
      checks,
      activeAlertCount: alertList.length,
      yellowCount,
      redCount,
    };
  }

  /**
   * Get fleet overview: workspace count by health status.
   */
  async getFleetOverview(): Promise<FleetOverview> {
    const { data: workspaces } = await this.db
      .from('workspaces')
      .select('id, status');

    const wsList = (workspaces || []) as any[];
    const total = wsList.length;
    const frozen = wsList.filter((w: any) => w.status === 'frozen').length;

    // Get partition registry count (provisioned workspaces)
    const genesisDb = this.db.schema('genesis');
    const { data: partitions } = await genesisDb
      .from('partition_registry')
      .select('workspace_id, status');

    const partList = (partitions || []) as any[];
    const provisioned = partList.length;
    const notProvisioned = total - provisioned - frozen;

    // For now, treat all provisioned as healthy (heartbeat integration is Phase 54)
    // Degraded/zombie detection would come from sidecar_health when available
    return {
      totalWorkspaces: total,
      healthy: provisioned,
      degraded: 0,
      zombie: 0,
      notProvisioned: Math.max(0, notProvisioned),
      frozen,
    };
  }

  /**
   * Get active alerts with optional status filter.
   */
  async getAlerts(statusFilter?: AlertStatus): Promise<ScaleAlert[]> {
    const genesisDb = this.db.schema('genesis');
    let query: ScaleHealthQuery = genesisDb.from('scale_alerts').select('*');

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    query = query.order('created_at', { ascending: false });

    const result = await query;
    if (result.error || !result.data) return [];
    return (result.data as any[]).map(toAlert);
  }

  /**
   * Acknowledge an alert.
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<ScaleAlert | null> {
    const genesisDb = this.db.schema('genesis');
    const { data, error } = await genesisDb
      .from('scale_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) return null;

    // Fetch updated alert
    const { data: updated } = await genesisDb
      .from('scale_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    return updated ? toAlert(updated as any) : null;
  }

  /**
   * Resolve an alert with notes.
   */
  async resolveAlert(alertId: string, userId: string, notes: string): Promise<ScaleAlert | null> {
    const genesisDb = this.db.schema('genesis');
    const { data, error } = await genesisDb
      .from('scale_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) return null;

    const { data: updated } = await genesisDb
      .from('scale_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    return updated ? toAlert(updated as any) : null;
  }

  /**
   * Get historical metrics with trend calculation.
   */
  async getMetricsHistory(days: number = 30): Promise<{ snapshots: ScaleMetricSnapshot[]; trends: MetricTrend[] }> {
    const genesisDb = this.db.schema('genesis');
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const { data } = await genesisDb
      .from('scale_metrics')
      .select('*')
      .gte('metric_date', since)
      .order('metric_date', { ascending: true });

    const snapshots = ((data || []) as any[]).map(toMetric);
    const trends = this.calculateTrends(snapshots);

    return { snapshots, trends };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /** Create or update an alert based on a health check result */
  private async processAlert(check: HealthCheckResult): Promise<boolean> {
    const genesisDb = this.db.schema('genesis');

    // Check for existing active alert of this type
    const { data: existing } = await genesisDb
      .from('scale_alerts')
      .select('id, severity')
      .eq('alert_type', check.metric)
      .eq('status', 'active')
      .limit(1);

    const existingAlert = (existing as any[])?.[0];

    if (existingAlert) {
      // Update existing alert
      await genesisDb
        .from('scale_alerts')
        .update({
          severity: check.status,
          current_value: String(check.currentValue),
          runway_days: check.runwayDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAlert.id);
      return false; // Updated, not created
    }

    // Create new alert
    const recommendation = this.getRecommendation(check);
    await genesisDb
      .from('scale_alerts')
      .insert({
        alert_type: check.metric,
        severity: check.status,
        metric_name: this.getMetricDisplayName(check.metric),
        current_value: String(check.currentValue),
        threshold_value: check.status === 'RED' ? String(check.thresholdRed) : String(check.thresholdYellow),
        runway_days: check.runwayDays,
        recommendation,
        remediation_link: `/admin?tab=scale-health&metric=${check.metric}`,
        status: 'active',
      })
      .select()
      .single();

    return true;
  }

  /** Resolve an alert if the metric returned to GREEN */
  private async resolveAlertIfExists(metric: string): Promise<void> {
    const genesisDb = this.db.schema('genesis');
    const { data: existing } = await genesisDb
      .from('scale_alerts')
      .select('id')
      .eq('alert_type', metric)
      .eq('status', 'active')
      .limit(1);

    if ((existing as any[])?.[0]) {
      await genesisDb
        .from('scale_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: 'Metric returned to green zone automatically',
          updated_at: new Date().toISOString(),
        })
        .eq('id', (existing as any[])[0].id);
    }
  }

  /** Calculate trends from historical snapshots */
  private calculateTrends(snapshots: ScaleMetricSnapshot[]): MetricTrend[] {
    if (snapshots.length < 2) return [];

    const metrics: Array<{ key: keyof ScaleMetricSnapshot; label: string }> = [
      { key: 'partitionCount', label: 'Partitions' },
      { key: 'totalSizeGb', label: 'Storage (GB)' },
      { key: 'p95LatencyMs', label: 'P95 Latency (ms)' },
    ];

    return metrics.map(({ key, label }) => {
      const dataPoints = snapshots.map(s => ({
        date: s.metricDate,
        value: s[key] as number | null,
      }));

      const first = dataPoints.find(d => d.value !== null)?.value ?? null;
      const last = [...dataPoints].reverse().find(d => d.value !== null)?.value ?? null;

      let changePercent: number | null = null;
      let direction: 'up' | 'down' | 'flat' = 'flat';

      if (first !== null && last !== null && first !== 0) {
        changePercent = ((last - first) / first) * 100;
        direction = changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'flat';
      }

      return { metric: label, dataPoints, changePercent, direction };
    });
  }

  /** Human-readable metric names */
  private getMetricDisplayName(metric: string): string {
    const names: Record<string, string> = {
      partition_count: 'Total Partitions',
      largest_partition: 'Largest Partition',
      query_p95_latency: 'Query P95 Latency',
      storage_growth: 'Total Storage',
      do_account_capacity: 'DO Account Capacity',
      oversized_partitions: 'Oversized Partitions',
      wallet_balance: 'Wallet Balance',
      snapshot_garbage: 'Orphaned Snapshots',
    };
    return names[metric] || metric;
  }

  /** Generate recommendation text based on check result */
  private getRecommendation(check: HealthCheckResult): string {
    const recs: Record<string, Record<string, string>> = {
      partition_count: {
        YELLOW: 'WARNING: Partition count growing. Review Phase 40 catalog optimizations within 30 days.',
        RED: 'CRITICAL: Approaching partition limit. Enable Phase 40 catalog optimizations immediately.',
      },
      largest_partition: {
        YELLOW: 'WARNING: Large partition detected. Monitor query performance and plan data archival.',
        RED: 'URGENT: Partition exceeds 1M rows. Archive old data or implement sub-partitioning.',
      },
      query_p95_latency: {
        YELLOW: 'WARNING: Query latency increasing. Consider adding indexes or refreshing materialized views.',
        RED: 'CRITICAL: Query latency exceeds 200ms. Immediate index optimization required.',
      },
      storage_growth: {
        YELLOW: 'WARNING: Storage usage at 50%+ capacity. Review data retention policies.',
        RED: 'CRITICAL: Approaching 1TB storage limit. Archive or export historical data immediately.',
      },
    };

    return recs[check.metric]?.[check.status] || `Alert: ${check.metric} is in ${check.status} zone.`;
  }
}
