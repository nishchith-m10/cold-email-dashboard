/**
 * PHASE 44: Metric Aggregator Tests
 * 
 * Covers: report validation, token validation, aggregation,
 * edge cases, empty states.
 */

import {
  MetricAggregatorService,
  MetricAggregatorDB,
  SidecarTokenValidator,
} from '@/lib/genesis/phase44/metric-aggregator';
import type { SidecarMetricReport } from '@/lib/genesis/phase44/types';

// ============================================
// MOCK FACTORIES
// ============================================

function createMockDB(snapshotData: any[] = [], insertError: any = null): MetricAggregatorDB {
  const createQuery = () => {
    const chain: any = {
      eq: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: snapshotData[0] || null, error: null }),
      then: (resolve: any) => resolve({ data: snapshotData, error: null }),
    };
    Object.defineProperty(chain, 'then', {
      value: (resolve: any) => resolve({ data: snapshotData, error: null }),
      configurable: true,
    });
    return chain;
  };

  return {
    schema: () => ({
      from: () => ({
        select: () => createQuery(),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'new' }, error: insertError }),
          }),
        }),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
    }),
  };
}

function createValidReport(overrides: Partial<SidecarMetricReport> = {}): SidecarMetricReport {
  return {
    workspaceId: 'ws-1',
    sidecarToken: 'scar_valid_token',
    timestamp: '2026-02-08T12:00:00Z',
    metrics: {
      totalExecutions: 150,
      successRate: 95.5,
      avgDurationMs: 1200,
      emailSentCount: 45,
      leadCountDelta: 12,
      errorTypes: { timeout: 3, auth_failed: 1 },
    },
    ...overrides,
  };
}

// ============================================
// TESTS
// ============================================

describe('Phase 44 - MetricAggregatorService', () => {
  // ============================================
  // REPORT PROCESSING
  // ============================================
  describe('processReport', () => {
    it('accepts a valid report', async () => {
      const db = createMockDB();
      const validator: SidecarTokenValidator = { validate: jest.fn().mockResolvedValue(true) };
      const service = new MetricAggregatorService(db, validator);

      const result = await service.processReport(createValidReport());
      expect(result.success).toBe(true);
      expect(validator.validate).toHaveBeenCalledWith('ws-1', 'scar_valid_token');
    });

    it('rejects invalid sidecar token', async () => {
      const db = createMockDB();
      const validator: SidecarTokenValidator = { validate: jest.fn().mockResolvedValue(false) };
      const service = new MetricAggregatorService(db, validator);

      const result = await service.processReport(createValidReport());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid sidecar token');
    });

    it('rejects report with missing workspaceId', async () => {
      const db = createMockDB();
      const service = new MetricAggregatorService(db);

      const result = await service.processReport(createValidReport({ workspaceId: '' }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('workspaceId');
    });

    it('rejects report with missing timestamp', async () => {
      const db = createMockDB();
      const service = new MetricAggregatorService(db);

      const result = await service.processReport(createValidReport({ timestamp: '' }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('timestamp');
    });

    it('rejects report with negative totalExecutions', async () => {
      const db = createMockDB();
      const service = new MetricAggregatorService(db);

      const report = createValidReport();
      report.metrics.totalExecutions = -1;
      const result = await service.processReport(report);
      expect(result.success).toBe(false);
      expect(result.error).toContain('totalExecutions');
    });

    it('rejects report with successRate > 100', async () => {
      const db = createMockDB();
      const service = new MetricAggregatorService(db);

      const report = createValidReport();
      report.metrics.successRate = 105;
      const result = await service.processReport(report);
      expect(result.success).toBe(false);
      expect(result.error).toContain('successRate');
    });

    it('rejects report with negative avgDurationMs', async () => {
      const db = createMockDB();
      const service = new MetricAggregatorService(db);

      const report = createValidReport();
      report.metrics.avgDurationMs = -50;
      const result = await service.processReport(report);
      expect(result.success).toBe(false);
      expect(result.error).toContain('avgDurationMs');
    });

    it('rejects report with missing metrics payload', async () => {
      const db = createMockDB();
      const service = new MetricAggregatorService(db);

      const result = await service.processReport({
        workspaceId: 'ws-1',
        sidecarToken: 'tok',
        timestamp: '2026-02-08T12:00:00Z',
        metrics: null as any,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('metrics');
    });

    it('handles DB insert failure gracefully', async () => {
      const db = createMockDB([], { message: 'table not found' });
      const service = new MetricAggregatorService(db);

      const result = await service.processReport(createValidReport());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store');
    });
  });

  // ============================================
  // PLATFORM METRICS AGGREGATION
  // ============================================
  describe('getPlatformMetrics', () => {
    it('aggregates metrics from multiple tenants', async () => {
      const snapshots = [
        { workspace_id: 'ws-1', total_executions: 100, success_rate: 95, avg_duration_ms: 1000, email_sent_count: 30, error_types: { timeout: 2 } },
        { workspace_id: 'ws-2', total_executions: 200, success_rate: 90, avg_duration_ms: 1500, email_sent_count: 60, error_types: { timeout: 3, auth: 1 } },
        { workspace_id: 'ws-3', total_executions: 50, success_rate: 100, avg_duration_ms: 800, email_sent_count: 15, error_types: {} },
      ];
      const db = createMockDB(snapshots);
      const service = new MetricAggregatorService(db);

      const metrics = await service.getPlatformMetrics();

      expect(metrics.totalExecutionsToday).toBe(350);
      expect(metrics.emailsSentToday).toBe(105);
      expect(metrics.activeCampaigns).toBe(3); // 3 unique workspace IDs
      expect(metrics.platformSuccessRate).toBeCloseTo(95, 0);
      expect(metrics.topErrors.length).toBeGreaterThan(0);
      expect(metrics.topErrors[0].error).toBe('timeout'); // Most common
    });

    it('returns empty metrics when no snapshots exist', async () => {
      const db = createMockDB([]);
      const service = new MetricAggregatorService(db);

      const metrics = await service.getPlatformMetrics();

      expect(metrics.totalExecutionsToday).toBe(0);
      expect(metrics.emailsSentToday).toBe(0);
      expect(metrics.activeCampaigns).toBe(0);
      expect(metrics.platformSuccessRate).toBe(0);
      expect(metrics.topErrors).toEqual([]);
    });

    it('limits topErrors to 5 entries', async () => {
      const errorTypes: Record<string, number> = {};
      for (let i = 0; i < 10; i++) {
        errorTypes[`error_type_${i}`] = (10 - i);
      }
      const snapshots = [
        { workspace_id: 'ws-1', total_executions: 100, success_rate: 80, avg_duration_ms: 1000, email_sent_count: 10, error_types: errorTypes },
      ];
      const db = createMockDB(snapshots);
      const service = new MetricAggregatorService(db);

      const metrics = await service.getPlatformMetrics();
      expect(metrics.topErrors.length).toBeLessThanOrEqual(5);
    });

    it('handles snapshots with empty error_types', async () => {
      const snapshots = [
        { workspace_id: 'ws-1', total_executions: 100, success_rate: 100, avg_duration_ms: 500, email_sent_count: 50, error_types: null },
      ];
      const db = createMockDB(snapshots);
      const service = new MetricAggregatorService(db);

      const metrics = await service.getPlatformMetrics();
      expect(metrics.topErrors).toEqual([]);
    });
  });
});
