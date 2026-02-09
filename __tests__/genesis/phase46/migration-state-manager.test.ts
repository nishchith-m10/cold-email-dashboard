/**
 * GENESIS PHASE 46: MIGRATION STATE MANAGER TESTS
 */

import { MigrationStateManager, MigrationStateError } from '@/lib/genesis/phase46/migration-state-manager';
import { MockMigrationDB } from '@/lib/genesis/phase46/mock-migration-db';

describe('Phase 46: MigrationStateManager', () => {
  let db: MockMigrationDB;
  let manager: MigrationStateManager;

  const WORKSPACE_ID = 'ws-test-001';
  const SOURCE_TABLE = 'leads_ohio';
  const TARGET_TABLE = 'genesis.leads_p_ws001';

  beforeEach(() => {
    db = new MockMigrationDB();
    manager = new MigrationStateManager(db);
  });

  // ============================================
  // CREATE MIGRATION
  // ============================================

  describe('createMigration', () => {
    it('should create a new migration in idle state', async () => {
      const state = await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      expect(state.workspaceId).toBe(WORKSPACE_ID);
      expect(state.sourceTable).toBe(SOURCE_TABLE);
      expect(state.targetTable).toBe(TARGET_TABLE);
      expect(state.status).toBe('idle');
      expect(state.dualWriteEnabled).toBe(false);
      expect(state.backfillProgress).toBe(0);
      expect(state.parityScore).toBe(0);
    });

    it('should use custom batch size', async () => {
      const state = await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 1000,
      });

      expect(state.backfillBatchSize).toBe(1000);
    });

    it('should reject duplicate migration', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      await expect(
        manager.createMigration({
          workspaceId: WORKSPACE_ID,
          sourceTable: SOURCE_TABLE,
          targetTable: TARGET_TABLE,
        }),
      ).rejects.toThrow(MigrationStateError);
    });

    it('should reject empty workspace ID', async () => {
      await expect(
        manager.createMigration({
          workspaceId: '',
          sourceTable: SOURCE_TABLE,
          targetTable: TARGET_TABLE,
        }),
      ).rejects.toThrow('Invalid workspace ID');
    });

    it('should reject same source and target table', async () => {
      await expect(
        manager.createMigration({
          workspaceId: WORKSPACE_ID,
          sourceTable: SOURCE_TABLE,
          targetTable: SOURCE_TABLE,
        }),
      ).rejects.toThrow('Source and target tables cannot be the same');
    });

    it('should reject table names with SQL injection characters', async () => {
      await expect(
        manager.createMigration({
          workspaceId: WORKSPACE_ID,
          sourceTable: "leads'; DROP TABLE--",
          targetTable: TARGET_TABLE,
        }),
      ).rejects.toThrow('disallowed characters');
    });

    it('should log migration_created event', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'migration_created')).toBe(true);
    });
  });

  // ============================================
  // GET STATE
  // ============================================

  describe('getState / getStateOrThrow', () => {
    it('should return null for non-existent workspace', async () => {
      const state = await manager.getState('non-existent');
      expect(state).toBeNull();
    });

    it('should return migration state', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const state = await manager.getState(WORKSPACE_ID);
      expect(state).not.toBeNull();
      expect(state!.workspaceId).toBe(WORKSPACE_ID);
    });

    it('should throw for non-existent workspace with getStateOrThrow', async () => {
      await expect(manager.getStateOrThrow('non-existent')).rejects.toThrow(
        'No migration configured',
      );
    });
  });

  // ============================================
  // STATE TRANSITIONS
  // ============================================

  describe('transitionTo', () => {
    beforeEach(async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
    });

    it('should transition idle → dual_write', async () => {
      const state = await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      expect(state.status).toBe('dual_write');
    });

    it('should transition dual_write → backfilling', async () => {
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      const state = await manager.transitionTo(WORKSPACE_ID, 'backfilling');
      expect(state.status).toBe('backfilling');
    });

    it('should allow full happy path', async () => {
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');
      await manager.transitionTo(WORKSPACE_ID, 'verifying');
      await manager.transitionTo(WORKSPACE_ID, 'cutover_ready');
      const state = await manager.transitionTo(WORKSPACE_ID, 'cutover_complete');
      expect(state.status).toBe('cutover_complete');
    });

    it('should reject invalid transition idle → cutover_complete', async () => {
      await expect(
        manager.transitionTo(WORKSPACE_ID, 'cutover_complete'),
      ).rejects.toThrow('Invalid transition');
    });

    it('should reject invalid transition dual_write → cutover_ready', async () => {
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await expect(
        manager.transitionTo(WORKSPACE_ID, 'cutover_ready'),
      ).rejects.toThrow('Invalid transition');
    });

    it('should apply additional updates', async () => {
      const state = await manager.transitionTo(WORKSPACE_ID, 'dual_write', {
        dual_write_enabled: true,
      });
      expect(state.dualWriteEnabled).toBe(true);
    });

    it('should clear error message when transitioning from failed', async () => {
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');
      await manager.transitionTo(WORKSPACE_ID, 'failed');
      await manager.recordError(WORKSPACE_ID, 'Test error');

      const state = await manager.transitionTo(WORKSPACE_ID, 'idle');
      expect(state.errorMessage).toBeNull();
    });
  });

  // ============================================
  // BACKFILL PROGRESS
  // ============================================

  describe('updateBackfillProgress', () => {
    beforeEach(async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');
    });

    it('should update progress correctly', async () => {
      const state = await manager.updateBackfillProgress(WORKSPACE_ID, 250, 1000, 'lead-250');
      expect(state.backfillProgress).toBe(25);
      expect(state.backfillProcessedRows).toBe(250);
      expect(state.backfillTotalRows).toBe(1000);
      expect(state.backfillLastId).toBe('lead-250');
    });

    it('should cap progress at 100%', async () => {
      const state = await manager.updateBackfillProgress(WORKSPACE_ID, 1100, 1000, null);
      expect(state.backfillProgress).toBe(100);
    });

    it('should handle zero total rows', async () => {
      const state = await manager.updateBackfillProgress(WORKSPACE_ID, 0, 0, null);
      expect(state.backfillProgress).toBe(0);
    });

    it('should reject update when not in backfilling state', async () => {
      await manager.transitionTo(WORKSPACE_ID, 'verifying');
      await expect(
        manager.updateBackfillProgress(WORKSPACE_ID, 100, 1000, null),
      ).rejects.toThrow("Cannot update backfill progress in 'verifying' state");
    });
  });

  // ============================================
  // PARITY SCORE
  // ============================================

  describe('updateParityScore', () => {
    beforeEach(async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');
      await manager.transitionTo(WORKSPACE_ID, 'verifying');
    });

    it('should update parity score', async () => {
      const state = await manager.updateParityScore(WORKSPACE_ID, 99.5);
      expect(state.parityScore).toBe(99.5);
      expect(state.lastVerifiedAt).not.toBeNull();
    });

    it('should clamp score to 0-100', async () => {
      const state = await manager.updateParityScore(WORKSPACE_ID, 150);
      expect(state.parityScore).toBe(100);

      const state2 = await manager.updateParityScore(WORKSPACE_ID, -10);
      expect(state2.parityScore).toBe(0);
    });

    it('should reject update in idle state', async () => {
      const db2 = new MockMigrationDB();
      const mgr2 = new MigrationStateManager(db2);
      await mgr2.createMigration({
        workspaceId: 'ws-idle',
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      await expect(mgr2.updateParityScore('ws-idle', 99)).rejects.toThrow(
        "Cannot update parity score in 'idle' state",
      );
    });
  });

  // ============================================
  // ERROR RECORDING
  // ============================================

  describe('recordError', () => {
    beforeEach(async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');
    });

    it('should increment error count', async () => {
      await manager.recordError(WORKSPACE_ID, 'Error 1');
      const state = await manager.recordError(WORKSPACE_ID, 'Error 2');
      expect(state.errorCount).toBe(2);
      expect(state.errorMessage).toBe('Error 2');
    });

    it('should transition to failed when requested', async () => {
      const state = await manager.recordError(WORKSPACE_ID, 'Critical error', true);
      expect(state.status).toBe('failed');
    });

    it('should auto-fail after max errors', async () => {
      // Record 10 errors (MAX_ERROR_COUNT_BEFORE_ABORT)
      for (let i = 0; i < 10; i++) {
        await manager.recordError(WORKSPACE_ID, `Error ${i + 1}`);
      }

      const state = await manager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('failed');
    });

    it('should log error event', async () => {
      await manager.recordError(WORKSPACE_ID, 'Test error');
      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'error')).toBe(true);
    });
  });

  // ============================================
  // DELETE MIGRATION
  // ============================================

  describe('deleteMigration', () => {
    it('should delete migration in idle state', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const result = await manager.deleteMigration(WORKSPACE_ID);
      expect(result).toBe(true);

      const state = await manager.getState(WORKSPACE_ID);
      expect(state).toBeNull();
    });

    it('should reject deletion in backfilling state', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');

      await expect(manager.deleteMigration(WORKSPACE_ID)).rejects.toThrow(
        "Cannot delete migration in 'backfilling' state",
      );
    });

    it('should allow deletion in failed state', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');
      await manager.transitionTo(WORKSPACE_ID, 'failed');

      const result = await manager.deleteMigration(WORKSPACE_ID);
      expect(result).toBe(true);
    });
  });

  // ============================================
  // RESET MIGRATION
  // ============================================

  describe('resetMigration', () => {
    it('should reset failed migration to idle', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');
      await manager.transitionTo(WORKSPACE_ID, 'failed');

      const state = await manager.resetMigration(WORKSPACE_ID);
      expect(state.status).toBe('idle');
      expect(state.backfillProgress).toBe(0);
      expect(state.parityScore).toBe(0);
      expect(state.errorMessage).toBeNull();
      expect(state.errorCount).toBe(0);
      expect(state.dualWriteEnabled).toBe(false);
    });

    it('should reject reset from backfilling state', async () => {
      await manager.createMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await manager.transitionTo(WORKSPACE_ID, 'dual_write');
      await manager.transitionTo(WORKSPACE_ID, 'backfilling');

      await expect(manager.resetMigration(WORKSPACE_ID)).rejects.toThrow(
        "Cannot reset migration in 'backfilling' state",
      );
    });
  });

  // ============================================
  // LIST MIGRATIONS
  // ============================================

  describe('listMigrations', () => {
    it('should return empty list when no migrations', async () => {
      const list = await manager.listMigrations();
      expect(list).toHaveLength(0);
    });

    it('should return all migrations', async () => {
      await manager.createMigration({ workspaceId: 'ws-1', sourceTable: 'a', targetTable: 'b' });
      await manager.createMigration({ workspaceId: 'ws-2', sourceTable: 'c', targetTable: 'd' });

      const list = await manager.listMigrations();
      expect(list).toHaveLength(2);
    });

    it('should filter by status', async () => {
      await manager.createMigration({ workspaceId: 'ws-1', sourceTable: 'a', targetTable: 'b' });
      await manager.createMigration({ workspaceId: 'ws-2', sourceTable: 'c', targetTable: 'd' });
      await manager.transitionTo('ws-1', 'dual_write');

      const idle = await manager.listMigrations({ status: 'idle' });
      expect(idle).toHaveLength(1);
      expect(idle[0].workspaceId).toBe('ws-2');

      const dw = await manager.listMigrations({ status: 'dual_write' });
      expect(dw).toHaveLength(1);
      expect(dw[0].workspaceId).toBe('ws-1');
    });
  });
});
