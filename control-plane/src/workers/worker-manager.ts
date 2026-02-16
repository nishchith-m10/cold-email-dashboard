/**
 * PHASE 73: WORKER MANAGER
 *
 * Manages all BullMQ workers lifecycle.
 * Follows Principle 4: Horizontal Scalability.
 * Each worker uses BullMQ concurrency limiter (not process-level).
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5
 */

import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import type { ControlPlaneConfig, Logger } from '../config';
import type { WorkerHealth } from '../../../packages/shared/types';
import {
  QUEUE_NAMES,
  type WorkflowUpdateJob,
  type SidecarUpdateJob,
  type WakeDropletJob,
  type CredentialInjectJob,
  type HardRebootJob,
} from '../../../packages/shared/types';
import { processWorkflowUpdate } from './workflow-update';
import { processSidecarUpdate } from './sidecar-update';
import { processWakeDroplet } from './wake-droplet';
import { processCredentialInject } from './credential-inject';

// ============================================
// WORKER STATS TRACKER
// ============================================

interface WorkerStats {
  completed: number;
  failed: number;
  active: number;
}

// ============================================
// WORKER MANAGER
// ============================================

export interface WorkerManager {
  start(): Promise<void>;
  getNames(): string[];
  isHealthy(): boolean;
  getHealthReport(): Record<string, WorkerHealth>;
  gracefulShutdown(timeoutMs: number): Promise<void>;
}

export function createWorkerManager(
  config: ControlPlaneConfig,
  logger: Logger
): WorkerManager {
  const workers: Worker[] = [];
  const stats: Record<string, WorkerStats> = {};
  let connection: Redis;

  function trackWorker(name: string, worker: Worker): void {
    stats[name] = { completed: 0, failed: 0, active: 0 };

    worker.on('completed', (job: Job) => {
      stats[name].completed++;
      stats[name].active = Math.max(0, stats[name].active - 1);
      logger.info(
        { worker: name, jobId: job.id, duration: Date.now() - (job.processedOn || Date.now()) },
        'Job completed'
      );
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      stats[name].failed++;
      stats[name].active = Math.max(0, stats[name].active - 1);
      logger.error(
        { worker: name, jobId: job?.id, error: error.message },
        'Job failed'
      );
    });

    worker.on('active', (job: Job) => {
      stats[name].active++;
      logger.debug({ worker: name, jobId: job.id }, 'Job active');
    });

    worker.on('error', (error: Error) => {
      logger.error({ worker: name, error: error.message }, 'Worker error');
    });

    workers.push(worker);
  }

  return {
    async start() {
      // Create shared Redis connection for all workers
      connection = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
      });

      // Workflow Update Worker (spec 69.5)
      const workflowWorker = new Worker<WorkflowUpdateJob>(
        QUEUE_NAMES.WORKFLOW_UPDATE,
        async (job) => processWorkflowUpdate(job.data, config, logger),
        { connection, concurrency: config.workflowUpdateConcurrency }
      );
      trackWorker(QUEUE_NAMES.WORKFLOW_UPDATE, workflowWorker);

      // Sidecar Update Worker
      const sidecarWorker = new Worker<SidecarUpdateJob>(
        QUEUE_NAMES.SIDECAR_UPDATE,
        async (job) => processSidecarUpdate(job.data, config, logger),
        { connection, concurrency: config.sidecarUpdateConcurrency }
      );
      trackWorker(QUEUE_NAMES.SIDECAR_UPDATE, sidecarWorker);

      // Wake Droplet Worker
      const wakeWorker = new Worker<WakeDropletJob>(
        QUEUE_NAMES.WAKE_DROPLET,
        async (job) => processWakeDroplet(job.data, config, logger),
        { connection, concurrency: config.wakeDropletConcurrency }
      );
      trackWorker(QUEUE_NAMES.WAKE_DROPLET, wakeWorker);

      // Credential Inject Worker
      const credWorker = new Worker<CredentialInjectJob>(
        QUEUE_NAMES.CREDENTIAL_INJECT,
        async (job) => processCredentialInject(job.data, config, logger),
        { connection, concurrency: config.credentialInjectConcurrency }
      );
      trackWorker(QUEUE_NAMES.CREDENTIAL_INJECT, credWorker);

      // Hard Reboot Worker (from Watchdog)
      const rebootWorker = new Worker<HardRebootJob>(
        QUEUE_NAMES.HARD_REBOOT,
        async (job) => {
          const { droplet_id, workspace_id, reason } = job.data;
          logger.info({ droplet_id, workspace_id, reason }, 'Hard rebooting droplet');

          // Call DigitalOcean API to power cycle
          if (config.digitalOceanApiToken) {
            const response = await fetch(
              `https://api.digitalocean.com/v2/droplets/${droplet_id}/actions`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${config.digitalOceanApiToken}`,
                },
                body: JSON.stringify({ type: 'power_cycle' }),
              }
            );

            if (!response.ok) {
              throw new Error(
                `DO API error ${response.status}: ${await response.text()}`
              );
            }

            logger.info({ droplet_id }, 'Hard reboot initiated via DO API');
          } else {
            logger.warn(
              { droplet_id },
              'No DO API token — hard reboot skipped (dry run)'
            );
          }
        },
        { connection, concurrency: 10 }
      );
      trackWorker(QUEUE_NAMES.HARD_REBOOT, rebootWorker);
    },

    getNames() {
      return Object.keys(stats);
    },

    isHealthy() {
      return workers.every((w) => w.isRunning());
    },

    getHealthReport() {
      const report: Record<string, WorkerHealth> = {};
      for (const [name, s] of Object.entries(stats)) {
        const worker = workers.find(
          (w) => w.name === name
        );
        report[name] = {
          name,
          running: worker?.isRunning() ?? false,
          concurrency: 0, // BullMQ doesn't expose this directly
          completed_jobs: s.completed,
          failed_jobs: s.failed,
          active_jobs: s.active,
        };
      }
      return report;
    },

    async gracefulShutdown(timeoutMs: number) {
      logger.info(
        { timeout: timeoutMs, workers: workers.length },
        'Shutting down workers gracefully'
      );

      // Close all workers (waits for in-flight jobs)
      await Promise.all(
        workers.map((w) =>
          Promise.race([
            w.close(),
            new Promise<void>((resolve) =>
              setTimeout(resolve, timeoutMs)
            ),
          ])
        )
      );

      // Close Redis connection
      await connection?.quit();
      logger.info('All workers shut down');
    },
  };
}
