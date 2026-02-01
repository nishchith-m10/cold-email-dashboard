/**
 * GENESIS PART VI - PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
 * Workflow Cloner
 * 
 * Clones n8n workflows for new campaigns
 */

import type {
  N8nWorkflow,
  WorkflowReplacementContext,
} from './workflow-types';
import { WorkflowNamer } from './workflow-namer';

/**
 * Workflow Cloner
 * Handles cloning of n8n workflows with campaign-specific replacements
 */
export class WorkflowCloner {
  /**
   * Clone a workflow for a new campaign
   * Replaces campaign-specific values throughout the workflow
   */
  static cloneWorkflow(
    sourceWorkflow: N8nWorkflow,
    context: WorkflowReplacementContext
  ): N8nWorkflow {
    // Deep clone the workflow
    const cloned = JSON.parse(JSON.stringify(sourceWorkflow)) as N8nWorkflow;

    // Remove ID (n8n will assign a new one)
    delete cloned.id;

    // Replace campaign name in workflow name
    cloned.name = WorkflowNamer.replaceCampaignName(
      cloned.name,
      context.source_campaign,
      context.target_campaign
    );

    // Set workflow to inactive (requires admin customization)
    cloned.active = false;

    // Replace campaign references in nodes
    cloned.nodes = cloned.nodes.map(node => 
      this.replaceNodeReferences(node, context)
    );

    // Replace in static data if present
    if (cloned.staticData) {
      cloned.staticData = this.replaceInObject(cloned.staticData, context);
    }

    return cloned;
  }

  /**
   * Replace campaign references in a node
   */
  private static replaceNodeReferences(
    node: any,
    context: WorkflowReplacementContext
  ): any {
    const clonedNode = JSON.parse(JSON.stringify(node));

    // Replace in parameters
    if (clonedNode.parameters) {
      clonedNode.parameters = this.replaceInObject(
        clonedNode.parameters,
        context
      );
    }

    return clonedNode;
  }

  /**
   * Recursively replace campaign references in an object
   */
  private static replaceInObject(
    obj: any,
    context: WorkflowReplacementContext
  ): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.replaceInString(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceInObject(item, context));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.replaceInObject(obj[key], context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Replace campaign references in a string
   */
  private static replaceInString(
    str: string,
    context: WorkflowReplacementContext
  ): string {
    let result = str;

    // Replace campaign name (case-sensitive)
    result = result.replace(
      new RegExp(context.source_campaign, 'g'),
      context.target_campaign
    );

    // Replace campaign name in SQL queries
    // Example: campaign_name = 'Tech CTOs' -> campaign_name = 'Marketing VPs'
    result = result.replace(
      new RegExp(`'${context.source_campaign}'`, 'g'),
      `'${context.target_campaign}'`
    );
    result = result.replace(
      new RegExp(`"${context.source_campaign}"`, 'g'),
      `"${context.target_campaign}"`
    );

    return result;
  }

  /**
   * Validate that a workflow can be cloned
   */
  static validateWorkflow(workflow: N8nWorkflow): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!workflow.name) {
      errors.push('Workflow name is missing');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow has no nodes');
    }

    if (!WorkflowNamer.isValidFormat(workflow.name)) {
      errors.push(`Workflow name "${workflow.name}" does not match expected format`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract campaign name from workflow
   */
  static extractCampaignName(workflow: N8nWorkflow): string | null {
    return WorkflowNamer.parseCampaignName(workflow.name);
  }

  /**
   * Check if workflow belongs to a specific campaign
   */
  static belongsToCampaign(
    workflow: N8nWorkflow,
    campaignName: string
  ): boolean {
    const workflowCampaign = this.extractCampaignName(workflow);
    return workflowCampaign === campaignName;
  }

  /**
   * Clone multiple workflows
   */
  static cloneMultipleWorkflows(
    sourceWorkflows: N8nWorkflow[],
    context: WorkflowReplacementContext
  ): N8nWorkflow[] {
    return sourceWorkflows.map(workflow =>
      this.cloneWorkflow(workflow, context)
    );
  }

  /**
   * Generate clone summary
   */
  static generateCloneSummary(
    sourceWorkflows: N8nWorkflow[],
    clonedWorkflows: N8nWorkflow[]
  ): {
    source_count: number;
    cloned_count: number;
    source_campaign: string | null;
    target_campaign: string | null;
  } {
    const sourceCampaign = sourceWorkflows.length > 0
      ? this.extractCampaignName(sourceWorkflows[0])
      : null;

    const targetCampaign = clonedWorkflows.length > 0
      ? this.extractCampaignName(clonedWorkflows[0])
      : null;

    return {
      source_count: sourceWorkflows.length,
      cloned_count: clonedWorkflows.length,
      source_campaign: sourceCampaign,
      target_campaign: targetCampaign,
    };
  }
}
