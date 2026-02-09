/**
 * GENESIS PHASE 46: MOCK MIGRATION DB TESTS
 *
 * Verifies the mock DB itself works correctly (meta-testing).
 */

import { MockMigrationDB, generateTestLeads } from '@/lib/genesis/phase46/mock-migration-db';

describe('Phase 46: MockMigrationDB', () => {
  let db: MockMigrationDB;

  beforeEach(() => {
    db = new MockMigrationDB();
  });

  describe('migration state CRUD', () => {
    it('should create and retrieve migration state', async () => {
      const row = await db.createMigrationState({
        workspaceId: 'ws-1',
        sourceTable: 'leads',
        targetTable: 'genesis.leads_p_ws1',
      });

      expect(row.workspace_id).toBe('ws-1');
      expect(row.status).toBe('idle');

      const retrieved = await db.getMigrationState('ws-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.workspace_id).toBe('ws-1');
    });

    it('should update migration state', async () => {
      await db.createMigrationState({
        workspaceId: 'ws-1',
        sourceTable: 'leads',
        targetTable: 'genesis.leads_p_ws1',
      });

      const updated = await db.updateMigrationState('ws-1', {
        status: 'dual_write',
        dual_write_enabled: true,
      });

      expect(updated!.status).toBe('dual_write');
      expect(updated!.dual_write_enabled).toBe(true);
    });

    it('should delete migration state', async () => {
      await db.createMigrationState({
        workspaceId: 'ws-1',
        sourceTable: 'leads',
        targetTable: 'genesis.leads_p_ws1',
      });

      const deleted = await db.deleteMigrationState('ws-1');
      expect(deleted).toBe(true);

      const retrieved = await db.getMigrationState('ws-1');
      expect(retrieved).toBeNull();
    });

    it('should list migration states with filter', async () => {
      await db.createMigrationState({ workspaceId: 'ws-1', sourceTable: 'a', targetTable: 'b' });
      await db.createMigrationState({ workspaceId: 'ws-2', sourceTable: 'c', targetTable: 'd' });
      await db.updateMigrationState('ws-1', { status: 'dual_write' });

      const all = await db.listMigrationStates();
      expect(all).toHaveLength(2);

      const dualWrite = await db.listMigrationStates({ status: 'dual_write' });
      expect(dualWrite).toHaveLength(1);
    });

    it('should reject duplicate creation', async () => {
      await db.createMigrationState({ workspaceId: 'ws-1', sourceTable: 'a', targetTable: 'b' });

      await expect(
        db.createMigrationState({ workspaceId: 'ws-1', sourceTable: 'c', targetTable: 'd' }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('data operations', () => {
    it('should seed and retrieve source data', async () => {
      const leads = generateTestLeads('ws-1', 10);
      db.seedSourceData('leads', 'ws-1', leads);

      const count = await db.getSourceRowCount('leads', 'ws-1');
      expect(count).toBe(10);

      const batch = await db.getSourceBatch('leads', 'ws-1', null, 5);
      expect(batch).toHaveLength(5);
    });

    it('should support batch pagination with afterId', async () => {
      const leads = generateTestLeads('ws-1', 20);
      db.seedSourceData('leads', 'ws-1', leads);

      const batch1 = await db.getSourceBatch('leads', 'ws-1', null, 10);
      expect(batch1).toHaveLength(10);

      const lastId = String(batch1[batch1.length - 1].id);
      const batch2 = await db.getSourceBatch('leads', 'ws-1', lastId, 10);
      expect(batch2).toHaveLength(10);

      // Should be different rows
      expect(String(batch2[0].id)).not.toBe(String(batch1[0].id));
    });

    it('should insert target batch', async () => {
      const leads = generateTestLeads('ws-1', 5);
      const result = await db.insertTargetBatch('genesis.leads', leads);

      expect(result.inserted).toBe(5);
      expect(result.errors).toHaveLength(0);
    });

    it('should simulate insert failure', async () => {
      db.failOnInsertBatch = true;
      const leads = generateTestLeads('ws-1', 5);
      const result = await db.insertTargetBatch('genesis.leads', leads);

      expect(result.inserted).toBe(0);
      expect(result.errors.length).toBe(1);
    });

    it('should return 0 for non-existent table', async () => {
      const count = await db.getSourceRowCount('nonexistent', 'ws-1');
      expect(count).toBe(0);
    });
  });

  describe('migration events', () => {
    it('should log and retrieve events', async () => {
      await db.logMigrationEvent({
        workspaceId: 'ws-1',
        eventType: 'migration_created',
        details: { test: true },
      });

      const events = await db.getMigrationEvents('ws-1');
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('migration_created');
      expect(events[0].id).toBeDefined();
      expect(events[0].timestamp).toBeDefined();
    });

    it('should limit events', async () => {
      for (let i = 0; i < 10; i++) {
        await db.logMigrationEvent({
          workspaceId: 'ws-1',
          eventType: 'backfill_progress',
          details: { batch: i },
        });
      }

      const events = await db.getMigrationEvents('ws-1', 5);
      expect(events).toHaveLength(5);
    });
  });

  describe('call logging', () => {
    it('should track method calls', async () => {
      await db.getSourceRowCount('leads', 'ws-1');
      await db.getTargetRowCount('genesis.leads', 'ws-1');

      expect(db.getCallsTo('getSourceRowCount')).toHaveLength(1);
      expect(db.getCallsTo('getTargetRowCount')).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should clear all state', async () => {
      await db.createMigrationState({ workspaceId: 'ws-1', sourceTable: 'a', targetTable: 'b' });
      db.seedSourceData('leads', 'ws-1', [{ id: '1' }]);

      db.reset();

      // callLog should be empty immediately after reset
      expect(db.callLog).toHaveLength(0);

      // Subsequent calls will add to callLog, but data should be gone
      expect(await db.getMigrationState('ws-1')).toBeNull();
      expect(await db.getSourceRowCount('leads', 'ws-1')).toBe(0);
    });
  });
});

describe('generateTestLeads', () => {
  it('should generate leads with correct workspace ID', () => {
    const leads = generateTestLeads('ws-1', 5);
    expect(leads).toHaveLength(5);
    leads.forEach(lead => {
      expect(lead.workspace_id).toBe('ws-1');
    });
  });

  it('should generate unique IDs', () => {
    const leads = generateTestLeads('ws-1', 100);
    const ids = leads.map(l => l.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100);
  });

  it('should support custom start ID', () => {
    const leads = generateTestLeads('ws-1', 3, { startId: 100 });
    expect(leads[0].id).toBe('lead-000100');
    expect(leads[1].id).toBe('lead-000101');
    expect(leads[2].id).toBe('lead-000102');
  });

  it('should distribute statuses', () => {
    const leads = generateTestLeads('ws-1', 50);
    const statuses = new Set(leads.map(l => l.status));
    expect(statuses.size).toBeGreaterThan(1);
  });

  it('should include all required fields', () => {
    const leads = generateTestLeads('ws-1', 1);
    const lead = leads[0];

    expect(lead.id).toBeDefined();
    expect(lead.workspace_id).toBeDefined();
    expect(lead.email_address).toBeDefined();
    expect(lead.status).toBeDefined();
    expect(lead.campaign_name).toBeDefined();
    expect(lead.email_1_sent).toBeDefined();
    expect(lead.email_2_sent).toBeDefined();
    expect(lead.email_3_sent).toBeDefined();
    expect(lead.created_at).toBeDefined();
    expect(lead.updated_at).toBeDefined();
  });
});
