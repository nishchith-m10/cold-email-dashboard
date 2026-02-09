/**
 * GENESIS PHASE 46: BACKFILL ENGINE TESTS
 */

import { BackfillEngine, BackfillEngineError } from '@/lib/genesis/phase46/backfill-engine';
import { MigrationStateManager } from '@/lib/genesis/phase46/migration-state-manager';
import { DualWriteService } from '@/lib/genesis/phase46/dual-write-service';
import { MockMigrationDB, generateTestLeads } from '@/lib/genesis/phase46/mock-migration-db';
import { BackfillProgress } from '@/lib/genesis/phase46/types';

describe('Phase 46: BackfillEngine', () => {
  let db: MockMigrationDB;
  let engine: BackfillEngine;
  let stateManager: MigrationStateManager;
  let dualWrite: DualWriteService;

  const WORKSPACE_ID = 'ws-bf-001';
  const SOURCE_TABLE = 'leads_ohio';
  const TARGET_TABLE = 'genesis.leads_p_ws001';

  beforeEach(async () => {
    db = new MockMigrationDB();
    engine = new BackfillEngine(db);
    stateManager = new MigrationStateManager(db);
    dualWrite = new DualWriteService(db);

    // Setup migration in dual_write state
    await stateManager.createMigration({
      workspaceId: WORKSPACE_ID,
      sourceTable: SOURCE_TABLE,
      targetTable: TARGET_TABLE,
      batchSize: 100,
    });
    await dualWrite.enable(WORKSPACE_ID);
  });

  // ============================================
  // BASIC BACKFILL
  // ============================================

  describe('run', () => {
    it('should backfill all data from source to target', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 50);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      const result = await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.processedRows).toBe(50);
      expect(result.totalRows).toBe(50);
      expect(result.errorsEncountered).toBe(0);

      // Verify data was copied to target
      const targetData = db.getTargetData(TARGET_TABLE, WORKSPACE_ID);
      expect(targetData.length).toBe(50);
    });

    it('should handle empty source table', async () => {
      const result = await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.processedRows).toBe(0);
      expect(result.totalRows).toBe(0);
    });

    it('should process data in batches', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 250);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      const result = await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.processedRows).toBe(250);
      expect(result.batchesCompleted).toBe(3); // 100 + 100 + 50
    });

    it('should transition to verifying on completion', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 10);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('verifying');
    });

    it('should transition from dual_write to backfilling', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 10);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      // Start from dual_write state
      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('dual_write');

      await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      // Should be in verifying after completion
      const finalState = await stateManager.getState(WORKSPACE_ID);
      expect(finalState!.status).toBe('verifying');
    });
  });

  // ============================================
  // RESUME
  // ============================================

  describe('resume', () => {
    it('should resume from last processed ID', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 200);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      // First run: process first 100
      // We'll simulate resuming by manually setting state to backfilling
      await stateManager.transitionTo(WORKSPACE_ID, 'backfilling');

      const result = await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: leads[99].id as string, // Start after row 100
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.processedRows).toBe(100); // Only remaining 100
    });
  });

  // ============================================
  // PROGRESS REPORTING
  // ============================================

  describe('progress reporting', () => {
    it('should call onProgress callback', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 250);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      const progressUpdates: BackfillProgress[] = [];

      await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
        onProgress: (p) => progressUpdates.push({ ...p }),
      });

      expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
      // Last progress should be near 100%
      const lastProgress = progressUpdates[progressUpdates.length - 1];
      expect(lastProgress.processedRows).toBe(250);
    });

    it('should persist progress to DB', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 150);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      const updateCalls = db.getCallsTo('updateMigrationState');
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('error handling', () => {
    it('should abort after consecutive failures', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 100);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.failOnInsertBatch = true;

      const result = await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 50,
        resumeFromId: null,
        maxRetries: 2,
        retryDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('consecutive batch failures');
    });

    it('should transition to failed on abort', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 100);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);
      db.failOnInsertBatch = true;

      await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 50,
        resumeFromId: null,
        maxRetries: 2,
        retryDelayMs: 10,
      });

      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('failed');
    });

    it('should reject backfill from idle state', async () => {
      const freshDb = new MockMigrationDB();
      const freshEngine = new BackfillEngine(freshDb);
      const freshManager = new MigrationStateManager(freshDb);

      await freshManager.createMigration({
        workspaceId: 'ws-idle',
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
      });

      await expect(
        freshEngine.run({
          workspaceId: 'ws-idle',
          sourceTable: SOURCE_TABLE,
          targetTable: TARGET_TABLE,
          batchSize: 100,
          resumeFromId: null,
          maxRetries: 3,
          retryDelayMs: 10,
        }),
      ).rejects.toThrow("Cannot start backfill in 'idle' state");
    });
  });

  // ============================================
  // ABORT SIGNAL
  // ============================================

  describe('abort signal', () => {
    it('should stop when abort signal is set', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 500);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      const abortSignal = { aborted: false };

      // Set abort after first batch would complete
      let batchCount = 0;
      const result = await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
        abortSignal,
        onProgress: () => {
          batchCount++;
          if (batchCount >= 2) {
            abortSignal.aborted = true;
          }
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('aborted');
      expect(result.processedRows).toBeLessThan(500);
      expect(result.resumeFromId).not.toBeNull();
    });
  });

  // ============================================
  // HELPER METHODS
  // ============================================

  describe('createConfigFromState', () => {
    it('should create config from migration state', async () => {
      const config = await engine.createConfigFromState(WORKSPACE_ID);

      expect(config.workspaceId).toBe(WORKSPACE_ID);
      expect(config.sourceTable).toBe(SOURCE_TABLE);
      expect(config.targetTable).toBe(TARGET_TABLE);
      expect(config.batchSize).toBe(100);
      expect(config.resumeFromId).toBeNull();
    });
  });

  describe('getProgress', () => {
    it('should return null for non-existent workspace', async () => {
      const progress = await engine.getProgress('non-existent');
      expect(progress).toBeNull();
    });

    it('should return progress for active migration', async () => {
      const progress = await engine.getProgress(WORKSPACE_ID);
      expect(progress).not.toBeNull();
      expect(progress!.workspaceId).toBe(WORKSPACE_ID);
    });
  });

  // ============================================
  // EVENT LOGGING
  // ============================================

  describe('event logging', () => {
    it('should log backfill_started event', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 10);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'backfill_started')).toBe(true);
    });

    it('should log backfill_completed event', async () => {
      const leads = generateTestLeads(WORKSPACE_ID, 10);
      db.seedSourceData(SOURCE_TABLE, WORKSPACE_ID, leads);

      await engine.run({
        workspaceId: WORKSPACE_ID,
        sourceTable: SOURCE_TABLE,
        targetTable: TARGET_TABLE,
        batchSize: 100,
        resumeFromId: null,
        maxRetries: 3,
        retryDelayMs: 10,
      });

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'backfill_completed')).toBe(true);
    });
  });
});
