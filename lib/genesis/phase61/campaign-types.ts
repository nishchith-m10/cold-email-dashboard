/**
 * GENESIS PART VI - PHASE 61: CAMPAIGN ARCHITECTURE & OPERATIONS
 * Type definitions for campaigns
 */

/**
 * Campaign status (lifecycle states)
 */
export type CampaignStatus = 
  | 'draft'                      // Just created, no leads
  | 'pending_leads'              // Awaiting CSV import
  | 'pending_personalization'    // Leads imported, awaiting prompt customization
  | 'ready'                      // Fully configured, not yet launched
  | 'active'                     // n8n workflows processing leads
  | 'paused'                     // Temporarily stopped
  | 'completed';                 // All leads processed

/**
 * Campaign tier pricing
 */
export type CampaignTier = 'starter' | 'professional' | 'scale' | 'enterprise';

/**
 * Campaign limits configuration
 */
export interface CampaignLimits {
  tier: CampaignTier;
  max_campaigns: number | null;      // null = unlimited
  max_leads_per_campaign: number | null;
  max_total_leads: number | null;
}

/**
 * Campaign data structure
 */
export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  status: CampaignStatus;
  lead_count: number;
  created_at: Date;
  updated_at: Date;
  launched_at?: Date;
  completed_at?: Date;
  paused_at?: Date;
}

/**
 * Campaign creation request
 */
export interface CreateCampaignRequest {
  workspace_id: string;
  name: string;
  type: 'empty_shell' | 'production_ready';
}

/**
 * Campaign creation result
 */
export interface CreateCampaignResult {
  success: boolean;
  campaign?: Campaign;
  error?: string;
}

/**
 * Campaign status transition
 */
export interface CampaignStatusTransition {
  from_status: CampaignStatus;
  to_status: CampaignStatus;
  timestamp: Date;
  reason?: string;
}

/**
 * Campaign statistics
 */
export interface CampaignStats {
  campaign_id: string;
  total_leads: number;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  emails_bounced: number;
  opted_out: number;
}

/**
 * Campaign tier limits
 */
export const CAMPAIGN_TIER_LIMITS: Record<CampaignTier, CampaignLimits> = {
  starter: {
    tier: 'starter',
    max_campaigns: 10,
    max_leads_per_campaign: 500,
    max_total_leads: 2000,
  },
  professional: {
    tier: 'professional',
    max_campaigns: 25,
    max_leads_per_campaign: 5000,
    max_total_leads: 20000,
  },
  scale: {
    tier: 'scale',
    max_campaigns: 50,
    max_leads_per_campaign: 20000,
    max_total_leads: 100000,
  },
  enterprise: {
    tier: 'enterprise',
    max_campaigns: null,         // unlimited
    max_leads_per_campaign: null, // unlimited
    max_total_leads: null,        // unlimited
  },
};

/**
 * Valid campaign status transitions
 */
export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['pending_leads'],
  pending_leads: ['pending_personalization', 'draft'],
  pending_personalization: ['ready', 'pending_leads'],
  ready: ['active', 'pending_personalization'],
  active: ['paused', 'completed'],
  paused: ['active', 'completed'],
  completed: [],  // Terminal state
};
