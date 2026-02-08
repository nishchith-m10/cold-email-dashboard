/**
 * PHASE 44: Types & Mapper Tests
 */

import {
  mapScaleAlertRow,
  mapScaleMetricRow,
  mapAlertHistoryRow,
} from '@/lib/genesis/phase44/types';

describe('Phase 44 - Type Mappers', () => {
  // ============================================
  // mapScaleAlertRow
  // ============================================
  describe('mapScaleAlertRow', () => {
    it('maps a complete DB row to ScaleAlert', () => {
      const row = {
        id: '123',
        alert_type: 'partition_count',
        severity: 'YELLOW',
        metric_name: 'Total Partitions',
        current_value: '10500',
        threshold_value: '10000',
        runway_days: 15,
        workspace_id: null,
        partition_name: null,
        recommendation: 'Review Phase 40',
        remediation_link: '/admin?tab=scale-health',
        status: 'active',
        acknowledged_at: null,
        acknowledged_by: null,
        resolved_at: null,
        resolution_notes: null,
        created_at: '2026-02-08T00:00:00Z',
        updated_at: '2026-02-08T00:00:00Z',
      };

      const alert = mapScaleAlertRow(row);
      expect(alert.id).toBe('123');
      expect(alert.alertType).toBe('partition_count');
      expect(alert.severity).toBe('YELLOW');
      expect(alert.metricName).toBe('Total Partitions');
      expect(alert.currentValue).toBe('10500');
      expect(alert.runwayDays).toBe(15);
      expect(alert.status).toBe('active');
    });

    it('handles null optional fields', () => {
      const row = {
        id: 'abc',
        alert_type: 'storage_growth',
        severity: 'RED',
        metric_name: 'Storage',
        current_value: '1050',
        threshold_value: '1000',
        runway_days: null,
        workspace_id: null,
        partition_name: null,
        recommendation: 'Archive data',
        remediation_link: null,
        status: 'active',
        acknowledged_at: null,
        acknowledged_by: null,
        resolved_at: null,
        resolution_notes: null,
        created_at: '2026-02-08T00:00:00Z',
        updated_at: '2026-02-08T00:00:00Z',
      };

      const alert = mapScaleAlertRow(row);
      expect(alert.runwayDays).toBeNull();
      expect(alert.workspaceId).toBeNull();
      expect(alert.remediationLink).toBeNull();
    });

    it('maps acknowledged alert with all fields populated', () => {
      const row = {
        id: 'xyz',
        alert_type: 'query_p95_latency',
        severity: 'YELLOW',
        metric_name: 'P95 Latency',
        current_value: '150',
        threshold_value: '100',
        runway_days: null,
        workspace_id: 'ws-1',
        partition_name: 'leads_p_ws1',
        recommendation: 'Add indexes',
        remediation_link: '/admin?tab=scale-health',
        status: 'acknowledged',
        acknowledged_at: '2026-02-08T01:00:00Z',
        acknowledged_by: 'user_admin',
        resolved_at: null,
        resolution_notes: null,
        created_at: '2026-02-08T00:00:00Z',
        updated_at: '2026-02-08T01:00:00Z',
      };

      const alert = mapScaleAlertRow(row);
      expect(alert.status).toBe('acknowledged');
      expect(alert.acknowledgedAt).toBe('2026-02-08T01:00:00Z');
      expect(alert.acknowledgedBy).toBe('user_admin');
      expect(alert.workspaceId).toBe('ws-1');
    });
  });

  // ============================================
  // mapScaleMetricRow
  // ============================================
  describe('mapScaleMetricRow', () => {
    it('maps a full metrics row', () => {
      const row = {
        id: 'metric-1',
        metric_date: '2026-02-08',
        partition_count: 8234,
        largest_partition_rows: 342000,
        largest_partition_name: 'leads_p_enterprise',
        avg_partition_rows: 42000,
        total_size_gb: 387.5,
        index_size_gb: 120.3,
        table_size_gb: 267.2,
        p95_latency_ms: 78.5,
        p99_latency_ms: 145.2,
        slow_query_count: 12,
        total_do_accounts: 3,
        total_droplet_capacity: 150,
        total_droplets_active: 98,
        do_utilization_pct: 65.33,
        total_wallet_balance_usd: 15000.00,
        daily_wallet_burn_usd: 250.00,
        created_at: '2026-02-08T06:00:00Z',
      };

      const metric = mapScaleMetricRow(row);
      expect(metric.partitionCount).toBe(8234);
      expect(metric.largestPartitionRows).toBe(342000);
      expect(metric.totalSizeGb).toBe(387.5);
      expect(metric.p95LatencyMs).toBe(78.5);
      expect(metric.doUtilizationPct).toBe(65.33);
    });

    it('handles null metrics gracefully', () => {
      const row = {
        id: 'metric-2',
        metric_date: '2026-02-07',
        partition_count: 0,
        largest_partition_rows: null,
        largest_partition_name: null,
        avg_partition_rows: null,
        total_size_gb: null,
        index_size_gb: null,
        table_size_gb: null,
        p95_latency_ms: null,
        p99_latency_ms: null,
        slow_query_count: null,
        total_do_accounts: null,
        total_droplet_capacity: null,
        total_droplets_active: null,
        do_utilization_pct: null,
        total_wallet_balance_usd: null,
        daily_wallet_burn_usd: null,
        created_at: '2026-02-07T06:00:00Z',
      };

      const metric = mapScaleMetricRow(row);
      expect(metric.partitionCount).toBe(0);
      expect(metric.largestPartitionRows).toBeNull();
      expect(metric.totalSizeGb).toBeNull();
      expect(metric.p95LatencyMs).toBeNull();
    });
  });

  // ============================================
  // mapAlertHistoryRow
  // ============================================
  describe('mapAlertHistoryRow', () => {
    it('maps a history row with channels', () => {
      const row = {
        id: 'hist-1',
        metric: 'partition_count',
        level: 'YELLOW',
        message: 'Total Partitions: 10500 (threshold: 10000)',
        channels_sent: ['in_app', 'gmail'],
        created_at: '2026-02-08T00:00:00Z',
      };

      const entry = mapAlertHistoryRow(row);
      expect(entry.metric).toBe('partition_count');
      expect(entry.level).toBe('YELLOW');
      expect(entry.channelsSent).toEqual(['in_app', 'gmail']);
    });

    it('handles null channels_sent', () => {
      const row = {
        id: 'hist-2',
        metric: 'storage_growth',
        level: 'RED',
        message: null,
        channels_sent: null,
        created_at: '2026-02-08T00:00:00Z',
      };

      const entry = mapAlertHistoryRow(row);
      expect(entry.message).toBeNull();
      expect(entry.channelsSent).toEqual([]);
    });

    it('handles empty channels array', () => {
      const row = {
        id: 'hist-3',
        metric: 'query_p95_latency',
        level: 'YELLOW',
        message: 'Latency alert',
        channels_sent: [],
        created_at: '2026-02-08T00:00:00Z',
      };

      const entry = mapAlertHistoryRow(row);
      expect(entry.channelsSent).toEqual([]);
    });
  });
});
