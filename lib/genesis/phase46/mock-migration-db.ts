/**
 * GENESIS PHASE 46: MOCK MIGRATION DATABASE
 *
 * In-memory implementation of MigrationDB for testing.
 * Simulates all database operations with full state tracking.
 */

import {
  MigrationDB,
  MigrationStateRow,
  CreateMigrationInput,
  MigrationEvent,
  MigrationStatus,
  BackfillError,
  MIGRATION_DEFAULTS,
} from './types';

export class MockMigrationDB implements MigrationDB {
  // In-memory stores
  private migrationStates = new Map<string, MigrationStateRow>();
  private migrationEvents: MigrationEvent[] = [];
  private sourceData = new Map<string, Map<string, Array<Record<string, unknown>>>>();
  private targetData = new Map<string, Map<string, Array<Record<string, unknown>>>>();

  // Behavior controls for testing
  public failOnEnableTrigger = false;
  public failOnDisableTrigger = false;
  public failOnInsertBatch = false;
  public insertBatchErrors: BackfillError[] = [];
  public triggerCreationDelay = 0;
  public callLog: Array<{ method: string; args: any[] }> = [];

  /**
   * Constructor accepts optional Supabase credentials for API compatibility.
   * When used as SupabaseMigrationDB, callers pass (url, key).
   * In mock mode, these are safely ignored.
   */
  constructor(_supabaseUrl?: string, _supabaseKey?: string) {
    // No-op: mock implementation uses in-memory stores
  }

  // ============================================
  // MIGRATION STATE CRUD
  // ============================================

  async getMigrationState(workspaceId: string): Promise<MigrationStateRow | null> {
    this.logCall('getMigrationState', [workspaceId]);
    return this.migrationStates.get(workspaceId) || null;
  }

  async createMigrationState(input: CreateMigrationInput): Promise<MigrationStateRow> {
    this.logCall('createMigrationState', [input]);

    if (this.migrationStates.has(input.workspaceId)) {
      throw new Error(`Migration already exists for ${input.workspaceId}`);
    }

    const now = new Date().toISOString();
    const row: MigrationStateRow = {
      workspace_id: input.workspaceId,
      source_table: input.sourceTable,
      target_table: input.targetTable,
      status: 'idle',
      dual_write_enabled: false,
      backfill_progress: 0,
      backfill_last_id: null,
      backfill_batch_size: input.batchSize || MIGRATION_DEFAULTS.BATCH_SIZE,
      backfill_total_rows: 0,
      backfill_processed_rows: 0,
      parity_score: 0,
      last_verified_at: null,
      error_message: null,
      error_count: 0,
      metadata: input.metadata || {},
      created_at: now,
      updated_at: now,
    };

    this.migrationStates.set(input.workspaceId, row);
    return { ...row };
  }

  async updateMigrationState(
    workspaceId: string,
    updates: Partial<MigrationStateRow>,
  ): Promise<MigrationStateRow | null> {
    this.logCall('updateMigrationState', [workspaceId, updates]);

    const existing = this.migrationStates.get(workspaceId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updated_at: updates.updated_at || new Date().toISOString(),
    };
    this.migrationStates.set(workspaceId, updated);
    return { ...updated };
  }

  async deleteMigrationState(workspaceId: string): Promise<boolean> {
    this.logCall('deleteMigrationState', [workspaceId]);
    return this.migrationStates.delete(workspaceId);
  }

  async listMigrationStates(filter?: { status?: MigrationStatus }): Promise<MigrationStateRow[]> {
    this.logCall('listMigrationStates', [filter]);
    let states = Array.from(this.migrationStates.values());
    if (filter?.status) {
      states = states.filter(s => s.status === filter.status);
    }
    return states.map(s => ({ ...s }));
  }

  // ============================================
  // DUAL-WRITE TRIGGERS
  // ============================================

  async enableDualWriteTrigger(workspaceId: string, sourceTable: string): Promise<boolean> {
    this.logCall('enableDualWriteTrigger', [workspaceId, sourceTable]);

    if (this.failOnEnableTrigger) {
      return false;
    }

    if (this.triggerCreationDelay > 0) {
      await new Promise(r => setTimeout(r, this.triggerCreationDelay));
    }

    return true;
  }

  async disableDualWriteTrigger(workspaceId: string, sourceTable: string): Promise<boolean> {
    this.logCall('disableDualWriteTrigger', [workspaceId, sourceTable]);

    if (this.failOnDisableTrigger) {
      return false;
    }

    return true;
  }

  // ============================================
  // DATA OPERATIONS
  // ============================================

  async getSourceRowCount(sourceTable: string, workspaceId: string): Promise<number> {
    this.logCall('getSourceRowCount', [sourceTable, workspaceId]);
    const tableData = this.sourceData.get(sourceTable);
    if (!tableData) return 0;
    const rows = tableData.get(workspaceId);
    return rows?.length || 0;
  }

  async getTargetRowCount(targetTable: string, workspaceId: string): Promise<number> {
    this.logCall('getTargetRowCount', [targetTable, workspaceId]);
    const tableData = this.targetData.get(targetTable);
    if (!tableData) return 0;
    const rows = tableData.get(workspaceId);
    return rows?.length || 0;
  }

  async getSourceBatch(
    sourceTable: string,
    workspaceId: string,
    afterId: string | null,
    limit: number,
  ): Promise<Array<Record<string, unknown>>> {
    this.logCall('getSourceBatch', [sourceTable, workspaceId, afterId, limit]);

    const tableData = this.sourceData.get(sourceTable);
    if (!tableData) return [];
    const rows = tableData.get(workspaceId) || [];

    let startIndex = 0;
    if (afterId) {
      const idx = rows.findIndex(r => String(r.id) === afterId);
      if (idx !== -1) startIndex = idx + 1;
    }

    return rows.slice(startIndex, startIndex + limit).map(r => ({ ...r }));
  }

