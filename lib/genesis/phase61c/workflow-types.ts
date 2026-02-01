/**
 * GENESIS PART VI - PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
 * Type definitions for n8n workflow integration
 */

/**
 * Workflow type (7 workflows per campaign)
 */
export type WorkflowType =
  | 'email_preparation'
  | 'research_report'
  | 'email_1'
  | 'email_2'
  | 'email_3'
  | 'reply_tracker'
  | 'opt_out';

/**
 * All workflow types
 */
export const ALL_WORKFLOW_TYPES: readonly WorkflowType[] = [
  'email_preparation',
  'research_report',
  'email_1',
  'email_2',
  'email_3',
  'reply_tracker',
  'opt_out',
] as const;

/**
 * Workflow type to human-readable name mapping
 */
export const WORKFLOW_TYPE_NAMES: Record<WorkflowType, string> = {
  email_preparation: 'Email Preparation',
  research_report: 'Research Report',
  email_1: 'Email 1',
  email_2: 'Email 2',
  email_3: 'Email 3',
  reply_tracker: 'Reply Tracker',
  opt_out: 'Opt-Out',
};

/**
 * N8N workflow structure (simplified)
 */
export interface N8nWorkflow {
  id?: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  staticData?: Record<string, any>;
  tags?: string[];
}

/**
 * N8N workflow node
 */
export interface N8nNode {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
}

/**
 * Campaign workflow set (7 workflows)
 */
export interface CampaignWorkflowSet {
  campaign_name: string;
  workspace_id: string;
  workflows: CampaignWorkflow[];
}

/**
 * Single campaign workflow
 */
export interface CampaignWorkflow {
  workflow_type: WorkflowType;
  workflow_name: string;
  n8n_workflow_id?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Campaign clone request
 */
export interface CampaignCloneRequest {
  workspace_id: string;
  source_campaign: string;
  target_campaign: string;
  n8n_api_url: string;
  n8n_api_key?: string;
}

/**
 * Campaign clone response
 */
export interface CampaignCloneResponse {
  success: boolean;
  workflows_created: number;
  workflow_ids: string[];
  status: 'needs_customization' | 'ready' | 'failed';
  errors: string[];
}

/**
 * Workflow replacement context
 */
export interface WorkflowReplacementContext {
  source_campaign: string;
  target_campaign: string;
  workspace_id: string;
}

/**
 * Workflow query parameters
 */
export interface WorkflowQueryParams {
  workspace_id: string;
  campaign_name: string;
  email_step?: 1 | 2 | 3;
}

/**
 * Maximum workflows per campaign
 */
export const MAX_WORKFLOWS_PER_CAMPAIGN = 7;

/**
 * Maximum campaigns per workspace (before performance warning)
 */
export const MAX_CAMPAIGNS_BEFORE_WARNING = 20;

/**
 * Maximum campaigns per workspace (hard limit)
 */
export const MAX_CAMPAIGNS_PER_WORKSPACE = 50;
