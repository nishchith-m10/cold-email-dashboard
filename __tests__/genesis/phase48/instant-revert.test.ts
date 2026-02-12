/**
 * GENESIS PHASE 48: INSTANT REVERT TESTS
 */

import {
  InstantRevertManager,
  DeploymentController,
  MockDeploymentEnvironment,
  DEFAULT_REVERT_TRIGGERS,
  type RevertTriggerConfig,
} from '../../../lib/genesis/phase48';

describe('Phase 48 Instant Revert', () => {
  let env: MockDeploymentEnvironment;
  let controller: DeploymentController;
  let revert: InstantRevertManager;

  beforeEach(() => {
    env = new MockDeploymentEnvironment();
    controller = new DeploymentController(env);
    revert = new InstantRevertManager(env, controller);
  });

  // ============================================
  // TRIGGER MANAGEMENT
  // ============================================
  describe('Trigger Management', () => {
    it('should have default triggers', () => {
      const triggers = revert.getTriggers();
      expect(triggers.length).toBe(DEFAULT_REVERT_TRIGGERS.length);
    });

    it('should add a trigger', () => {
      revert.addTrigger({
        name: 'Custom',
        type: 'custom',
        threshold: 10,
        autoRevert: true,
        cooldownSeconds: 60,
      });
      expect(revert.getTriggers().length).toBe(DEFAULT_REVERT_TRIGGERS.length + 1);
    });

    it('should replace trigger with same name', () => {
      const before = revert.getTriggers().length;
      revert.addTrigger({
        name: 'Error Rate', // Matches default
        type: 'error_rate',
        threshold: 0.1,
        autoRevert: false,
        cooldownSeconds: 60,
      });
      expect(revert.getTriggers().length).toBe(before);
      const updated = revert.getTriggers().find(t => t.name === 'Error Rate');
      expect(updated?.threshold).toBe(0.1);
    });

    it('should remove a trigger', () => {
      const before = revert.getTriggers().length;
      expect(revert.removeTrigger('Error Rate')).toBe(true);
      expect(revert.getTriggers().length).toBe(before - 1);
    });

    it('should return false for non-existent trigger', () => {
      expect(revert.removeTrigger('nonexistent')).toBe(false);
    });
  });

  // ============================================
  // TRIGGER EVALUATION
  // ============================================
  describe('Trigger Evaluation', () => {
    it('should check all triggers against metrics', async () => {
      const states = await revert.checkTriggers();
      expect(states.length).toBe(DEFAULT_REVERT_TRIGGERS.length);
      for (const state of states) {
        expect(state.currentValue).toBeGreaterThanOrEqual(0);
        expect(typeof state.triggered).toBe('boolean');
      }
    });

    it('should not trigger with healthy metrics', async () => {
      const states = await revert.checkTriggers();
      const triggered = states.filter(s => s.triggered);
      expect(triggered.length).toBe(0);
    });

    it('should trigger on high error rate', async () => {
      env.setMetrics({ errorRate: 0.1 }); // Above 0.05 threshold
      const states = await revert.checkTriggers();
      const errorTrigger = states.find(s => s.type === 'error_rate');
      expect(errorTrigger?.triggered).toBe(true);
    });

    it('should trigger on high latency', async () => {
      env.setMetrics({ p95Latency: 5000 }); // Above 3000 threshold
      const states = await revert.checkTriggers();
      const latencyTrigger = states.find(s => s.type === 'p95_latency');
      expect(latencyTrigger?.triggered).toBe(true);
    });

    it('should trigger on DB connection failures', async () => {
      env.setMetrics({ dbConnectionFailures: 10 }); // Above 5 threshold
      const states = await revert.checkTriggers();
      const dbTrigger = states.find(s => s.type === 'db_connection_failures');
      expect(dbTrigger?.triggered).toBe(true);
    });
  });

  // ============================================
  // AUTO-REVERT
  // ============================================
  describe('Auto-Revert', () => {
    it('should not auto-revert with healthy metrics', async () => {
      const result = await revert.monitorAndAutoRevert();
      expect(result).toBeNull();
    });

    it('should auto-revert when trigger fires', async () => {
      // Must be in a rollback-able state for auto-revert to work
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      env.setMetrics({ errorRate: 0.2 });
      const result = await revert.monitorAndAutoRevert();
      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.reason).toContain('Error Rate');
    });

    it('should respect cooldown period', async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      env.setMetrics({ errorRate: 0.2 });
      const first = await revert.monitorAndAutoRevert();
      expect(first).not.toBeNull();

      // Second call should be in cooldown
      const second = await revert.monitorAndAutoRevert();
      expect(second).toBeNull();
    });

    it('should reset cooldowns', async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      env.setMetrics({ errorRate: 0.2 });
      // Use trigger with 0 cooldown for this test
      revert.addTrigger({
        name: 'Error Rate',
        type: 'error_rate',
        threshold: 0.05,
        autoRevert: true,
        cooldownSeconds: 0, // No cooldown
      });

      await revert.monitorAndAutoRevert();
      revert.resetCooldowns();
      // Reset state since rollback moved it
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });

      const result = await revert.monitorAndAutoRevert();
      expect(result).not.toBeNull();
    });
  });

  // ============================================
  // REVERT EXECUTION
  // ============================================
  describe('Revert Execution', () => {
    it('should execute instant revert from deploying state', async () => {
      // Must be in a rollback-able state
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0', activeVersion: 'v1.0.0' });
      const result = await revert.executeRevert('manual revert');
      expect(result.success).toBe(true);
      expect(result.reason).toBe('manual revert');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('should abort canary during revert', async () => {
      // Start a canary
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await controller.startCanary();
      expect(controller.getCanaryState().active).toBe(true);

      // Revert — now in canary state (rollback-able)
      const result = await revert.executeRevert('abort canary');
      expect(result.success).toBe(true);
      expect(result.actions.some(a => a.includes('canary'))).toBe(true);
      expect(controller.getCanaryState().active).toBe(false);
    });

    it('should log revert event', async () => {
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await revert.executeRevert('test');
      const events = await env.getEvents();
      expect(events.some(e => e.type === 'revert_triggered')).toBe(true);
    });

    it('should increment revert count', async () => {
      expect(revert.getRevertCount()).toBe(0);
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await revert.executeRevert('first');
      expect(revert.getRevertCount()).toBe(1);
      // Reset state for second revert (rollback sets it to rolling_back/rolled_back)
      env.setState({ status: 'deploying', standbyVersion: 'v2.0.0' });
      await revert.executeRevert('second');
      expect(revert.getRevertCount()).toBe(2);
    });

    it('should record version info', async () => {
      env.setState({ status: 'deploying', activeVersion: 'v1.0.0', standbyVersion: 'v2.0.0' });
      const result = await revert.executeRevert('version check');
      expect(result.revertedToVersion).toBe('v1.0.0');
    });
  });
});