  async getTargetBatch(
    targetTable: string,
    workspaceId: string,
    afterId: string | null,
    limit: number,
  ): Promise<Array<Record<string, unknown>>> {
    this.logCall('getTargetBatch', [targetTable, workspaceId, afterId, limit]);

    const tableData = this.targetData.get(targetTable);
    if (!tableData) return [];
    const rows = tableData.get(workspaceId) || [];

    let startIndex = 0;
    if (afterId) {
      const idx = rows.findIndex(r => String(r.id) === afterId);
      if (idx !== -1) startIndex = idx + 1;
    }

    return rows.slice(startIndex, startIndex + limit).map(r => ({ ...r }));
  }

  async insertTargetBatch(
    targetTable: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<{ inserted: number; errors: BackfillError[] }> {
    this.logCall('insertTargetBatch', [targetTable, rows.length]);

    if (this.failOnInsertBatch) {
      return {
        inserted: 0,
        errors: [{ recordId: 'batch', error: 'Simulated insert failure', retryable: true }],
      };
    }

    if (this.insertBatchErrors.length > 0) {
      return { inserted: rows.length - this.insertBatchErrors.length, errors: [...this.insertBatchErrors] };
    }

    // Insert into target data
    for (const row of rows) {
      const wsId = String(row.workspace_id || '');
      if (!this.targetData.has(targetTable)) {
        this.targetData.set(targetTable, new Map());
      }
      const tableData = this.targetData.get(targetTable)!;
      if (!tableData.has(wsId)) {
        tableData.set(wsId, []);
      }
      const existing = tableData.get(wsId)!;
      // Upsert: replace if exists, insert if not
      const idx = existing.findIndex(r => String(r.id) === String(row.id));
      if (idx !== -1) {
        existing[idx] = { ...row };
      } else {
        existing.push({ ...row });
      }
    }

    return { inserted: rows.length, errors: [] };
  }

  // ============================================
  // MIGRATION EVENTS
  // ============================================

  async logMigrationEvent(event: Omit<MigrationEvent, 'id' | 'timestamp'>): Promise<void> {
    this.logCall('logMigrationEvent', [event]);
    this.migrationEvents.push({
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    });
  }

  async getMigrationEvents(workspaceId: string, limit: number = 50): Promise<MigrationEvent[]> {
    this.logCall('getMigrationEvents', [workspaceId, limit]);
    return this.migrationEvents
      .filter(e => e.workspaceId === workspaceId)
      .slice(-limit)
      .reverse();
  }

  // ============================================
  // TEST HELPERS
  // ============================================

  /**
   * Seed source data for testing.
   */
  seedSourceData(
    sourceTable: string,
    workspaceId: string,
    rows: Array<Record<string, unknown>>,
  ): void {
    if (!this.sourceData.has(sourceTable)) {
      this.sourceData.set(sourceTable, new Map());
    }
    this.sourceData.get(sourceTable)!.set(workspaceId, rows.map(r => ({ ...r })));
  }

  /**
   * Seed target data for testing.
   */
  seedTargetData(
    targetTable: string,
    workspaceId: string,
    rows: Array<Record<string, unknown>>,
  ): void {
    if (!this.targetData.has(targetTable)) {
      this.targetData.set(targetTable, new Map());
    }
    this.targetData.get(targetTable)!.set(workspaceId, rows.map(r => ({ ...r })));
  }

  /**
   * Get all target data for a workspace.
   */
  getTargetData(targetTable: string, workspaceId: string): Array<Record<string, unknown>> {
    const tableData = this.targetData.get(targetTable);
    if (!tableData) return [];
    return tableData.get(workspaceId) || [];
  }

  /**
   * Get all logged events.
   */
  getAllEvents(): MigrationEvent[] {
    return [...this.migrationEvents];
  }

  /**
   * Get calls to a specific method.
   */
  getCallsTo(method: string): any[][] {
    return this.callLog.filter(c => c.method === method).map(c => c.args);
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.migrationStates.clear();
    this.migrationEvents = [];
    this.sourceData.clear();
    this.targetData.clear();
    this.callLog = [];
    this.failOnEnableTrigger = false;
    this.failOnDisableTrigger = false;
    this.failOnInsertBatch = false;
    this.insertBatchErrors = [];
    this.triggerCreationDelay = 0;
  }

  private logCall(method: string, args: any[]): void {
    this.callLog.push({ method, args });
  }
}

// ============================================
// TEST DATA GENERATORS
// ============================================

/**
 * Generate test lead rows for seeding.
 */
export function generateTestLeads(
  workspaceId: string,
  count: number,
  options?: {
    startId?: number;
    statusDistribution?: Record<string, number>;
  },
): Array<Record<string, unknown>> {
  const startId = options?.startId || 1;
  const statuses = ['pending', 'contacted', 'replied', 'bounced', 'opted_out'];
  const rows: Array<Record<string, unknown>> = [];

  for (let i = 0; i < count; i++) {
    const id = `lead-${String(startId + i).padStart(6, '0')}`;
    rows.push({
      id,
      workspace_id: workspaceId,
      email_address: `user${startId + i}@example.com`,
      status: statuses[i % statuses.length],
      campaign_name: `campaign-${Math.ceil((i + 1) / 100)}`,
      email_1_sent: i % 3 === 0,
      email_2_sent: i % 5 === 0,
      email_3_sent: i % 7 === 0,
      created_at: new Date(Date.now() - (count - i) * 60000).toISOString(),
      updated_at: new Date(Date.now() - (count - i) * 30000).toISOString(),
    });
  }

  return rows;
}
