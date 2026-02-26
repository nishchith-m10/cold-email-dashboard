/**
 * PHASE 41: IGNITION ORCHESTRATOR - INTEGRATION TESTS
 * 
 * Simplified tests focused on core functionality.
 */

import { describe, it, expect } from '@jest/globals';
import {
  encryptCredential,
  decryptCredential,
  computeFingerprint,
  createCredentialVault,
  MockCredentialVaultDB,
} from '@/lib/genesis/credential-vault';
import {
  MockIgnitionStateDB,
  MockPartitionManager,
  MockDropletFactory,
  MockSidecarClient,
  MockWorkflowDeployer,
  IgnitionOrchestrator,
} from '@/lib/genesis/ignition-orchestrator';
import type { IgnitionConfig } from '@/lib/genesis/ignition-types';

// ============================================
// CREDENTIAL VAULT TESTS
// ============================================

describe('Credential Vault', () => {
  const masterKey = 'test-master-key-must-be-at-least-32-characters-long';
  const workspaceId = 'ws_123';

  it('should encrypt and decrypt credentials', () => {
    const data = {
      clientId: 'test-client-id',
      clientSecret: 'secret-value',
      refreshToken: 'refresh-token',
    };

    const encrypted = encryptCredential(data, workspaceId, masterKey);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decryptCredential(encrypted, workspaceId, masterKey);
    expect(decrypted).toEqual(data);
  });

  it('should generate consistent fingerprints', () => {
    const data = { key1: 'value1', key2: 'value2' };

    const fp1 = computeFingerprint(data);
    const fp2 = computeFingerprint(data);

    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(16);
  });

  it('should fail decryption with wrong workspace ID', () => {
    const data = { test: 'data' };
    const encrypted = encryptCredential(data, 'ws_1', masterKey);

    expect(() => {
      decryptCredential(encrypted, 'ws_2', masterKey);
    }).toThrow();
  });

  it('should store and retrieve credentials', async () => {
    const vault = createCredentialVault();

    const result = await vault.store(
      workspaceId,
      {
        type: 'google_oauth2',
        name: 'Test Gmail',
        data: { clientId: 'test-id', clientSecret: 'test-secret' },
      },
      'user_456'
    );

    expect(result.success).toBe(true);
    expect(result.credential_id).toBeDefined();

    const retrieved = await vault.retrieve(workspaceId, result.credential_id!);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.data.clientId).toBe('test-id');
  });

  it('should list workspace credentials', async () => {
    const vault = createCredentialVault();

    await vault.store(workspaceId, {
      type: 'google_oauth2',
      name: 'Gmail',
      data: { clientId: 'test' },
    }, 'user_1');

    await vault.store(workspaceId, {
      type: 'openai_api',
      name: 'OpenAI',
      data: { apiKey: 'key' },
    }, 'user_1');

    const list = await vault.list(workspaceId);
    expect(list.length).toBe(2);
  });
});

// ============================================
// MOCK COMPONENTS TESTS
// ============================================

describe('Mock Components', () => {
  it('should create mock partition manager', async () => {
    const manager = new MockPartitionManager();
    const result = await manager.create('ws_123', 'test-workspace');

    expect(result.success).toBe(true);
    expect(result.partition_name).toBe('genesis.leads_p_test-workspace');
  });

  it('should create mock droplet factory', async () => {
    const factory = new MockDropletFactory();
    const result = await factory.provision({
      workspace_id: 'ws_123',
      workspace_slug: 'test',
      region: 'nyc1',
      size_slug: 'professional',
    });

    expect(result.success).toBe(true);
    expect(result.droplet_id).toBeDefined();
    expect(result.ip_address).toBe('10.0.0.1');
  });

  it('should create mock sidecar client', async () => {
    const client = new MockSidecarClient();
    const result = await client.sendCommand('10.0.0.1', {
      action: 'TEST',
      payload: {},
    });

    expect(result.success).toBe(true);
  });

  it('should create mock workflow deployer', async () => {
    const deployer = new MockWorkflowDeployer();
    const result = await deployer.deploy('10.0.0.1', {
      name: 'Test Workflow',
      json: {},
      credential_map: {},
      variable_map: {},
    });

    expect(result.success).toBe(true);
    expect(result.workflow_id).toBeDefined();
  });
});

// ============================================
// STATE PERSISTENCE TESTS
// ============================================

describe('State Persistence', () => {
  it('should save and load state', async () => {
    const stateDB = new MockIgnitionStateDB();

    const state = {
      workspace_id: 'ws_123',
      status: 'pending' as const,
      current_step: 0,
      total_steps: 6,
      workflow_ids: [],
      credential_ids: [],
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      requested_by: 'user_1',
      region: 'nyc1',
      droplet_size: 'professional',
    };

    await stateDB.save(state);

    const loaded = await stateDB.load('ws_123');
    expect(loaded).not.toBeNull();
    expect(loaded?.workspace_id).toBe('ws_123');
    expect(loaded?.status).toBe('pending');
  });

  it('should log operations', async () => {
    const stateDB = new MockIgnitionStateDB();

    await stateDB.logOperation({
      workspace_id: 'ws_123',
      operation: 'test_operation',
      status: 'completed',
      result: { test: 'data' },
    });

    const operations = stateDB.getOperations('ws_123');
    expect(operations).toHaveLength(1);
    expect(operations[0].operation).toBe('test_operation');
  });
});

// ============================================
// ORCHESTRATOR CORE TESTS
// ============================================

describe('Ignition Orchestrator', () => {
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
        data: { clientId: 'test-id', clientSecret: 'test-secret' },
        template_placeholder: 'TEMPLATE_GMAIL_UUID',
      },
    ],
    variables: { YOUR_SENDER_EMAIL: 'sender@test.example' },
  };

  it('should create orchestrator', () => {
    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    expect(orchestrator).toBeDefined();
  });

  it('should complete successful ignition', async () => {
    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(TEST_CONFIG);

    expect(result.success).toBe(true);
    expect(result.partition_name).toBe('genesis.leads_p_test-corp');
    expect(result.droplet_id).toBeDefined();
    expect(result.workflow_ids).toHaveLength(7);
  });

  it('should track state through ignition', async () => {
    const stateDB = new MockIgnitionStateDB();
    const orchestrator = new IgnitionOrchestrator(
      stateDB,
      createCredentialVault(),
      new MockPartitionManager(),
      new MockDropletFactory(),
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    await orchestrator.ignite(TEST_CONFIG);

    const state = await stateDB.load('ws_test_123');
    expect(state?.status).toBe('active');
    expect(state?.current_step).toBe(6);
  });

  it('should handle droplet provisioning failure with rollback', async () => {
    let dropletTerminated = false;
    let partitionDropped = false;

    const failingFactory: any = {
      provision: async () => ({ success: false, error: 'Test failure' }),
      terminate: async () => {
        dropletTerminated = true;
        return { success: true };
      },
    };

    const trackingPartitionManager: any = {
      create: async () => ({ success: true, partition_name: 'test_partition' }),
      drop: async () => {
        partitionDropped = true;
        return { success: true };
      },
    };

    const orchestrator = new IgnitionOrchestrator(
      new MockIgnitionStateDB(),
      createCredentialVault(),
      trackingPartitionManager,
      failingFactory,
      new MockSidecarClient(),
      new MockWorkflowDeployer(),
      { handshakeDelayMs: 0 }
    );

    const result = await orchestrator.ignite(TEST_CONFIG);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Test failure');
    expect(result.rollback_performed).toBe(true);
    expect(partitionDropped).toBe(true);
  });
});
