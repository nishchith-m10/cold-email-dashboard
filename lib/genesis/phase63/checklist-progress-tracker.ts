/**
 * GENESIS PART VI - PHASE 63: ADMIN ONBOARDING QUEUE & TRACKING
 * Checklist Progress Tracker
 * 
 * Calculates progress, completion percentages, and time estimates
 */

import type {
  ChecklistItem,
  ChecklistProgress,
  CategoryProgress,
  ChecklistCategory,
} from './checklist-types';
import { CATEGORY_TIME_ESTIMATES } from './checklist-types';

export class ChecklistProgressTracker {
  /**
   * Calculate checklist progress
   */
  static calculateProgress(
    workspaceId: string,
    items: ChecklistItem[],
    startedAt: Date,
    campaignName?: string
  ): ChecklistProgress {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.status === 'complete').length;
    const pendingItems = items.filter(item => item.status === 'pending').length;
    const skippedItems = items.filter(item => item.status === 'skipped').length;

    const completionPercentage = totalItems > 0
      ? Math.round((completedItems / totalItems) * 100)
      : 0;

    const isComplete = pendingItems === 0;
    const completedAt = isComplete ? new Date() : undefined;

    const estimatedTimeRemaining = this.estimateTimeRemaining(items);

    return {
      workspace_id: workspaceId,
      campaign_name: campaignName,
      total_items: totalItems,
      completed_items: completedItems,
      pending_items: pendingItems,
      skipped_items: skippedItems,
      completion_percentage: completionPercentage,
      started_at: startedAt,
      completed_at: completedAt,
      estimated_time_remaining_minutes: estimatedTimeRemaining,
    };
  }

  /**
   * Estimate time remaining based on pending items
   */
  static estimateTimeRemaining(items: ChecklistItem[]): number {
    const pendingItems = items.filter(item => item.status === 'pending');

    let totalMinutes = 0;

    // Group by category and calculate time
    const categoryCounts: Partial<Record<ChecklistCategory, number>> = {};

    pendingItems.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    // Calculate time based on category estimates
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const categoryTime = CATEGORY_TIME_ESTIMATES[category as ChecklistCategory] || 5;
      totalMinutes += Math.ceil((categoryTime * count) / this.getItemsPerCategory(category as ChecklistCategory));
    });

    return totalMinutes;
  }

  /**
   * Get typical items per category (for time calculation)
   */
  private static getItemsPerCategory(category: ChecklistCategory): number {
    const counts: Record<ChecklistCategory, number> = {
      infrastructure: 4,
      workflow_import: 7,
      credentials: 6,
      prompts: 8,
      schedules: 5,
      leads: 4,
      testing: 7,
      activation: 3,
    };
    return counts[category] || 1;
  }

  /**
   * Calculate category progress
   */
  static calculateCategoryProgress(
    items: ChecklistItem[],
    category: ChecklistCategory
  ): CategoryProgress {
    const categoryItems = items.filter(item => item.category === category);
    const total = categoryItems.length;
    const completed = categoryItems.filter(item => item.status === 'complete').length;
    const pending = categoryItems.filter(item => item.status === 'pending').length;

    const completionPercentage = total > 0
      ? Math.round((completed / total) * 100)
      : 0;

    return {
      category,
      total,
      completed,
      pending,
      completion_percentage: completionPercentage,
    };
  }

  /**
   * Calculate all category progress
   */
  static calculateAllCategoryProgress(items: ChecklistItem[]): CategoryProgress[] {
    const categories: ChecklistCategory[] = [
      'infrastructure',
      'workflow_import',
      'credentials',
      'prompts',
      'schedules',
      'leads',
      'testing',
      'activation',
    ];

    return categories
      .map(category => this.calculateCategoryProgress(items, category))
      .filter(progress => progress.total > 0); // Only include categories with items
  }

  /**
   * Get completion velocity (items per hour)
   */
  static getCompletionVelocity(
    items: ChecklistItem[],
    startedAt: Date
  ): number {
    const completedItems = items.filter(item => item.status === 'complete');
    
    if (completedItems.length === 0) {
      return 0;
    }

    const now = new Date();
    const elapsedHours = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);

    if (elapsedHours === 0) {
      return 0;
    }

    return completedItems.length / elapsedHours;
  }

  /**
   * Estimate completion time based on velocity
   */
  static estimateCompletionTime(
    items: ChecklistItem[],
    startedAt: Date
  ): Date | null {
    const pendingItems = items.filter(item => item.status === 'pending').length;
    
    if (pendingItems === 0) {
      return null;
    }

    const velocity = this.getCompletionVelocity(items, startedAt);

    if (velocity === 0) {
      // Use static time estimate
      const estimatedMinutes = this.estimateTimeRemaining(items);
      const estimatedTime = new Date();
      estimatedTime.setMinutes(estimatedTime.getMinutes() + estimatedMinutes);
      return estimatedTime;
    }

    const hoursRemaining = pendingItems / velocity;
    const estimatedTime = new Date();
    estimatedTime.setHours(estimatedTime.getHours() + hoursRemaining);

    return estimatedTime;
  }

  /**
   * Get next milestone
   */
  static getNextMilestone(items: ChecklistItem[]): {
    category: ChecklistCategory;
    completion_percentage: number;
  } | null {
    const categoryProgress = this.calculateAllCategoryProgress(items);
    
    const inProgressCategory = categoryProgress.find(
      cat => cat.completed > 0 && cat.pending > 0
    );

    if (inProgressCategory) {
      return {
        category: inProgressCategory.category,
        completion_percentage: inProgressCategory.completion_percentage,
      };
    }

    const nextCategory = categoryProgress.find(cat => cat.pending === cat.total);

    if (nextCategory) {
      return {
        category: nextCategory.category,
        completion_percentage: 0,
      };
    }

    return null;
  }

  /**
   * Format time remaining
   */
  static formatTimeRemaining(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get progress summary text
   */
  static getProgressSummary(progress: ChecklistProgress): string {
    const percentage = progress.completion_percentage;
    const remaining = progress.pending_items;

    if (percentage === 100) {
      return 'Setup complete!';
    }

    if (percentage === 0) {
      return 'Not started';
    }

    if (percentage < 25) {
      return `Getting started (${remaining} items remaining)`;
    }

    if (percentage < 50) {
      return `In progress (${remaining} items remaining)`;
    }

    if (percentage < 75) {
      return `More than halfway (${remaining} items remaining)`;
    }

    return `Almost done (${remaining} items remaining)`;
  }

  /**
   * Check if category is complete
   */
  static isCategoryComplete(
    items: ChecklistItem[],
    category: ChecklistCategory
  ): boolean {
    const categoryItems = items.filter(item => item.category === category);
    return categoryItems.every(item => item.status === 'complete' || item.status === 'skipped');
  }

  /**
   * Get completed categories
   */
  static getCompletedCategories(items: ChecklistItem[]): ChecklistCategory[] {
    const categories: ChecklistCategory[] = [
      'infrastructure',
      'workflow_import',
      'credentials',
      'prompts',
      'schedules',
      'leads',
      'testing',
      'activation',
    ];

    return categories.filter(category => this.isCategoryComplete(items, category));
  }
}
