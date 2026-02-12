/**
 * GENESIS PHASE 70.B: DEPLOYMENT TRACKER TESTS
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { TerraformStateManager } from '../../../lib/genesis/phase70b/terraform-state-manager';
import { DeploymentTracker, TerraformPlanJson } from '../../../lib/genesis/phase70b/deployment-tracker';
import { TerraformState } from '../../../lib/genesis/phase70b/types';

const TEST_DIR = join(__dirname, 'tmp-deploy-tests');
const TEST_STATE_PATH = join(TEST_DIR, 'terraform.tfstate');

const MOCK_STATE: TerraformState = {
  version: 4,
  terraform_version: '1.6.0',
  serial: 1,
  lineage: 'test',
  outputs: { ip: { value: '192.0.2.1', type: 'string', sensitive: false } },
  resources: [],
};

const MOCK_PLAN_CREATE: TerraformPlanJson = {
  format_version: '1.2',
  terraform_version: '1.6.0',
  resource_changes: [
    {
      address: 'digitalocean_droplet.dashboard',
      mode: 'managed',
      type: 'digitalocean_droplet',
      name: 'dashboard',
      change: {
        actions: ['create'],
        before: null,
        after: { name: 'genesis-dashboard', region: 'nyc1', size: 's-2vcpu-4gb' },
      },
    },
  ],
};

const MOCK_PLAN_UPDATE: TerraformPlanJson = {
  format_version: '1.2',
  terraform_version: '1.6.0',
  resource_changes: [
    {
      address: 'digitalocean_droplet.dashboard',
      mode: 'managed',
      type: 'digitalocean_droplet',
      name: 'dashboard',
      change: {
        actions: ['update'],
        before: { name: 'genesis-dashboard', size: 's-2vcpu-4gb' },
        after: { name: 'genesis-dashboard', size: 's-4vcpu-8gb' },
      },
    },
  ],
};

const MOCK_PLAN_DELETE: TerraformPlanJson = {
  format_version: '1.2',
  terraform_version: '1.6.0',
  resource_changes: [
    {
      address: 'digitalocean_droplet.dashboard',
      mode: 'managed',
      type: 'digitalocean_droplet',
      name: 'dashboard',
      change: {
        actions: ['delete'],
        before: { name: 'genesis-dashboard' },
        after: null,
      },
    },
  ],
};

const MOCK_PLAN_RECREATE: TerraformPlanJson = {
  format_version: '1.2',
  terraform_version: '1.6.0',
  resource_changes: [
    {
      address: 'digitalocean_droplet.dashboard',
      mode: 'managed',
      type: 'digitalocean_droplet',
      name: 'dashboard',
      change: {
        actions: ['delete', 'create'],
        before: { name: 'old', region: 'nyc1' },
        after: { name: 'new', region: 'sfo1' },
      },
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
    // Ignore
  }
});

describe('DeploymentTracker - Plan Analysis', () => {
  it('should analyze create plan', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const plan = await tracker.analyzePlan(MOCK_PLAN_CREATE, 'production');

    expect(plan.environment).toBe('production');
    expect(plan.totalChanges).toBe(1);
    expect(plan.changes[0].action).toBe('create');
    expect(plan.changes[0].resourceName).toBe('dashboard');
    expect(plan.safeToApply).toBe(true);
  });

  it('should analyze update plan', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const plan = await tracker.analyzePlan(MOCK_PLAN_UPDATE, 'production');

    expect(plan.changes[0].action).toBe('update');
    expect(plan.changes[0].before).toEqual({ name: 'genesis-dashboard', size: 's-2vcpu-4gb' });
    expect(plan.changes[0].after).toEqual({ name: 'genesis-dashboard', size: 's-4vcpu-8gb' });
    expect(plan.safeToApply).toBe(true);
  });

  it('should analyze delete plan and mark as unsafe', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const plan = await tracker.analyzePlan(MOCK_PLAN_DELETE, 'production');

    expect(plan.changes[0].action).toBe('delete');
    expect(plan.safeToApply).toBe(false);
    expect(plan.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('DELETIONS')]),
    );
  });

  it('should detect recreate and mark as requiring recreate', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const plan = await tracker.analyzePlan(MOCK_PLAN_RECREATE, 'production');

    expect(plan.changes[0].action).toBe('recreate');
    expect(plan.changes[0].requiresRecreate).toBe(true);
    expect(plan.safeToApply).toBe(false);
    expect(plan.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('recreated')]),
    );
  });

  it('should identify affected dependencies for droplet changes', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const plan = await tracker.analyzePlan(MOCK_PLAN_UPDATE, 'production');

    expect(plan.changes[0].affectedDependencies).toContain('digitalocean_loadbalancer');
  });
});

describe('DeploymentTracker - Deployment Recording', () => {
  it('should start deployment and return ID', () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const { deploymentId, startedAt } = tracker.startDeployment();

    expect(deploymentId).toMatch(/^deploy-\d+-[a-z0-9]+$/);
    expect(new Date(startedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should record successful deployment', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const { deploymentId, startedAt } = tracker.startDeployment();

    // Simulate deployment taking 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await tracker.recordDeployment(deploymentId, startedAt, true, 3, 0);

    expect(result.success).toBe(true);
    expect(result.appliedChanges).toBe(3);
    expect(result.failedChanges).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(100);
    expect(result.error).toBeUndefined();
  });

  it('should record failed deployment with error', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const { deploymentId, startedAt } = tracker.startDeployment();

    const result = await tracker.recordDeployment(
      deploymentId,
      startedAt,
      false,
      1,
      2,
      'Droplet creation failed',
    );

    expect(result.success).toBe(false);
    expect(result.appliedChanges).toBe(1);
    expect(result.failedChanges).toBe(2);
    expect(result.error).toBe('Droplet creation failed');
  });
});

describe('DeploymentTracker - History & Analytics', () => {
  it('should retrieve deployment history', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    // Record multiple deployments
    const { deploymentId: id1, startedAt: start1 } = tracker.startDeployment();
    await tracker.recordDeployment(id1, start1, true, 2, 0);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const { deploymentId: id2, startedAt: start2 } = tracker.startDeployment();
    await tracker.recordDeployment(id2, start2, false, 0, 1, 'Failed');

    const history = tracker.getHistory();

    expect(history).toHaveLength(2);
    // Most recent first
    expect(history[0].success).toBe(false);
    expect(history[1].success).toBe(true);
  });

  it('should limit history results', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    // Record 3 deployments
    for (let i = 0; i < 3; i++) {
      const { deploymentId, startedAt } = tracker.startDeployment();
      await tracker.recordDeployment(deploymentId, startedAt, true, 1, 0);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const history = tracker.getHistory(2);

    expect(history).toHaveLength(2);
  });

  it('should calculate deployment statistics', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    // 3 successful, 1 failed (one with delay so averageDurationMs > 0)
    for (let i = 0; i < 3; i++) {
      const { deploymentId, startedAt } = tracker.startDeployment();
      if (i === 1) await new Promise((r) => setTimeout(r, 15)); // ensure non-zero duration
      await tracker.recordDeployment(deploymentId, startedAt, true, 2, 0);
    }

    const { deploymentId, startedAt } = tracker.startDeployment();
    await tracker.recordDeployment(deploymentId, startedAt, false, 0, 1, 'Error');

    const stats = tracker.getStatistics();

    expect(stats.totalDeployments).toBe(4);
    expect(stats.successfulDeployments).toBe(3);
    expect(stats.failedDeployments).toBe(1);
    expect(stats.successRate).toBe(75);
    expect(stats.averageDurationMs).toBeGreaterThanOrEqual(0);
    expect(stats.lastDeploymentAt).toBeTruthy();
  });

  it('should get last successful deployment', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const { deploymentId: id1, startedAt: start1 } = tracker.startDeployment();
    await tracker.recordDeployment(id1, start1, true, 1, 0);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const { deploymentId: id2, startedAt: start2 } = tracker.startDeployment();
    await tracker.recordDeployment(id2, start2, false, 0, 1, 'Failed');

    const last = tracker.getLastSuccessfulDeployment();

    expect(last).toBeTruthy();
    expect(last?.success).toBe(true);
    expect(last?.appliedChanges).toBe(1);
  });

  it('should return null if no successful deployments', () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const last = tracker.getLastSuccessfulDeployment();

    expect(last).toBeNull();
  });
});

describe('DeploymentTracker - Change Diff', () => {
  it('should generate human-readable diff for update', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const plan = await tracker.analyzePlan(MOCK_PLAN_UPDATE, 'production');
    const diff = tracker.generateChangeDiff(plan.changes[0]);

    expect(diff).toContain('Resource: digitalocean_droplet.dashboard');
    expect(diff).toContain('Action: UPDATE');
    expect(diff).toContain('s-2vcpu-4gb');
    expect(diff).toContain('s-4vcpu-8gb');
  });

  it('should indicate recreate in diff', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const plan = await tracker.analyzePlan(MOCK_PLAN_RECREATE, 'production');
    const diff = tracker.generateChangeDiff(plan.changes[0]);

    expect(diff).toContain('REQUIRES RECREATE');
  });
});

describe('DeploymentTracker - Rollback Guidance', () => {
  it('should provide rollback guidance after failure if previous deployment exists', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    // Record successful deployment
    const { deploymentId: id1, startedAt: start1 } = tracker.startDeployment();
    const success = await tracker.recordDeployment(id1, start1, true, 3, 0);

    // Record failed deployment
    const { deploymentId: id2, startedAt: start2 } = tracker.startDeployment();
    const failure = await tracker.recordDeployment(id2, start2, false, 0, 2, 'Error');

    const guidance = tracker.generateRollbackGuidance(failure);

    expect(guidance.canRollback).toBe(true);
    expect(guidance.steps.length).toBeGreaterThan(0);
    expect(guidance.warnings.length).toBeGreaterThan(0);
  });

  it('should indicate no rollback possible if no previous successful deployment', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const { deploymentId, startedAt } = tracker.startDeployment();
    const failure = await tracker.recordDeployment(deploymentId, startedAt, false, 0, 1, 'Error');

    const guidance = tracker.generateRollbackGuidance(failure);

    expect(guidance.canRollback).toBe(false);
    expect(guidance.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('manual intervention')]),
    );
  });
});

describe('DeploymentTracker - Drift Detection', () => {
  it('should detect no drift when resource count matches', async () => {
    const stateWith2Resources = {
      ...MOCK_STATE,
      resources: [
        { mode: 'managed' as const, type: 'digitalocean_droplet' as const, name: 'a', provider: 'x', instances: [] },
        { mode: 'managed' as const, type: 'digitalocean_droplet' as const, name: 'b', provider: 'x', instances: [] },
      ],
    };

    await writeFile(TEST_STATE_PATH, JSON.stringify(stateWith2Resources, null, 2));

    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const drift = await tracker.detectDrift(2);

    expect(drift.hasDrift).toBe(false);
    expect(drift.actualResourceCount).toBe(2);
    expect(drift.driftSummary).toContain('No drift');
  });

  it('should detect drift when resource count differs', async () => {
    const stateManager = new TerraformStateManager(TEST_STATE_PATH);
    const tracker = new DeploymentTracker(stateManager);

    const drift = await tracker.detectDrift(5);

    expect(drift.hasDrift).toBe(true);
    expect(drift.actualResourceCount).toBe(0);
    expect(drift.driftSummary).toContain('drift detected');
  });
});
