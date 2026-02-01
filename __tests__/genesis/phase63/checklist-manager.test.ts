import { ChecklistManager } from '@/lib/genesis/phase63/checklist-manager';
import type { ChecklistItem, ChecklistUpdateRequest } from '@/lib/genesis/phase63/checklist-types';

describe('ChecklistManager', () => {
  const workspaceId = '123e4567-e89b-12d3-a456-426614174000';

  describe('initializeChecklist', () => {
    it('should initialize without campaign', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item => item.status === 'pending')).toBe(true);
      expect(items.every(item => !item.per_campaign)).toBe(true);
    });

    it('should include per-campaign items with campaign', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId, 'Campaign');
      const perCampaign = items.filter(item => item.per_campaign);
      expect(perCampaign.length).toBeGreaterThan(0);
    });
  });

  describe('updateItem', () => {
    it('should update status', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const result = ChecklistManager.updateItem(items, {
        workspace_id: workspaceId,
        item_id: 'infra_droplet_provisioned',
        status: 'complete',
      });
      expect(result.updated).toBe(true);
      const item = result.items.find(i => i.id === 'infra_droplet_provisioned');
      expect(item?.status).toBe('complete');
    });

    it('should reject non-existent item', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const result = ChecklistManager.updateItem(items, {
        workspace_id: workspaceId,
        item_id: 'non_existent',
        status: 'complete',
      });
      expect(result.updated).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require admin_id for manual items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId, 'Campaign');
      const result = ChecklistManager.updateItem(items, {
        workspace_id: workspaceId,
        item_id: 'leads_csv_received',
        status: 'complete',
      });
      expect(result.updated).toBe(false);
      expect(result.error).toContain('admin_id');
    });

    it('should set completed_at and completed_by', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const result = ChecklistManager.updateItem(items, {
        workspace_id: workspaceId,
        item_id: 'infra_droplet_provisioned',
        status: 'complete',
        admin_id: 'admin-123',
      });
      const item = result.items.find(i => i.id === 'infra_droplet_provisioned');
      expect(item?.completed_at).toBeDefined();
      expect(item?.completed_by).toBe('admin-123');
    });

    it('should preserve completed_at when changing to non-complete status', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItem(items, 'infra_droplet_provisioned', 'admin-123');
      const completedItem = items.find(i => i.id === 'infra_droplet_provisioned');
      const originalTime = completedItem?.completed_at;
      
      const result = ChecklistManager.updateItem(items, {
        workspace_id: workspaceId,
        item_id: 'infra_droplet_provisioned',
        status: 'pending',
      });
      const item = result.items.find(i => i.id === 'infra_droplet_provisioned');
      expect(item?.completed_at).toEqual(originalTime);
    });
  });

  describe('completeItem', () => {
    it('should mark item complete', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const updated = ChecklistManager.completeItem(items, 'infra_droplet_provisioned', 'admin-123');
      const item = updated.find(i => i.id === 'infra_droplet_provisioned');
      expect(item?.status).toBe('complete');
      expect(item?.completed_by).toBe('admin-123');
    });
  });

  describe('markAutoDetected', () => {
    it('should mark auto item', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const updated = ChecklistManager.markAutoDetected(items, 'infra_droplet_provisioned');
      const item = updated.find(i => i.id === 'infra_droplet_provisioned');
      expect(item?.status).toBe('complete');
      expect(item?.auto_detected).toBe(true);
    });

    it('should not mark manual items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId, 'Campaign');
      const updated = ChecklistManager.markAutoDetected(items, 'leads_csv_received');
      const item = updated.find(i => i.id === 'leads_csv_received');
      expect(item?.status).toBe('pending');
    });
  });

  describe('completeItems', () => {
    it('should complete multiple', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const ids = ['infra_droplet_provisioned', 'infra_sidecar_handshake'];
      const updated = ChecklistManager.completeItems(items, ids, 'admin-123');
      ids.forEach(id => {
        const item = updated.find(i => i.id === id);
        expect(item?.status).toBe('complete');
      });
    });
  });

  describe('getItemsByStatus', () => {
    it('should filter by status', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItem(items, 'infra_droplet_provisioned');
      const completed = ChecklistManager.getItemsByStatus(items, 'complete');
      expect(completed).toHaveLength(1);
    });
  });

  describe('getItemsByCategory', () => {
    it('should filter by category', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const infra = ChecklistManager.getItemsByCategory(items, 'infrastructure');
      expect(infra.every(i => i.category === 'infrastructure')).toBe(true);
    });
  });

  describe('getPendingManualItems', () => {
    it('should return pending manual items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId, 'Campaign');
      const manual = ChecklistManager.getPendingManualItems(items);
      expect(manual.every(i => i.detection === 'manual')).toBe(true);
    });
  });

  describe('getPendingAutoItems', () => {
    it('should return pending auto items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const auto = ChecklistManager.getPendingAutoItems(items);
      expect(auto.every(i => i.detection === 'auto')).toBe(true);
    });
  });

  describe('isComplete', () => {
    it('should return false for incomplete', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      expect(ChecklistManager.isComplete(items)).toBe(false);
    });

    it('should return true when all complete', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItems(items, items.map(i => i.id));
      expect(ChecklistManager.isComplete(items)).toBe(true);
    });
  });

  describe('getCompletionCount', () => {
    it('should calculate counts', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItem(items, 'infra_droplet_provisioned');
      items = ChecklistManager.skipItem(items, 'infra_ssl_certificate');
      const counts = ChecklistManager.getCompletionCount(items);
      expect(counts.completed).toBe(1);
      expect(counts.skipped).toBe(1);
    });
  });

  describe('getNextPendingItem', () => {
    it('should return first pending', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const next = ChecklistManager.getNextPendingItem(items);
      expect(next).not.toBeNull();
    });

    it('should return null if all complete', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItems(items, items.map(i => i.id));
      const next = ChecklistManager.getNextPendingItem(items);
      expect(next).toBeNull();
    });
  });

  describe('validateUpdate', () => {
    it('should validate correct request', () => {
      const request: ChecklistUpdateRequest = {
        workspace_id: workspaceId,
        item_id: 'infra_droplet_provisioned',
        status: 'complete',
      };
      const result = ChecklistManager.validateUpdate(request);
      expect(result.valid).toBe(true);
    });

    it('should require workspace_id', () => {
      const request: ChecklistUpdateRequest = {
        workspace_id: '',
        item_id: 'infra_droplet_provisioned',
        status: 'complete',
      };
      const result = ChecklistManager.validateUpdate(request);
      expect(result.valid).toBe(false);
    });

    it('should require item_id', () => {
      const request: ChecklistUpdateRequest = {
        workspace_id: workspaceId,
        item_id: '',
        status: 'complete',
      };
      const result = ChecklistManager.validateUpdate(request);
      expect(result.valid).toBe(false);
    });

    it('should require status', () => {
      const request: any = {
        workspace_id: workspaceId,
        item_id: 'infra_droplet_provisioned',
      };
      const result = ChecklistManager.validateUpdate(request);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid item_id', () => {
      const request: ChecklistUpdateRequest = {
        workspace_id: workspaceId,
        item_id: 'invalid_id',
        status: 'complete',
      };
      const result = ChecklistManager.validateUpdate(request);
      expect(result.valid).toBe(false);
    });

    it('should require admin_id for manual items', () => {
      const request: ChecklistUpdateRequest = {
        workspace_id: workspaceId,
        item_id: 'leads_csv_received',
        status: 'complete',
      };
      const result = ChecklistManager.validateUpdate(request);
      expect(result.valid).toBe(false);
    });
  });

  describe('getItemsRequiringAdminAction', () => {
    it('should return pending manual items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId, 'Campaign');
      const adminItems = ChecklistManager.getItemsRequiringAdminAction(items);
      expect(adminItems.every(i => i.detection === 'manual')).toBe(true);
    });
  });

  describe('getAutoDetectableItems', () => {
    it('should return pending auto items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const autoItems = ChecklistManager.getAutoDetectableItems(items);
      expect(autoItems.every(i => i.detection === 'auto')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all items', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItem(items, 'infra_droplet_provisioned');
      items = ChecklistManager.reset(items);
      expect(items.every(i => i.status === 'pending')).toBe(true);
    });
  });

  describe('skipItem', () => {
    it('should mark as skipped', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const updated = ChecklistManager.skipItem(items, 'infra_ssl_certificate');
      const item = updated.find(i => i.id === 'infra_ssl_certificate');
      expect(item?.status).toBe('skipped');
    });
  });

  describe('getCategorySummary', () => {
    it('should calculate summary', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const summary = ChecklistManager.getCategorySummary(items);
      expect(summary.infrastructure).toBeDefined();
    });
  });
});
