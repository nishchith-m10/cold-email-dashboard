/**
 * GENESIS PHASE 48: TYPES TESTS
 */

import {
  isValidStatusTransition,
  generateEventId,
  generateDeploymentId,
  DEFAULT_CANARY_CONFIG,
  DEFAULT_REVERT_TRIGGERS,
  DEPLOYMENT_DEFAULTS,
  VALID_STATUS_TRANSITIONS,
} from '../../../lib/genesis/phase48';

describe('Phase 48 Types & Helpers', () => {
  describe('isValidStatusTransition', () => {
    it('should allow stable -> deploying', () => {
      expect(isValidStatusTransition('stable', 'deploying')).toBe(true);
    });

    it('should allow deploying -> canary', () => {
      expect(isValidStatusTransition('deploying', 'canary')).toBe(true);
    });

    it('should allow canary -> promoting', () => {
      expect(isValidStatusTransition('canary', 'promoting')).toBe(true);
    });

    it('should allow canary -> rolling_back', () => {
      expect(isValidStatusTransition('canary', 'rolling_back')).toBe(true);
    });

    it('should allow promoting -> stable', () => {
      expect(isValidStatusTransition('promoting', 'stable')).toBe(true);
    });

    it('should allow rolling_back -> rolled_back', () => {
      expect(isValidStatusTransition('rolling_back', 'rolled_back')).toBe(true);
    });

    it('should allow rolled_back -> stable', () => {
      expect(isValidStatusTransition('rolled_back', 'stable')).toBe(true);
    });

    it('should allow failed -> deploying', () => {
      expect(isValidStatusTransition('failed', 'deploying')).toBe(true);
    });

    it('should reject stable -> canary (must deploy first)', () => {
      expect(isValidStatusTransition('stable', 'canary')).toBe(false);
    });

    it('should reject promoting -> deploying', () => {
      expect(isValidStatusTransition('promoting', 'deploying')).toBe(false);
    });
  });

  describe('generateEventId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateEventId()));
      expect(ids.size).toBe(100);
    });

    it('should start with evt-', () => {
      expect(generateEventId()).toMatch(/^evt-/);
    });
  });

  describe('generateDeploymentId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateDeploymentId()));
      expect(ids.size).toBe(100);
    });

    it('should start with dep-', () => {
      expect(generateDeploymentId()).toMatch(/^dep-/);
    });
  });

  describe('Constants', () => {
    it('should have valid DEFAULT_CANARY_CONFIG', () => {
      expect(DEFAULT_CANARY_CONFIG.initialPercentage).toBe(5);
      expect(DEFAULT_CANARY_CONFIG.stepPercentage).toBe(10);
      expect(DEFAULT_CANARY_CONFIG.maxPercentage).toBe(100);
      expect(DEFAULT_CANARY_CONFIG.rollbackOnFailure).toBe(true);
      expect(DEFAULT_CANARY_CONFIG.requiredHealthChecks).toBe(3);
    });

    it('should have valid DEFAULT_REVERT_TRIGGERS', () => {
      expect(DEFAULT_REVERT_TRIGGERS.length).toBe(3);
      const names = DEFAULT_REVERT_TRIGGERS.map(t => t.type);
      expect(names).toContain('error_rate');
      expect(names).toContain('p95_latency');
      expect(names).toContain('db_connection_failures');
    });

    it('should have valid DEPLOYMENT_DEFAULTS', () => {
      expect(DEPLOYMENT_DEFAULTS.MAX_DEPLOY_WAIT_MS).toBe(300_000);
      expect(DEPLOYMENT_DEFAULTS.HEALTH_CHECK_TIMEOUT_MS).toBe(10_000);
    });

    it('should have transitions for all statuses', () => {
      const statuses = ['stable', 'deploying', 'canary', 'promoting', 'rolling_back', 'rolled_back', 'failed'];
      for (const status of statuses) {
        expect(VALID_STATUS_TRANSITIONS[status as keyof typeof VALID_STATUS_TRANSITIONS]).toBeDefined();
      }
    });
  });
});
