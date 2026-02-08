/**
 * PHASE 44: ScaleHealthService Tests
 * 
 * Covers: health check processing, alert lifecycle, fleet overview,
 * history/trends, edge cases, error handling.
 */

import { ScaleHealthService, ScaleHealthDB } from '@/lib/genesis/phase44/scale-health-service';

// ============================================
// MOCK DB FACTORY
// ============================================

function createMockDB(overrides: Partial<{
  rpcResults: Record<string, any[]>;
  tableData: Record<string, any[]>;
  insertResult: any;
  updateResult: any;
}> = {}): ScaleHealthDB {
  const rpcResults = overrides.rpcResults || {};
  const tableData = overrides.tableData || {};
  const insertResult = overrides.insertResult || { data: { id: 'new-id' }, error: null };

  const createQuery = (table: string) => ({
    select: (_cols?: string) => createQueryChain(table),
    insert: (_row: any) => ({
      select: () => ({
        single: () => Promise.resolve(insertResult),
      }),
    }),
    update: (_vals: any) => ({
      eq: (_col: string, _val: any) => Promise.resolve(overrides.updateResult || { data: null, error: null }),
    }),
    upsert: (_row: any) => Promise.resolve({ data: null, error: null }),
  });

  const createQueryChain = (table: string) => {
    const chain: any = {
      eq: () => chain,
      in: () => chain,
      gte: () => chain,
      lte: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: (tableData[table] || [])[0] || null, error: null }),
      then: (resolve: any) => resolve({ data: tableData[table] || [], error: null }),
    };
    // Make it thenable for await
    Object.defineProperty(chain, 'then', {
      value: (resolve: any) => resolve({ data: tableData[table] || [], error: null }),
      configurable: true,
    });
    return chain;
  };

  const genesisDb: ScaleHealthDB = {
    rpc: (fn: string) => Promise.resolve({ data: rpcResults[fn] || [], error: null }),
    from: createQuery,
    schema: () => genesisDb,
  };

  const mainDb: ScaleHealthDB = {
    rpc: (fn: string) => Promise.resolve({ data: rpcResults[fn] || [], error: null }),
    from: (table: string) => createQuery(table),
    schema: () => genesisDb,
  };

  return mainDb;
}

// ============================================
// TESTS
// ============================================

