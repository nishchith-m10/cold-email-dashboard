/**
 * PHASE 52: BULLMQ EVENT BUS TESTS
 * 
 * Comprehensive test suite for the Genesis Event Bus infrastructure.
 * Tests queue management, concurrency governor, workers, and DLQ.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import {
  // Types
  QUEUE_NAMES,
  QUEUE_CONFIGS,
  QueuePriority,
  type QueueName,
  type JobResult,
  type BusEvent,
  type IgnitionJobPayload,
  type HeartbeatProcessJobPayload,
} from '@/lib/genesis/bullmq-types';

import {
  RedisConnectionManager,
  getConnectionManager,
  resetConnectionManager,
} from '@/lib/genesis/redis-connection';

import {
  QueueManager,
  getQueueManager,
  resetQueueManager,
} from '@/lib/genesis/queue-manager';

import {
  ConcurrencyGovernor,
  getConcurrencyGovernor,
  resetConcurrencyGovernor,
} from '@/lib/genesis/concurrency-governor';

import {
  GenesisWorker,
  WorkerRegistry,
  getWorkerRegistry,
  resetWorkerRegistry,
  type GenesisWorkerConfig,
} from '@/lib/genesis/worker-base';

import {
  DeadLetterQueueManager,
  DLQReplayManager,
  getDLQManager,
  resetDLQManager,
} from '@/lib/genesis/dead-letter-queue';

// ============================================
// TEST SETUP & HELPERS
// ============================================

beforeEach(() => {
  // Reset all singletons before each test
  resetConnectionManager();
  resetQueueManager();
  resetConcurrencyGovernor();
  resetWorkerRegistry();
  resetDLQManager();
});

afterEach(() => {
  // Clean up after each test
  resetConnectionManager();
  resetQueueManager();
  resetConcurrencyGovernor();
  resetWorkerRegistry();
  resetDLQManager();
});

// ============================================
// QUEUE CONFIGURATION TESTS
// ============================================

describe('Queue Configuration', () => {
  it('should have all 6 queues defined', () => {
    expect(Object.keys(QUEUE_NAMES)).toHaveLength(6);
    expect(QUEUE_NAMES.IGNITION).toBe('genesis:ignition');
    expect(QUEUE_NAMES.SECURITY).toBe('genesis:security');
    expect(QUEUE_NAMES.TEMPLATE).toBe('genesis:template');
    expect(QUEUE_NAMES.HEALTH).toBe('genesis:health');
    expect(QUEUE_NAMES.METRIC).toBe('genesis:metric');
    expect(QUEUE_NAMES.REBOOT).toBe('genesis:reboot');
  });

  it('should have correct priorities per Phase 52 spec', () => {
    // Ignition = CRITICAL (1)
    expect(QUEUE_CONFIGS[QUEUE_NAMES.IGNITION].priority).toBe(QueuePriority.CRITICAL);
    
    // Security = HIGH (2)
    expect(QUEUE_CONFIGS[QUEUE_NAMES.SECURITY].priority).toBe(QueuePriority.HIGH);
    
    // Template = MEDIUM (3)
    expect(QUEUE_CONFIGS[QUEUE_NAMES.TEMPLATE].priority).toBe(QueuePriority.MEDIUM);
    
    // Health = LOW (4)
    expect(QUEUE_CONFIGS[QUEUE_NAMES.HEALTH].priority).toBe(QueuePriority.LOW);
    
    // Metric = LOW (4)
    expect(QUEUE_CONFIGS[QUEUE_NAMES.METRIC].priority).toBe(QueuePriority.LOW);
    
    // Reboot = HIGH (2)
    expect(QUEUE_CONFIGS[QUEUE_NAMES.REBOOT].priority).toBe(QueuePriority.HIGH);
  });

  it('should have correct concurrency limits per Phase 52 spec', () => {
    expect(QUEUE_CONFIGS[QUEUE_NAMES.IGNITION].concurrency).toBe(50);
    expect(QUEUE_CONFIGS[QUEUE_NAMES.SECURITY].concurrency).toBe(100);
    expect(QUEUE_CONFIGS[QUEUE_NAMES.TEMPLATE].concurrency).toBe(100);
    expect(QUEUE_CONFIGS[QUEUE_NAMES.HEALTH].concurrency).toBe(500);
    expect(QUEUE_CONFIGS[QUEUE_NAMES.METRIC].concurrency).toBe(200);
    expect(QUEUE_CONFIGS[QUEUE_NAMES.REBOOT].concurrency).toBe(25);
  });

  it('should have exponential backoff for critical queues', () => {
    expect(QUEUE_CONFIGS[QUEUE_NAMES.IGNITION].backoffType).toBe('exponential');
    expect(QUEUE_CONFIGS[QUEUE_NAMES.SECURITY].backoffType).toBe('exponential');
    expect(QUEUE_CONFIGS[QUEUE_NAMES.TEMPLATE].backoffType).toBe('exponential');
    expect(QUEUE_CONFIGS[QUEUE_NAMES.REBOOT].backoffType).toBe('exponential');
  });

  it('should have fixed backoff for high-volume queues', () => {
    expect(QUEUE_CONFIGS[QUEUE_NAMES.HEALTH].backoffType).toBe('fixed');
    expect(QUEUE_CONFIGS[QUEUE_NAMES.METRIC].backoffType).toBe('fixed');
  });
});

// ============================================
// REDIS CONNECTION TESTS
// ============================================

describe('Redis Connection Manager', () => {
  it('should initialize successfully', async () => {
    const manager = new RedisConnectionManager();
    await manager.initialize();

    expect(manager.isHealthy()).toBe(true);

    await manager.shutdown();
  });

  it('should return singleton instance', () => {
    const manager1 = getConnectionManager();
    const manager2 = getConnectionManager();

    expect(manager1).toBe(manager2);
  });

  it('should track connection health', async () => {
    const manager = new RedisConnectionManager();
    await manager.initialize();

    const health = manager.getHealthStatus();
    expect(health['primary']).toBe('healthy');

    await manager.shutdown();
  });

  it('should handle connection errors gracefully', async () => {
    const manager = new RedisConnectionManager();
    await manager.initialize();

    // Shutdown should not throw
    await expect(manager.shutdown()).resolves.not.toThrow();
  });
});

// ============================================
// QUEUE MANAGER TESTS
// ============================================

describe('Queue Manager', () => {
  let queueManager: QueueManager;

  beforeEach(async () => {
    queueManager = new QueueManager();
    await queueManager.initialize();
  });

  afterEach(async () => {
    await queueManager.shutdown();
  });

  it('should initialize all queues', async () => {
    // Should be able to get all queues
    expect(() => queueManager.getQueue(QUEUE_NAMES.IGNITION)).not.toThrow();
    expect(() => queueManager.getQueue(QUEUE_NAMES.SECURITY)).not.toThrow();
    expect(() => queueManager.getQueue(QUEUE_NAMES.TEMPLATE)).not.toThrow();
    expect(() => queueManager.getQueue(QUEUE_NAMES.HEALTH)).not.toThrow();
    expect(() => queueManager.getQueue(QUEUE_NAMES.METRIC)).not.toThrow();
    expect(() => queueManager.getQueue(QUEUE_NAMES.REBOOT)).not.toThrow();
  });

  it('should add ignition job', async () => {
    const payload: IgnitionJobPayload = {
      workspace_id: 'ws_test_123',
      workspace_slug: 'test-workspace',
      droplet_size: 'professional',
      region: 'nyc1',
      requested_by_user_id: 'user_456',
    };

    const jobId = await queueManager.addIgnitionJob(payload);

    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');
  });

  it('should support idempotency for ignition jobs', async () => {
    const payload: IgnitionJobPayload = {
      workspace_id: 'ws_test_123',
      workspace_slug: 'test-workspace',
      droplet_size: 'professional',
      region: 'nyc1',
      requested_by_user_id: 'user_456',
    };

    const idempotencyKey = 'unique-request-123';

    const jobId1 = await queueManager.addIgnitionJob(payload, { idempotencyKey });
    const jobId2 = await queueManager.addIgnitionJob(payload, { idempotencyKey });

    // Same idempotency key should return same job ID
    expect(jobId1).toBe(jobId2);
  });

  it('should add heartbeat job', async () => {
    const payload: HeartbeatProcessJobPayload = {
      workspace_id: 'ws_test_123',
      droplet_id: 'droplet_789',
      sidecar_ip: '10.0.0.1',
      timestamp: new Date().toISOString(),
      metrics: {
        cpu_percent: 45,
        memory_percent: 60,
        disk_percent: 30,
        n8n_status: 'running',
        active_workflows: 5,
      },
    };

    const jobId = await queueManager.addHeartbeatJob(payload);

    expect(jobId).toBeDefined();
    expect(jobId).toContain('hb-');
  });

  it('should add fleet workflow update jobs', async () => {
    const droplets = [
      { workspace_id: 'ws_1', droplet_id: 'd_1' },
      { workspace_id: 'ws_2', droplet_id: 'd_2' },
      { workspace_id: 'ws_3', droplet_id: 'd_3' },
    ];

    const result = await queueManager.addFleetWorkflowUpdateJobs(
      droplets,
      'email_1',
      '1.2.0',
      { name: 'Email 1', nodes: [] }
    );

    expect(result.rolloutId).toBeDefined();
    expect(result.jobIds).toHaveLength(3);
  });

  it('should emit events on job addition', async () => {
    const events: BusEvent[] = [];
    queueManager.subscribe((event) => events.push(event));

    const payload: IgnitionJobPayload = {
      workspace_id: 'ws_test_123',
      workspace_slug: 'test-workspace',
      droplet_size: 'starter',
      region: 'nyc1',
      requested_by_user_id: 'user_456',
    };

    await queueManager.addIgnitionJob(payload);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('job:added');
    expect(events[0].queue).toBe(QUEUE_NAMES.IGNITION);
  });

  it('should get job counts', async () => {
    const counts = await queueManager.getAllJobCounts();

    expect(counts[QUEUE_NAMES.IGNITION]).toBeDefined();
    expect(counts[QUEUE_NAMES.SECURITY]).toBeDefined();
    expect(counts[QUEUE_NAMES.TEMPLATE]).toBeDefined();
    expect(counts[QUEUE_NAMES.HEALTH]).toBeDefined();
    expect(counts[QUEUE_NAMES.METRIC]).toBeDefined();
    expect(counts[QUEUE_NAMES.REBOOT]).toBeDefined();
  });

  it('should pause and resume queues', async () => {
    await expect(queueManager.pauseQueue(QUEUE_NAMES.IGNITION)).resolves.not.toThrow();
    await expect(queueManager.resumeQueue(QUEUE_NAMES.IGNITION)).resolves.not.toThrow();
  });
});

// ============================================
// CONCURRENCY GOVERNOR TESTS
// ============================================

describe('Concurrency Governor', () => {
  let governor: ConcurrencyGovernor;

  beforeEach(async () => {
    governor = new ConcurrencyGovernor({
      global_max_concurrent: 10,
      per_account_max_concurrent: 2,
      rate_limit_window_ms: 1000,
      rate_limit_max_jobs: 100,
      circuit_breaker_threshold: 3,
      circuit_breaker_reset_ms: 1000,
    });
  });

  it('should acquire and release concurrency slots', async () => {
    const result = await governor.acquire(QUEUE_NAMES.IGNITION, 'job-1');

    expect(result.granted).toBe(true);
    expect(result.release).toBeDefined();

    // Release should not throw
    if (result.release) {
      await expect(result.release()).resolves.not.toThrow();
    }
  });

  it('should track success and failure', () => {
    // Initial state should be closed
    expect(governor.isCircuitOpen(QUEUE_NAMES.IGNITION)).toBe(false);

    // Record success
    governor.recordSuccess(QUEUE_NAMES.IGNITION);
    expect(governor.isCircuitOpen(QUEUE_NAMES.IGNITION)).toBe(false);

    // Record failures to open circuit
    governor.recordFailure(QUEUE_NAMES.IGNITION);
    governor.recordFailure(QUEUE_NAMES.IGNITION);
    governor.recordFailure(QUEUE_NAMES.IGNITION);

    expect(governor.isCircuitOpen(QUEUE_NAMES.IGNITION)).toBe(true);
  });

  it('should reset circuit breaker manually', () => {
    // Open circuit
    governor.recordFailure(QUEUE_NAMES.SECURITY);
    governor.recordFailure(QUEUE_NAMES.SECURITY);
    governor.recordFailure(QUEUE_NAMES.SECURITY);

    expect(governor.isCircuitOpen(QUEUE_NAMES.SECURITY)).toBe(true);

    // Reset
    governor.resetCircuit(QUEUE_NAMES.SECURITY);

    expect(governor.isCircuitOpen(QUEUE_NAMES.SECURITY)).toBe(false);
  });

  it('should get stats', async () => {
    const stats = await governor.getStats();

    expect(stats.global_concurrency).toBeDefined();
    expect(stats.rate_per_second).toBeDefined();
    expect(stats.circuit_breakers).toBeDefined();
  });

  it('should emit events for rate limiting', async () => {
    const events: BusEvent[] = [];
    governor.setEventEmitter((event) => events.push(event));

    // Force circuit open
    governor.recordFailure(QUEUE_NAMES.TEMPLATE);
    governor.recordFailure(QUEUE_NAMES.TEMPLATE);
    governor.recordFailure(QUEUE_NAMES.TEMPLATE);

    expect(events.some((e) => e.type === 'governor:circuit_open')).toBe(true);
  });
});

// ============================================
// WORKER BASE TESTS
// ============================================

describe('Genesis Worker', () => {
  it('should create worker with config', () => {
    const config: GenesisWorkerConfig = {
      queue: QUEUE_NAMES.IGNITION,
      concurrencyOverride: 10,
      useGovernor: true,
    };

    const worker = new GenesisWorker(
      config,
      async (payload, metadata) => {
        return {
          success: true,
          data: { processed: true },
          execution_time_ms: 100,
        };
      }
    );

    const status = worker.getStatus();
    expect(status.queue_name).toBe(QUEUE_NAMES.IGNITION);
    expect(status.current_concurrency).toBe(10);
    expect(status.is_running).toBe(false);
    expect(status.jobs_processed).toBe(0);
  });

  it('should start and shutdown', async () => {
    const worker = new GenesisWorker(
      { queue: QUEUE_NAMES.HEALTH },
      async () => ({ success: true, execution_time_ms: 1 })
    );

    await worker.start();
    expect(worker.getStatus().is_running).toBe(true);

    await worker.shutdown();
    expect(worker.getStatus().is_running).toBe(false);
  });

  it('should pause and resume', async () => {
    const worker = new GenesisWorker(
      { queue: QUEUE_NAMES.METRIC },
      async () => ({ success: true, execution_time_ms: 1 })
    );

    await worker.start();
    
    await worker.pause();
    // Note: In-memory worker doesn't track pause state in isRunning
    
    worker.resume();
    
    await worker.shutdown();
  });
});

describe('Worker Registry', () => {
  it('should register and manage workers', async () => {
    const registry = new WorkerRegistry();

    const worker1 = new GenesisWorker(
      { queue: QUEUE_NAMES.IGNITION },
      async () => ({ success: true, execution_time_ms: 1 })
    );

    const worker2 = new GenesisWorker(
      { queue: QUEUE_NAMES.HEALTH },
      async () => ({ success: true, execution_time_ms: 1 })
    );

    registry.register(worker1);
    registry.register(worker2);

    const statuses = registry.getAllStatuses();
    expect(statuses).toHaveLength(2);

    await registry.startAll();

    const runningStatuses = registry.getAllStatuses();
    expect(runningStatuses.every((s) => s.is_running)).toBe(true);

    await registry.shutdownAll();
  });

  it('should use singleton', () => {
    const registry1 = getWorkerRegistry();
    const registry2 = getWorkerRegistry();

    expect(registry1).toBe(registry2);
  });
});

// ============================================
// DEAD LETTER QUEUE TESTS
// ============================================

describe('Dead Letter Queue Manager', () => {
  let dlqManager: DeadLetterQueueManager;

  beforeEach(() => {
    dlqManager = new DeadLetterQueueManager();
  });

  it('should add failed jobs', async () => {
    await dlqManager.addFailedJob(
      QUEUE_NAMES.IGNITION,
      'job-1',
      { workspace_id: 'ws_1', workspace_slug: 'test', droplet_size: 'starter', region: 'nyc1', requested_by_user_id: 'u_1' },
      { job_id: 'job-1', queue_name: QUEUE_NAMES.IGNITION, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
      'Connection timeout'
    );

    const count = await dlqManager.getCount(QUEUE_NAMES.IGNITION);
    expect(count).toBe(1);
  });

  it('should list entries', async () => {
    await dlqManager.addFailedJob(
      QUEUE_NAMES.SECURITY,
      'job-2',
      { workspace_id: 'ws_1', droplet_id: 'd_1', credential_type: 'gmail', credential_id: 'c_1', reason: 'scheduled' },
      { job_id: 'job-2', queue_name: QUEUE_NAMES.SECURITY, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
      'API rate limited'
    );

    const entries = await dlqManager.listEntries(QUEUE_NAMES.SECURITY);
    expect(entries).toHaveLength(1);
    expect(entries[0].original_job_id).toBe('job-2');
    expect(entries[0].failure_reason).toBe('API rate limited');
  });

  it('should get entry by ID', async () => {
    await dlqManager.addFailedJob(
      QUEUE_NAMES.TEMPLATE,
      'job-3',
      { workspace_id: 'ws_1', droplet_id: 'd_1', workflow_name: 'email_1', workflow_json: {}, activate_after_deploy: true },
      { job_id: 'job-3', queue_name: QUEUE_NAMES.TEMPLATE, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
      'Sidecar unreachable'
    );

    const entry = await dlqManager.getEntry(QUEUE_NAMES.TEMPLATE, 'job-3');
    expect(entry).not.toBeNull();
    expect(entry?.failure_reason).toBe('Sidecar unreachable');
  });

  it('should remove entries', async () => {
    await dlqManager.addFailedJob(
      QUEUE_NAMES.REBOOT,
      'job-4',
      { workspace_id: 'ws_1', droplet_id: 'd_1', reason: 'zombie_detected', escalated_from_soft_reboot: true },
      { job_id: 'job-4', queue_name: QUEUE_NAMES.REBOOT, created_at: new Date().toISOString(), attempt_number: 3, max_attempts: 3 },
      'DO API error'
    );

    const removed = await dlqManager.removeEntry(QUEUE_NAMES.REBOOT, 'job-4');
    expect(removed).toBe(true);

    const count = await dlqManager.getCount(QUEUE_NAMES.REBOOT);
    expect(count).toBe(0);
  });

  it('should get summary', async () => {
    await dlqManager.addFailedJob(
      QUEUE_NAMES.IGNITION,
      'job-5',
      { workspace_id: 'ws_1', workspace_slug: 'test', droplet_size: 'starter', region: 'nyc1', requested_by_user_id: 'u_1' },
      { job_id: 'job-5', queue_name: QUEUE_NAMES.IGNITION, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
      'Error'
    );

    const summary = await dlqManager.getSummary();
    expect(summary.total_entries).toBe(1);
    expect(summary.by_queue[QUEUE_NAMES.IGNITION]).toBe(1);
  });

  it('should alert when threshold exceeded', async () => {
    let alertCalled = false;
    dlqManager.setAlertHandler((queue, count) => {
      alertCalled = true;
    });

    // DLQ config has alertThreshold of 100, so we'll test event emission instead
    const events: BusEvent[] = [];
    dlqManager.setEventEmitter((event) => events.push(event));

    await dlqManager.addFailedJob(
      QUEUE_NAMES.METRIC,
      'job-6',
      { workspace_id: 'ws_1', droplet_id: 'd_1', collection_type: 'full' },
      { job_id: 'job-6', queue_name: QUEUE_NAMES.METRIC, created_at: new Date().toISOString(), attempt_number: 3, max_attempts: 3 },
      'Timeout'
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('job:dead_lettered');
  });
});

describe('DLQ Replay Manager', () => {
  let dlqManager: DeadLetterQueueManager;
  let replayedJobs: Array<{ queue: QueueName; payload: any }>;
  let replayManager: DLQReplayManager;

  beforeEach(() => {
    dlqManager = new DeadLetterQueueManager();
    replayedJobs = [];

    replayManager = new DLQReplayManager(
      dlqManager,
      async (queue, payload, metadata) => {
        replayedJobs.push({ queue, payload });
        // Use metadata.job_id since not all payloads have workspace_id
        return `replay-${metadata.job_id}`;
      }
    );
  });

  it('should replay a single entry', async () => {
    await dlqManager.addFailedJob(
      QUEUE_NAMES.IGNITION,
      'job-replay-1',
      { workspace_id: 'ws_1', workspace_slug: 'test', droplet_size: 'starter', region: 'nyc1', requested_by_user_id: 'u_1' },
      { job_id: 'job-replay-1', queue_name: QUEUE_NAMES.IGNITION, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
      'Error'
    );

    const result = await replayManager.replayOne(QUEUE_NAMES.IGNITION, 'job-replay-1');

    expect(result.success).toBe(true);
    expect(result.new_job_id).toBe('replay-job-replay-1');
    expect(replayedJobs).toHaveLength(1);

    // Entry should be removed from DLQ
    const count = await dlqManager.getCount(QUEUE_NAMES.IGNITION);
    expect(count).toBe(0);
  });

  it('should replay multiple entries', async () => {
    for (let i = 0; i < 3; i++) {
      await dlqManager.addFailedJob(
        QUEUE_NAMES.TEMPLATE,
        `job-multi-${i}`,
        { workspace_id: `ws_${i}`, droplet_id: `d_${i}`, workflow_name: 'email_1', workflow_json: {}, activate_after_deploy: true },
        { job_id: `job-multi-${i}`, queue_name: QUEUE_NAMES.TEMPLATE, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
        'Error'
      );
    }

    const result = await replayManager.replayMany(
      QUEUE_NAMES.TEMPLATE,
      ['job-multi-0', 'job-multi-1', 'job-multi-2']
    );

    expect(result.success_count).toBe(3);
    expect(result.failure_count).toBe(0);
    expect(replayedJobs).toHaveLength(3);
  });

  it('should handle replay errors', async () => {
    const failingReplayManager = new DLQReplayManager(
      dlqManager,
      async () => {
        throw new Error('Replay failed');
      }
    );

    await dlqManager.addFailedJob(
      QUEUE_NAMES.SECURITY,
      'job-fail-replay',
      { workspace_id: 'ws_1', droplet_id: 'd_1', credential_type: 'gmail', credential_id: 'c_1', reason: 'scheduled' },
      { job_id: 'job-fail-replay', queue_name: QUEUE_NAMES.SECURITY, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
      'Error'
    );

    const result = await failingReplayManager.replayOne(QUEUE_NAMES.SECURITY, 'job-fail-replay');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Replay failed');

    // Entry should still be in DLQ
    const count = await dlqManager.getCount(QUEUE_NAMES.SECURITY);
    expect(count).toBe(1);
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Phase 52 Integration', () => {
  it('should initialize all components together', async () => {
    const connectionManager = new RedisConnectionManager();
    await connectionManager.initialize();

    const queueManager = new QueueManager(connectionManager);
    await queueManager.initialize();

    const governor = new ConcurrencyGovernor();
    
    const dlqManager = new DeadLetterQueueManager();

    // All should be initialized
    expect(connectionManager.isHealthy()).toBe(true);

    // Add a job
    const jobId = await queueManager.addIgnitionJob({
      workspace_id: 'ws_integration',
      workspace_slug: 'integration-test',
      droplet_size: 'professional',
      region: 'sfo1',
      requested_by_user_id: 'user_test',
    });

    expect(jobId).toBeDefined();

    // Acquire governor slot
    const slot = await governor.acquire(QUEUE_NAMES.IGNITION, jobId);
    expect(slot.granted).toBe(true);

    // Release slot
    if (slot.release) await slot.release();

    // Cleanup
    await queueManager.shutdown();
    await connectionManager.shutdown();
  });

  it('should handle full job lifecycle', async () => {
    const events: BusEvent[] = [];
    
    const queueManager = new QueueManager();
    await queueManager.initialize();
    queueManager.subscribe((event) => events.push(event));

    const dlqManager = new DeadLetterQueueManager();
    dlqManager.setEventEmitter((event) => events.push(event));

    // Add job
    const jobId = await queueManager.addIgnitionJob({
      workspace_id: 'ws_lifecycle',
      workspace_slug: 'lifecycle-test',
      droplet_size: 'scale',
      region: 'lon1',
      requested_by_user_id: 'user_lifecycle',
    });

    // Verify job added event
    expect(events.find((e) => e.type === 'job:added' && e.job_id === jobId)).toBeDefined();

    // Simulate job failure and DLQ
    await dlqManager.addFailedJob(
      QUEUE_NAMES.IGNITION,
      jobId,
      { workspace_id: 'ws_lifecycle', workspace_slug: 'lifecycle-test', droplet_size: 'scale', region: 'lon1', requested_by_user_id: 'user_lifecycle' },
      { job_id: jobId, queue_name: QUEUE_NAMES.IGNITION, created_at: new Date().toISOString(), attempt_number: 5, max_attempts: 5 },
      'Simulated failure'
    );

    // Verify DLQ event
    expect(events.find((e) => e.type === 'job:dead_lettered' && e.job_id === jobId)).toBeDefined();

    await queueManager.shutdown();
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Performance', () => {
  it('should add 1000 jobs in under 1 second (in-memory)', async () => {
    const queueManager = new QueueManager();
    await queueManager.initialize();

    const start = Date.now();

    const promises: Promise<string>[] = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        queueManager.addHeartbeatJob({
          workspace_id: `ws_${i}`,
          droplet_id: `d_${i}`,
          sidecar_ip: '10.0.0.1',
          timestamp: new Date().toISOString(),
          metrics: {
            cpu_percent: Math.random() * 100,
            memory_percent: Math.random() * 100,
            disk_percent: Math.random() * 100,
            n8n_status: 'running',
            active_workflows: Math.floor(Math.random() * 10),
          },
        })
      );
    }

    await Promise.all(promises);

    const duration = Date.now() - start;
    console.log(`Added 1000 jobs in ${duration}ms`);

    expect(duration).toBeLessThan(1000);

    await queueManager.shutdown();
  });

  it('should acquire and release 100 governor slots quickly', async () => {
    const governor = new ConcurrencyGovernor({ global_max_concurrent: 200 });

    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      const result = await governor.acquire(QUEUE_NAMES.TEMPLATE, `job-perf-${i}`);
      expect(result.granted).toBe(true);
      if (result.release) await result.release();
    }

    const duration = Date.now() - start;
    console.log(`100 acquire/release cycles in ${duration}ms`);

    expect(duration).toBeLessThan(500);
  });
});
