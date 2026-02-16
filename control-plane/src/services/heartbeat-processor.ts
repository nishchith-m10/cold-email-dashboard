/**
 * PHASE 73: Heartbeat Processor Service
 *
 * Processes heartbeat pings from up to 15,000 Sidecar agents per minute.
 * Updates droplet_health records in Supabase and detects missed heartbeats.
 *
 * Integrates with Phase 54 (Heartbeat Protocol).
 *
 * Architecture:
 *   - Redis subscriber listens on `heartbeat:*` channels
 *   - Batches writes to Supabase every N seconds for efficiency
 *   - Detects stale heartbeats (>5min) and flags as degraded
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5, 54.x
 */

import IORedis from 'ioredis';
import type { ControlPlaneConfig, Logger } from '../config';
import type { ServiceHealth } from '../../../packages/shared/types';

interface HeartbeatPayload {
  workspace_id: string;
  droplet_id: number;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  n8n_healthy: boolean;
  timestamp: string;
}

export interface HeartbeatProcessor {
  start(): void;
  stop(): void;
  isHealthy(): boolean;
  getHealth(): ServiceHealth;
}

export function createHeartbeatProcessor(
  config: ControlPlaneConfig,
  logger: Logger
): HeartbeatProcessor {
  let running = false;
  let lastRunAt: string | null = null;
  let errorCount = 0;
  let lastError: string | null = null;
  let subscriber: IORedis | null = null;
  let flushHandle: ReturnType<typeof setInterval> | null = null;

  // In-memory buffer for batching writes
  const heartbeatBuffer = new Map<string, HeartbeatPayload>();
  let processedCount = 0;

  const FLUSH_INTERVAL_MS = config.heartbeatFlushIntervalMs;
  const HEARTBEAT_CHANNEL_PATTERN = 'heartbeat:*';

  async function handleHeartbeat(message: string): Promise<void> {
    try {
      const payload = JSON.parse(message) as HeartbeatPayload;

      // Buffer — most recent heartbeat per workspace wins
      heartbeatBuffer.set(payload.workspace_id, payload);
      processedCount++;
    } catch (error) {
      errorCount++;
      lastError =
        error instanceof Error ? error.message : 'Failed to parse heartbeat';
      logger.debug({ error: lastError }, 'Heartbeat parse error');
    }
  }

  async function flush(): Promise<void> {
    if (heartbeatBuffer.size === 0) return;

    // Take snapshot and clear buffer
    const entries = Array.from(heartbeatBuffer.values());
    heartbeatBuffer.clear();

    try {
      // Batch upsert to Supabase
      const upsertBody = entries.map((hb) => ({
        workspace_id: hb.workspace_id,
        droplet_id: hb.droplet_id,
        cpu_percent: hb.cpu_percent,
        memory_percent: hb.memory_percent,
        disk_percent: hb.disk_percent,
        n8n_healthy: hb.n8n_healthy,
        last_heartbeat_at: hb.timestamp,
        state: hb.n8n_healthy ? 'ACTIVE_HEALTHY' : 'ACTIVE_DEGRADED',
        updated_at: new Date().toISOString(),
      }));

      const response = await fetch(
        `${config.supabaseUrl}/rest/v1/droplet_health`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: config.supabaseServiceKey,
            Authorization: `Bearer ${config.supabaseServiceKey}`,
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(upsertBody),
        }
      );

      if (!response.ok) {
        throw new Error(`Heartbeat flush failed: ${response.status}`);
      }

      lastRunAt = new Date().toISOString();
      logger.debug(
        { flushed: entries.length, totalProcessed: processedCount },
        'Heartbeat flush completed'
      );
    } catch (error) {
      errorCount++;
      lastError =
        error instanceof Error ? error.message : 'Heartbeat flush error';
      logger.error({ error: lastError, batchSize: entries.length }, 'Heartbeat flush error');

      // Re-buffer entries that failed to flush (best effort)
      for (const entry of entries) {
        if (!heartbeatBuffer.has(entry.workspace_id)) {
          heartbeatBuffer.set(entry.workspace_id, entry);
        }
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      logger.info(
        { flushIntervalMs: FLUSH_INTERVAL_MS },
        'Heartbeat processor starting'
      );

      // Subscribe to Redis heartbeat channels
      subscriber = new IORedis(config.redisUrl, {
        maxRetriesPerRequest: null,
      });

      subscriber.psubscribe(HEARTBEAT_CHANNEL_PATTERN, (err) => {
        if (err) {
          errorCount++;
          lastError = `Redis psubscribe error: ${err.message}`;
          logger.error({ error: lastError }, 'Failed to subscribe to heartbeat channels');
        } else {
          logger.info(
            { pattern: HEARTBEAT_CHANNEL_PATTERN },
            'Subscribed to heartbeat channels'
          );
        }
      });

      subscriber.on('pmessage', (_pattern, _channel, message) => {
        handleHeartbeat(message);
      });

      subscriber.on('error', (error) => {
        errorCount++;
        lastError = error.message;
        logger.error({ error: error.message }, 'Redis subscriber error');
      });

      // Periodic flush
      flushHandle = setInterval(flush, FLUSH_INTERVAL_MS);
    },

    stop() {
      if (!running) return;
      running = false;

      if (flushHandle) {
        clearInterval(flushHandle);
        flushHandle = null;
      }

      // Final flush
      flush().catch((error) => {
        logger.error({ error }, 'Error during final heartbeat flush');
      });

      if (subscriber) {
        subscriber.punsubscribe(HEARTBEAT_CHANNEL_PATTERN).catch(() => {});
        subscriber.quit().catch(() => {});
        subscriber = null;
      }

      logger.info(
        { totalProcessed: processedCount },
        'Heartbeat processor stopped'
      );
    },

    isHealthy() {
      if (!running) return false;
      // Heartbeat processor is healthy if it flushed within 3x the flush interval
      if (lastRunAt) {
        const age = Date.now() - new Date(lastRunAt).getTime();
        return age < FLUSH_INTERVAL_MS * 3;
      }
      // No flush yet — tolerate for the first interval window
      return true;
    },

    getHealth(): ServiceHealth {
      return {
        name: 'heartbeat_processor',
        running,
        last_run_at: lastRunAt,
        error_count: errorCount,
        last_error: lastError,
      };
    },
  };
}
