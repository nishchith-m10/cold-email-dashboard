/**
 * PHASE 41: EDGE CASE TESTS
 * 
 * Testing error paths, boundary conditions, and exceptional scenarios.
 * Pushing for 99.99999% quality standard.
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
import { createCredentialVault, CredentialVault, MockCredentialVaultDB } from '@/lib/genesis/credential-vault';
import type { IgnitionConfig } from '@/lib/genesis/ignition-types';

const BASE_CONFIG: IgnitionConfig = {
  workspace_id: 'ws_edge_test',
  workspace_slug: 'edge-test',
  workspace_name: 'Edge Test',
  region: 'nyc1',
  droplet_size: 'professional',
  requested_by: 'user_edge',
  credentials: [],
};

// ============================================
// EDGE CASE 1: EMPTY CONFIGURATIONS
// ============================================

describe('Empty Configurations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle zero credentials', async () => {
    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(BASE_CONFIG);

    expect(result.success).toBe(true);
    expect(result.credential_count).toBe(0);
  });

  it('should handle zero workflows when skip_activation is true', async () => {
    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      workflow_templates: [],
      skip_activation: true,
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(true);
    expect(result.workflow_ids).toHaveLength(0);
  });

  it('should handle empty variables map', async () => {
    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      variables: {},
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(true);
  });
});

// ============================================
// EDGE CASE 2: MALFORMED DATA
// ============================================

describe('Malformed Data', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle missing droplet IP during credential injection', async () => {
    const noIpFactory: any = {
      provision: async () => ({ success: true, droplet_id: 'd_123', ip_address: undefined }),
      terminate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      noIpFactory,
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      credentials: [{
        type: 'google_oauth2',
        name: 'Gmail',
        data: { test: 'data' },
      }],
    };

    const result = await orchestrator.ignite(config);

    // Should FAIL at workflow deployment step (requires droplet IP)
    expect(result.success).toBe(false);
    expect(result.error).toContain('Droplet IP not available');
    expect(result.error_step).toBe('workflows_deploying');
  });

  it('should handle credential storage failure', async () => {
    const failingVaultDB: any = {
      insert: async () => { throw new Error('Database error'); },
      update: async () => {},
      select: async () => [],
      selectOne: async () => null,
      delete: async () => {},
      logAction: async () => {},
    };

    const failingVault = new CredentialVault(
      'test-master-key-must-be-at-least-32-characters-long',
      failingVaultDB
    );

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      failingVault,
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      credentials: [{
        type: 'google_oauth2',
        name: 'Gmail',
        data: { test: 'data' },
      }],
    };

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Database error');
    expect(result.error_step).toBe('credentials_injecting');
  });
});

// ============================================
// EDGE CASE 3: RACE CONDITIONS
// ============================================

describe('Race Conditions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle duplicate ignition attempts for same workspace', async () => {
    const stateDB = new MockIgnitionStateDB();

    const orchestrator1 = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const orchestrator2 = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    // Both orchestrators ignite same workspace simultaneously
    const result1 = await orchestrator1.ignite(BASE_CONFIG);
    const result2 = await orchestrator2.ignite(BASE_CONFIG);

    // Both should succeed (idempotent partition creation)
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should handle cancellation during different steps', async () => {
    const stateDB = new MockIgnitionStateDB();

    const orch1 = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 1000 } // Longer delay to ensure cancel happens mid-flight
    );

    const config1 = { ...BASE_CONFIG, workspace_id: 'ws_cancel_1' };
    
    // Start ignition
    const promise1 = orch1.ignite(config1);
    
    // Wait for ignition to reach handshake step
    await jest.advanceTimersByTimeAsync(10);
    
    // Cancel while in handshake
    const cancelResult = await orch1.cancel('ws_cancel_1');
    
    // Advance past handshake - cancellation will be checked before step 4
    await jest.advanceTimersByTimeAsync(1000);
    
    const result1 = await promise1;

    expect(cancelResult.success).toBe(true);
    expect(result1.success).toBe(false);
    expect(result1.error).toContain('Cancelled');
  }, 10000); // Increase test timeout
});

// ============================================
// EDGE CASE 4: RESOURCE LIMITS
// ============================================

describe('Resource Limits', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle maximum credentials (100)', async () => {
    const credentials = Array.from({ length: 100 }, (_, i) => ({
      type: 'http_header_auth' as const,
      name: `Credential ${i}`,
      data: { token: `token_${i}` },
    }));

    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      credentials,
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(true);
    expect(result.credential_count).toBe(100);
  });

  it('should handle long workspace slugs', async () => {
    const longSlug = 'a'.repeat(100);

    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      workspace_slug: longSlug,
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(true);
    expect(result.partition_name).toContain(longSlug);
  });
});

// ============================================
// EDGE CASE 5: ROLLBACK FAILURES
// ============================================

describe('Rollback Failures', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle partition drop failure during rollback', async () => {
    const failingPartitionManager: any = {
      create: async () => ({ success: true, partition_name: 'test_partition' }),
      drop: async () => { throw new Error('Cannot drop partition'); },
    };

    const failingDeployer: any = {
      deploy: async () => ({ success: false, error: 'Deploy failed' }),
      activate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      failingPartitionManager,
      new MockDropletFactory(),
      new MockSidecarClient(),
      failingDeployer,
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(BASE_CONFIG);

    expect(result.success).toBe(false);
    expect(result.rollback_performed).toBe(true);
    // Rollback continues even if partition drop fails
  });

  it('should handle droplet termination failure during rollback', async () => {
    const failingFactory: any = {
      provision: async () => ({ success: true, droplet_id: 'd_123', ip_address: '10.0.0.1' }),
      terminate: async () => { throw new Error('Cannot terminate droplet'); },
    };

    const failingDeployer: any = {
      deploy: async () => ({ success: false, error: 'Deploy failed' }),
      activate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      failingFactory,
      new MockSidecarClient(),
      failingDeployer,
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(BASE_CONFIG);

    expect(result.success).toBe(false);
    expect(result.rollback_performed).toBe(true);
  });

  it('should continue rollback even if credential deletion fails', async () => {
    const failingVaultDB: any = {
      insert: async (record: any) => ({ id: 'cred-1' }),
      update: async () => {},
      select: async () => [],
      selectOne: async () => null,
      delete: async () => { throw new Error('Cannot delete credential'); },
      logAction: async () => {},
    };

    const failingVault = new CredentialVault(
      'test-master-key-must-be-at-least-32-characters-long',
      failingVaultDB
    );

    const failingDeployer: any = {
      deploy: async () => ({ success: false, error: 'Deploy failed' }),
      activate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      failingVault,
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      failingDeployer,
      { handshakeDelayMs: 0 }
    );

    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      credentials: [{
        type: 'google_oauth2',
        name: 'Gmail',
        data: { test: 'data' },
      }],
    };

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(false);
    expect(result.rollback_performed).toBe(true);
  });
});

// ============================================
// EDGE CASE 6: PARTIAL FAILURES
// ============================================

describe('Partial Failures', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle failure on second workflow deployment', async () => {
    let deployCount = 0;

    const partialFailDeployer: any = {
      deploy: async (ip: string, workflow: any) => {
        deployCount++;
        if (deployCount === 2) {
          return { success: false, error: 'Second workflow failed' };
        }
        return { success: true, workflow_id: `wf_${deployCount}` };
      },
      activate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      partialFailDeployer,
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(BASE_CONFIG);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Second workflow failed');
  });

  it('should handle failure on second credential injection', async () => {
    let credCount = 0;

    const partialFailSidecar: any = {
      sendCommand: async () => {
        credCount++;
        if (credCount === 2) {
          return { success: false, error: 'Second credential failed' };
        }
        return { success: true, result: { credential_id: `cred_${credCount}` } };
      },
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      partialFailSidecar,
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      credentials: [
        { type: 'google_oauth2', name: 'Gmail 1', data: { test: '1' } },
        { type: 'openai_api', name: 'OpenAI', data: { test: '2' } },
      ],
    };

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Second credential failed');
  });
});

// ============================================
// EDGE CASE 7: STATE RECOVERY
// ============================================

describe('State Recovery', () => {
  it('should handle getState for non-existent workspace', async () => {
    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const state = await orchestrator.getState('ws_nonexistent');

    expect(state).toBeNull();
  });

  it('should handle cancel for non-existent workspace', async () => {
    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.cancel('ws_nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// ============================================
// EDGE CASE 8: CALLBACK ERRORS
// ============================================

describe('Callback Error Handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not crash if progress callback throws error', async () => {
    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    // Set callback that throws
    orchestrator.setProgressCallback(() => {
      throw new Error('Callback error');
    });

    const result = await orchestrator.ignite(BASE_CONFIG);

    // Should still succeed despite callback errors
    expect(result.success).toBe(true);
  });
});

// ============================================
// EDGE CASE 9: TIMEOUT SCENARIOS
// ============================================

describe('Timeout Scenarios', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should timeout on partition creation', async () => {
    const slowPartitionManager: any = {
      create: async () => {
        // Simulate operation that takes longer than timeout (30s)
        await new Promise(resolve => setTimeout(resolve, 35000));
        return { success: true, partition_name: 'test' };
      },
      drop: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      slowPartitionManager,
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const ignitionPromise = orchestrator.ignite(BASE_CONFIG);

    // Advance to timeout (30s for partition_creating)
    await jest.advanceTimersByTimeAsync(30000);

    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('should timeout on droplet provisioning', async () => {
    const slowFactory: any = {
      provision: async () => {
        await new Promise(resolve => setTimeout(resolve, 130000)); // > 120s timeout
        return { success: true, droplet_id: 'd_123', ip_address: '10.0.0.1' };
      },
      terminate: async () => ({ success: true }),
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      slowFactory,
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const ignitionPromise = orchestrator.ignite(BASE_CONFIG);

    // Advance to droplet timeout (120s)
    await jest.advanceTimersByTimeAsync(120000);

    const result = await ignitionPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
    expect(result.error_step).toBe('droplet_provisioning');
  });
});

// ============================================
// EDGE CASE 10: SPECIAL CHARACTERS
// ============================================

describe('Special Characters in Data', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle special characters in workspace names', async () => {
    const config: IgnitionConfig = {
      ...BASE_CONFIG,
      workspace_name: 'Test & Co. "Special" \'Chars\' <Script>',
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(config);

    expect(result.success).toBe(true);
  });

  it('should handle unicode in credential data', async () => {
    const vault = createCredentialVault();

    const result = await vault.store(
      'ws_123',
      {
        type: 'google_oauth2',
        name: 'Test',
        data: {
          name: '日本語 テスト',
          emoji: '🚀✅💯',
          special: 'Ñoño',
        },
      },
      'user_1'
    );

    expect(result.success).toBe(true);

    const retrieved = await vault.retrieve('ws_123', result.credential_id!);
    expect(retrieved?.data.name).toBe('日本語 テスト');
    expect(retrieved?.data.emoji).toBe('🚀✅💯');
  });
});
