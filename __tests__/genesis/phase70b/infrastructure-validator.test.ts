/**
 * GENESIS PHASE 70.B: INFRASTRUCTURE VALIDATOR TESTS
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { TerraformStateManager } from '../../../lib/genesis/phase70b/terraform-state-manager';
import { InfrastructureValidator } from '../../../lib/genesis/phase70b/infrastructure-validator';
import { TerraformState } from '../../../lib/genesis/phase70b/types';

const TEST_DIR = join(__dirname, 'tmp-infra-tests');
const TEST_STATE_PATH = join(TEST_DIR, 'terraform.tfstate');

const MOCK_STATE: TerraformState = {
  version: 4,
  terraform_version: '1.6.0',
  serial: 1,
  lineage: 'test-lineage',
  outputs: {},
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
            id: 'd-1',
            status: 'active',
            ipv4_address: '192.0.2.1',
            region: 'nyc1',
            size: 's-2vcpu-4gb',
            monitoring: true,
            backups: true,
          },
          dependencies: [],
          create_before_destroy: false,
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
            id: 'db-1',
            status: 'online',
            host: 'redis.example.com',
            port: 25061,
            engine_version: '7',
            num_nodes: 1,
          },
          dependencies: [],
          create_before_destroy: false,
        },
      ],
    },
    {
      mode: 'managed',
      type: 'digitalocean_loadbalancer',
      name: 'dashboard_lb',
      provider: 'provider[\"registry.terraform.io/digitalocean/digitalocean\"]',
      instances: [
        {
          schema_version: 1,
          attributes: {
            id: 'lb-1',
            status: 'active',
            ip: '192.0.2.100',
            droplet_ids: ['d-1'],
            health_check: { path: '/health' },
          },
          dependencies: [],
          create_before_destroy: false,
        },
      ],
    },
    {
      mode: 'managed',
      type: 'digitalocean_record',
      name: 'apex',
      provider: 'provider[\"registry.terraform.io/digitalocean/digitalocean\"]',
      instances: [
        {
          schema_version: 1,
          attributes: {
            id: 'rec-1',
            type: 'A',
            value: '192.0.2.100',
            ttl: 300,
          },
          dependencies: [],
          create_before_destroy: false,
        },
      ],
    },
  ],
};

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
  await writeFile(TEST_STATE_PATH, JSON.stringify(MOCK_STATE, null, 2));
});

afterEach(async () => {
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

describe('InfrastructureValidator - Droplet Validation', () => {
  it('should validate healthy droplet', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    const droplet = report.resources.find((r) => r.resourceType === 'digitalocean_droplet');
    expect(droplet).toBeDefined();
    expect(droplet?.status).toBe('healthy');
    expect(droplet?.checks.find((c) => c.name === 'exists')?.passed).toBe(true);
    expect(droplet?.checks.find((c) => c.name === 'status')?.passed).toBe(true);
    expect(droplet?.checks.find((c) => c.name === 'ip_assigned')?.passed).toBe(true);
  });

  it('should detect droplet without IP address', async () => {
    const stateWithoutIP = {
      ...MOCK_STATE,
      resources: [
        {
          ...MOCK_STATE.resources[0],
          instances: [
            {
              ...MOCK_STATE.resources[0].instances[0],
              attributes: {
                ...MOCK_STATE.resources[0].instances[0].attributes,
                ipv4_address: null,
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateWithoutIP, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    const droplet = report.resources.find((r) => r.resourceType === 'digitalocean_droplet');
    expect(droplet?.status).toBe('error');
    expect(droplet?.checks.find((c) => c.name === 'ip_assigned')?.passed).toBe(false);
  });

  it('should detect droplet not in active status', async () => {
    const stateNotActive = {
      ...MOCK_STATE,
      resources: [
        {
          ...MOCK_STATE.resources[0],
          instances: [
            {
              ...MOCK_STATE.resources[0].instances[0],
              attributes: {
                ...MOCK_STATE.resources[0].instances[0].attributes,
                status: 'off',
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateNotActive, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    const droplet = report.resources.find((r) => r.resourceType === 'digitalocean_droplet');
    expect(droplet?.status).toBe('error');
    expect(droplet?.checks.find((c) => c.name === 'status')?.passed).toBe(false);
  });

  it('should flag monitoring disabled as degraded', async () => {
    const stateNoMonitoring = {
      ...MOCK_STATE,
      resources: [
        {
          ...MOCK_STATE.resources[0],
          instances: [
            {
              ...MOCK_STATE.resources[0].instances[0],
              attributes: {
                ...MOCK_STATE.resources[0].instances[0].attributes,
                monitoring: false,
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateNoMonitoring, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    const droplet = report.resources.find((r) => r.resourceType === 'digitalocean_droplet');
    expect(droplet?.status).toBe('degraded');
    expect(droplet?.checks.find((c) => c.name === 'monitoring_enabled')?.passed).toBe(false);
  });
});

describe('InfrastructureValidator - Redis Validation', () => {
  it('should validate healthy Redis cluster', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    const redis = report.resources.find((r) => r.resourceType === 'digitalocean_database_cluster');
    expect(redis).toBeDefined();
    expect(redis?.status).toBe('healthy');
    expect(redis?.checks.find((c) => c.name === 'status')?.passed).toBe(true);
    expect(redis?.checks.find((c) => c.name === 'connection_info')?.passed).toBe(true);
  });

  it('should detect Redis cluster not online', async () => {
    const stateNotOnline = {
      ...MOCK_STATE,
      resources: [
        MOCK_STATE.resources[0], // Keep droplet
        {
          ...MOCK_STATE.resources[1],
          instances: [
            {
              ...MOCK_STATE.resources[1].instances[0],
              attributes: {
                ...MOCK_STATE.resources[1].instances[0].attributes,
                status: 'creating',
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateNotOnline, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    const redis = report.resources.find((r) => r.resourceType === 'digitalocean_database_cluster');
    expect(redis?.status).toBe('error');
    expect(redis?.checks.find((c) => c.name === 'status')?.passed).toBe(false);
  });

  it('should detect missing connection info', async () => {
    const stateMissingConnection = {
      ...MOCK_STATE,
      resources: [
        MOCK_STATE.resources[0], // Keep droplet
        {
          ...MOCK_STATE.resources[1],
          instances: [
            {
              ...MOCK_STATE.resources[1].instances[0],
              attributes: {
                ...MOCK_STATE.resources[1].instances[0].attributes,
                host: null,
                port: null,
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateMissingConnection, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    const redis = report.resources.find((r) => r.resourceType === 'digitalocean_database_cluster');
    expect(redis?.status).toBe('error');
    expect(redis?.checks.find((c) => c.name === 'connection_info')?.passed).toBe(false);
  });
});

describe('InfrastructureValidator - Overall Report', () => {
  it('should generate comprehensive report with all resource types', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    expect(report.environment).toBe('production');
    expect(report.resources).toHaveLength(4);
    expect(report.overallStatus).toBe('healthy');
    expect(report.issueCount).toBe(0);
  });

  it('should report degraded overall status if any resource is degraded', async () => {
    const stateDegraded = {
      ...MOCK_STATE,
      resources: [
        {
          ...MOCK_STATE.resources[0],
          instances: [
            {
              ...MOCK_STATE.resources[0].instances[0],
              attributes: {
                ...MOCK_STATE.resources[0].instances[0].attributes,
                backups: false, // Degraded
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateDegraded, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    expect(report.overallStatus).toBe('degraded');
    expect(report.issueCount).toBeGreaterThan(0);
  });

  it('should report error status if any critical resource is unhealthy', async () => {
    const stateError = {
      ...MOCK_STATE,
      resources: [
        {
          ...MOCK_STATE.resources[0],
          instances: [
            {
              ...MOCK_STATE.resources[0].instances[0],
              attributes: {
                ...MOCK_STATE.resources[0].instances[0].attributes,
                status: 'off',
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateError, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    expect(report.overallStatus).toBe('error');
    expect(report.issueCount).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('should provide recommendations when issues detected', async () => {
    const stateError = {
      ...MOCK_STATE,
      resources: [
        {
          ...MOCK_STATE.resources[0],
          instances: [
            {
              ...MOCK_STATE.resources[0].instances[0],
              attributes: {
                ...MOCK_STATE.resources[0].instances[0].attributes,
                status: 'off',
              },
            },
          ],
        },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateError, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const validator = new InfrastructureValidator(stateManager);

    const report = await validator.generateReport('production');

    expect(report.recommendations).toEqual(
      expect.arrayContaining([expect.stringContaining('resource(s) are unhealthy')]),
    );
  });
});
