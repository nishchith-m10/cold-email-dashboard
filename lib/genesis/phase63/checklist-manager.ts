/**
 * GENESIS PART VI - PHASE 63: ADMIN ONBOARDING QUEUE & TRACKING
 * Checklist Manager
 * 
 * Core logic for managing checklist state and updates
 */

import type {
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistUpdateRequest,
  ChecklistCategory,
} from './checklist-types';
import { CHECKLIST_ITEMS, getItemById } from './checklist-definitions';

export class ChecklistManager {
  /**
   * Initialize checklist for a workspace
   */
  static initializeChecklist(
    workspaceId: string,
    campaignName?: string
  ): ChecklistItem[] {
    return CHECKLIST_ITEMS
      .filter(item => {
        // Include workspace-level items always
        // Include per-campaign items only if campaign specified
        return !item.per_campaign || (item.per_campaign && campaignName);
      })
      .map(def => ({
        ...def,
        status: 'pending' as ChecklistItemStatus,
      }));
  }

  /**
   * Update checklist item status
   */
  static updateItem(
    items: ChecklistItem[],
    request: ChecklistUpdateRequest
  ): {
    items: ChecklistItem[];
    updated: boolean;
    error?: string;
  } {
    const itemDef = getItemById(request.item_id);
    
    if (!itemDef) {
      return {
        items,
        updated: false,
        error: `Item not found: ${request.item_id}`,
      };
    }

    // Manual items can only be updated manually
    if (itemDef.detection === 'manual' && !request.admin_id) {
      return {
        items,
        updated: false,
        error: 'Manual items require admin_id',
      };
    }

    const updatedItems = items.map(item => {
      if (item.id === request.item_id) {
        return {
          ...item,
          status: request.status,
          completed_at: request.status === 'complete' ? new Date() : item.completed_at,
          completed_by: request.status === 'complete' ? request.admin_id : item.completed_by,
        };
      }
      return item;
    });

    return {
      items: updatedItems,
      updated: true,
    };
  }

  /**
   * Mark item as complete
   */
  static completeItem(
    items: ChecklistItem[],
    itemId: string,
    adminId?: string
  ): ChecklistItem[] {
    return items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'complete',
          completed_at: new Date(),
          completed_by: adminId,
        };
      }
      return item;
    });
  }

  /**
   * Mark item as auto-detected
   */
  static markAutoDetected(
    items: ChecklistItem[],
    itemId: string
  ): ChecklistItem[] {
    return items.map(item => {
      if (item.id === itemId && item.detection === 'auto') {
        return {
          ...item,
          status: 'complete',
          completed_at: new Date(),
          auto_detected: true,
        };
      }
      return item;
    });
  }

  /**
   * Mark multiple items as complete
   */
  static completeItems(
    items: ChecklistItem[],
    itemIds: string[],
    adminId?: string
  ): ChecklistItem[] {
    return items.map(item => {
      if (itemIds.includes(item.id)) {
        return {
          ...item,
          status: 'complete',
          completed_at: new Date(),
          completed_by: adminId,
        };
      }
      return item;
    });
  }

  /**
   * Get items by status
   */
  static getItemsByStatus(
    items: ChecklistItem[],
    status: ChecklistItemStatus
  ): ChecklistItem[] {
    return items.filter(item => item.status === status);
  }

  /**
   * Get items by category
   */
  static getItemsByCategory(
    items: ChecklistItem[],
    category: ChecklistCategory
  ): ChecklistItem[] {
    return items.filter(item => item.category === category);
  }

  /**
   * Get pending manual items
   */
  static getPendingManualItems(items: ChecklistItem[]): ChecklistItem[] {
    return items.filter(
      item => item.status === 'pending' && item.detection === 'manual'
    );
  }

  /**
   * Get pending auto items
   */
  static getPendingAutoItems(items: ChecklistItem[]): ChecklistItem[] {
    return items.filter(
      item => item.status === 'pending' && item.detection === 'auto'
    );
  }

  /**
   * Check if checklist is complete
   */
  static isComplete(items: ChecklistItem[]): boolean {
    return items.every(item => item.status === 'complete' || item.status === 'skipped');
  }

  /**
   * Get completion count
   */
  static getCompletionCount(items: ChecklistItem[]): {
    total: number;
    completed: number;
    pending: number;
    skipped: number;
  } {
    return {
      total: items.length,
      completed: items.filter(item => item.status === 'complete').length,
      pending: items.filter(item => item.status === 'pending').length,
      skipped: items.filter(item => item.status === 'skipped').length,
    };
  }

  /**
   * Get next pending item
   */
  static getNextPendingItem(items: ChecklistItem[]): ChecklistItem | null {
    const pending = items.find(item => item.status === 'pending');
    return pending || null;
  }

  /**
   * Validate item update
   */
  static validateUpdate(request: ChecklistUpdateRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.workspace_id) {
      errors.push('workspace_id is required');
    }

    if (!request.item_id) {
      errors.push('item_id is required');
    }

    if (!request.status) {
      errors.push('status is required');
    }

    const itemDef = getItemById(request.item_id);
    if (!itemDef) {
      errors.push(`Invalid item_id: ${request.item_id}`);
    } else if (itemDef.detection === 'manual' && !request.admin_id) {
      errors.push('admin_id required for manual items');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get items requiring admin action
   */
  static getItemsRequiringAdminAction(items: ChecklistItem[]): ChecklistItem[] {
    return items.filter(
      item => item.status === 'pending' && item.detection === 'manual'
    );
  }

  /**
   * Get items that can be auto-detected
   */
  static getAutoDetectableItems(items: ChecklistItem[]): ChecklistItem[] {
    return items.filter(
      item => item.status === 'pending' && item.detection === 'auto'
    );
  }

  /**
   * Reset checklist
   */
  static reset(items: ChecklistItem[]): ChecklistItem[] {
    return items.map(item => ({
      ...item,
      status: 'pending',
      completed_at: undefined,
      completed_by: undefined,
      auto_detected: undefined,
    }));
  }

  /**
   * Skip item
   */
  static skipItem(items: ChecklistItem[], itemId: string): ChecklistItem[] {
    return items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'skipped',
        };
      }
      return item;
    });
  }

  /**
   * Get category completion summary
   */
  static getCategorySummary(
    items: ChecklistItem[]
  ): Record<ChecklistCategory, { total: number; completed: number }> {
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

    const summary = {} as Record<ChecklistCategory, { total: number; completed: number }>;

    categories.forEach(category => {
      const categoryItems = items.filter(item => item.category === category);
      summary[category] = {
        total: categoryItems.length,
        completed: categoryItems.filter(item => item.status === 'complete').length,
      };
    });

    return summary;
  }
}
