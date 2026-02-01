/**
 * GENESIS PART VI - PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
 * Workflow Query Generator
 * 
 * Generates SQL queries for workflow-specific lead selection
 */

import type { WorkflowQueryParams } from './workflow-types';

/**
 * Workflow Query Generator
 * Generates campaign-specific SQL queries for n8n workflows
 */
export class WorkflowQueryGenerator {
  /**
   * Generate lead selection query for Email Preparation workflow
   */
  static generateEmailPrepQuery(params: WorkflowQueryParams): string {
    return `SELECT * FROM genesis.leads
WHERE workspace_id = '${params.workspace_id}'
  AND campaign_name = '${params.campaign_name}'
  AND email_prep = false
  AND bounced = false
  AND opted_out = false
LIMIT 125`;
  }

  /**
   * Generate lead selection query for Email 1 workflow
   */
  static generateEmail1Query(params: WorkflowQueryParams): string {
    return `SELECT * FROM genesis.leads
WHERE workspace_id = '${params.workspace_id}'
  AND campaign_name = '${params.campaign_name}'
  AND email_prep = true
  AND email_1_sent = false
  AND bounced = false
  AND opted_out = false
LIMIT 125`;
  }

  /**
   * Generate lead selection query for Email 2 workflow
   */
  static generateEmail2Query(params: WorkflowQueryParams): string {
    return `SELECT * FROM genesis.leads
WHERE workspace_id = '${params.workspace_id}'
  AND campaign_name = '${params.campaign_name}'
  AND email_1_sent = true
  AND email_2_sent = false
  AND bounced = false
  AND opted_out = false
LIMIT 125`;
  }

  /**
   * Generate lead selection query for Email 3 workflow
   */
  static generateEmail3Query(params: WorkflowQueryParams): string {
    return `SELECT * FROM genesis.leads
WHERE workspace_id = '${params.workspace_id}'
  AND campaign_name = '${params.campaign_name}'
  AND email_2_sent = true
  AND email_3_sent = false
  AND bounced = false
  AND opted_out = false
LIMIT 125`;
  }

  /**
   * Generate lead selection query for Reply Tracker workflow
   */
  static generateReplyTrackerQuery(params: WorkflowQueryParams): string {
    return `SELECT * FROM genesis.leads
WHERE workspace_id = '${params.workspace_id}'
  AND campaign_name = '${params.campaign_name}'
  AND (email_1_sent = true OR email_2_sent = true OR email_3_sent = true)
  AND replied = false
  AND bounced = false
  AND opted_out = false
LIMIT 125`;
  }

  /**
   * Generate lead selection query for Research Report workflow
   */
  static generateResearchReportQuery(params: WorkflowQueryParams): string {
    return `SELECT * FROM genesis.leads
WHERE workspace_id = '${params.workspace_id}'
  AND campaign_name = '${params.campaign_name}'
  AND email_prep = false
  AND research_complete = false
  AND bounced = false
  AND opted_out = false
LIMIT 125`;
  }

  /**
   * Generate lead selection query for Opt-Out workflow
   */
  static generateOptOutQuery(params: WorkflowQueryParams): string {
    return `SELECT * FROM genesis.leads
WHERE workspace_id = '${params.workspace_id}'
  AND campaign_name = '${params.campaign_name}'
  AND opted_out = false
LIMIT 125`;
  }

  /**
   * Generate query for specific email step
   */
  static generateEmailStepQuery(
    params: WorkflowQueryParams,
    step: 1 | 2 | 3
  ): string {
    switch (step) {
      case 1:
        return this.generateEmail1Query(params);
      case 2:
        return this.generateEmail2Query(params);
      case 3:
        return this.generateEmail3Query(params);
      default:
        throw new Error(`Invalid email step: ${step}`);
    }
  }

  /**
   * Validate query parameters
   */
  static validateParams(params: WorkflowQueryParams): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!params.workspace_id || params.workspace_id.trim().length === 0) {
      errors.push('workspace_id is required');
    }

    if (!params.campaign_name || params.campaign_name.trim().length === 0) {
      errors.push('campaign_name is required');
    }

    // Validate workspace_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (params.workspace_id && !uuidRegex.test(params.workspace_id)) {
      errors.push('workspace_id must be a valid UUID');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Escape single quotes in SQL string values
   */
  static escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Generate safe query with escaped values
   */
  static generateSafeQuery(
    params: WorkflowQueryParams,
    queryType: 'email_prep' | 'email_1' | 'email_2' | 'email_3' | 'reply_tracker' | 'research_report' | 'opt_out'
  ): string {
    const safeParams = {
      workspace_id: params.workspace_id,
      campaign_name: this.escapeSqlString(params.campaign_name),
    };

    const generators = {
      email_prep: this.generateEmailPrepQuery,
      email_1: this.generateEmail1Query,
      email_2: this.generateEmail2Query,
      email_3: this.generateEmail3Query,
      reply_tracker: this.generateReplyTrackerQuery,
      research_report: this.generateResearchReportQuery,
      opt_out: this.generateOptOutQuery,
    };

    return generators[queryType](safeParams);
  }
}
