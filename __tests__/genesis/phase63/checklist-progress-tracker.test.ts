import { ChecklistProgressTracker } from '@/lib/genesis/phase63/checklist-progress-tracker';
import { ChecklistManager } from '@/lib/genesis/phase63/checklist-manager';

describe('ChecklistProgressTracker', () => {
  const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
  const startedAt = new Date('2024-01-01T10:00:00Z');

  describe('calculateProgress', () => {
    it('should calculate progress correctly', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      expect(progress.workspace_id).toBe(workspaceId);
      expect(progress.completion_percentage).toBe(0);
    });

    it('should calculate 100% when all complete', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItems(items, items.map(i => i.id));
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      expect(progress.completion_percentage).toBe(100);
      expect(progress.completed_at).toBeDefined();
    });

    it('should include campaign name', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId, 'Tech CTOs');
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt, 'Tech CTOs');
      expect(progress.campaign_name).toBe('Tech CTOs');
    });
  });

  describe('estimateTimeRemaining', () => {
    it('should estimate time for pending items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const estimate = ChecklistProgressTracker.estimateTimeRemaining(items);
      expect(estimate).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when all complete', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItems(items, items.map(i => i.id));
      const estimate = ChecklistProgressTracker.estimateTimeRemaining(items);
      expect(estimate).toBe(0);
    });
  });

  describe('calculateCategoryProgress', () => {
    it('should calculate progress', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const progress = ChecklistProgressTracker.calculateCategoryProgress(items, 'infrastructure');
      expect(progress.category).toBe('infrastructure');
      expect(progress.completion_percentage).toBe(0);
    });

    it('should calculate 100% for complete category', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const infraItems = ChecklistManager.getItemsByCategory(items, 'infrastructure');
      items = ChecklistManager.completeItems(items, infraItems.map(i => i.id));
      const progress = ChecklistProgressTracker.calculateCategoryProgress(items, 'infrastructure');
      expect(progress.completion_percentage).toBe(100);
    });
  });

  describe('calculateAllCategoryProgress', () => {
    it('should calculate all', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId, 'Campaign');
      const progress = ChecklistProgressTracker.calculateAllCategoryProgress(items);
      expect(progress.length).toBeGreaterThan(0);
    });

    it('should filter empty categories', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const progress = ChecklistProgressTracker.calculateAllCategoryProgress(items);
      expect(progress.every(p => p.total > 0)).toBe(true);
    });
  });

  describe('getCompletionVelocity', () => {
    it('should return 0 for no completed items', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const velocity = ChecklistProgressTracker.getCompletionVelocity(items, startedAt);
      expect(velocity).toBe(0);
    });

    it('should calculate velocity', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItem(items, 'infra_droplet_provisioned');
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const velocity = ChecklistProgressTracker.getCompletionVelocity(items, oneHourAgo);
      expect(velocity).toBeGreaterThan(0);
    });
  });

  describe('estimateCompletionTime', () => {
    it('should return null if no pending', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItems(items, items.map(i => i.id));
      const estimate = ChecklistProgressTracker.estimateCompletionTime(items, startedAt);
      expect(estimate).toBeNull();
    });

    it('should use static estimate with zero velocity', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const estimate = ChecklistProgressTracker.estimateCompletionTime(items, new Date());
      expect(estimate).not.toBeNull();
    });

    it('should use velocity when available', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItem(items, 'infra_droplet_provisioned');
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const estimate = ChecklistProgressTracker.estimateCompletionTime(items, oneHourAgo);
      expect(estimate).not.toBeNull();
    });
  });

  describe('getNextMilestone', () => {
    it('should return null when all complete', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItems(items, items.map(i => i.id));
      const milestone = ChecklistProgressTracker.getNextMilestone(items);
      expect(milestone).toBeNull();
    });

    it('should return in-progress category', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItem(items, 'infra_droplet_provisioned');
      const milestone = ChecklistProgressTracker.getNextMilestone(items);
      expect(milestone).not.toBeNull();
    });

    it('should return next pending category', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const milestone = ChecklistProgressTracker.getNextMilestone(items);
      expect(milestone).not.toBeNull();
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format minutes', () => {
      expect(ChecklistProgressTracker.formatTimeRemaining(1)).toBe('1 minute');
      expect(ChecklistProgressTracker.formatTimeRemaining(30)).toBe('30 minutes');
    });

    it('should format hours', () => {
      expect(ChecklistProgressTracker.formatTimeRemaining(60)).toBe('1 hour');
      expect(ChecklistProgressTracker.formatTimeRemaining(120)).toBe('2 hours');
    });

    it('should format hours and minutes', () => {
      expect(ChecklistProgressTracker.formatTimeRemaining(90)).toBe('1h 30m');
      expect(ChecklistProgressTracker.formatTimeRemaining(150)).toBe('2h 30m');
    });
  });

  describe('getProgressSummary', () => {
    it('should return "Not started" for 0%', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      const summary = ChecklistProgressTracker.getProgressSummary(progress);
      expect(summary).toBe('Not started');
    });

    it('should return "Setup complete!" for 100%', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      items = ChecklistManager.completeItems(items, items.map(i => i.id));
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      const summary = ChecklistProgressTracker.getProgressSummary(progress);
      expect(summary).toBe('Setup complete!');
    });

    it('should return appropriate summary for 25%', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const count = Math.floor(items.length * 0.15);
      items = ChecklistManager.completeItems(items, items.slice(0, count).map(i => i.id));
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      const summary = ChecklistProgressTracker.getProgressSummary(progress);
      expect(summary).toContain('Getting started');
    });

    it('should return appropriate summary for 50%', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const count = Math.floor(items.length * 0.4);
      items = ChecklistManager.completeItems(items, items.slice(0, count).map(i => i.id));
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      const summary = ChecklistProgressTracker.getProgressSummary(progress);
      expect(summary).toContain('In progress');
    });

    it('should return appropriate summary for 75%', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const count = Math.floor(items.length * 0.65);
      items = ChecklistManager.completeItems(items, items.slice(0, count).map(i => i.id));
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      const summary = ChecklistProgressTracker.getProgressSummary(progress);
      expect(summary).toContain('More than halfway');
    });

    it('should return appropriate summary for 90%', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const count = Math.floor(items.length * 0.9);
      items = ChecklistManager.completeItems(items, items.slice(0, count).map(i => i.id));
      const progress = ChecklistProgressTracker.calculateProgress(workspaceId, items, startedAt);
      const summary = ChecklistProgressTracker.getProgressSummary(progress);
      expect(summary).toContain('Almost done');
    });
  });

  describe('isCategoryComplete', () => {
    it('should return false for incomplete', () => {
      const items = ChecklistManager.initializeChecklist(workspaceId);
      const complete = ChecklistProgressTracker.isCategoryComplete(items, 'infrastructure');
      expect(complete).toBe(false);
    });

    it('should return true when complete', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const infraItems = ChecklistManager.getItemsByCategory(items, 'infrastructure');
      items = ChecklistManager.completeItems(items, infraItems.map(i => i.id));
      const complete = ChecklistProgressTracker.isCategoryComplete(items, 'infrastructure');
      expect(complete).toBe(true);
    });

    it('should consider skipped items as complete', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const infraItems = ChecklistManager.getItemsByCategory(items, 'infrastructure');
      items = ChecklistManager.skipItem(items, infraItems[0].id);
      infraItems.slice(1).forEach(item => {
        items = ChecklistManager.completeItem(items, item.id);
      });
      const complete = ChecklistProgressTracker.isCategoryComplete(items, 'infrastructure');
      expect(complete).toBe(true);
    });
  });

  describe('getCompletedCategories', () => {
    it('should return completed categories', () => {
      let items = ChecklistManager.initializeChecklist(workspaceId);
      const infraItems = ChecklistManager.getItemsByCategory(items, 'infrastructure');
      items = ChecklistManager.completeItems(items, infraItems.map(i => i.id));
      const completed = ChecklistProgressTracker.getCompletedCategories(items);
      expect(completed).toContain('infrastructure');
    });
  });
});
