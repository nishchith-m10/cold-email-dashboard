/**
 * GENESIS PHASE 46: PARITY CHECKER TESTS
 */

import { ParityChecker, ParityCheckerError } from '@/lib/genesis/phase46/parity-checker';
import { MigrationStateManager } from '@/lib/genesis/phase46/migration-state-manager';
import { MockMigrationDB, generateTestLeads } from '@/lib/genesis/phase46/mock-migration-db';
import { DEFAULT_COMPARE_FIELDS, PARITY_THRESHOLDS } from '@/lib/genesis/phase46/types';

describe('Phase 46: ParityChecker', () => {
  let db: MockMigrationDB;
  let checker: ParityChecker;
  let stateManager: MigrationStateManager;

  const WORKSPACE_ID = 'ws-pc-001';
  const SOURCE_TABLE = 'leads_ohio';
  const TARGET_TABLE = 'genesis.leads_p_ws001';

  beforeEach(async () => {
    db = new MockMigrationDB();
    checker = new ParityChecker(db);
    stateManager = new MigrationStateManager(db);

    // Create migration in verifying state
    await stateManager.createMigration({
      workspaceId: WORKSPACE_ID,
      sourceTable: SOURCE_TABLE,
      targetTable: TARGET_TABLE,
    });
    await stateManager.transitionTo(WORKSPACE_ID, 'dual_write');
    await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
    await stateManager.transitionTo(WORKSPACE_ID, 'verifying');
  });

  // ============================================
  // PERFECT PARITY
  // ============================================

  describe('perfect parity', () => {
    it('should return 100% match when data is identical', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 100);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      const result = await checker.check({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        sampleSize: 1000,
        compareFields: DEFAULT_COMPARE_FIELDS,
        fullScan: false,
        tolerancePercent: 0.1,
      });

      expect(result.match).toBe(true);
      expect(result.parityScore).toBe(100);
      expect(result.sourceCount).toBe(100);
      expect(result.targetCount).toBe(100);
      expect(result.mismatches).toHaveLength(0);
      expect(result.missingInTarget).toHaveLength(0);
      expect(result.missingInSource).toHaveLength(0);
    });

    it('should return 100% for empty tables', async () => {
      const result = await checker.check({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        sampleSize: 1000,
        compareFields: DEFAULT_COMPARE_FIELDS,
        fullScan: false,
        tolerancePercent: 0.1,
      });

      expect(result.match).toBe(true);
      expect(result.parityScore).toBe(100);
      expect(result.sourceCount).toBe(0);
      expect(result.targetCount).toBe(0);
    });
  });

  // ============================================
  // MISSING DATA
  // ============================================

  describe('missing data', () => {
    it('should detect rows missing from target', async () => {
      const sourceLeads = generateTestLeads(WORKSPACE_ID, 100);
      const targetLeads = sourceLeads.slice(0, 90); // Missing 10 rows

      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, sourceLeads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, targetLeads);

      const result = await checker.check({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        sampleSize: 1000,
        compareFields: DEFAULT_COMPARE_FIELDS,
        fullScan: true,
        tolerancePercent: 0.1,
      });

      expect(result.match).toBe(false);
      expect(result.missingInTarget.length).toBe(10);
      expect(result.sourceCount).toBe(100);
      expect(result.targetCount).toBe(90);
      expect(result.parityScore).toBeLessThan(100);
    });

    it('should detect rows missing from source (extra in target)', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 100);
      const extraLeads = generateTestLeads(WORKSPACE_ID, 10, { startId: 200 });

      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, [...leads, ...extraLeads]);

      const result = await checker.check({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        sampleSize: 1000,
        compareFields: DEFAULT_COMPARE_FIELDS,
        fullScan: true,
        tolerancePercent: 0.1,
      });

      expect(result.match).toBe(false);
      expect(result.missingInSource.length).toBe(10);
    });
  });

  // ============================================
  // FIELD MISMATCHES
  // ============================================

  describe('field mismatches', () => {
    it('should detect field-level differences', async () => {
      const sourceLeads = generateTestLeads(WORKSPACE_ID, 100);
      const targetLeads = sourceLeads.map(l => ({ ...l }));

      // Modify 5 rows in target
      targetLeads[0].status = 'different_status';
      targetLeads[1].email_address = 'changed@example.com';
      targetLeads[2].status = 'modified';
      targetLeads[3].campaign_name = 'different_campaign';
      targetLeads[4].email_address = 'another@example.com';

      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, sourceLeads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, targetLeads);

      const result = await checker.check({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        sampleSize: 1000,
        compareFields: ['email_address', 'status', 'campaign_name'],
        fullScan: true,
        tolerancePercent: 0.1,
      });

      expect(result.match).toBe(false);
      expect(result.mismatches.length).toBeGreaterThan(0);
      expect(result.parityScore).toBeLessThan(100);
    });
  });

  // ============================================
  // QUICK CHECK
  // ============================================

  describe('quickCheck', () => {
    it('should run parity check from migration state', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 50);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      const result = await checker.quickCheck(WORKSPACE_ID);

      expect(result.match).toBe(true);
      expect(result.parityScore).toBe(100);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(checker.quickCheck('non-existent')).rejects.toThrow(
        'No migration configured',
      );
    });
  });

  // ============================================
  // FULL CHECK
  // ============================================

  describe('fullCheck', () => {
    it('should scan all rows', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 200);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      const result = await checker.fullCheck(WORKSPACE_ID);

      expect(result.match).toBe(true);
      expect(result.sampledRows).toBe(200);
    });
  });

  // ============================================
  // PARITY SCORE UPDATES
  // ============================================

  describe('parity score updates', () => {
    it('should update migration state with parity score', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 50);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      await checker.quickCheck(WORKSPACE_ID);

      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.parityScore).toBe(100);
      expect(state!.lastVerifiedAt).not.toBeNull();
    });
  });

  // ============================================
  // CUTOVER READINESS
  // ============================================

  describe('isCutoverReady', () => {
    it('should return true for score >= 99.9', () => {
      expect(checker.isCutoverReady(99.9)).toBe(true);
      expect(checker.isCutoverReady(100)).toBe(true);
    });

    it('should return false for score < 99.9', () => {
      expect(checker.isCutoverReady(99.8)).toBe(false);
      expect(checker.isCutoverReady(95)).toBe(false);
      expect(checker.isCutoverReady(0)).toBe(false);
    });
  });

  describe('getParityCategory', () => {
    it('should categorize scores correctly', () => {
      expect(checker.getParityCategory(100)).toBe('excellent');
      expect(checker.getParityCategory(99.9)).toBe('excellent');
      expect(checker.getParityCategory(99.5)).toBe('good');
      expect(checker.getParityCategory(99.0)).toBe('good');
      expect(checker.getParityCategory(97)).toBe('warning');
      expect(checker.getParityCategory(95)).toBe('warning');
      expect(checker.getParityCategory(90)).toBe('critical');
      expect(checker.getParityCategory(0)).toBe('critical');
    });
  });

  // ============================================
  // EVENT LOGGING
  // ============================================

  describe('event logging', () => {
    it('should log parity_check_started and parity_check_completed', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 10);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      await checker.quickCheck(WORKSPACE_ID);

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'parity_check_started')).toBe(true);
      expect(events.some(e => e.eventType === 'parity_check_completed')).toBe(true);
    });
  });

  // ============================================
  // RESULT CAPPING
  // ============================================

  describe('result capping', () => {
    it('should cap mismatches at 100', async () => {
      const sourceLeads = generateTestLeads(WORKSPACE_ID, 200);
      const targetLeads = sourceLeads.map(l => ({ ...l, status: 'changed' }));

      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, sourceLeads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, targetLeads);

      const result = await checker.check({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        sampleSize: 1000,
        compareFields: ['status'],
        fullScan: true,
        tolerancePercent: 0.1,
      });

      expect(result.mismatches.length).toBeLessThanOrEqual(100);
    });
  });
});
