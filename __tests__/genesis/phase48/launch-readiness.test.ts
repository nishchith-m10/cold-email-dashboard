/**
 * GENESIS PHASE 48: LAUNCH READINESS TESTS
 */

import {
  LaunchReadinessEngine,
  getDefaultReadinessChecks,
  MockDeploymentEnvironment,
  type ReadinessCheck,
} from '../../../lib/genesis/phase48';

describe('Phase 48 Launch Readiness', () => {
  let env: MockDeploymentEnvironment;
  let engine: LaunchReadinessEngine;

  beforeEach(() => {
    env = new MockDeploymentEnvironment();
    engine = new LaunchReadinessEngine(env);
  });

  describe('Default Checks', () => {
    it('should have 6 default checks', () => {
      const checks = getDefaultReadinessChecks(env);
      expect(checks.length).toBe(6);
    });

    it('should include blocker-level checks', () => {
      const checks = getDefaultReadinessChecks(env);
      const blockers = checks.filter(c => c.severity === 'blocker');
      expect(blockers.length).toBeGreaterThanOrEqual(3);
    });

    it('should cover multiple categories', () => {
      const checks = getDefaultReadinessChecks(env);
      const categories = [...new Set(checks.map(c => c.category))];
      expect(categories.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Report Generation', () => {
    it('should generate GO report when all checks pass', async () => {
      // Default env is healthy
      env.setState({ standbyVersion: 'v2.0.0' }); // Different version
      const report = await engine.generateReport();

      expect(report.status).toBe('GO');
      expect(report.blockers).toHaveLength(0);
      expect(report.passedChecks).toBeGreaterThan(0);
      expect(report.totalChecks).toBeGreaterThan(0);
      expect(report.timestamp).toBeTruthy();
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should generate NO-GO when blocker fails', async () => {
      // Make health check fail
      env.setHealthOverride('blue', false);
      const report = await engine.generateReport();

      expect(report.status).toBe('NO-GO');
      expect(report.blockers.length).toBeGreaterThan(0);
    });

    it('should track critical failures separately', async () => {
      // DB connection failures
      env.setMetrics({ dbConnectionFailures: 10 });
      const report = await engine.generateReport();

      expect(report.criticals.length).toBeGreaterThan(0);
    });

    it('should track warnings separately', async () => {
      // Same version = warning
      env.setState({ standbyVersion: 'v1.0.0' }); // Same as active
      const report = await engine.generateReport();

      expect(report.warnings.length).toBeGreaterThan(0);
    });

    it('should include all results', async () => {
      const report = await engine.generateReport();
      expect(report.results.length).toBe(report.totalChecks);
      for (const result of report.results) {
        expect(result.checkId).toBeTruthy();
        expect(result.message).toBeTruthy();
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Custom Checks', () => {
    it('should add a custom check', async () => {
      const customCheck: ReadinessCheck = {
        id: 'custom-check',
        name: 'Custom Check',
        description: 'Test custom check',
        severity: 'warning',
        category: 'configuration',
        check: async () => ({
          checkId: 'custom-check',
          passed: true,
          message: 'Custom check passed',
          durationMs: 0,
        }),
      };

      engine.addCheck(customCheck);
      const checks = engine.getChecks();
      expect(checks.find(c => c.id === 'custom-check')).toBeDefined();
    });

    it('should replace check with same ID', () => {
      const checks = engine.getChecks();
      const initialCount = checks.length;

      engine.addCheck({
        id: 'db-connection', // Exists in defaults
        name: 'Custom DB Check',
        description: 'Override',
        severity: 'blocker',
        category: 'database',
        check: async () => ({ checkId: 'db-connection', passed: true, message: 'OK', durationMs: 0 }),
      });

      expect(engine.getChecks().length).toBe(initialCount); // No increase
    });

    it('should remove a check by ID', () => {
      const before = engine.getChecks().length;
      const removed = engine.removeCheck('db-connection');
      expect(removed).toBe(true);
      expect(engine.getChecks().length).toBe(before - 1);
    });

    it('should return false when removing non-existent check', () => {
      expect(engine.removeCheck('nonexistent')).toBe(false);
    });
  });

  describe('Quick Check', () => {
    it('should return true when ready', async () => {
      env.setState({ standbyVersion: 'v2.0.0' });
      expect(await engine.isReady()).toBe(true);
    });

    it('should return false when not ready', async () => {
      env.setMetrics({ errorRate: 0.5 }); // High error rate = blocker
      expect(await engine.isReady()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle check that throws', async () => {
      engine.addCheck({
        id: 'throwing-check',
        name: 'Throwing Check',
        description: 'This check throws',
        severity: 'blocker',
        category: 'database',
        check: async () => { throw new Error('Boom'); },
      });

      const report = await engine.generateReport();
      expect(report.status).toBe('NO-GO');
      expect(report.blockers.some(b => b.includes('Boom'))).toBe(true);
    });
  });
});
