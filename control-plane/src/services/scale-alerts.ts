/**
 * PHASE 73: Scale Alerts Service
 *
 * Monitors database metrics every 15 minutes to detect approaching limits
 * (partition count, row counts, connection pool usage).
 *
 * Integrates with Phase 44 (Scale Alerts) thresholds.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5, 44.x
 */

import type { ControlPlaneConfig, Logger } from '../config';
import type { ServiceHealth } from '../../../packages/shared/types';
import { SCALE_ALERT_THRESHOLDS } from '../../../packages/shared/constants';
import { sendTelegramAlert } from './telegram';

export interface ScaleAlertsService {
  start(): void;
  stop(): void;
  isHealthy(): boolean;
  getHealth(): ServiceHealth;
}

export function createScaleAlertsService(
  config: ControlPlaneConfig,
  logger: Logger
): ScaleAlertsService {
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let lastRunAt: string | null = null;
  let errorCount = 0;
  let lastError: string | null = null;

  async function check(): Promise<void> {
    try {
      // 1. Check partition count
      const partitionCount = await fetchPartitionCount(config);
      evaluatePartitions(partitionCount, logger);

      // 2. Check total row count across email_events
      const rowCount = await fetchTotalRowCount(config);
      evaluateRowCount(rowCount, logger);

      // 3. Check active connection count
      const connectionCount = await fetchConnectionCount(config);
      evaluateConnections(connectionCount, logger);

      lastRunAt = new Date().toISOString();
    } catch (error) {
      errorCount++;
      lastError =
        error instanceof Error ? error.message : 'Unknown scale alerts error';
      logger.error({ error: lastError }, 'Scale alerts check error');
    }
  }

  function evaluatePartitions(count: number, checkLogger: Logger): void {
    if (count >= SCALE_ALERT_THRESHOLDS.CRITICAL_PARTITION_COUNT) {
      checkLogger.error(
        { count, threshold: SCALE_ALERT_THRESHOLDS.CRITICAL_PARTITION_COUNT },
        'CRITICAL: Partition count approaching PostgreSQL limit'
      );
      sendTelegramAlert(
        `🔴 *CRITICAL: Partition Count*\nCount: ${count}\nThreshold: ${SCALE_ALERT_THRESHOLDS.CRITICAL_PARTITION_COUNT}\nAction required: partition expansion needed`,
        checkLogger
      );
    } else if (count >= SCALE_ALERT_THRESHOLDS.WARNING_PARTITION_COUNT) {
      checkLogger.warn(
        { count, threshold: SCALE_ALERT_THRESHOLDS.WARNING_PARTITION_COUNT },
        'WARNING: Partition count approaching warning threshold'
      );
      sendTelegramAlert(
        `🟡 *WARNING: Partition Count*\nCount: ${count}\nThreshold: ${SCALE_ALERT_THRESHOLDS.WARNING_PARTITION_COUNT}`,
        checkLogger
      );
    } else {
      checkLogger.debug({ count }, 'Partition count within normal range');
    }
  }

  function evaluateRowCount(count: number, checkLogger: Logger): void {
    // Warn if approaching 1B rows (PostgreSQL performance boundary)
    const warningThreshold = 800_000_000;
    const criticalThreshold = 950_000_000;

    if (count >= criticalThreshold) {
      checkLogger.error(
        { count, threshold: criticalThreshold },
        'CRITICAL: Row count approaching 1B — partition expansion required'
      );
      sendTelegramAlert(
        `🔴 *CRITICAL: Row Count*\nCount: ${count.toLocaleString()}\nThreshold: ${criticalThreshold.toLocaleString()}\nAction required: partition expansion needed`,
        checkLogger
      );
    } else if (count >= warningThreshold) {
      checkLogger.warn(
        { count, threshold: warningThreshold },
        'WARNING: Row count approaching warning threshold'
      );
      sendTelegramAlert(
        `🟡 *WARNING: Row Count*\nCount: ${count.toLocaleString()}\nThreshold: ${warningThreshold.toLocaleString()}`,
        checkLogger
      );
    }
  }

  function evaluateConnections(count: number, checkLogger: Logger): void {
    // Conservative thresholds for Supabase-managed PgBouncer
    const warningThreshold = 80; // % of max connections
    const criticalThreshold = 95;

    // Assuming max 500 connections (Supabase Pro default)
    const maxConnections = 500;
    const percent = (count / maxConnections) * 100;

    if (percent >= criticalThreshold) {
      checkLogger.error(
        { count, percent, maxConnections },
        'CRITICAL: Connection pool near exhaustion'
      );
      sendTelegramAlert(
        `🔴 *CRITICAL: Connection Pool*\nActive: ${count}/${maxConnections} (${percent.toFixed(1)}%)\nAction required: connection pool near exhaustion`,
        checkLogger
      );
    } else if (percent >= warningThreshold) {
      checkLogger.warn(
        { count, percent, maxConnections },
        'WARNING: Connection pool usage elevated'
      );
      sendTelegramAlert(
        `🟡 *WARNING: Connection Pool*\nActive: ${count}/${maxConnections} (${percent.toFixed(1)}%)`,
        checkLogger
      );
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      logger.info(
        { intervalMs: config.scaleAlertsIntervalMs },
        'Scale alerts service starting'
      );

      // Run immediately, then on interval
      check();
      intervalHandle = setInterval(check, config.scaleAlertsIntervalMs);
    },

    stop() {
      if (!running) return;
      running = false;
      if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
      logger.info('Scale alerts service stopped');
    },

    isHealthy() {
      if (!running) return false;
      if (lastRunAt) {
        const age = Date.now() - new Date(lastRunAt).getTime();
        return age < config.scaleAlertsIntervalMs * 3;
      }
      return true;
    },

    getHealth(): ServiceHealth {
      return {
        name: 'scale_alerts',
        running,
        last_run_at: lastRunAt,
        error_count: errorCount,
        last_error: lastError,
      };
    },
  };
}

// ============================================
// DATA ACCESS HELPERS
// ============================================

async function fetchPartitionCount(
  config: ControlPlaneConfig
): Promise<number> {
  // Query pg_catalog for partition count on email_events
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/rpc/get_partition_count`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch partition count: ${response.status}`);
  }

  const result = (await response.json()) as number;
  return result;
}

async function fetchTotalRowCount(
  config: ControlPlaneConfig
): Promise<number> {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/rpc/get_email_events_row_count`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch row count: ${response.status}`);
  }

  const result = (await response.json()) as number;
  return result;
}

async function fetchConnectionCount(
  config: ControlPlaneConfig
): Promise<number> {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/rpc/get_connection_count`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch connection count: ${response.status}`);
  }

  const result = (await response.json()) as number;
  return result;
}
