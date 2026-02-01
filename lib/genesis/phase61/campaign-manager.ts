/**
 * GENESIS PART VI - PHASE 61: CAMPAIGN ARCHITECTURE & OPERATIONS
 * Campaign Manager
 * 
 * Manages campaign lifecycle and enforces limits
 */

import type {
  Campaign,
  CampaignTier,
  CreateCampaignRequest,
  CreateCampaignResult,
} from './campaign-types';
import { CAMPAIGN_TIER_LIMITS } from './campaign-types';
import { CampaignStatusMachine } from './campaign-status-machine';

/**
 * Campaign Manager
 * Handles campaign creation, validation, and limit enforcement
 */
export class CampaignManager {
  /**
   * Create a new campaign
   */
  static createCampaign(
    request: CreateCampaignRequest,
    existingCampaignsCount: number,
    totalLeadsCount: number,
    tier: CampaignTier
  ): CreateCampaignResult {
    // Validate campaign name
    const nameValidation = this.validateCampaignName(request.name);
    if (!nameValidation.valid) {
      return {
        success: false,
        error: nameValidation.error,
      };
    }

    // Check campaign limits
    const limitsCheck = this.checkCampaignLimits(
      existingCampaignsCount,
      totalLeadsCount,
      tier
    );

    if (!limitsCheck.allowed) {
      return {
        success: false,
        error: limitsCheck.reason,
      };
    }

    // Determine initial status based on campaign type
    const initialStatus = request.type === 'empty_shell' ? 'draft' : 'pending_leads';

    // Create campaign object
    const campaign: Campaign = {
      id: this.generateCampaignId(),
      workspace_id: request.workspace_id,
      name: request.name,
      status: initialStatus,
      lead_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return {
      success: true,
      campaign,
    };
  }

  /**
   * Validate campaign name
   */
  static validateCampaignName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Campaign name is required' };
    }

    if (name.trim().length < 3) {
      return { valid: false, error: 'Campaign name must be at least 3 characters' };
    }

    if (name.trim().length > 100) {
      return { valid: false, error: 'Campaign name must not exceed 100 characters' };
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_&()]+$/.test(name)) {
      return { valid: false, error: 'Campaign name contains invalid characters' };
    }

    return { valid: true };
  }

  /**
   * Check if campaign limits are reached
   */
  static checkCampaignLimits(
    existingCampaignsCount: number,
    totalLeadsCount: number,
    tier: CampaignTier
  ): { allowed: boolean; reason?: string } {
    const limits = CAMPAIGN_TIER_LIMITS[tier];

    // Check max campaigns
    if (limits.max_campaigns !== null && existingCampaignsCount >= limits.max_campaigns) {
      return {
        allowed: false,
        reason: `Campaign limit reached (${limits.max_campaigns} campaigns for ${tier} tier)`,
      };
    }

    // Check max total leads
    if (limits.max_total_leads !== null && totalLeadsCount >= limits.max_total_leads) {
      return {
        allowed: false,
        reason: `Lead limit reached (${limits.max_total_leads} total leads for ${tier} tier)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if leads can be added to campaign
   */
  static canAddLeads(
    campaign: Campaign,
    newLeadsCount: number,
    totalLeadsCount: number,
    tier: CampaignTier
  ): { allowed: boolean; reason?: string } {
    const limits = CAMPAIGN_TIER_LIMITS[tier];

    // Check campaign status
    if (campaign.status !== 'pending_leads' && campaign.status !== 'draft') {
      return {
        allowed: false,
        reason: `Cannot add leads to campaign with status: ${campaign.status}`,
      };
    }

    // Check max leads per campaign
    if (limits.max_leads_per_campaign !== null) {
      const newCampaignTotal = campaign.lead_count + newLeadsCount;
      if (newCampaignTotal > limits.max_leads_per_campaign) {
        return {
          allowed: false,
          reason: `Would exceed campaign lead limit (${limits.max_leads_per_campaign} leads per campaign for ${tier} tier)`,
        };
      }
    }

    // Check max total leads
    if (limits.max_total_leads !== null) {
      const newTotalLeads = totalLeadsCount + newLeadsCount;
      if (newTotalLeads > limits.max_total_leads) {
        return {
          allowed: false,
          reason: `Would exceed workspace lead limit (${limits.max_total_leads} total leads for ${tier} tier)`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Update campaign status
   */
  static updateCampaignStatus(
    campaign: Campaign,
    newStatus: string,
    reason?: string
  ): { success: boolean; campaign?: Campaign; error?: string } {
    // Validate new status
    if (!CampaignStatusMachine.isValidStatus(newStatus)) {
      return {
        success: false,
        error: `Invalid status: ${newStatus}`,
      };
    }

    // Check if transition is valid
    const transition = CampaignStatusMachine.transition(
      campaign.status,
      newStatus,
      reason
    );

    if (!transition.success) {
      return {
        success: false,
        error: transition.error,
      };
    }

    // Update campaign
    const updatedCampaign: Campaign = {
      ...campaign,
      status: newStatus,
      updated_at: new Date(),
    };

    // Set special timestamps based on status
    if (newStatus === 'active' && !campaign.launched_at) {
      updatedCampaign.launched_at = new Date();
    } else if (newStatus === 'paused') {
      updatedCampaign.paused_at = new Date();
    } else if (newStatus === 'completed') {
      updatedCampaign.completed_at = new Date();
    }

    return {
      success: true,
      campaign: updatedCampaign,
    };
  }

  /**
   * Get campaign limits for tier
   */
  static getLimits(tier: CampaignTier) {
    return CAMPAIGN_TIER_LIMITS[tier];
  }

  /**
   * Check if tier has unlimited campaigns
   */
  static hasUnlimitedCampaigns(tier: CampaignTier): boolean {
    return CAMPAIGN_TIER_LIMITS[tier].max_campaigns === null;
  }

  /**
   * Check if tier has unlimited leads
   */
  static hasUnlimitedLeads(tier: CampaignTier): boolean {
    return CAMPAIGN_TIER_LIMITS[tier].max_total_leads === null;
  }

  /**
   * Generate campaign ID (in production, this would be a UUID from database)
   */
  private static generateCampaignId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
