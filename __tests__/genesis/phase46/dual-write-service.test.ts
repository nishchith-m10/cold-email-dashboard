/**
 * GENESIS PHASE 46: DUAL-WRITE SERVICE TESTS
 */

import { DualWriteService, DualWriteServiceError } from '@/lib/genesis/phase46/dual-write-service';
import { MigrationStateManager } from '@/lib/genesis/phase46/migration-state-manager';
import { MockMigrationDB } from '@/lib/genesis/phase46/mock-migration-db';

describe('Phase 46: DualWriteService', () => {
  let db: MockMigrationDB;
  let service: DualWriteService;
  let stateManager: MigrationStateManager;

  const WORKSPACE_ID = 'ws-dw-001';
  const SOURCE_TABLE = 'leads_ohio';
  const TARGET_TABLE = 'genesis.leads_p_ws001';

  beforeEach(async () => {
    db = new MockMigrationDB();
    service = new DualWriteService(db);
    stateManager = new MigrationStateManager(db);

    // Create a migration in idle state
    await stateManager.createMigration({
      workspaceId: WORKSPACE_ID,
      sourceTable: SOURCE_TABLE,
      targetTable: TARGET_TABLE,
    });
  });

  // ============================================
  // ENABLE DUAL-WRITE
  // ============================================

  describe('enable', () => {
    it('should enable dual-write and transition to dual_write state', async () => {
      const result = await service.enable(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.triggerName).toContain('dual_write_');

      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('dual_write');
      expect(state!.dualWriteEnabled).toBe(true);
    });

    it('should be idempotent if already enabled', async () => {
      await service.enable(WORKSPACE_ID);
      const result = await service.enable(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.error).toContain('already enabled');
    });

    it('should call enableDualWriteTrigger on DB', async () => {
      await service.enable(WORKSPACE_ID);

      const calls = db.getCallsTo('enableDualWriteTrigger');
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe(WORKSPACE_ID);
      expect(calls[0][1]).toBe(SOURCE_TABLE);
    });

    it('should log dual_write_enabled event', async () => {
      await service.enable(WORKSPACE_ID);

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'dual_write_enabled')).toBe(true);
    });

    it('should return failure when trigger creation fails', async () => {
      db.failOnEnableTrigger = true;

      await expect(service.enable(WORKSPACE_ID)).rejects.toThrow(
        'Failed to create dual-write trigger',
      );
    });

    it('should reject enabling from wrong state (cutover_complete)', async () => {
      // Manually set state to cutover_complete
      await db.updateMigrationState(WORKSPACE_ID, {
        status: 'cutover_complete',
      });

      await expect(service.enable(WORKSPACE_ID)).rejects.toThrow(
        "Cannot enable dual-write in 'cutover_complete' state",
      );
    });

    it('should throw for non-existent workspace', async () => {
      const service2 = new DualWriteService(db);
      await expect(service2.enable('non-existent')).rejects.toThrow(
        'No migration configured',
      );
    });
  });

  // ============================================
  // DISABLE DUAL-WRITE
  // ============================================

  describe('disable', () => {
    beforeEach(async () => {
      await service.enable(WORKSPACE_ID);
    });

    it('should disable dual-write and transition to idle', async () => {
      const result = await service.disable(WORKSPACE_ID);

      expect(result.success).toBe(true);

      const state = await stateManager.getState(WORKSPACE_ID);
      expect(state!.status).toBe('idle');
      expect(state!.dualWriteEnabled).toBe(false);
    });

    it('should be idempotent if already disabled', async () => {
      await service.disable(WORKSPACE_ID);
      const result = await service.disable(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.error).toContain('already disabled');
    });

    it('should call disableDualWriteTrigger on DB', async () => {
      await service.disable(WORKSPACE_ID);

      const calls = db.getCallsTo('disableDualWriteTrigger');
      expect(calls.length).toBe(1);
    });

    it('should log dual_write_disabled event', async () => {
      await service.disable(WORKSPACE_ID);

      const events = await db.getMigrationEvents(WORKSPACE_ID);
      expect(events.some(e => e.eventType === 'dual_write_disabled')).toBe(true);
    });

    it('should handle trigger removal failure', async () => {
      db.failOnDisableTrigger = true;

      await expect(service.disable(WORKSPACE_ID)).rejects.toThrow(
        'Failed to remove dual-write trigger',
      );
    });
  });

  // ============================================
  // STATUS QUERIES
  // ============================================

  describe('isEnabled', () => {
    it('should return false for non-existent workspace', async () => {
      const result = await service.isEnabled('non-existent');
      expect(result).toBe(false);
    });

    it('should return false before enabling', async () => {
      const result = await service.isEnabled(WORKSPACE_ID);
      expect(result).toBe(false);
    });

    it('should return true after enabling', async () => {
      await service.enable(WORKSPACE_ID);
      const result = await service.isEnabled(WORKSPACE_ID);
      expect(result).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return status for non-configured workspace', async () => {
      const status = await service.getStatus('non-existent');
      expect(status.enabled).toBe(false);
      expect(status.migrationStatus).toBe('not_configured');
      expect(status.sourceTable).toBeNull();
      expect(status.targetTable).toBeNull();
    });

    it('should return full status after enabling', async () => {
      await service.enable(WORKSPACE_ID);
      const status = await service.getStatus(WORKSPACE_ID);

      expect(status.enabled).toBe(true);
      expect(status.migrationStatus).toBe('dual_write');
      expect(status.sourceTable).toBe(SOURCE_TABLE);
      expect(status.targetTable).toBe(TARGET_TABLE);
    });
  });

  // ============================================
  // TRIGGER NAMING
  // ============================================

  describe('generateTriggerName', () => {
    it('should generate deterministic trigger name', () => {
      const name = service.generateTriggerName('abc-def-ghi');
      expect(name).toBe('dual_write_abc_def_ghi');
    });

    it('should replace all hyphens with underscores', () => {
      const name = service.generateTriggerName('a-b-c-d-e');
      expect(name).toBe('dual_write_a_b_c_d_e');
    });
  });

  describe('generateFunctionName', () => {
    it('should generate genesis-scoped function name', () => {
      const name = service.generateFunctionName('abc-def');
      expect(name).toBe('genesis.dual_write_fn_abc_def');
    });
  });
});
