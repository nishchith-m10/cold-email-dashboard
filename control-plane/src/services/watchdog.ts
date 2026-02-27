/**
 * PHASE 73: Watchdog Service
 *
 * Polls Sidecar agents every 60 seconds to detect zombies and degraded nodes.
 * Triggers remediation actions (alerts, reboots) via BullMQ.
 *
 * Integrates with Phase 43 (Watchdog) types and Phase 72 (Fleet Updates).
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5, 43.x
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { ControlPlaneConfig, Logger } from '../config';
import { sendTelegramAlert } from './telegram';
import type {
  ServiceHealth,
  DropletHealthRecord,
  WatchdogAction,
  HardRebootJob,
} from '../../../packages/shared/types';
import { QUEUE_NAMES } from '../../../packages/shared/types';
import { WATCHDOG_THRESHOLDS } from '../../../packages/shared/constants';

export interface WatchdogService {
  start(): void;
  stop(): void;
  isHealthy(): boolean;
  getHealth(): ServiceHealth;
}

export function createWatchdogService(
  config: ControlPlaneConfig,
  logger: Logger
): WatchdogService {
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let lastRunAt: string | null = null;
  let errorCount = 0;
  let lastError: string | null = null;
  let degraded = false;
  let degradedReason: string | null = null;

  // D8-007: Graceful degradation — wrap Redis/BullMQ in try-catch
  let redis: IORedis | null = null;
  let rebootQueue: Queue | null = null;

  try {
    redis = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
    rebootQueue = new Queue(QUEUE_NAMES.HARD_REBOOT, { connection: redis });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    degraded = true;
    degradedReason = `Redis not available — watchdog remediation (reboots) disabled: ${errMsg}`;
    logger.warn({ error: errMsg }, 'Redis not available — watchdog running in degraded mode (health checks only, no reboot queue)');
  }

  async function poll(): Promise<void> {
    try {
      const droplets = await fetchAllDroplets(config);
      const now = Date.now();

      for (const droplet of droplets) {
        const actions = evaluateDropletHealth(droplet, now);

        for (const action of actions) {
          await executeAction(action, config, logger);
        }
      }

      lastRunAt = new Date().toISOString();
    } catch (error) {
      errorCount++;
      lastError =
        error instanceof Error ? error.message : 'Unknown watchdog error';
      logger.error({ error: lastError }, 'Watchdog poll error');
    }
  }

  function evaluateDropletHealth(
    droplet: DropletHealthRecord,
    nowMs: number
  ): WatchdogAction[] {
    const actions: WatchdogAction[] = [];
    const heartbeatAge =
      nowMs - new Date(droplet.last_heartbeat_at).getTime();
    const heartbeatThresholdMs =
      WATCHDOG_THRESHOLDS.HEARTBEAT_TIMEOUT_MINUTES * 60 * 1000;

    // Check heartbeat timeout → zombie
    if (heartbeatAge > heartbeatThresholdMs) {
      actions.push({
        workspace_id: droplet.workspace_id,
        droplet_id: droplet.droplet_id,
        action: 'mark_zombie',
        reason: `No heartbeat for ${Math.floor(heartbeatAge / 1000)}s (threshold: ${WATCHDOG_THRESHOLDS.HEARTBEAT_TIMEOUT_MINUTES * 60}s)`,
        timestamp: new Date().toISOString(),
      });

      // Also schedule reboot
      actions.push({
        workspace_id: droplet.workspace_id,
        droplet_id: droplet.droplet_id,
        action: 'reboot',
        reason: 'Zombie detected — heartbeat timeout',
        timestamp: new Date().toISOString(),
      });
    }

    // Check resource thresholds
    if (
      droplet.cpu_percent !== null &&
      droplet.cpu_percent > WATCHDOG_THRESHOLDS.MAX_CPU_PERCENT
    ) {
      actions.push({
        workspace_id: droplet.workspace_id,
        droplet_id: droplet.droplet_id,
        action: 'alert',
        reason: `CPU at ${droplet.cpu_percent}% (threshold: ${WATCHDOG_THRESHOLDS.MAX_CPU_PERCENT}%)`,
        timestamp: new Date().toISOString(),
      });
    }

    if (
      droplet.memory_percent !== null &&
      droplet.memory_percent > WATCHDOG_THRESHOLDS.MAX_MEMORY_PERCENT
    ) {
      actions.push({
        workspace_id: droplet.workspace_id,
        droplet_id: droplet.droplet_id,
        action: 'alert',
        reason: `Memory at ${droplet.memory_percent}% (threshold: ${WATCHDOG_THRESHOLDS.MAX_MEMORY_PERCENT}%)`,
        timestamp: new Date().toISOString(),
      });
    }

    if (
      droplet.disk_percent !== null &&
      droplet.disk_percent > WATCHDOG_THRESHOLDS.MAX_DISK_PERCENT
    ) {
      actions.push({
        workspace_id: droplet.workspace_id,
        droplet_id: droplet.droplet_id,
        action: 'alert',
        reason: `Disk at ${droplet.disk_percent}% (threshold: ${WATCHDOG_THRESHOLDS.MAX_DISK_PERCENT}%)`,
        timestamp: new Date().toISOString(),
      });
    }

    return actions;
  }

  async function executeAction(
    action: WatchdogAction,
    _config: ControlPlaneConfig,
    actionLogger: Logger
  ): Promise<void> {
    actionLogger.info(
      {
        workspace_id: action.workspace_id,
        droplet_id: action.droplet_id,
        action: action.action,
        reason: action.reason,
      },
      'Watchdog action triggered'
    );

    if (action.action === 'reboot') {
      // D8-007: Only queue reboot if Redis/BullMQ is available
      if (rebootQueue) {
        const jobData: HardRebootJob = {
          droplet_id: action.droplet_id,
          workspace_id: action.workspace_id,
          reason: 'zombie_detected',
        };

        await rebootQueue.add('hard-reboot', jobData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
        });

        actionLogger.info(
          { droplet_id: action.droplet_id },
          'Hard reboot job enqueued'
        );
      } else {
        // Degraded mode — log critical alert instead of queuing
        actionLogger.error(
          {
            droplet_id: action.droplet_id,
            workspace_id: action.workspace_id,
            reason: action.reason,
          },
          'CRITICAL: Reboot required but Redis/BullMQ unavailable — manual intervention needed'
        );
      }
    }

    if (action.action === 'mark_zombie') {
      await markDropletZombie(action.workspace_id, _config);
    }

    // Send alert actions to Telegram
    if (action.action === 'alert') {
      const msg = [
        '🔴 *Watchdog Alert*',
        `*Action:* ${action.action}`,
        `*Workspace:* \`${action.workspace_id}\``,
        `*Droplet:* \`${action.droplet_id}\``,
        `*Reason:* ${action.reason}`,
      ].join('\n');
      await sendTelegramAlert(msg, actionLogger);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      logger.info(
        { intervalMs: config.watchdogIntervalMs },
        'Watchdog service starting'
      );

      // Run immediately, then on interval
      poll();
      intervalHandle = setInterval(poll, config.watchdogIntervalMs);
    },

    stop() {
      if (!running) return;
      running = false;
      if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
      // D8-007: Only close Redis/BullMQ if they were initialized
      if (rebootQueue) rebootQueue.close().catch(() => {});
      if (redis) redis.quit().catch(() => {});
      logger.info('Watchdog service stopped');
    },

    isHealthy() {
      if (!running) return false;
      // D8-007: Degraded mode is explicitly unhealthy
      if (degraded) return false;
      // Unhealthy if last run was more than 3x the interval ago
      if (lastRunAt) {
        const age = Date.now() - new Date(lastRunAt).getTime();
        return age < config.watchdogIntervalMs * 3;
      }
      return true; // Just started
    },

    getHealth(): ServiceHealth {
      return {
        name: 'watchdog',
        running,
        last_run_at: lastRunAt,
        error_count: errorCount,
        last_error: lastError,
        // D8-007: Surface degradation reason in health check
        ...(degraded ? { degraded: true, degraded_reason: degradedReason } : {}),
      } as ServiceHealth;
    },
  };
}

// ============================================
// DATA ACCESS HELPERS
// ============================================

async function fetchAllDroplets(
  config: ControlPlaneConfig
): Promise<DropletHealthRecord[]> {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/droplet_health?select=workspace_id,droplet_id,state,last_heartbeat_at,cpu_percent,memory_percent,disk_percent&state=neq.HIBERNATED`,
    {
      headers: {
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch droplet health: ${response.status}`);
  }

  return (await response.json()) as DropletHealthRecord[];
}

async function markDropletZombie(
  workspaceId: string,
  config: ControlPlaneConfig
): Promise<void> {
  await fetch(
    `${config.supabaseUrl}/rest/v1/droplet_health?workspace_id=eq.${workspaceId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        state: 'ZOMBIE',
        updated_at: new Date().toISOString(),
      }),
    }
  );
}
