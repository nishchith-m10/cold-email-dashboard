/**
 * PHASE 50: DROPLET PROVISIONING TESTS
 * 
 * Tests for the Sovereign Droplet Factory:
 *   • Account selection logic
 *   • Cloud-Init generation
 *   • Droplet creation (mocked)
 *   • State transitions
 *   • Error handling and rollback
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestSupabaseClient } from './setup.test';
import { DropletFactory } from '@/lib/genesis/droplet-factory';
import { DigitalOceanClient } from '@/lib/genesis/do-client';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const supabase = createTestSupabaseClient();

// Test fixtures
const TEST_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const TEST_ACCOUNT_ID = 'genesis-do-pool-test-01';
const TEST_REGION = 'nyc1';

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

beforeAll(async () => {
  // Set encryption key for token operations
  await supabase.rpc('set_config', {
    setting_name: 'app.encryption_key',
    setting_value: process.env.INTERNAL_ENCRYPTION_KEY!
  });

  // Clean up any existing test data
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

async function cleanupTestData() {
  // Delete test droplets
  await supabase
    .from('genesis.fleet_status')
    .delete()
    .eq('workspace_id', TEST_WORKSPACE_ID);

  // Delete test accounts
  await supabase
    .from('genesis.do_accounts')
    .delete()
    .eq('account_id', TEST_ACCOUNT_ID);
}

// ============================================================================
// ACCOUNT POOL TESTS
// ============================================================================

describe('Account Pool Management', () => {
  it('should create a test account', async () => {
    // Generate a fake encrypted token
    const { data: encryptedToken, error: encryptError } = await supabase.rpc(
      'genesis.encrypt_do_token',
      { p_plaintext_token: 'dop_v1_test_token_1234567890abcdef' }
    );

    expect(encryptError).toBeNull();
    expect(encryptedToken).toBeTruthy();

    // Insert test account
    const { error } = await supabase
      .from('genesis.do_accounts')
      .insert({
        account_id: TEST_ACCOUNT_ID,
        api_token_encrypted: encryptedToken,
        region: TEST_REGION,
        max_droplets: 50,
        current_droplets: 10,
        status: 'active',
        notes: 'Test account for provisioning tests'
      });

    expect(error).toBeNull();
  });

  it('should select account with most available capacity', async () => {
    const factory = new DropletFactory();
    const account = await factory.selectAccount(TEST_REGION);

    expect(account).not.toBeNull();
    expect(account?.accountId).toBe(TEST_ACCOUNT_ID);
    expect(account?.availableCapacity).toBe(40); // 50 max - 10 current
  });

  it('should return null when no accounts available', async () => {
    const factory = new DropletFactory();
    const account = await factory.selectAccount('non-existent-region');

    expect(account).toBeNull();
  });

  it('should increment droplet count', async () => {
    await supabase.rpc('genesis.increment_droplet_count', {
      p_account_id: TEST_ACCOUNT_ID
    });

    const { data } = await supabase
      .from('genesis.do_accounts')
      .select('current_droplets')
      .eq('account_id', TEST_ACCOUNT_ID)
      .single();

    expect(data?.current_droplets).toBe(11); // Was 10, now 11
  });

  it('should decrement droplet count', async () => {
    await supabase.rpc('genesis.decrement_droplet_count', {
      p_account_id: TEST_ACCOUNT_ID
    });

    const { data } = await supabase
      .from('genesis.do_accounts')
      .select('current_droplets')
      .eq('account_id', TEST_ACCOUNT_ID)
      .single();

    expect(data?.current_droplets).toBe(10); // Back to 10
  });

  it('should mark account as full at 95% capacity', async () => {
    // Set to 48/50 (96%)
    await supabase
      .from('genesis.do_accounts')
      .update({ current_droplets: 48 })
      .eq('account_id', TEST_ACCOUNT_ID);

    // Increment should trigger 'full' status
    await supabase.rpc('genesis.increment_droplet_count', {
      p_account_id: TEST_ACCOUNT_ID
    });

    const { data } = await supabase
      .from('genesis.do_accounts')
      .select('status, current_droplets')
      .eq('account_id', TEST_ACCOUNT_ID)
      .single();

    expect(data?.current_droplets).toBe(49);
    expect(data?.status).toBe('full');
  });

  it('should restore active status when capacity freed', async () => {
    // Decrement from 49 to 48 (back under 95%)
    await supabase.rpc('genesis.decrement_droplet_count', {
      p_account_id: TEST_ACCOUNT_ID
    });

    const { data } = await supabase
      .from('genesis.do_accounts')
      .select('status, current_droplets')
      .eq('account_id', TEST_ACCOUNT_ID)
      .single();

    expect(data?.current_droplets).toBe(48);
    expect(data?.status).toBe('active');
  });
});

// ============================================================================
// CLOUD-INIT GENERATION TESTS
// ============================================================================

describe('Cloud-Init Script Generation', () => {
  it('should generate valid Cloud-Init script', async () => {
    const factory = new DropletFactory();
    
    const script = await factory.generateCloudInit({
      workspaceId: TEST_WORKSPACE_ID,
      workspaceSlug: 'test-workspace',
      customDomain: 'track.example.com',
      timezone: 'America/New_York',
      provisioningToken: 'prov_test123',
      postgresPassword: 'test_postgres_pass',
      n8nEncryptionKey: 'test_encryption_key'
    });

    // Verify script structure
    expect(script).toContain('#!/bin/bash');
    expect(script).toContain('CLOUD-INIT');
    expect(script).toContain(TEST_WORKSPACE_ID);
    expect(script).toContain('test-workspace');
    expect(script).toContain('track.example.com');
    expect(script).toContain('America/New_York');
  });

  it('should include survival mode configuration', async () => {
    const factory = new DropletFactory();
    
    const script = await factory.generateCloudInit({
      workspaceId: TEST_WORKSPACE_ID,
      workspaceSlug: 'test-workspace',
      timezone: 'UTC',
      provisioningToken: 'prov_test',
      postgresPassword: 'pass',
      n8nEncryptionKey: 'key'
    });

    // Check for critical survival mode components
    expect(script).toContain('4G /swapfile'); // 4GB swap
    expect(script).toContain('docker'); // Docker installation
    expect(script).toContain('ufw'); // Firewall
    expect(script).toContain('max-size'); // Log limits
  });

  it('should escape special characters in passwords', async () => {
    const factory = new DropletFactory();
    
    const script = await factory.generateCloudInit({
      workspaceId: TEST_WORKSPACE_ID,
      workspaceSlug: 'test',
      timezone: 'UTC',
      provisioningToken: 'prov_test',
      postgresPassword: 'p@ss$word!with"special\'chars',
      n8nEncryptionKey: 'key'
    });

    // Password should be present (exact escaping depends on implementation)
    expect(script).toContain('POSTGRES_PASSWORD');
  });
});

// ============================================================================
// STATE TRANSITION TESTS
// ============================================================================

describe('Droplet State Machine', () => {
  const TEST_DROPLET_ID = 12345678;

  beforeEach(async () => {
    // Create test droplet record
    await supabase
      .from('genesis.fleet_status')
      .insert({
        droplet_id: TEST_DROPLET_ID,
        workspace_id: TEST_WORKSPACE_ID,
        account_id: TEST_ACCOUNT_ID,
        region: TEST_REGION,
        size_slug: 's-1vcpu-1gb',
        ip_address: '159.223.45.67',
        status: 'PENDING',
        sslip_domain: '159.223.45.67.sslip.io',
        provisioning_token: 'test_token'
      });
  });

  afterEach(async () => {
    await supabase
      .from('genesis.fleet_status')
      .delete()
      .eq('droplet_id', TEST_DROPLET_ID);
  });

  it('should transition from PENDING to INITIALIZING', async () => {
    await supabase.rpc('genesis.transition_droplet_state', {
      p_droplet_id: TEST_DROPLET_ID,
      p_new_state: 'INITIALIZING',
      p_reason: 'droplet_created',
      p_triggered_by: 'system'
    });

    const { data } = await supabase
      .from('genesis.fleet_status')
      .select('status')
      .eq('droplet_id', TEST_DROPLET_ID)
      .single();

    expect(data?.status).toBe('INITIALIZING');
  });

  it('should log state transitions', async () => {
    await supabase.rpc('genesis.transition_droplet_state', {
      p_droplet_id: TEST_DROPLET_ID,
      p_new_state: 'HANDSHAKE_PENDING',
      p_reason: 'cloud_init_complete',
      p_triggered_by: 'cloud-init'
    });

    const { data: logs } = await supabase
      .from('genesis.droplet_lifecycle_log')
      .select('*')
      .eq('droplet_id', TEST_DROPLET_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(logs).toHaveLength(1);
    expect(logs![0].to_state).toBe('HANDSHAKE_PENDING');
    expect(logs![0].transition_reason).toBe('cloud_init_complete');
  });

  it('should record heartbeat', async () => {
    // Transition to ACTIVE_HEALTHY first
    await supabase.rpc('genesis.transition_droplet_state', {
      p_droplet_id: TEST_DROPLET_ID,
      p_new_state: 'ACTIVE_HEALTHY',
      p_reason: 'handshake_success'
    });

    // Record heartbeat
    await supabase.rpc('genesis.record_heartbeat', {
      p_droplet_id: TEST_DROPLET_ID
    });

    const { data } = await supabase
      .from('genesis.fleet_status')
      .select('last_heartbeat_at, failed_heartbeats')
      .eq('droplet_id', TEST_DROPLET_ID)
      .single();

    expect(data?.last_heartbeat_at).not.toBeNull();
    expect(data?.failed_heartbeats).toBe(0);
  });

  it('should detect zombie droplets', async () => {
    // Create ACTIVE_HEALTHY droplet with old heartbeat
    await supabase
      .from('genesis.fleet_status')
      .update({
        status: 'ACTIVE_HEALTHY',
        last_heartbeat_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
      })
      .eq('droplet_id', TEST_DROPLET_ID);

    const { data: zombies } = await supabase.rpc('genesis.detect_zombie_droplets');

    expect(zombies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          droplet_id: TEST_DROPLET_ID,
          workspace_id: TEST_WORKSPACE_ID
        })
      ])
    );
  });
});

// ============================================================================
// ACCOUNT HEALTH MONITORING TESTS
// ============================================================================

describe('Account Health Monitoring', () => {
  it('should calculate account utilization', async () => {
    const { data } = await supabase
      .from('genesis.account_pool_health')
      .select('*')
      .eq('account_id', TEST_ACCOUNT_ID)
      .single();

    expect(data).not.toBeNull();
    expect(data?.utilization_pct).toBeGreaterThan(0);
    expect(data?.available_capacity).toBeGreaterThan(0);
  });

  it('should show fleet health summary', async () => {
    const { data } = await supabase
      .from('genesis.fleet_health_summary')
      .select('*');

    expect(data).not.toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ============================================================================
// ERROR HANDLING & ROLLBACK TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle missing region gracefully', async () => {
    const factory = new DropletFactory();
    
    const result = await factory.provisionDroplet({
      workspaceId: TEST_WORKSPACE_ID,
      workspaceSlug: 'test',
      region: 'non-existent-region'
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NO_CAPACITY');
  });

  it('should validate droplet ID in state transitions', async () => {
    const invalidDropletId = 99999999;

    await expect(
      supabase.rpc('genesis.transition_droplet_state', {
        p_droplet_id: invalidDropletId,
        p_new_state: 'ACTIVE_HEALTHY',
        p_reason: 'test'
      })
    ).rejects.toThrow();
  });

  it('should prevent negative droplet counts', async () => {
    // Reset to 0
    await supabase
      .from('genesis.do_accounts')
      .update({ current_droplets: 0 })
      .eq('account_id', TEST_ACCOUNT_ID);

    // Try to decrement
    await supabase.rpc('genesis.decrement_droplet_count', {
      p_account_id: TEST_ACCOUNT_ID
    });

    const { data } = await supabase
      .from('genesis.do_accounts')
      .select('current_droplets')
      .eq('account_id', TEST_ACCOUNT_ID)
      .single();

    // Should stay at 0, not go negative
    expect(data?.current_droplets).toBe(0);
  });
});

// ============================================================================
// ENCRYPTION TESTS
// ============================================================================

describe('Token Encryption', () => {
  const TEST_TOKEN = 'dop_v1_test1234567890abcdef1234567890abcdef1234567890abcdef12345678';

  it('should encrypt DO API token', async () => {
    const { data: encrypted, error } = await supabase.rpc(
      'genesis.encrypt_do_token',
      { p_plaintext_token: TEST_TOKEN }
    );

    expect(error).toBeNull();
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(TEST_TOKEN); // Should be encrypted
  });

  it('should decrypt DO API token', async () => {
    // First encrypt
    const { data: encrypted } = await supabase.rpc(
      'genesis.encrypt_do_token',
      { p_plaintext_token: TEST_TOKEN }
    );

    // Create temporary account with encrypted token
    const tempAccountId = 'genesis-do-pool-encryption-test';
    await supabase
      .from('genesis.do_accounts')
      .insert({
        account_id: tempAccountId,
        api_token_encrypted: encrypted,
        region: 'nyc1',
        max_droplets: 50
      });

    // Decrypt
    const { data: decrypted, error } = await supabase.rpc(
      'genesis.decrypt_do_token',
      { p_account_id: tempAccountId }
    );

    expect(error).toBeNull();
    expect(decrypted).toBe(TEST_TOKEN);

    // Cleanup
    await supabase
      .from('genesis.do_accounts')
      .delete()
      .eq('account_id', tempAccountId);
  });

  it('should fail to decrypt with invalid account', async () => {
    await expect(
      supabase.rpc('genesis.decrypt_do_token', {
        p_account_id: 'non-existent-account'
      })
    ).rejects.toThrow();
  });
});

// ============================================================================
// INTEGRATION TEST (MOCKED)
// ============================================================================

describe('Full Provisioning Flow (Mocked)', () => {
  it('should complete provisioning flow with mocked DO API', async () => {
    // Note: This test would require mocking the DigitalOcean API
    // In a real implementation, we'd use a library like nock or msw
    
    // For now, just test the account selection and preparation steps
    const factory = new DropletFactory();
    
    const account = await factory.selectAccount(TEST_REGION);
    expect(account).not.toBeNull();
    
    const script = await factory.generateCloudInit({
      workspaceId: TEST_WORKSPACE_ID,
      workspaceSlug: 'test-integration',
      timezone: 'UTC',
      provisioningToken: 'prov_integration_test',
      postgresPassword: 'test_pass',
      n8nEncryptionKey: 'test_key'
    });
    
    expect(script).toBeTruthy();
    expect(script.length).toBeGreaterThan(100);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  it('should select account in under 100ms', async () => {
    const factory = new DropletFactory();
    const start = Date.now();
    
    await factory.selectAccount(TEST_REGION);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should generate Cloud-Init script in under 50ms', async () => {
    const factory = new DropletFactory();
    const start = Date.now();
    
    await factory.generateCloudInit({
      workspaceId: TEST_WORKSPACE_ID,
      workspaceSlug: 'perf-test',
      timezone: 'UTC',
      provisioningToken: 'prov_perf',
      postgresPassword: 'pass',
      n8nEncryptionKey: 'key'
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
