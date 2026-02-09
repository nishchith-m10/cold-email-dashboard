/**
 * GENESIS PHASE 46: TYPE TESTS
 *
 * Tests for type validation helpers, state transitions, and model conversions.
 */

import {
  isValidTransition,
  migrationStateRowToModel,
  modelToMigrationStateRow,
  VALID_TRANSITIONS,
  PARITY_THRESHOLDS,
  MIGRATION_DEFAULTS,
  MigrationStatus,
  MigrationStateRow,
  MigrationState,
} from '@/lib/genesis/phase46/types';

describe('Phase 46: Types', () => {
  // ============================================
  // isValidTransition
  // ============================================

  describe('isValidTransition', () => {
    it('should allow idle → dual_write', () => {
      expect(isValidTransition('idle', 'dual_write')).toBe(true);
    });

    it('should allow dual_write → backfilling', () => {
      expect(isValidTransition('dual_write', 'backfilling')).toBe(true);
    });

    it('should allow dual_write → idle (revert)', () => {
      expect(isValidTransition('dual_write', 'idle')).toBe(true);
    });

    it('should allow backfilling → verifying', () => {
      expect(isValidTransition('backfilling', 'verifying')).toBe(true);
    });

    it('should allow backfilling → dual_write (retry)', () => {
      expect(isValidTransition('backfilling', 'dual_write')).toBe(true);
    });

    it('should allow backfilling → failed', () => {
      expect(isValidTransition('backfilling', 'failed')).toBe(true);
    });

    it('should allow verifying → cutover_ready', () => {
      expect(isValidTransition('verifying', 'cutover_ready')).toBe(true);
    });

    it('should allow verifying → backfilling (re-backfill)', () => {
      expect(isValidTransition('verifying', 'backfilling')).toBe(true);
    });

    it('should allow cutover_ready → cutover_complete', () => {
      expect(isValidTransition('cutover_ready', 'cutover_complete')).toBe(true);
    });

    it('should allow cutover_complete → rolled_back', () => {
      expect(isValidTransition('cutover_complete', 'rolled_back')).toBe(true);
    });

    it('should allow failed → idle (reset)', () => {
      expect(isValidTransition('failed', 'idle')).toBe(true);
    });

    it('should allow failed → dual_write (retry)', () => {
      expect(isValidTransition('failed', 'dual_write')).toBe(true);
    });

    it('should allow rolled_back → idle', () => {
      expect(isValidTransition('rolled_back', 'idle')).toBe(true);
    });

    it('should block idle → cutover_complete (skip)', () => {
      expect(isValidTransition('idle', 'cutover_complete')).toBe(false);
    });

    it('should block dual_write → cutover_ready (skip)', () => {
      expect(isValidTransition('dual_write', 'cutover_ready')).toBe(false);
    });

    it('should block cutover_complete → idle (must go through rolled_back)', () => {
      expect(isValidTransition('cutover_complete', 'idle')).toBe(false);
    });

    it('should block backfilling → cutover_complete (skip)', () => {
      expect(isValidTransition('backfilling', 'cutover_complete')).toBe(false);
    });
  });

  // ============================================
  // migrationStateRowToModel
  // ============================================

  describe('migrationStateRowToModel', () => {
    const now = new Date().toISOString();

    const mockRow: MigrationStateRow = {
      workspace_id: 'ws-001',
      source_table: 'leads_ohio',
      target_table: 'genesis.leads_p_ws001',
      status: 'dual_write',
      dual_write_enabled: true,
      backfill_progress: 50,
      backfill_last_id: 'lead-000500',
      backfill_batch_size: 500,
      backfill_total_rows: 1000,
      backfill_processed_rows: 500,
      parity_score: 98,
      last_verified_at: now,
      error_message: null,
      error_count: 0,
      metadata: { version: 1 },
      created_at: now,
      updated_at: now,
    };

    it('should convert all fields correctly', () => {
      const model = migrationStateRowToModel(mockRow);

      expect(model.workspaceId).toBe('ws-001');
      expect(model.sourceTable).toBe('leads_ohio');
      expect(model.targetTable).toBe('genesis.leads_p_ws001');
      expect(model.status).toBe('dual_write');
      expect(model.dualWriteEnabled).toBe(true);
      expect(model.backfillProgress).toBe(50);
      expect(model.backfillLastId).toBe('lead-000500');
      expect(model.backfillBatchSize).toBe(500);
      expect(model.backfillTotalRows).toBe(1000);
      expect(model.backfillProcessedRows).toBe(500);
      expect(model.parityScore).toBe(98);
      expect(model.lastVerifiedAt).toBe(now);
      expect(model.errorMessage).toBeNull();
      expect(model.errorCount).toBe(0);
      expect(model.metadata).toEqual({ version: 1 });
    });

    it('should handle null metadata', () => {
      const row = { ...mockRow, metadata: null as any };
      const model = migrationStateRowToModel(row);
      expect(model.metadata).toEqual({});
    });
  });

  // ============================================
  // modelToMigrationStateRow
  // ============================================

  describe('modelToMigrationStateRow', () => {
    it('should convert selected fields', () => {
      const partial: Partial<MigrationState> = {
        workspaceId: 'ws-002',
        status: 'backfilling',
        backfillProgress: 75,
      };

      const row = modelToMigrationStateRow(partial);

      expect(row.workspace_id).toBe('ws-002');
      expect(row.status).toBe('backfilling');
      expect(row.backfill_progress).toBe(75);
      // Undefined fields should not be present
      expect(row.source_table).toBeUndefined();
      expect(row.dual_write_enabled).toBeUndefined();
    });

    it('should handle empty partial', () => {
      const row = modelToMigrationStateRow({});
      expect(Object.keys(row)).toHaveLength(0);
    });

    it('should convert all fields when provided', () => {
      const full: Partial<MigrationState> = {
        workspaceId: 'ws-003',
        sourceTable: 'leads',
        targetTable: 'genesis.leads_p_ws003',
        status: 'verifying',
        dualWriteEnabled: false,
        backfillProgress: 100,
        backfillLastId: null,
        backfillBatchSize: 1000,
        backfillTotalRows: 5000,
        backfillProcessedRows: 5000,
        parityScore: 99.5,
        lastVerifiedAt: new Date().toISOString(),
        errorMessage: null,
        errorCount: 0,
        metadata: { test: true },
      };

      const row = modelToMigrationStateRow(full);
      expect(row.workspace_id).toBe('ws-003');
      expect(row.source_table).toBe('leads');
      expect(row.target_table).toBe('genesis.leads_p_ws003');
      expect(row.status).toBe('verifying');
      expect(row.dual_write_enabled).toBe(false);
      expect(row.backfill_progress).toBe(100);
      expect(row.backfill_last_id).toBeNull();
      expect(row.parity_score).toBe(99.5);
    });
  });

  // ============================================
  // CONSTANTS
  // ============================================

  describe('Constants', () => {
    it('should have valid PARITY_THRESHOLDS', () => {
      expect(PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER).toBe(99.9);
      expect(PARITY_THRESHOLDS.WARNING_THRESHOLD).toBe(99.0);
      expect(PARITY_THRESHOLDS.CRITICAL_THRESHOLD).toBe(95.0);
      expect(PARITY_THRESHOLDS.SAMPLE_SIZE_DEFAULT).toBe(1000);
    });

    it('should have valid MIGRATION_DEFAULTS', () => {
      expect(MIGRATION_DEFAULTS.BATCH_SIZE).toBe(500);
      expect(MIGRATION_DEFAULTS.MAX_RETRIES).toBe(3);
      expect(MIGRATION_DEFAULTS.RETRY_DELAY_MS).toBe(1000);
      expect(MIGRATION_DEFAULTS.MAX_ERROR_COUNT_BEFORE_ABORT).toBe(10);
    });

    it('should have valid VALID_TRANSITIONS for all statuses', () => {
      const allStatuses: MigrationStatus[] = [
        'idle', 'dual_write', 'backfilling', 'verifying',
        'cutover_ready', 'cutover_complete', 'failed', 'rolled_back',
      ];

      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS[status]).toBeDefined();
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      }
    });

    it('should ensure no self-transitions', () => {
      for (const [status, targets] of Object.entries(VALID_TRANSITIONS)) {
        expect(targets).not.toContain(status);
      }
    });
  });
});
