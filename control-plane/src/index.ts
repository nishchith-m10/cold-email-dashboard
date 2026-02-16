/**
 * PHASE 73: CONTROL PLANE — MAIN ENTRY POINT
 *
 * Genesis Control Plane 24/7 Node.js service.
 * Runs long-running workers and services that can't run on Vercel.
 *
 * Components:
 *   - BullMQ Workers (workflow-update, sidecar-update, wake-droplet, credential-inject)
 *   - Watchdog Service (Phase 43 — poll Sidecars every 60s)
 *   - Scale Alerts Worker (Phase 44.3 — monitor DB metrics every 15 min)
 *   - Heartbeat Processor (Phase 54 — process 15k pings/min)
 *   - Health Check endpoint (/health)
 *
 * Follows 12-Factor App Principles:
 *   1. All config from env vars (config.ts)
 *   2. Structured JSON logging (pino)
 *   3. Stateless — all state in Redis/Supabase
 *   4. Horizontally scalable — safe for N instances
 *   5. Platform-agnostic /health endpoint
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5
 */

import express from 'express';
import { loadConfig, createLogger } from './config';
import { createWorkerManager } from './workers/worker-manager';
import { createWatchdogService } from './services/watchdog';
import { createScaleAlertsService } from './services/scale-alerts';
import { createHeartbeatProcessor } from './services/heartbeat-processor';
import type { ControlPlaneHealth } from '../../packages/shared/types';

// ============================================
// GLOBAL STATE (process-level)
// ============================================

const startedAt = new Date();
let isShuttingDown = false;

// ============================================
// MAIN
// ============================================

async function main() {
  // 1. Load config (fails fast on missing env vars)
  const config = loadConfig();
  const logger = createLogger(config);

  logger.info({ stage: 'startup' }, 'Genesis Control Plane starting...');

  // 2. Initialize BullMQ Workers
  const workerManager = createWorkerManager(config, logger);
  await workerManager.start();
  logger.info(
    { workers: workerManager.getNames() },
    'BullMQ workers started'
  );

  // 3. Start long-running services
  const watchdog = createWatchdogService(config, logger);
  const scaleAlerts = createScaleAlertsService(config, logger);
  const heartbeat = createHeartbeatProcessor(config, logger);

  watchdog.start();
  scaleAlerts.start();
  heartbeat.start();

  logger.info('Background services started');

  // 4. Health check endpoint (spec 69.5, 69.9.2 Principle 5)
  const app = express();

  app.get('/health', (_req: any, res: any) => {
    const uptimeSeconds = Math.floor(
      (Date.now() - startedAt.getTime()) / 1000
    );

    const health: ControlPlaneHealth = {
      status: isShuttingDown
        ? 'unhealthy'
        : workerManager.isHealthy() && watchdog.isHealthy()
          ? 'healthy'
          : 'degraded',
      uptime_seconds: uptimeSeconds,
      started_at: startedAt.toISOString(),
      workers: workerManager.getHealthReport(),
      services: {
        watchdog: watchdog.getHealth(),
        scale_alerts: scaleAlerts.getHealth(),
        heartbeat_processor: heartbeat.getHealth(),
      },
      version: '1.0.0',
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  app.get('/', (_req: any, res: any) => {
    res.json({ service: 'genesis-control-plane', status: 'running' });
  });

  const server = app.listen(config.port, config.host, () => {
    logger.info(
      { port: config.port, host: config.host },
      'Health check endpoint ready'
    );
  });

  // 5. Graceful shutdown (spec 69.9.2 — required for K8s rolling updates)
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Graceful shutdown initiated');

    // Stop accepting new health check requests
    server.close();

    // Stop background services
    watchdog.stop();
    scaleAlerts.stop();
    heartbeat.stop();

    // Wait for in-flight BullMQ jobs to complete
    await workerManager.gracefulShutdown(config.gracefulShutdownTimeoutMs);

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });

  logger.info(
    {
      port: config.port,
      workers: workerManager.getNames().length,
      services: 3,
    },
    'Genesis Control Plane fully operational'
  );
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
