/**
 * PHASE 63: ADMIN ONBOARDING QUEUE & TRACKING
 * 
 * Central exports for Phase 63 modules.
 */

// Checklist Manager
export { ChecklistManager } from './checklist-manager';

// Progress Tracker
export { ChecklistProgressTracker } from './checklist-progress-tracker';

// Definitions
export {
  CHECKLIST_ITEMS,
  getItemsByCategory as getChecklistItemsByCategory,
  getItemsByDetection,
  getPerCampaignItems,
  getTotalItemCount,
  getItemById,
} from './checklist-definitions';

// Types and Constants
export type {
  ChecklistCategory,
  DetectionMethod,
  ChecklistItemStatus,
  ChecklistItemDef,
  ChecklistItem,
  ChecklistProgress,
  CategoryProgress,
  SetupTimeLog,
  AdminQueueItem,
  ChecklistUpdateRequest,
  AutoDetectionResult,
} from './checklist-types';

export {
  CATEGORY_NAMES,
  CATEGORY_TIME_ESTIMATES,
} from './checklist-types';
