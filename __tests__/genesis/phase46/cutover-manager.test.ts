/**
 * GENESIS PHASE 46: CUTOVER MANAGER TESTS
 */

import { CutoverManager, CutoverError } from '@/lib/genesis/phase46/cutover-manager';
import { MigrationStateManager } from '@/lib/genesis/phase46/migration-state-manager';
import { MockMigrationDB, generateTestLeads } from '@/lib/genesis/phase46/mock-migration-db';

describe('Phase 46: CutoverManager', () => {
  let db: MockMigrationDB;
  let cutover: CutoverManager;
  let stateManager: MigrationStateManager;

  const WORKSPACE_ID = 'ws-co-001';
  const SOURCE_TABLE = 'leads_ohio';
  const TARGET_TABLE = 'genesis.leads_p_ws001';

  /**
   * Helper to advance migration state to cutover_ready with matching data
   */
  async function advanceToCutoverReady(dataCount: number = 100) {
    await stateManager.createMigration({
      workspaceId: WORKSPACE_ID,
      sourceTable: SOURCE_TABLE,
      targetTable: TARGET_TABLE,
    });

    // Seed matching data
    const leads = generateTestLeads(WORKSPACE_ID, dataCount);
    db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
    db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

    // Advance through states
    await stateManager.transitionTo(WORKSPACE_ID, 'dual_write', { dual_write_enabled: true });
    await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
    await stateManager.updateBackfillProgress(WORKSPACE_ID, dataCount, dataCount, null);
    await stateManager.transitionTo(WORKSPACE_ID, 'verifying');
    await stateManager.updateParityScore(WORKSPACE_ID, 100);
    await stateManager.transitionTo(WORKSPACE_ID, 'cutover_ready');
  }

  beforeEach(() => {
    db = new MockMigrationDB();
    cutover = new CutoverManager(db);
    stateManager = new MigrationStateManager(db);
  });

  // ============================================
  // EXECUTE CUTOVER
  // ============================================

  describe('execute', () => {
    it('should complete full cutover with matching data', async () => {
      await advanceToCutoverReady(50);

      const result = await cutover.execute(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.phase).toBe('complete');
      expect(result.steps.length).toBe(8);
      expect(result.steps.every(s => s.status === 'completed')).toBe(true);
      expect(result.totalDurationMs).toBeGreaterThan(0);
    });

    it('should set final parity score', async () => {
      await advanceToCutoverReady(50);

      const result = await cutover.execute(WORKSPACE_ID);

      expect(result.finalParityScore).toBeGreaterThan(0);
    });

    it('should transition to cutover_complete', async () => {
      await advanceToCutoverReady(50);

      await cutover.execute(WORKSPACE_ID);

      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('cutover_complete');
    });

    it('should reject cutover from idle state', async () => {
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      await expect(cutover.execute(WORKSPACE_ID)).rejects.toThrow(
        "Cannot start cutover in 'idle' state",
      );
    });

    it('should allow cutover from verifying state', async () => {
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      const leads = generateTestLeads(WORKSPACE_ID, 10);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      await stateManager.transitionTo(WORKSPACE_ID, 'dual_write', { dual_write_enabled: true });
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await stateManager.updateBackfillProgress(WORKSPACE_ID, 10, 10, null);
      await stateManager.transitionTo(WORKSPACE_ID, 'verifying');
      await stateManager.updateParityScore(WORKSPACE_ID, 100);

      const result = await cutover.execute(WORKSPACE_ID);
      expect(result.success).toBe(true);
    });

    it('should log cutover events', async () => {
      await advanceToCutoverReady(10);

      await cutover.execute(WORKSPACE_ID);

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'cutover_started')).toBe(true);
      expect(events.some(e => e.eventType === 'cutover_completed')).toBe(true);
    });
  });

  // ============================================
  // PRE-CHECKS
  // ============================================

  describe('runPreChecks', () => {
    it('should pass all checks for ready migration', async () => {
      await advanceToCutoverReady(50);

      const checks = await cutover.runPreChecks(WORKSPACE_ID);

      expect(checks.length).toBeGreaterThanOrEqual(5);
      const blockers = checks.filter(c => c.severity === 'blocker' && !c.passed);
      expect(blockers).toHaveLength(0);
    });

    it('should fail parity check when score is low', async () => {
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await stateManager.transitionTo(WORKSPACE_ID, 'dual_write');
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await stateManager.transitionTo(WORKSPACE_ID, 'verifying');
      // Low parity score
      await stateManager.updateParityScore(WORKSPACE_ID, 50);

      const checks = await cutover.runPreChecks(WORKSPACE_ID);
      const parityCheck = checks.find(c => c.id === 'parity_score');

      expect(parityCheck).toBeDefined();
      expect(parityCheck!.passed).toBe(false);
    });

    it('should fail backfill check when not complete', async () => {
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await stateManager.transitionTo(WORKSPACE_ID, 'dual_write');
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      // backfill not complete (0%)
      await stateManager.transitionTo(WORKSPACE_ID, 'verifying');

      const checks = await cutover.runPreChecks(WORKSPACE_ID);
      const backfillCheck = checks.find(c => c.id === 'backfill_complete');

      expect(backfillCheck).toBeDefined();
      expect(backfillCheck!.passed).toBe(false);
    });
  });

  // ============================================
  // READINESS
  // ============================================

  describe('getReadiness', () => {
    it('should return ready=true when all checks pass', async () => {
      await advanceToCutoverReady(50);

      const readiness = await cutover.getReadiness(WORKSPACE_ID);

      expect(readiness.ready).toBe(true);
      expect(readiness.blockers).toHaveLength(0);
    });

    it('should return ready=false with blockers', async () => {
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await stateManager.transitionTo(WORKSPACE_ID, 'dual_write');
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await stateManager.transitionTo(WORKSPACE_ID, 'verifying');

      const readiness = await cutover.getReadiness(WORKSPACE_ID);

      expect(readiness.ready).toBe(false);
      expect(readiness.blockers.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ROLLBACK
  // ============================================

  describe('rollback', () => {
    it('should rollback completed cutover', async () => {
      await advanceToCutoverReady(10);
      await cutover.execute(WORKSPACE_ID);

      const result = await cutover.rollback(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);

      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('rolled_back');
    });

    it('should rollback failed migration', async () => {
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await stateManager.transitionTo(WORKSPACE_ID, 'dual_write');
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await stateManager.transitionTo(WORKSPACE_ID, 'failed');

      const result = await cutover.rollback(WORKSPACE_ID);

      expect(result.success).toBe(true);
      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('rolled_back');
    });

    it('should log rollback events', async () => {
      await advanceToCutoverReady(10);
      await cutover.execute(WORKSPACE_ID);

      await cutover.rollback(WORKSPACE_ID);

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'rollback_started')).toBe(true);
      expect(events.some(e => e.eventType === 'rollback_completed')).toBe(true);
    });

    it('should handle rollback from in-progress state', async () => {
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await stateManager.transitionTo(WORKSPACE_ID, 'dual_write', { dual_write_enabled: true });
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');

      const result = await cutover.rollback(WORKSPACE_ID);

      expect(result.success).toBe(true);
      const state = await stateManager.getState(WORKSPACE_ID);
      // Should revert to dual_write since it was enabled
      expect(['dual_write', 'idle']).toContain(state!.status);
    });
  });

  // ============================================
  // CUTOVER FAILURE SCENARIOS
  // ============================================

  describe('cutover failure', () => {
    it('should abort and mark remaining steps as skipped on failure', async () => {
      // Create migration but with mismatched data (parity will fail during cutover)
      await stateManager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const sourceLeads = generateTestLeads(WORKSPACE_ID, 100);
      const targetLeads = generateTestLeads(WORKSPACE_ID, 50); // Missing 50 rows

      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, sourceLeads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, targetLeads);

      await stateManager.transitionTo(WORKSPACE_ID, 'dual_write', { dual_write_enabled: true });
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await stateManager.updateBackfillProgress(WORKSPACE_ID, 50, 100, null);
      await stateManager.transitionTo(WORKSPACE_ID, 'verifying');
      // Low parity score - precheck will fail
      await stateManager.updateParityScore(WORKSPACE_ID, 50);
      await stateManager.transitionTo(WORKSPACE_ID, 'cutover_ready');

      const result = await cutover.execute(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Some steps should be skipped
      const skippedSteps = result.steps.filter(s => s.status === 'skipped');
      expect(skippedSteps.length).toBeGreaterThan(0);
    });
  });
});
