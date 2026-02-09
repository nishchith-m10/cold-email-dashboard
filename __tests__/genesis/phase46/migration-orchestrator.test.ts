/**
 * GENESIS PHASE 46: MIGRATION ORCHESTRATOR TESTS
 */

import { MigrationOrchestrator, MigrationOrchestratorError } from '@/lib/genesis/phase46/migration-orchestrator';
import { MockMigrationDB, generateTestLeads } from '@/lib/genesis/phase46/mock-migration-db';

describe('Phase 46: MigrationOrchestrator', () => {
  let db: MockMigrationDB;
  let orchestrator: MigrationOrchestrator;

  const WORKSPACE_ID = 'ws-orch-001';
  const SOURCE_TABLE = 'leads_ohio';
  const TARGET_TABLE = 'genesis.leads_p_ws001';

  beforeEach(() => {
    db = new MockMigrationDB();
    orchestrator = new MigrationOrchestrator(db);
  });

  // ============================================
  // LIFECYCLE MANAGEMENT
  // ============================================

  describe('initializeMigration', () => {
    it('should create a new migration', async () => {
      const state = await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      expect(state.workspaceId).toBe(WORKSPACE_ID);
      expect(state.status).toBe('idle');
    });

    it('should reject duplicate', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      await expect(
        orchestrator.initializeMigration({
          workspaceId: WORKSPACE_ID,
          sourceTable: SOURCE_TABLE,
          targetTable: TARGET_TABLE,
        }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('startDualWrite', () => {
    it('should enable dual-write', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const result = await orchestrator.startDualWrite(WORKSPACE_ID);

      expect(result.success).toBe(true);
      const state = await orchestrator.getState(WORKSPACE_ID);
      expect(state!.status).toBe('dual_write');
    });
  });

  describe('stopDualWrite', () => {
    it('should disable dual-write', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await orchestrator.startDualWrite(WORKSPACE_ID);

      const result = await orchestrator.stopDualWrite(WORKSPACE_ID);

      expect(result.success).toBe(true);
      const state = await orchestrator.getState(WORKSPACE_ID);
      expect(state!.status).toBe('idle');
      expect(state!.dualWriteEnabled).toBe(false);
    });
  });

  describe('startBackfill', () => {
    it('should backfill data', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 50,
      });

      const leads = generateTestLeads(WORKSPACE_ID, 30);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      await orchestrator.startDualWrite(WORKSPACE_ID);
      const result = await orchestrator.startBackfill(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.processedRows).toBe(30);
    });
  });

  describe('runParityCheck', () => {
    it('should run quick parity check', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const leads = generateTestLeads(WORKSPACE_ID, 20);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      await orchestrator.startDualWrite(WORKSPACE_ID);
      await orchestrator.stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await orchestrator.stateManager.transitionTo(WORKSPACE_ID, 'verifying');

      const result = await orchestrator.runParityCheck(WORKSPACE_ID);
      expect(result.parityScore).toBe(100);
    });

    it('should run full parity check', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const leads = generateTestLeads(WORKSPACE_ID, 20);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.seedTargetData(TARGET_TABLE, WORKSPACE_ID, leads);

      await orchestrator.startDualWrite(WORKSPACE_ID);
      await orchestrator.stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await orchestrator.stateManager.transitionTo(WORKSPACE_ID, 'verifying');

      const result = await orchestrator.runParityCheck(WORKSPACE_ID, true);
      expect(result.parityScore).toBe(100);
      expect(result.match).toBe(true);
    });
  });

  // ============================================
  // STATUS & REPORTING
  // ============================================

  describe('getState', () => {
    it('should return null for non-existent workspace', async () => {
      const state = await orchestrator.getState('non-existent');
      expect(state).toBeNull();
    });

    it('should return state after creation', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const state = await orchestrator.getState(WORKSPACE_ID);
      expect(state).not.toBeNull();
      expect(state!.workspaceId).toBe(WORKSPACE_ID);
    });
  });

  describe('getSummary', () => {
    it('should return null for non-existent workspace', async () => {
      const summary = await orchestrator.getSummary('non-existent');
      expect(summary).toBeNull();
    });

    it('should return summary with state and events', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const summary = await orchestrator.getSummary(WORKSPACE_ID);

      expect(summary).not.toBeNull();
      expect(summary!.state.workspaceId).toBe(WORKSPACE_ID);
      expect(summary!.recentEvents.length).toBeGreaterThan(0);
    });
  });

  describe('listMigrations', () => {
    it('should list all migrations', async () => {
      await orchestrator.initializeMigration({
        workspaceId: 'ws-1',
        sourceTable: 'a',
        targetTable: 'b',
      });
      await orchestrator.initializeMigration({
        workspaceId: 'ws-2',
        sourceTable: 'c',
        targetTable: 'd',
      });

      const list = await orchestrator.listMigrations();
      expect(list).toHaveLength(2);
    });
  });

  describe('getEvents', () => {
    it('should return events for workspace', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const events = await orchestrator.getEvents(WORKSPACE_ID);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // DELETE & RESET
  // ============================================

  describe('deleteMigration', () => {
    it('should delete idle migration', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      const result = await orchestrator.deleteMigration(WORKSPACE_ID);
      expect(result).toBe(true);

      const state = await orchestrator.getState(WORKSPACE_ID);
      expect(state).toBeNull();
    });
  });

  describe('resetMigration', () => {
    it('should reset failed migration', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });
      await orchestrator.startDualWrite(WORKSPACE_ID);
      await orchestrator.stateManager.transitionTo(WORKSPACE_ID, 'backfilling');
      await orchestrator.stateManager.transitionTo(WORKSPACE_ID, 'failed');

      const state = await orchestrator.resetMigration(WORKSPACE_ID);
      expect(state.status).toBe('idle');
    });
  });

  // ============================================
  // FULL MIGRATION PIPELINE
  // ============================================

  describe('runFullMigration', () => {
    it('should complete full migration pipeline', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
      });

      const leads = generateTestLeads(WORKSPACE_ID, 50);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      const progressLogs: string[] = [];
      const result = await orchestrator.runFullMigration(WORKSPACE_ID, (phase, detail) => {
        progressLogs.push(`${phase}: ${detail}`);
      });

      expect(result.success).toBe(true);
      expect(result.backfillResult).toBeDefined();
      expect(result.backfillResult!.success).toBe(true);
      expect(result.parityResult).toBeDefined();
      expect(result.parityResult!.parityScore).toBeGreaterThanOrEqual(99.9);
      expect(result.cutoverResult).toBeDefined();
      expect(progressLogs.length).toBeGreaterThan(0);
    });

    it('should fail when dual-write fails', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      db.failOnEnableTrigger = true;

      const result = await orchestrator.runFullMigration(WORKSPACE_ID);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when backfill fails', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 50,
      });

      const leads = generateTestLeads(WORKSPACE_ID, 100);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.failOnInsertBatch = true;

      const result = await orchestrator.runFullMigration(WORKSPACE_ID);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // ROLLBACK VIA ORCHESTRATOR
  // ============================================

  describe('rollback', () => {
    it('should rollback through orchestrator', async () => {
      await orchestrator.initializeMigration({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
      });

      const leads = generateTestLeads(WORKSPACE_ID, 20);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      await orchestrator.runFullMigration(WORKSPACE_ID);

      const result = await orchestrator.rollback(WORKSPACE_ID);
      expect(result.success).toBe(true);

      const state = await orchestrator.getState(WORKSPACE_ID);
      expect(state!.status).toBe('rolled_back');
    });
  });
});
