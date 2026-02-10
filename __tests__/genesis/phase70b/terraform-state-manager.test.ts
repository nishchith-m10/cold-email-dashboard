/**
 * GENESIS PHASE 70.B: TERRAFORM STATE MANAGER TESTS
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { TerraformStateManager } from '../../../lib/genesis/phase70b/terraform-state-manager';
import {
  TerraformState,
  StateValidationFailedError,
  InfrastructureError,
} from '../../../lib/genesis/phase70b/types';

const TEST_DIR = join(__dirname, 'tmp-terraform-tests');
const TEST_STATE_PATH = join(TEST_DIR, 'terraform.tfstate');

// ============================================
// TEST FIXTURES
// ============================================

const VALID_STATE: TerraformState = {
  version: 4,
  terraform_version: '1.6.0',
  serial: 5,
  lineage: 'abc-123-def-456',
  outputs: {
    dashboard_ip: {
      value: '192.0.2.1',
      type: 'string',
      sensitive: false,
    },
    redis_password: {
      value: 'super_secret_password',
      type: 'string',
      sensitive: true,
    },
  },
  resources: [
    {
      mode: 'managed',
      type: 'digitalocean_droplet',
      name: 'dashboard',
      provider: 'provider[\"registry.terraform.io/digitalocean/digitalocean\"]',
      instances: [
        {
          schema_version: 1,
          attributes: {
            id: 'droplet-123',
            name: 'genesis-dashboard-prod',
            region: 'nyc1',
            size: 's-2vcpu-4gb',
            ipv4_address: '192.0.2.1',
            status: 'active',
            monitoring: true,
            backups: false,
          },
          dependencies: [],
          create_before_destroy: true,
        },
      ],
    },
    {
      mode: 'managed',
      type: 'digitalocean_database_cluster',
      name: 'redis',
      provider: 'provider[\"registry.terraform.io/digitalocean/digitalocean\"]',
      instances: [
        {
          schema_version: 1,
          attributes: {
            id: 'redis-456',
            name: 'genesis-redis-prod',
            engine: 'redis',
            version: '7',
            status: 'online',
            host: 'redis.example.com',
            port: 25061,
            num_nodes: 1,
          },
          dependencies: [],
          create_before_destroy: false,
        },
      ],
    },
  ],
};

const INVALID_STATE_OLD_VERSION: TerraformState = {
  ...VALID_STATE,
  version: 3, // Too old
};

const INVALID_STATE_NO_LINEAGE: TerraformState = {
  ...VALID_STATE,
  lineage: '', // Missing lineage
};

const INVALID_STATE_DROPLET_NOT_ACTIVE: TerraformState = {
  ...VALID_STATE,
  resources: [
    {
      ...VALID_STATE.resources[0],
      instances: [
        {
          ...VALID_STATE.resources[0].instances[0],
          attributes: {
            ...VALID_STATE.resources[0].instances[0].attributes,
            status: 'off', // Not active
          },
        },
      ],
    },
  ],
};

// ============================================
// SETUP / TEARDOWN
// ============================================

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

// ============================================
// TESTS: STATE LOADING
// ============================================

describe('TerraformStateManager - State Loading', () => {
  it('should load valid Terraform state from file', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(VALID_STATE, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const state = await manager.loadState();

    expect(state.version).toBe(4);
    expect(state.serial).toBe(5);
    expect(state.lineage).toBe('abc-123-def-456');
    expect(state.resources).toHaveLength(2);
  });

  it('should throw error if state file does not exist', async () => {
    const manager = new TerraformStateManager(join(TEST_DIR, 'nonexistent.tfstate'));

    await expect(manager.loadState()).rejects.toThrow(InfrastructureError);
    await expect(manager.loadState()).rejects.toThrow('State file not found');
  });

  it('should throw error if state file is invalid JSON', async () => {
    await writeFile(TEST_STATE_PATH, 'invalid json {{{');

    const manager = new TerraformStateManager(TEST_STATE_PATH);

    await expect(manager.loadState()).rejects.toThrow(InfrastructureError);
    await expect(manager.loadState()).rejects.toThrow('Failed to parse state file');
  });

  it('should throw error if state file has invalid structure', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify({ foo: 'bar' }));

    const manager = new TerraformStateManager(TEST_STATE_PATH);

    await expect(manager.loadState()).rejects.toThrow(InfrastructureError);
    await expect(manager.loadState()).rejects.toThrow(/invalid.*version|INVALID_STATE_STRUCTURE/i);
  });

  it('should cache state and not reload from file on second call', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(VALID_STATE, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);

    // First load
    const state1 = await manager.loadState();
    expect(state1.serial).toBe(5);

    // Update file
    const modifiedState = { ...VALID_STATE, serial: 10 };
    await writeFile(TEST_STATE_PATH, JSON.stringify(modifiedState, null, 2));

    // Second load (should still be cached)
    const state2 = await manager.loadState();
    expect(state2.serial).toBe(5); // Still cached value

    // Bypass cache
    const state3 = await manager.loadState(true);
    expect(state3.serial).toBe(10); // Updated value
  });

  it('should clear cache successfully', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(VALID_STATE, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);

    // Load and cache
    await manager.loadState();

    // Clear cache
    manager.clearCache();

    // Update file
    const modifiedState = { ...VALID_STATE, serial: 15 };
    await writeFile(TEST_STATE_PATH, JSON.stringify(modifiedState, null, 2));

    // Load again (should read from file since cache was cleared)
    const state = await manager.loadState();
    expect(state.serial).toBe(15);
  });
});

// ============================================
// TESTS: METADATA EXTRACTION
// ============================================

describe('TerraformStateManager - Metadata', () => {
  beforeEach(async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(VALID_STATE, null, 2));
  });

  it('should extract metadata from state', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const metadata = await manager.getMetadata('production');

    expect(metadata.environment).toBe('production');
    expect(metadata.version).toBe(4);
    expect(metadata.serial).toBe(5);
    expect(metadata.lineage).toBe('abc-123-def-456');
    expect(metadata.resourceCount).toBe(2);
    expect(metadata.outputCount).toBe(2);
  });
});

// ============================================
// TESTS: STATE VALIDATION
// ============================================

describe('TerraformStateManager - Validation', () => {
  it('should validate a healthy state successfully', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(VALID_STATE, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.validateState('production');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect state version too old', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(INVALID_STATE_OLD_VERSION, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.validateState('production');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'STATE_VERSION_UNSUPPORTED',
          severity: 'critical',
        }),
      ]),
    );
  });

  it('should detect missing lineage', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(INVALID_STATE_NO_LINEAGE, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.validateState('production');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_LINEAGE',
          severity: 'error',
        }),
      ]),
    );
  });

  it('should accept droplet not active (health reported by InfrastructureValidator)', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(INVALID_STATE_DROPLET_NOT_ACTIVE, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.validateState('production');

    // State structure is valid; droplet health (e.g. not active) is reported by generateReport
    expect(result.valid).toBe(true);
    expect(result.errors.filter((e) => e.code === 'DROPLET_NOT_ACTIVE')).toHaveLength(0);
  });

  it('should warn if sensitive output not marked', async () => {
    const stateWithExposedSecret = {
      ...VALID_STATE,
      outputs: {
        api_token: {
          value: 'dop_v1_this_is_a_really_long_token_12345678901234567890',
          type: 'string',
          sensitive: false, // Should be true!
        },
      },
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateWithExposedSecret, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.validateState('production');

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SENSITIVE_OUTPUT_NOT_MARKED',
        }),
      ]),
    );
  });

  it('should warn if serial is 0 (never applied)', async () => {
    const freshState = { ...VALID_STATE, serial: 0 };
    await writeFile(TEST_STATE_PATH, JSON.stringify(freshState, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.validateState('production');

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FRESH_STATE',
        }),
      ]),
    );
  });

  it('should throw when validateOrThrow is called on invalid state', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(INVALID_STATE_OLD_VERSION, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);

    await expect(manager.validateOrThrow('production')).rejects.toThrow(StateValidationFailedError);
  });

  it('should not throw when validateOrThrow is called on valid state', async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(VALID_STATE, null, 2));

    const manager = new TerraformStateManager(TEST_STATE_PATH);

    await expect(manager.validateOrThrow('production')).resolves.not.toThrow();
  });
});

// ============================================
// TESTS: RESOURCE QUERIES
// ============================================

describe('TerraformStateManager - Resource Queries', () => {
  beforeEach(async () => {
    await writeFile(TEST_STATE_PATH, JSON.stringify(VALID_STATE, null, 2));
  });

  it('should get resources by type', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const droplets = await manager.getResourcesByType('digitalocean_droplet');

    expect(droplets).toHaveLength(1);
    expect(droplets[0].name).toBe('dashboard');
  });

  it('should return empty array if no resources of type exist', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const lbs = await manager.getResourcesByType('digitalocean_loadbalancer');

    expect(lbs).toHaveLength(0);
  });

  it('should get a specific resource by type and name', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const redis = await manager.getResource('digitalocean_database_cluster', 'redis');

    expect(redis).not.toBeNull();
    expect(redis?.name).toBe('redis');
    expect(redis?.type).toBe('digitalocean_database_cluster');
  });

  it('should return null if resource does not exist', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.getResource('digitalocean_droplet', 'nonexistent');

    expect(result).toBeNull();
  });

  it('should get all outputs', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const outputs = await manager.getOutputs();

    expect(outputs).toHaveProperty('dashboard_ip', '192.0.2.1');
    expect(outputs).toHaveProperty('redis_password', 'super_secret_password');
  });

  it('should get a specific output', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const ip = await manager.getOutput('dashboard_ip');

    expect(ip).toBe('192.0.2.1');
  });

  it('should return undefined for non-existent output', async () => {
    const manager = new TerraformStateManager(TEST_STATE_PATH);
    const result = await manager.getOutput('nonexistent');

    expect(result).toBeUndefined();
  });
});
