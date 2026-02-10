/**
 * GENESIS PHASE 70: TYPES TESTS
 */

import {
  FAILURE_MODE_CATALOG,
  CROSS_REGION_MAPPINGS,
  SNAPSHOT_CONFIGS,
  DEFAULT_FAILOVER_TRIGGERS,
  DR_DEFAULTS,
  getBackupRegion,
  calculateSnapshotCost,
  isSnapshotExpired,
  generateSnapshotName,
  generateTaskId,
  generatePlanId,
  generateEventId,
  type Snapshot,
  type DORegion,
} from '../../../lib/genesis/phase70';

describe('Phase 70 Types & Helpers', () => {
  describe('Constants', () => {
    it('should have 8 failure mode definitions', () => {
      expect(FAILURE_MODE_CATALOG.length).toBe(8);
    });

    it('should have region mappings', () => {
      expect(CROSS_REGION_MAPPINGS.length).toBeGreaterThan(0);
      for (const mapping of CROSS_REGION_MAPPINGS) {
        expect(mapping.primary).toBeTruthy();
        expect(mapping.backup).toBeTruthy();
        expect(mapping.rationale).toBeTruthy();
      }
    });

    it('should have snapshot configs for all types', () => {
      expect(SNAPSHOT_CONFIGS.daily).toBeDefined();
      expect(SNAPSHOT_CONFIGS.weekly).toBeDefined();
      expect(SNAPSHOT_CONFIGS.cross_region).toBeDefined();
      expect(SNAPSHOT_CONFIGS.pre_update).toBeDefined();
    });

    it('should have default failover triggers', () => {
      expect(DEFAULT_FAILOVER_TRIGGERS.length).toBeGreaterThan(0);
    });

    it('should have DR defaults', () => {
      expect(DR_DEFAULTS.MAX_CONCURRENT_SNAPSHOTS).toBe(100);
      expect(DR_DEFAULTS.MAX_CONCURRENT_TRANSFERS).toBe(50);
      expect(DR_DEFAULTS.HEARTBEAT_MISSING_THRESHOLD).toBe(50);
    });
  });

  describe('getBackupRegion', () => {
    it('should return backup for nyc1', () => {
      expect(getBackupRegion('nyc1')).toBe('sfo1');
    });

    it('should return backup for sfo1', () => {
      expect(getBackupRegion('sfo1')).toBe('nyc1');
    });

    it('should return backup for fra1', () => {
      expect(getBackupRegion('fra1')).toBe('lon1');
    });

    it('should throw for invalid region', () => {
      expect(() => getBackupRegion('invalid' as DORegion)).toThrow();
    });
  });

  describe('calculateSnapshotCost', () => {
    it('should calculate cost correctly', () => {
      const cost = calculateSnapshotCost(10);
      expect(cost).toBe(0.5); // 10 GB * $0.05
    });

    it('should handle zero size', () => {
      expect(calculateSnapshotCost(0)).toBe(0);
    });
  });

  describe('isSnapshotExpired', () => {
    it('should return false for future expiry', () => {
      const snapshot: Snapshot = {
        id: 'snap-1',
        workspaceId: 'ws-1',
        dropletId: 'd-1',
        type: 'daily',
        region: 'nyc1',
        status: 'completed',
        sizeGb: 5,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      expect(isSnapshotExpired(snapshot)).toBe(false);
    });

    it('should return true for past expiry', () => {
      const snapshot: Snapshot = {
        id: 'snap-1',
        workspaceId: 'ws-1',
        dropletId: 'd-1',
        type: 'daily',
        region: 'nyc1',
        status: 'completed',
        sizeGb: 5,
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      };
      expect(isSnapshotExpired(snapshot)).toBe(true);
    });
  });

  describe('ID Generators', () => {
    it('should generate unique snapshot names', () => {
      const names = new Set([
        generateSnapshotName('ws-1', 'daily'),
        generateSnapshotName('ws-1', 'daily'),
        generateSnapshotName('ws-2', 'daily'),
      ]);
      // At least 2 unique (may be 3 if generated on different days)
      expect(names.size).toBeGreaterThanOrEqual(2);
    });

    it('should generate unique task IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTaskId()));
      expect(ids.size).toBe(100);
    });

    it('should generate unique plan IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generatePlanId()));
      expect(ids.size).toBe(100);
    });

    it('should generate unique event IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateEventId()));
      expect(ids.size).toBe(100);
    });

    it('should start with correct prefixes', () => {
      expect(generateTaskId()).toMatch(/^task-/);
      expect(generatePlanId()).toMatch(/^plan-/);
      expect(generateEventId()).toMatch(/^event-/);
    });
  });
});
