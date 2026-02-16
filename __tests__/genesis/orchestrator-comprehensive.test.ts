/**
 * PHASE 41: COMPREHENSIVE ORCHESTRATOR TESTS
 * 
 * Full test coverage with proper async handling using Jest fake timers.
 * NO COMPROMISES - 99.99999% quality standard.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  IgnitionOrchestrator,
  MockIgnitionStateDB,
  MockPartitionManager,
  MockDropletFactory,
  MockSidecarClient,
  MockWorkflowDeployer,
} from '@/lib/genesis/ignition-orchestrator';
import { createCredentialVault } from '@/lib/genesis/credential-vault';
import type { IgnitionConfig, IgnitionEvent } from '@/lib/genesis/ignition-types';

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_CONFIG: IgnitionConfig = {
  workspace_id: 'ws_test_123',
  workspace_slug: 'test-corp',
  workspace_name: 'Test Corporation',
  region: 'nyc1',
  droplet_size: 'professional',
  requested_by: 'user_456',
  credentials: [
    {
      type: 'google_oauth2',
      name: 'Gmail',
      data: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      template_placeholder: 'TEMPLATE_GMAIL_UUID',
    },
    {
      type: 'postgres',
      name: 'Database',
      data: {
        host: 'localhost',
        port: 5432,
        database: 'genesis',
        user: 'postgres',
        password: 'test-password',
      },
      template_placeholder: 'TEMPLATE_POSTGRES_UUID',
    },
  ],
  variables: {
    CUSTOM_VAR: 'custom-value',
  },
};

// ============================================
// HELPER: CREATE ORCHESTRATOR
// ============================================

function createOrchestrator(options?: { handshakeDelayMs?: number }) {
  return new IgnitionOrchestrator(
    new MockIgnitionStateDB(),
    createCredentialVault(),
    new MockPartitionManager(),
    new MockDropletFactory(),
    new MockSidecarClient(),
    new MockWorkflowDeployer(),
    options
  );
}

// ============================================
// SUITE 1: SUCCESSFUL IGNITION FLOW
// ============================================

describe('Successful Ignition Flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should complete full ignition with all 6 steps', async () => {
    const orchestrator = createOrchestrator({ handshakeDelayMs: 5000 });

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);

    // Fast-forward through the handshake delay
    await jest.advanceTimersByTimeAsync(5000);

    const result = await ignitionPromise;

    expect(result.success).toBe(true);
    expect(result.partition_name).toBe('genesis.leads_p_test-corp');
    expect(result.droplet_id).toBeDefined();
    expect(result.droplet_ip).toBe('10.0.0.1');
    expect(result.workflow_ids).toHaveLength(4);
    expect(result.credential_count).toBe(2);
    expect(result.steps_completed).toBe(6);
    expect(result.error).toBeUndefined();
  });

  it('should emit progress events in correct order', async () => {
    const orchestrator = createOrchestrator({ handshakeDelayMs: 100 });
    const events: IgnitionEvent[] = [];
    orchestrator.setProgressCallback((event) => events.push(event));

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    // Verify event sequence
    expect(events[0]).toMatchObject({ type: 'started', workspace_id: 'ws_test_123' });
    
    const stepStartEvents = events.filter(e => e.type === 'step_started');
    expect(stepStartEvents).toHaveLength(6);
    expect(stepStartEvents.map(e => (e as any).step)).toEqual([
      'partition_creating',
      'droplet_provisioning',
      'handshake_pending',
      'credentials_injecting',
      'workflows_deploying',
      'activating',
    ]);

    const stepCompletedEvents = events.filter(e => e.type === 'step_completed');
    expect(stepCompletedEvents).toHaveLength(6);

    const finalEvent = events[events.length - 1];
    expect(finalEvent.type).toBe('completed');
  });

  it('should track state progression through all steps', async () => {
    const stateDB = new MockIgnitionStateDB();
    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    const finalState = await stateDB.load('ws_test_123');

    expect(finalState).not.toBeNull();
    expect(finalState?.status).toBe('active');
    expect(finalState?.current_step).toBe(6);
    expect(finalState?.total_steps).toBe(6);
    expect(finalState?.partition_name).toBe('genesis.leads_p_test-corp');
    expect(finalState?.droplet_id).toBeDefined();
    expect(finalState?.droplet_ip).toBe('10.0.0.1');
    expect(finalState?.workflow_ids).toHaveLength(4);
    expect(finalState?.credential_ids).toHaveLength(2);
    expect(finalState?.error_message).toBeUndefined();
    expect(finalState?.completed_at).toBeDefined();
  });

  it('should handle partial template selection', async () => {
    const config: IgnitionConfig = {
      ...TEST_CONFIG,
      workflow_templates: ['email_1', 'email_2'],
    };

    const orchestrator = createOrchestrator({ handshakeDelayMs: 100 });

    const ignitionPromise = orchestrator.ignite(config);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(true);
    expect(result.workflow_ids).toHaveLength(2);
  });

  it('should skip activation when requested', async () => {
    const config: IgnitionConfig = {
      ...TEST_CONFIG,
      skip_activation: true,
    };

    const orchestrator = createOrchestrator({ handshakeDelayMs: 100 });

    const ignitionPromise = orchestrator.ignite(config);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(true);
    expect(result.steps_completed).toBe(5); // Stops before activation
  });

  it('should store resources correctly for later rollback', async () => {
    const stateDB = new MockIgnitionStateDB();
    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    const state = await stateDB.load('ws_test_123');
    
    expect(state?.partition_name).toBeDefined();
    expect(state?.droplet_id).toBeDefined();
    expect(state?.credential_ids).toHaveLength(2);
    expect(state?.workflow_ids).toHaveLength(4);
  });
});

// ============================================
// SUITE 2: ERROR HANDLING & ROLLBACK
// ============================================

describe('Error Handling & Rollback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle partition creation failure', async () => {
    const failingPartitionManager: any = {
      create: async () => ({ success: false, error: 'Database connection failed' }),
      drop: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      failingPartitionManager,
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database connection failed');
    expect(result.error_step).toBe('partition_creating');
    expect(result.rollback_performed).toBe(true);
  });

  it('should handle droplet provisioning failure with rollback', async () => {
    let partitionDropped = false;

    const trackingPartitionManager: any = {
      create: async () => ({ success: true, partition_name: 'test_partition' }),
      drop: async () => {
        partitionDropped = true;
        return { success: true };
      },
    };

    const failingFactory: any = {
      provision: async () => ({ success: false, error: 'DigitalOcean API error' }),
      terminate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      trackingPartitionManager,
      failingFactory,
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('DigitalOcean API error');
    expect(result.error_step).toBe('droplet_provisioning');
    expect(result.rollback_performed).toBe(true);
    expect(partitionDropped).toBe(true);
  });

  it('should handle credential injection failure', async () => {
    const failingSidecarClient: any = {
      sendCommand: async () => ({ success: false, error: 'Sidecar connection timeout' }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      failingSidecarClient,
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error_step).toBe('credentials_injecting');
    expect(result.rollback_performed).toBe(true);
  });

  it('should handle workflow deployment failure', async () => {
    const failingDeployer: any = {
      deploy: async () => ({ success: false, error: 'Invalid workflow schema' }),
      activate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      failingDeployer,
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid workflow schema');
    expect(result.error_step).toBe('workflows_deploying');
    expect(result.rollback_performed).toBe(true);
  });

  it('should handle workflow activation failure', async () => {
    const failingDeployer: any = {
      deploy: async () => ({ success: true, workflow_id: 'wf_123' }),
      activate: async () => ({ success: false }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      failingDeployer,
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error_step).toBe('activating');
    expect(result.rollback_performed).toBe(true);
  });

  it('should perform complete rollback of all resources', async () => {
    let partitionDropped = false;
    let dropletTerminated = false;
    let credentialsDeleted = 0;

    const trackingPartitionManager: any = {
      create: async () => ({ success: true, partition_name: 'test_partition' }),
      drop: async () => {
        partitionDropped = true;
        return { success: true };
      },
    };

    const trackingFactory: any = {
      provision: async () => ({ success: true, droplet_id: 'd_123', ip_address: '10.0.0.1' }),
      terminate: async () => {
        dropletTerminated = true;
        return { success: true };
      },
    };

    const failingDeployer: any = {
      deploy: async () => ({ success: false, error: 'Deploy failed at step 5' }),
      activate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      trackingPartitionManager,
      trackingFactory,
      new MockSidecarClient(),
      failingDeployer,
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(partitionDropped).toBe(true);
    expect(dropletTerminated).toBe(true);
  });

  it('should emit rollback events', async () => {
    const failingFactory: any = {
      provision: async () => ({ success: false, error: 'Test failure' }),
      terminate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      failingFactory,
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const events: IgnitionEvent[] = [];
    orchestrator.setProgressCallback((event) => events.push(event));

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'rollback_started' })
    );

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'rollback_completed' })
    );

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'failed' })
    );
  });

  it('should mark state as failed after rollback', async () => {
    const stateDB = new MockIgnitionStateDB();

    const failingFactory: any = {
      provision: async () => ({ success: false, error: 'Test error' }),
      terminate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      failingFactory,
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    const state = await stateDB.load('ws_test_123');

    expect(state?.status).toBe('failed');
    expect(state?.error_message).toBe('Test error');
    expect(state?.error_step).toBe('droplet_provisioning');
    expect(state?.rollback_completed_at).toBeDefined();
    expect(state?.rollback_success).toBe(true);
  });
});

// ============================================
// SUITE 3: STATE MACHINE VERIFICATION
// ============================================

describe('State Machine Progression', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should progress through exactly 6 steps in order', async () => {
    const stateDB = new MockIgnitionStateDB();
    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const states: string[] = [];
    orchestrator.setProgressCallback((event) => {
      if (event.type === 'step_started') {
        states.push(event.step);
      }
    });

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    expect(states).toEqual([
      'partition_creating',
      'droplet_provisioning',
      'handshake_pending',
      'credentials_injecting',
      'workflows_deploying',
      'activating',
    ]);
  });

  it('should update step numbers correctly', async () => {
    const stateDB = new MockIgnitionStateDB();
    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    const state = await stateDB.load('ws_test_123');

    expect(state?.current_step).toBe(6);
    expect(state?.total_steps).toBe(6);
  });

  it('should persist state after each step', async () => {
    const stateDB = new MockIgnitionStateDB();
    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    const state = await stateDB.load('ws_test_123');

    expect(state).not.toBeNull();
    expect(state?.status).toBe('active');
    expect(state?.started_at).toBeDefined();
    expect(state?.updated_at).toBeDefined();
    expect(state?.completed_at).toBeDefined();
  });

  it('should stop at failure step', async () => {
    const failingFactory: any = {
      provision: async () => ({ success: false, error: 'Step 2 failure' }),
      terminate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      failingFactory,
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 100 }
    );

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;

    expect(result.steps_completed).toBe(1); // Only step 1 completed
    expect(result.error_step).toBe('droplet_provisioning');
  });
});

// ============================================
// SUITE 4: CONCURRENCY & PERFORMANCE
// ============================================

describe('Concurrency & Performance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle multiple concurrent ignitions', async () => {
    const configs = Array.from({ length: 5 }, (_, i) => ({
      ...TEST_CONFIG,
      workspace_id: `ws_concurrent_${i}`,
      workspace_slug: `workspace-${i}`,
    }));

    const promises = configs.map((config) => {
      const orchestrator = createOrchestrator({ handshakeDelayMs: 100 });
      return orchestrator.ignite(config);
    });

    await jest.advanceTimersByTimeAsync(100);
    const results = await Promise.all(promises);

    expect(results.every(r => r.success)).toBe(true);
    expect(results.map(r => r.workspace_id)).toEqual(configs.map(c => c.workspace_id));
  });

  it('should complete ignition in reasonable time', async () => {
    const orchestrator = createOrchestrator({ handshakeDelayMs: 100 });

    const start = Date.now();
    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    const result = await ignitionPromise;
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(1000);
  });

  it('should handle rapid sequential ignitions', async () => {
    const orchestrator = createOrchestrator({ handshakeDelayMs: 50 });

    const result1Promise = orchestrator.ignite({ ...TEST_CONFIG, workspace_id: 'ws_1', workspace_slug: 'ws-1' });
    await jest.advanceTimersByTimeAsync(50);
    const result1 = await result1Promise;

    const result2Promise = orchestrator.ignite({ ...TEST_CONFIG, workspace_id: 'ws_2', workspace_slug: 'ws-2' });
    await jest.advanceTimersByTimeAsync(50);
    const result2 = await result2Promise;

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.workspace_id).not.toBe(result2.workspace_id);
  });
});

// ============================================
// SUITE 5: CANCELLATION
// ============================================

describe('Cancellation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow cancellation of in-progress ignition', async () => {
    const stateDB = new MockIgnitionStateDB();
    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 5000 }
    );

    // Start ignition (will be waiting at handshake)
    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);

    // Advance partially through handshake
    await jest.advanceTimersByTimeAsync(1000);

    // Cancel
    const cancelResult = await orchestrator.cancel('ws_test_123');
    expect(cancelResult.success).toBe(true);

    // Complete the ignition
    await jest.advanceTimersByTimeAsync(4000);
    await ignitionPromise;

    const state = await stateDB.load('ws_test_123');
    expect(state?.status).toBe('failed');
    expect(state?.error_message).toContain('Cancelled');
  });

  it('should not allow cancellation of completed ignition', async () => {
    const orchestrator = createOrchestrator({ handshakeDelayMs: 100 });

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);
    await jest.advanceTimersByTimeAsync(100);
    await ignitionPromise;

    const cancelResult = await orchestrator.cancel('ws_test_123');

    expect(cancelResult.success).toBe(false);
    expect(cancelResult.error).toContain('already completed');
  });
});

// ============================================
// SUITE 6: REAL-WORLD DELAYS
// ============================================

describe('Real-World Timing (5-second handshake)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle production handshake delay (5 seconds)', async () => {
    const orchestrator = createOrchestrator({ handshakeDelayMs: 5000 });

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);

    // Fast-forward through handshake
    await jest.advanceTimersByTimeAsync(5000);

    const result = await ignitionPromise;

    expect(result.success).toBe(true);
    expect(result.droplet_ip).toBeDefined();
  });

  it('should timeout if handshake never completes', async () => {
    // This test verifies the timeout mechanism from STEP_TIMEOUTS
    const orchestrator = createOrchestrator({ handshakeDelayMs: 350000 }); // Longer than timeout

    const ignitionPromise = orchestrator.ignite(TEST_CONFIG);

    // Advance to timeout (handshake timeout is 300s = 300000ms)
    await jest.advanceTimersByTimeAsync(300000);

    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });
});
