/**
 * GENESIS PART VI - PHASE 63: ADMIN ONBOARDING QUEUE & TRACKING
 * Checklist Definitions Tests
 */

import {
  CHECKLIST_ITEMS,
  getItemsByCategory,
  getItemsByDetection,
  getPerCampaignItems,
  getTotalItemCount,
  getItemById,
} from '@/lib/genesis/phase63/checklist-definitions';

describe('Checklist Definitions', () => {
  describe('CHECKLIST_ITEMS', () => {
    it('should have exactly 44 items', () => {
      expect(CHECKLIST_ITEMS).toHaveLength(44);
    });

    it('should have unique IDs', () => {
      const ids = CHECKLIST_ITEMS.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(CHECKLIST_ITEMS.length);
    });

    it('should have all required fields', () => {
      CHECKLIST_ITEMS.forEach(item => {
        expect(item.id).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.detection).toBeTruthy();
        expect(item.order).toBeGreaterThan(0);
      });
    });
  });

  describe('Category Distribution', () => {
    it('should have 4 infrastructure items', () => {
      const items = getItemsByCategory('infrastructure');
      expect(items).toHaveLength(4);
    });

    it('should have 7 workflow_import items', () => {
      const items = getItemsByCategory('workflow_import');
      expect(items).toHaveLength(7);
    });

    it('should have 6 credential items', () => {
      const items = getItemsByCategory('credentials');
      expect(items).toHaveLength(6);
    });

    it('should have 8 prompt items', () => {
      const items = getItemsByCategory('prompts');
      expect(items).toHaveLength(8);
    });

    it('should have 5 schedule items', () => {
      const items = getItemsByCategory('schedules');
      expect(items).toHaveLength(5);
    });

    it('should have 4 leads items', () => {
      const items = getItemsByCategory('leads');
      expect(items).toHaveLength(4);
    });

    it('should have 7 testing items', () => {
      const items = getItemsByCategory('testing');
      expect(items).toHaveLength(7);
    });

    it('should have 3 activation items', () => {
      const items = getItemsByCategory('activation');
      expect(items).toHaveLength(3);
    });
  });

  describe('Detection Methods', () => {
    it('should have auto-detected items', () => {
      const auto = getItemsByDetection('auto');
      expect(auto.length).toBeGreaterThan(0);
    });

    it('should have manual items', () => {
      const manual = getItemsByDetection('manual');
      expect(manual.length).toBeGreaterThan(0);
    });

    it('should have exactly 28 auto-detected items', () => {
      const auto = getItemsByDetection('auto');
      expect(auto).toHaveLength(27);
    });

    it('should have exactly 17 manual items', () => {
      const manual = getItemsByDetection('manual');
      expect(manual).toHaveLength(17);
    });
  });

  describe('Per-Campaign Items', () => {
    it('should have 20 per-campaign items', () => {
      const perCampaign = getPerCampaignItems();
      expect(perCampaign).toHaveLength(20);
    });

    it('should mark all workflow imports as per-campaign', () => {
      const workflows = getItemsByCategory('workflow_import');
      workflows.forEach(item => {
        expect(item.per_campaign).toBe(true);
      });
    });

    it('should mark all prompts as per-campaign', () => {
      const prompts = getItemsByCategory('prompts');
      prompts.forEach(item => {
        expect(item.per_campaign).toBe(true);
      });
    });

    it('should mark all schedules as per-campaign', () => {
      const schedules = getItemsByCategory('schedules');
      schedules.forEach(item => {
        expect(item.per_campaign).toBe(true);
      });
    });
  });

  describe('getTotalItemCount', () => {
    it('should return 47', () => {
      expect(getTotalItemCount()).toBe(44);
    });
  });

  describe('getItemById', () => {
    it('should find infrastructure items', () => {
      const item = getItemById('infra_droplet_provisioned');
      expect(item).toBeDefined();
      expect(item?.category).toBe('infrastructure');
    });

    it('should find workflow items', () => {
      const item = getItemById('workflow_email_1');
      expect(item).toBeDefined();
      expect(item?.category).toBe('workflow_import');
    });

    it('should return undefined for non-existent ID', () => {
      const item = getItemById('non_existent_id');
      expect(item).toBeUndefined();
    });
  });

  describe('Order Consistency', () => {
    it('should have sequential orders within each category', () => {
      const categories = [
        'infrastructure',
        'workflow_import',
        'credentials',
        'prompts',
        'schedules',
        'leads',
        'testing',
        'activation',
      ];

      categories.forEach(category => {
        const items = getItemsByCategory(category);
        const orders = items.map(i => i.order).sort((a, b) => a - b);
        
        orders.forEach((order, index) => {
          expect(order).toBe(index + 1);
        });
      });
    });
  });
});
