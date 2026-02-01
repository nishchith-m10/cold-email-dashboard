/**
 * GENESIS PART VI - PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
 * Workflow Naming Utilities
 * 
 * Handles workflow naming conventions and parsing
 */

import type { WorkflowType } from './workflow-types';
import { WORKFLOW_TYPE_NAMES, ALL_WORKFLOW_TYPES } from './workflow-types';

/**
 * Workflow Namer
 * Utilities for generating and parsing workflow names
 */
export class WorkflowNamer {
  /**
   * Generate workflow name
   * Format: "{Workflow Type} - {Campaign Name}"
   * Example: "Email Preparation - Tech CTOs"
   */
  static generateName(workflowType: WorkflowType, campaignName: string): string {
    const typeName = WORKFLOW_TYPE_NAMES[workflowType];
    return `${typeName} - ${campaignName}`;
  }

  /**
   * Generate all workflow names for a campaign
   */
  static generateAllNames(campaignName: string): Record<WorkflowType, string> {
    const names: Partial<Record<WorkflowType, string>> = {};
    
    ALL_WORKFLOW_TYPES.forEach(type => {
      names[type] = this.generateName(type, campaignName);
    });

    return names as Record<WorkflowType, string>;
  }

  /**
   * Parse workflow name to extract campaign name
   * Returns null if name doesn't match expected format
   */
  static parseCampaignName(workflowName: string): string | null {
    // Expected format: "{Workflow Type} - {Campaign Name}"
    const parts = workflowName.split(' - ');
    
    if (parts.length < 2) {
      return null;
    }

    // Extract campaign name (everything after first " - ")
    const campaignName = parts.slice(1).join(' - ');
    return campaignName || null;
  }

  /**
   * Parse workflow name to extract workflow type
   * Returns null if name doesn't match expected format
   */
  static parseWorkflowType(workflowName: string): WorkflowType | null {
    const typePart = workflowName.split(' - ')[0];
    
    if (!typePart) {
      return null;
    }

    // Find matching workflow type
    for (const type of ALL_WORKFLOW_TYPES) {
      if (WORKFLOW_TYPE_NAMES[type] === typePart) {
        return type;
      }
    }

    return null;
  }

  /**
   * Check if workflow name matches expected format
   */
  static isValidFormat(workflowName: string): boolean {
    const campaignName = this.parseCampaignName(workflowName);
    const workflowType = this.parseWorkflowType(workflowName);
    
    return campaignName !== null && workflowType !== null;
  }

  /**
   * Replace campaign name in workflow name
   * Example: "Email 1 - Tech CTOs" -> "Email 1 - Marketing VPs"
   */
  static replaceCampaignName(
    workflowName: string,
    oldCampaign: string,
    newCampaign: string
  ): string {
    // Simple string replacement
    return workflowName.replace(` - ${oldCampaign}`, ` - ${newCampaign}`);
  }

  /**
   * Get workflow type from name (with validation)
   */
  static getWorkflowType(workflowName: string): WorkflowType {
    const type = this.parseWorkflowType(workflowName);
    
    if (!type) {
      throw new Error(`Invalid workflow name format: ${workflowName}`);
    }

    return type;
  }

  /**
   * Get campaign name from workflow name (with validation)
   */
  static getCampaignName(workflowName: string): string {
    const campaign = this.parseCampaignName(workflowName);
    
    if (!campaign) {
      throw new Error(`Invalid workflow name format: ${workflowName}`);
    }

    return campaign;
  }

  /**
   * Validate campaign name
   */
  static validateCampaignName(campaignName: string): {
    valid: boolean;
    error?: string;
  } {
    if (!campaignName || campaignName.trim().length === 0) {
      return { valid: false, error: 'Campaign name is required' };
    }

    if (campaignName.trim().length < 3) {
      return { valid: false, error: 'Campaign name must be at least 3 characters' };
    }

    if (campaignName.trim().length > 100) {
      return { valid: false, error: 'Campaign name must not exceed 100 characters' };
    }

    // Check for invalid characters (should match campaign name validation)
    if (!/^[a-zA-Z0-9\s\-_&()]+$/.test(campaignName)) {
      return { valid: false, error: 'Campaign name contains invalid characters' };
    }

    return { valid: true };
  }

  /**
   * Filter workflows by campaign name
   */
  static filterByCampaign(workflowNames: string[], campaignName: string): string[] {
    return workflowNames.filter(name => {
      const parsed = this.parseCampaignName(name);
      return parsed === campaignName;
    });
  }

  /**
   * Get workflow type display name
   */
  static getDisplayName(workflowType: WorkflowType): string {
    return WORKFLOW_TYPE_NAMES[workflowType];
  }
}