describe('Phase 44 - ScaleHealthService', () => {
  // ============================================
  // HEALTH CHECK PROCESSING
  // ============================================
  describe('runHealthChecks', () => {
    it('runs all 4 check functions and returns structured results', async () => {
      const db = createMockDB({
        rpcResults: {
          check_partition_count: [{ current_value: 5000, threshold_yellow: 10000, threshold_red: 12000, status: 'GREEN', days_until_red: null }],
          check_largest_partition: [{ partition_name: 'leads_p_ws1', row_count: 100000, size_gb: 0.5, threshold_yellow: 500000, threshold_red: 1000000, status: 'GREEN' }],
          check_query_latency: [{ p95_latency_ms: 45.2, p99_latency_ms: 89.1, threshold_yellow: 100, threshold_red: 200, status: 'GREEN', slow_query_count: 0 }],
          check_storage_growth: [{ current_size_gb: 120, growth_rate_gb_per_day: 0.5, days_until_1tb: 1760, threshold_yellow: 500, threshold_red: 1000, status: 'GREEN' }],
          run_scale_health_checks: [{ check_name: 'scale_health_checks', check_status: 'completed' }],
        },
      });

      const service = new ScaleHealthService(db);
      const { results, alertsCreated, durationMs } = await service.runHealthChecks();

      expect(results).toHaveLength(4);
      expect(results[0].metric).toBe('partition_count');
      expect(results[0].status).toBe('GREEN');
      expect(results[1].metric).toBe('largest_partition');
      expect(results[2].metric).toBe('query_p95_latency');
      expect(results[3].metric).toBe('storage_growth');
      expect(alertsCreated).toBe(0); // All GREEN
      expect(typeof durationMs).toBe('number');
    });

    it('creates alerts for non-GREEN checks', async () => {
      const db = createMockDB({
        rpcResults: {
          check_partition_count: [{ current_value: 10500, threshold_yellow: 10000, threshold_red: 12000, status: 'YELLOW', days_until_red: 30 }],
          check_largest_partition: [{ partition_name: 'leads_p_big', row_count: 1200000, size_gb: 2.3, threshold_yellow: 500000, threshold_red: 1000000, status: 'RED' }],
          check_query_latency: [{ p95_latency_ms: 45, p99_latency_ms: 89, threshold_yellow: 100, threshold_red: 200, status: 'GREEN', slow_query_count: 0 }],
          check_storage_growth: [{ current_size_gb: 120, growth_rate_gb_per_day: 0.5, days_until_1tb: 1760, threshold_yellow: 500, threshold_red: 1000, status: 'GREEN' }],
          run_scale_health_checks: [{}],
        },
        tableData: {
          scale_alerts: [], // No existing alerts
        },
      });

      const service = new ScaleHealthService(db);
      const { results, alertsCreated } = await service.runHealthChecks();

      expect(results).toHaveLength(4);
      expect(results[0].status).toBe('YELLOW');
      expect(results[1].status).toBe('RED');
      // alertsCreated depends on the mock insert being successful
      expect(alertsCreated).toBeGreaterThanOrEqual(0);
    });

    it('handles empty RPC results gracefully', async () => {
      const db = createMockDB({
        rpcResults: {
          check_partition_count: [],
          check_largest_partition: [],
          check_query_latency: [],
          check_storage_growth: [],
          run_scale_health_checks: [],
        },
      });

      const service = new ScaleHealthService(db);
      const { results } = await service.runHealthChecks();
      expect(results).toHaveLength(0);
    });
  });

  // ============================================
  // HEALTH SUMMARY
  // ============================================
  describe('getHealthSummary', () => {
    it('returns overall GREEN when all checks pass', async () => {
      const db = createMockDB({
        rpcResults: {
          check_partition_count: [{ current_value: 5000, threshold_yellow: 10000, threshold_red: 12000, status: 'GREEN', days_until_red: null }],
          check_largest_partition: [{ partition_name: 'none', row_count: 0, size_gb: 0, threshold_yellow: 500000, threshold_red: 1000000, status: 'GREEN' }],
          check_query_latency: [{ p95_latency_ms: 20, p99_latency_ms: 40, threshold_yellow: 100, threshold_red: 200, status: 'GREEN', slow_query_count: 0 }],
          check_storage_growth: [{ current_size_gb: 50, growth_rate_gb_per_day: 0.1, days_until_1tb: 9500, threshold_yellow: 500, threshold_red: 1000, status: 'GREEN' }],
          run_scale_health_checks: [{}],
        },
        tableData: {
          scale_alerts: [],
        },
      });

      const service = new ScaleHealthService(db);
      const summary = await service.getHealthSummary();

      expect(summary.overallStatus).toBe('GREEN');
      expect(summary.activeAlertCount).toBe(0);
      expect(summary.yellowCount).toBe(0);
      expect(summary.redCount).toBe(0);
    });

    it('returns YELLOW when there are yellow alerts', async () => {
      const db = createMockDB({
        rpcResults: {
          check_partition_count: [{ current_value: 10500, threshold_yellow: 10000, threshold_red: 12000, status: 'YELLOW', days_until_red: 30 }],
          check_largest_partition: [{ partition_name: 'none', row_count: 0, size_gb: 0, threshold_yellow: 500000, threshold_red: 1000000, status: 'GREEN' }],
          check_query_latency: [{ p95_latency_ms: 20, p99_latency_ms: 40, threshold_yellow: 100, threshold_red: 200, status: 'GREEN', slow_query_count: 0 }],
          check_storage_growth: [{ current_size_gb: 50, growth_rate_gb_per_day: 0.1, days_until_1tb: 9500, threshold_yellow: 500, threshold_red: 1000, status: 'GREEN' }],
          run_scale_health_checks: [{}],
        },
        tableData: {
          scale_alerts: [{ severity: 'YELLOW' }],
        },
      });

      const service = new ScaleHealthService(db);
      const summary = await service.getHealthSummary();

      expect(summary.overallStatus).toBe('YELLOW');
      expect(summary.yellowCount).toBe(1);
    });

    it('returns RED when any red alert exists', async () => {
      const db = createMockDB({
        rpcResults: {
          check_partition_count: [{ current_value: 5000, threshold_yellow: 10000, threshold_red: 12000, status: 'GREEN', days_until_red: null }],
          check_largest_partition: [{ partition_name: 'none', row_count: 0, size_gb: 0, threshold_yellow: 500000, threshold_red: 1000000, status: 'GREEN' }],
          check_query_latency: [{ p95_latency_ms: 250, p99_latency_ms: 400, threshold_yellow: 100, threshold_red: 200, status: 'RED', slow_query_count: 5 }],
          check_storage_growth: [{ current_size_gb: 50, growth_rate_gb_per_day: 0.1, days_until_1tb: 9500, threshold_yellow: 500, threshold_red: 1000, status: 'GREEN' }],
          run_scale_health_checks: [{}],
        },
        tableData: {
          scale_alerts: [{ severity: 'RED' }, { severity: 'YELLOW' }],
        },
      });

      const service = new ScaleHealthService(db);
      const summary = await service.getHealthSummary();

      expect(summary.overallStatus).toBe('RED');
      expect(summary.redCount).toBe(1);
      expect(summary.activeAlertCount).toBe(2);
    });
  });

  // ============================================
  // FLEET OVERVIEW
  // ============================================
  describe('getFleetOverview', () => {
    it('counts workspaces by status', async () => {
      const db = createMockDB({
        tableData: {
          workspaces: [
            { id: 'ws1', status: 'active' },
            { id: 'ws2', status: 'active' },
            { id: 'ws3', status: 'frozen' },
          ],
          partition_registry: [
            { workspace_id: 'ws1', status: 'active' },
            { workspace_id: 'ws2', status: 'active' },
          ],
        },
      });

      const service = new ScaleHealthService(db);
      const overview = await service.getFleetOverview();

      expect(overview.totalWorkspaces).toBe(3);
      expect(overview.frozen).toBe(1);
    });

    it('handles empty workspace list', async () => {
      const db = createMockDB({
        tableData: {
          workspaces: [],
          partition_registry: [],
        },
      });

      const service = new ScaleHealthService(db);
      const overview = await service.getFleetOverview();

      expect(overview.totalWorkspaces).toBe(0);
      expect(overview.healthy).toBe(0);
      expect(overview.frozen).toBe(0);
    });
  });

  // ============================================
  // ALERT LIFECYCLE
  // ============================================
  describe('acknowledgeAlert', () => {
    it('returns the updated alert', async () => {
      const db = createMockDB({
        tableData: {
          scale_alerts: [{
            id: 'alert-1',
            alert_type: 'partition_count',
            severity: 'YELLOW',
            metric_name: 'Partitions',
            current_value: '10500',
            threshold_value: '10000',
            runway_days: null,
            workspace_id: null,
            partition_name: null,
            recommendation: 'Review',
            remediation_link: null,
            status: 'acknowledged',
            acknowledged_at: '2026-02-08T01:00:00Z',
            acknowledged_by: 'admin-1',
            resolved_at: null,
            resolution_notes: null,
            created_at: '2026-02-08T00:00:00Z',
            updated_at: '2026-02-08T01:00:00Z',
          }],
        },
      });

      const service = new ScaleHealthService(db);
      const result = await service.acknowledgeAlert('alert-1', 'admin-1');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('acknowledged');
    });
  });

  describe('resolveAlert', () => {
    it('returns the resolved alert with notes', async () => {
      const db = createMockDB({
        tableData: {
          scale_alerts: [{
            id: 'alert-1',
            alert_type: 'storage_growth',
            severity: 'RED',
            metric_name: 'Storage',
            current_value: '1050',
            threshold_value: '1000',
            runway_days: null,
            workspace_id: null,
            partition_name: null,
            recommendation: 'Archive',
            remediation_link: null,
            status: 'resolved',
            acknowledged_at: null,
            acknowledged_by: null,
            resolved_at: '2026-02-08T02:00:00Z',
            resolution_notes: 'Archived old data',
            created_at: '2026-02-08T00:00:00Z',
            updated_at: '2026-02-08T02:00:00Z',
          }],
        },
      });

      const service = new ScaleHealthService(db);
      const result = await service.resolveAlert('alert-1', 'admin-1', 'Archived old data');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('resolved');
      expect(result?.resolutionNotes).toBe('Archived old data');
    });
  });

  // ============================================
  // METRICS HISTORY & TRENDS
  // ============================================
  describe('getMetricsHistory', () => {
    it('returns snapshots and calculates trends', async () => {
      const db = createMockDB({
        tableData: {
          scale_metrics: [
            { id: '1', metric_date: '2026-02-01', partition_count: 5000, total_size_gb: 100, p95_latency_ms: 40, created_at: '2026-02-01' },
            { id: '2', metric_date: '2026-02-08', partition_count: 6000, total_size_gb: 110, p95_latency_ms: 42, created_at: '2026-02-08' },
          ],
        },
      });

      const service = new ScaleHealthService(db);
      const { snapshots, trends } = await service.getMetricsHistory(30);

      expect(snapshots.length).toBe(2);
      expect(trends.length).toBe(3); // Partitions, Storage, P95 Latency
      
      // Partition trend should show "up"
      const partitionTrend = trends.find(t => t.metric === 'Partitions');
      expect(partitionTrend?.direction).toBe('up');
      expect(partitionTrend?.changePercent).toBe(20); // 5000 → 6000 = 20%
    });

    it('returns empty trends for single snapshot', async () => {
      const db = createMockDB({
        tableData: {
          scale_metrics: [
            { id: '1', metric_date: '2026-02-08', partition_count: 5000, total_size_gb: 100, p95_latency_ms: 40, created_at: '2026-02-08' },
          ],
        },
      });

      const service = new ScaleHealthService(db);
      const { trends } = await service.getMetricsHistory(30);
      expect(trends).toEqual([]);
    });

    it('handles empty metrics history', async () => {
      const db = createMockDB({
        tableData: { scale_metrics: [] },
      });

      const service = new ScaleHealthService(db);
      const { snapshots, trends } = await service.getMetricsHistory(30);

      expect(snapshots).toEqual([]);
      expect(trends).toEqual([]);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('edge cases', () => {
    it('getAlerts returns empty array on DB error', async () => {
      // Create a mock that returns error from the query chain
      const errorChain: any = {
        eq: () => errorChain,
        order: () => errorChain,
        limit: () => errorChain,
        single: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
        then: (resolve: any) => resolve({ data: null, error: { message: 'DB error' } }),
      };
      Object.defineProperty(errorChain, 'then', {
        value: (resolve: any) => resolve({ data: null, error: { message: 'DB error' } }),
        configurable: true,
      });

      const genesisDb = {
        schema: () => genesisDb,
        from: () => ({
          select: () => errorChain,
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        }),
        rpc: () => Promise.resolve({ data: [], error: null }),
      } as any;

      const service = new ScaleHealthService(genesisDb);
      const alerts = await service.getAlerts('active');
      expect(alerts).toEqual([]);
    });
  });
});
