/**
 * PHASE 45: WORKFLOW TRIGGER SERVICE TESTS
 */

import {
  WorkflowTriggerService,
  WorkflowTriggerError,
  MockWorkspaceLookupDB,
  MockSidecarClient,
} from '@/lib/genesis/phase45/workflow-trigger';

describe('WorkflowTriggerService', () => {
  let db: MockWorkspaceLookupDB;
  let sidecar: MockSidecarClient;
  let service: WorkflowTriggerService;

  beforeEach(() => {
    db = new MockWorkspaceLookupDB();
    sidecar = new MockSidecarClient();
    service = new WorkflowTriggerService(db, sidecar);
  });

  describe('triggerTest', () => {
    it('triggers workflow via Sidecar and returns stream URL', async () => {
      db.setSidecarUrl('ws-1', 'http://sidecar.local:3000');

      const result = await service.triggerTest({
        workspaceId: 'ws-1',
        campaignId: 'camp-1',
        testEmail: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.executionId).toMatch(/^mock-exec-/);
      expect(result.streamUrl).toContain('/api/sandbox/execution-stream/');
      expect(sidecar.triggerCount).toBe(1);
    });

    it('passes correct payload to Sidecar', async () => {
      db.setSidecarUrl('ws-1', 'http://sidecar.local:3000');

      await service.triggerTest({
        workspaceId: 'ws-1',
        campaignId: 'camp-1',
        testEmail: 'user@test.com',
        testLeadData: { company: 'Acme' },
      });

      expect(sidecar.lastPayload).toEqual({
        campaignId: 'camp-1',
        testEmail: 'user@test.com',
        testMode: true,
        testData: { company: 'Acme' },
      });
    });

    it('throws NO_SIDECAR if workspace has no Sidecar', async () => {
      await expect(
        service.triggerTest({
          workspaceId: 'ws-no-sidecar',
          campaignId: 'camp-1',
          testEmail: 'test@example.com',
        })
      ).rejects.toThrow(WorkflowTriggerError);

      try {
        await service.triggerTest({
          workspaceId: 'ws-no-sidecar',
          campaignId: 'camp-1',
          testEmail: 'test@example.com',
        });
      } catch (e) {
        expect((e as WorkflowTriggerError).code).toBe('NO_SIDECAR');
      }
    });

    it('throws TRIGGER_FAILED if Sidecar returns error', async () => {
      db.setSidecarUrl('ws-1', 'http://sidecar.local:3000');
      sidecar.shouldFail = true;
      sidecar.failError = 'n8n is unreachable';

      await expect(
        service.triggerTest({
          workspaceId: 'ws-1',
          campaignId: 'camp-1',
          testEmail: 'test@example.com',
        })
      ).rejects.toThrow(WorkflowTriggerError);

      try {
        await service.triggerTest({
          workspaceId: 'ws-1',
          campaignId: 'camp-1',
          testEmail: 'test@example.com',
        });
      } catch (e) {
        expect((e as WorkflowTriggerError).code).toBe('TRIGGER_FAILED');
        expect((e as WorkflowTriggerError).message).toContain('n8n is unreachable');
      }
    });
  });

  describe('MockWorkspaceLookupDB', () => {
    it('returns null for unknown workspaces', async () => {
      const url = await db.getSidecarUrl('unknown');
      expect(url).toBeNull();
    });

    it('stores and retrieves Sidecar URLs', async () => {
      db.setSidecarUrl('ws-1', 'http://sidecar-1:3000');
      db.setSidecarUrl('ws-2', 'http://sidecar-2:3000');

      expect(await db.getSidecarUrl('ws-1')).toBe('http://sidecar-1:3000');
      expect(await db.getSidecarUrl('ws-2')).toBe('http://sidecar-2:3000');
    });
  });

  describe('MockSidecarClient', () => {
    it('tracks trigger count', async () => {
      db.setSidecarUrl('ws-1', 'http://sidecar.local:3000');

      await service.triggerTest({ workspaceId: 'ws-1', campaignId: 'c1', testEmail: 't@t.com' });
      await service.triggerTest({ workspaceId: 'ws-1', campaignId: 'c2', testEmail: 't@t.com' });

      expect(sidecar.triggerCount).toBe(2);
    });

    it('reset clears state', () => {
      sidecar.shouldFail = true;
      sidecar.triggerCount = 5;
      sidecar.reset();

      expect(sidecar.shouldFail).toBe(false);
      expect(sidecar.triggerCount).toBe(0);
      expect(sidecar.lastPayload).toBeNull();
    });
  });

  describe('WorkflowTriggerError', () => {
    it('has correct name and code', () => {
      const err = new WorkflowTriggerError('NO_SIDECAR', 'No sidecar found');
      expect(err.name).toBe('WorkflowTriggerError');
      expect(err.code).toBe('NO_SIDECAR');
      expect(err.message).toBe('No sidecar found');
    });
  });
});
