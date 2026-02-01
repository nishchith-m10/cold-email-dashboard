/**
 * GENESIS PART VI - PHASE 63: ADMIN ONBOARDING QUEUE & TRACKING
 * Type definitions for admin checklist system
 */

/**
 * Checklist category
 */
export type ChecklistCategory =
  | 'infrastructure'
  | 'workflow_import'
  | 'credentials'
  | 'prompts'
  | 'schedules'
  | 'leads'
  | 'testing'
  | 'activation';

/**
 * Detection method for checklist items
 */
export type DetectionMethod = 'auto' | 'manual';

/**
 * Checklist item status
 */
export type ChecklistItemStatus = 'pending' | 'complete' | 'skipped';

/**
 * Checklist item definition
 */
export interface ChecklistItemDef {
  id: string;
  category: ChecklistCategory;
  label: string;
  detection: DetectionMethod;
  order: number;
  per_campaign?: boolean;
}

/**
 * Checklist item with status
 */
export interface ChecklistItem extends ChecklistItemDef {
  status: ChecklistItemStatus;
  completed_at?: Date;
  completed_by?: string;
  auto_detected?: boolean;
}

/**
 * Checklist progress
 */
export interface ChecklistProgress {
  workspace_id: string;
  campaign_name?: string;
  total_items: number;
  completed_items: number;
  pending_items: number;
  skipped_items: number;
  completion_percentage: number;
  started_at: Date;
  completed_at?: Date;
  estimated_time_remaining_minutes?: number;
}

/**
 * Checklist category progress
 */
export interface CategoryProgress {
  category: ChecklistCategory;
  total: number;
  completed: number;
  pending: number;
  completion_percentage: number;
}

/**
 * Setup time tracking
 */
export interface SetupTimeLog {
  id: string;
  workspace_id: string;
  campaign_name?: string;
  setup_started_at: Date;
  setup_completed_at?: Date;
  total_minutes?: number;
  workflow_import_minutes?: number;
  prompt_customization_minutes?: number;
  testing_minutes?: number;
  admin_id: string;
  notes?: string;
}

/**
 * Admin queue item
 */
export interface AdminQueueItem {
  workspace_id: string;
  workspace_name: string;
  campaign_name?: string;
  status: 'awaiting_setup' | 'in_progress' | 'ready_to_launch' | 'active';
  progress: ChecklistProgress;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: Date;
  assigned_to?: string;
  last_activity?: Date;
  time_in_queue_hours: number;
}

/**
 * Checklist update request
 */
export interface ChecklistUpdateRequest {
  workspace_id: string;
  campaign_name?: string;
  item_id: string;
  status: ChecklistItemStatus;
  admin_id?: string;
}

/**
 * Auto-detection result
 */
export interface AutoDetectionResult {
  detected_items: string[];
  failed_items: string[];
  errors: string[];
}

/**
 * Category display names
 */
export const CATEGORY_NAMES: Record<ChecklistCategory, string> = {
  infrastructure: 'Droplet & Infrastructure',
  workflow_import: 'Workflow Import',
  credentials: 'Credential Configuration',
  prompts: 'Prompt Customization',
  schedules: 'Schedule Configuration',
  leads: 'Leads Import',
  testing: 'Production Testing',
  activation: 'Final Activation',
};

/**
 * Average time per category (minutes)
 */
export const CATEGORY_TIME_ESTIMATES: Record<ChecklistCategory, number> = {
  infrastructure: 5,   // Auto-detected, minimal manual work
  workflow_import: 10, // 7 workflows to import
  credentials: 8,      // Configure API keys
  prompts: 20,         // Main time sink
  schedules: 5,        // Quick configuration
  leads: 5,            // CSV upload
  testing: 10,         // Run test flows
  activation: 2,       // Final toggle
};
