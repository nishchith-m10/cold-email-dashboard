/**
 * GENESIS PHASE 48: DEPLOYMENT CONTROLLER TESTS
 */

import {
  DeploymentController,
  DeploymentControllerError,
  MockDeploymentEnvironment,
  DEFAULT_CANARY_CONFIG,
} from '../../../lib/genesis/phase48';

describe('Phase 48 Deployment Controller', () => {
  let env: MockDeploymentEnvironment;
  let controller: DeploymentController;

  beforeEach(() => {
    env = new MockDeploymentEnvironment();
    controller = new DeploymentController(env);
  });

  // ============================================
  // DEPLOY TO STANDBY
  // ============================================
  describe('deployToStandby', () => {
    it('should deploy to standby slot', async () => {
      const result = await controller.deployToStandby('v2.0.0');
      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeTruthy();

      const state = await env.getDeploymentState();
      expect(state.standbyVersion).toBe('v2.0.0');
    });

    it('should reject deploy when status is canary', async () => {
      env.setState({ status: 'canary' });
      await expect(controller.deployToStandby('v2.0.0')).rejects.toThrow(DeploymentControllerError);
    });

    it('should allow deploy from failed state', async () => {
      env.setState({ status: 'failed' });
      const result = await controller.deployToStandby('v2.0.0');
      expect(result.success).toBe(true);
    });

    it('should allow deploy from rolled_back state', async () => {
      env.setState({ status: 'rolled_back' });
      const result = await controller.deployToStandby('v2.0.0');
      expect(result.success).toBe(true);
    });

    it('should log deploy events', async () => {
      await controller.deployToStandby('v2.0.0');
      const events = await env.getEvents();
      const deployEvents = events.filter(e => e.type === 'deploy_started' || e.type === 'deploy_completed');
      expect(deployEvents.length).toBe(2);
    });
  });

  // ============================================
  // HEALTH CHECK
  // ============================================
  describe('healthCheck', () => {
    it('should check standby slot by default', async () => {
      const result = await controller.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.details).toBeDefined();
    });

    it('should check specified slot', async () => {
      const result = await controller.healthCheck('blue');
      expect(result.healthy).toBe(true);
    });

    it('should detect unhealthy slot', async () => {
      env.setHealthOverride('green', false);
      const result = await controller.healthCheck('green');
      expect(result.healthy).toBe(false);
    });

    it('should log health check events', async () => {
      await controller.healthCheck();
      const events = await env.getEvents();
      expect(events.some(e => e.type === 'health_check_passed')).toBe(true);
    });

    it('should track consecutive health checks for canary', async () => {
      // Start canary first
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await controller.startCanary();

      await controller.healthCheck();
      await controller.healthCheck();
      const canary = controller.getCanaryState();
      expect(canary.consecutiveHealthChecks).toBe(2);
      expect(canary.healthChecksPassed).toBe(2);
    });

    it('should reset consecutive count on failure', async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await controller.startCanary();

      await controller.healthCheck(); // pass
      env.setHealthOverride('green', false);
      await controller.healthCheck(); // fail

      const canary = controller.getCanaryState();
      expect(canary.consecutiveHealthChecks).toBe(0);
      expect(canary.healthChecksFailed).toBe(1);
    });
  });

  // ============================================
  // CANARY MANAGEMENT
  // ============================================
  describe('Canary', () => {
    beforeEach(async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
    });

    it('should start canary with initial percentage', async () => {
      const canary = await controller.startCanary();
      expect(canary.active).toBe(true);
      expect(canary.percentage).toBe(DEFAULT_CANARY_CONFIG.initialPercentage);
      expect(canary.startedAt).toBeTruthy();
    });

    it('should reject canary start from invalid state', async () => {
      env.setState({ status: 'rolling_back' });
      await expect(controller.startCanary()).rejects.toThrow(DeploymentControllerError);
    });

    it('should advance canary after health checks', async () => {
      const config = { ...DEFAULT_CANARY_CONFIG, requiredHealthChecks: 1 };
      controller = new DeploymentController(env, config);

      await controller.startCanary();
      await controller.healthCheck(); // 1 consecutive pass

      const canary = await controller.advanceCanary();
      expect(canary.percentage).toBe(config.initialPercentage + config.stepPercentage);
      expect(canary.stepCount).toBe(1);
    });

    it('should reject advance without enough health checks', async () => {
      await controller.startCanary();
      // No health checks yet
      await expect(controller.advanceCanary()).rejects.toThrow('health checks');
    });

    it('should cap canary at max percentage', async () => {
      const config = { ...DEFAULT_CANARY_CONFIG, initialPercentage: 90, stepPercentage: 20, requiredHealthChecks: 1 };
      controller = new DeploymentController(env, config);

      await controller.startCanary();
      await controller.healthCheck();
      const canary = await controller.advanceCanary();
      expect(canary.percentage).toBe(100); // Capped at max
    });

    it('should abort canary', async () => {
      await controller.startCanary();
      await controller.abortCanary('test abort');
      const canary = controller.getCanaryState();
      expect(canary.active).toBe(false);
      expect(canary.percentage).toBe(0);
    });

    it('should be safe to abort when no canary active', async () => {
      await controller.abortCanary('no-op');
      expect(controller.getCanaryState().active).toBe(false);
    });

    it('should reject advance when no canary active', async () => {
      await expect(controller.advanceCanary()).rejects.toThrow('No active canary');
    });

    it('should determine promotion readiness', async () => {
      const config = { ...DEFAULT_CANARY_CONFIG, initialPercentage: 100, requiredHealthChecks: 2 };
      controller = new DeploymentController(env, config);

      await controller.startCanary();
      await controller.healthCheck();
      expect(controller.isCanaryReadyForPromotion()).toBe(false);
      await controller.healthCheck();
      expect(controller.isCanaryReadyForPromotion()).toBe(true);
    });
  });

  // ============================================
  // PROMOTION
  // ============================================
  describe('Promotion', () => {
    it('should promote standby to active', async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      const result = await controller.promote();
      expect(result.success).toBe(true);

      const state = await env.getDeploymentState();
      expect(state.activeVersion).toBe('v2.0.0');
    });

    it('should log promotion events', async () => {
      await controller.promote();
      const events = await env.getEvents();
      expect(events.some(e => e.type === 'promote_started')).toBe(true);
      expect(events.some(e => e.type === 'promote_completed')).toBe(true);
    });

    it('should reset canary state after promotion', async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await controller.startCanary();
      await controller.promote();
      expect(controller.getCanaryState().active).toBe(false);
    });
  });

  // ============================================
  // ROLLBACK
  // ============================================
  describe('Rollback', () => {
    it('should rollback deployment', async () => {
      const result = await controller.rollback('test rollback');
      expect(result.success).toBe(true);
    });

    it('should abort active canary during rollback', async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await controller.startCanary();
      await controller.rollback('rollback with canary');
      expect(controller.getCanaryState().active).toBe(false);
    });

    it('should log rollback events', async () => {
      await controller.rollback('test');
      const events = await env.getEvents();
      expect(events.some(e => e.type === 'rollback_started')).toBe(true);
      expect(events.some(e => e.type === 'rollback_completed')).toBe(true);
    });
  });

  // ============================================
  // DEPLOYMENT ID
  // ============================================
  describe('Deployment ID', () => {
    it('should be null initially', () => {
      expect(controller.getDeploymentId()).toBeNull();
    });

    it('should be set after deploy', async () => {
      await controller.deployToStandby('v2.0.0');
      expect(controller.getDeploymentId()).toBeTruthy();
    });
  });
});
