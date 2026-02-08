/**
 * PHASE 44: Metric Aggregator
 * 
 * Processes anonymized execution metrics reported by Sidecars
 * every 15 minutes. Stores per-tenant snapshots and computes
 * platform-wide aggregates for the God Mode dashboard.
 * 
 * Privacy guarantee: NO lead data, NO email content, NO recipient
 * information — ONLY aggregate counts and performance metrics.
 */

import type {
  SidecarMetricReport,
  TenantMetricSnapshot,
  PlatformMetrics,
} from './types';

// ============================================
// TYPES
// ============================================

export interface MetricAggregatorDB {
  schema(name: string): {
    from(table: string): {
      select(columns?: string): {
        eq(col: string, val: unknown): any;
        gte(col: string, val: unknown): any;
        order(col: string, opts?: { ascending?: boolean }): any;
        limit(n: number): any;
        single(): any;
      };
      insert(row: Record<string, unknown>): { select(): { single(): Promise<{ data: unknown; error: unknown }> } };
    };
    rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  };
}

export interface SidecarTokenValidator {
  validate(workspaceId: string, token: string): Promise<boolean>;
}

/** Default token validator: always accepts (override in production) */
export const defaultTokenValidator: SidecarTokenValidator = {
  async validate() { return true; },
};

// ============================================
// METRIC AGGREGATOR SERVICE
// ============================================

export class MetricAggregatorService {
  constructor(
    private db: MetricAggregatorDB,
    private tokenValidator: SidecarTokenValidator = defaultTokenValidator,
  ) {}

  /**
   * Process an incoming metric report from a Sidecar.
   * Validates the token, then inserts into genesis.metric_snapshots.
   */
  async processReport(report: SidecarMetricReport): Promise<{ success: boolean; error?: string }> {
    // Validate sidecar token
    const isValid = await this.tokenValidator.validate(report.workspaceId, report.sidecarToken);
    if (!isValid) {
      return { success: false, error: 'Invalid sidecar token' };
    }

    // Validate metric values
    const validation = this.validateMetrics(report);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Insert per-tenant snapshot
    const genesisDb = this.db.schema('genesis');
    const { error } = await genesisDb
      .from('metric_snapshots')
      .insert({
        workspace_id: report.workspaceId,
        reported_at: report.timestamp,
        total_executions: report.metrics.totalExecutions,
        success_rate: report.metrics.successRate,
        avg_duration_ms: report.metrics.avgDurationMs,
        email_sent_count: report.metrics.emailSentCount,
        lead_count_delta: report.metrics.leadCountDelta,
        error_types: report.metrics.errorTypes,
      })
      .select()
      .single();

    if (error) {
      // metric_snapshots table may not exist yet (requires Phase 44 full deploy)
      // Log but don't fail hard — this is an additive feature
      /* eslint-disable-next-line no-console */
      console.warn('[MetricAggregator] Failed to insert metric snapshot:', error);
      return { success: false, error: 'Failed to store metric snapshot' };
    }

    return { success: true };
  }

  /**
   * Get aggregated platform-wide metrics for the God Mode dashboard.
   * Aggregates data from the last 24 hours.
   */
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const genesisDb = this.db.schema('genesis');
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const { data } = await genesisDb
      .from('metric_snapshots')
      .select('*')
      .gte('reported_at', since);

    const snapshots = (data || []) as any[];

    if (snapshots.length === 0) {
      return this.emptyPlatformMetrics();
    }

    // Aggregate
    const totalExecutions = snapshots.reduce((sum: number, s: any) => sum + (s.total_executions || 0), 0);
    const totalEmails = snapshots.reduce((sum: number, s: any) => sum + (s.email_sent_count || 0), 0);
    const avgSuccessRate = snapshots.reduce((sum: number, s: any) => sum + (s.success_rate || 0), 0) / snapshots.length;
    const avgDuration = snapshots.reduce((sum: number, s: any) => sum + (s.avg_duration_ms || 0), 0) / snapshots.length;

    // Aggregate error types
    const errorCounts: Record<string, number> = {};
    for (const s of snapshots) {
      const errors = (s.error_types || {}) as Record<string, number>;
      for (const [errType, count] of Object.entries(errors)) {
        errorCounts[errType] = (errorCounts[errType] || 0) + count;
      }
    }

    const totalErrors = Object.values(errorCounts).reduce((a, b) => a + b, 0);
    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({
        error,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }));

    // Count distinct workspaces with active campaigns (approximation)
    const uniqueWorkspaces = new Set(snapshots.map((s: any) => s.workspace_id));

    return {
      totalExecutionsToday: totalExecutions,
      platformSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      avgExecutionTimeMs: Math.round(avgDuration * 100) / 100,
      emailsSentToday: totalEmails,
      activeCampaigns: uniqueWorkspaces.size,
      topErrors,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private validateMetrics(report: SidecarMetricReport): { valid: boolean; error?: string } {
    if (!report.workspaceId) {
      return { valid: false, error: 'Missing workspaceId' };
    }
    if (!report.timestamp) {
      return { valid: false, error: 'Missing timestamp' };
    }
    if (!report.metrics) {
      return { valid: false, error: 'Missing metrics payload' };
    }
    if (typeof report.metrics.totalExecutions !== 'number' || report.metrics.totalExecutions < 0) {
      return { valid: false, error: 'Invalid totalExecutions value' };
    }
    if (typeof report.metrics.successRate !== 'number' || report.metrics.successRate < 0 || report.metrics.successRate > 100) {
      return { valid: false, error: 'successRate must be between 0 and 100' };
    }
    if (typeof report.metrics.avgDurationMs !== 'number' || report.metrics.avgDurationMs < 0) {
      return { valid: false, error: 'Invalid avgDurationMs value' };
    }
    return { valid: true };
  }

  private emptyPlatformMetrics(): PlatformMetrics {
    return {
      totalExecutionsToday: 0,
      platformSuccessRate: 0,
      avgExecutionTimeMs: 0,
      emailsSentToday: 0,
      activeCampaigns: 0,
      topErrors: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
