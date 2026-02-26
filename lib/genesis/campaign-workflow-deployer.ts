/**
 * DOMAIN 3 — PER-CAMPAIGN WORKFLOW DEPLOYER
 *
 * Deploys a dedicated set of 7 n8n workflows for a single campaign.
 *
 * When a new campaign is created in a workspace that has an active ignition,
 * this module loads the golden templates, builds a campaign-specific variable
 * map (with YOUR_CAMPAIGN_NAME set to the campaign's name), and deploys the
 * workflows via the Sidecar's DEPLOY_WORKFLOW / ACTIVATE_WORKFLOW commands.
 *
 * Workflow naming convention:
 *   [{workspace_name}] {template_display_name} — {campaign_name}
 *
 * Architecture notes:
 *   - Reuses the same TEMPLATE_FILE_MAP and DEFAULT_TEMPLATES from the
 *     ignition orchestrator so the template set stays in sync.
 *   - Uses HttpWorkflowDeployer (or any WorkflowDeployer) for deployment.
 *   - Reads the workspace's droplet_ip from genesis.partition_registry.
 *   - Reads email provider config to pick gmail vs smtp templates.
 *
 * @module genesis/campaign-workflow-deployer
 * @see docs/plans/POST_GENESIS_EXECUTION_PLAN.md — Domain 3, TASK 3.3.1
 */

import fs from 'fs';
import path from 'path';

import { DEFAULT_TEMPLATES, TemplateReference } from './ignition-types';
import type { WorkflowDeployer, SidecarClient } from './ignition-orchestrator';

// ============================================
// TEMPLATE FILE NAME MAP (identical to ignition-orchestrator)
// ============================================
const TEMPLATE_FILE_MAP: Record<string, { gmail: string; smtp?: string }> = {
  email_1:           { gmail: 'Email 1.json',           smtp: 'Email 1-SMTP.json' },
  email_2:           { gmail: 'Email 2.json',           smtp: 'Email 2-SMTP.json' },
  email_3:           { gmail: 'Email 3.json',           smtp: 'Email 3-SMTP.json' },
  email_preparation: { gmail: 'Email Preparation.json' },
  research_report:   { gmail: 'Research Report.json' },
  reply_tracker:     { gmail: 'Reply Tracker.json' },
  opt_out:           { gmail: 'Opt-Out.json' },
};

// ============================================
// TYPES
// ============================================

export interface CampaignDeploymentConfig {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  campaign_id: string;
  campaign_name: string;
  campaign_group_id?: string;
}

export interface CampaignDeploymentResult {
  success: boolean;
  campaign_id: string;
  workflow_ids: string[];
  error?: string;
}

interface PartitionRegistryRow {
  workspace_id: string;
  partition_name: string;
  droplet_ip: string | null;
  status: string;
}

interface EmailProviderConfigRow {
  provider: 'gmail' | 'smtp';
}

// ============================================
// CAMPAIGN WORKFLOW DEPLOYER
// ============================================

/**
 * Deploys a full set of 7 n8n workflows for a single campaign.
 *
 * @param config  - Campaign and workspace identity
 * @param deps    - Injected dependencies (supabaseAdmin, workflowDeployer)
 * @returns       - Deployment result with workflow IDs
 */
export async function deployForCampaign(
  config: CampaignDeploymentConfig,
  deps: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdmin: any;
    workflowDeployer: WorkflowDeployer;
    templateDir?: string;
  }
): Promise<CampaignDeploymentResult> {
  const { supabaseAdmin, workflowDeployer } = deps;
  const templateDir = deps.templateDir ?? path.join(process.cwd(), 'base-cold-email');

  try {
    // ── 1. Load droplet_ip from genesis.partition_registry ──────────
    const { data: registryRow, error: registryError } = await supabaseAdmin
      .schema('genesis')
      .from('partition_registry')
      .select('workspace_id, partition_name, droplet_ip, status')
      .eq('workspace_id', config.workspace_id)
      .eq('status', 'active')
      .maybeSingle();

    if (registryError || !registryRow) {
      return {
        success: false,
        campaign_id: config.campaign_id,
        workflow_ids: [],
        error: registryError?.message ?? 'No active partition found for workspace',
      };
    }

    const { droplet_ip } = registryRow as PartitionRegistryRow;
    if (!droplet_ip) {
      return {
        success: false,
        campaign_id: config.campaign_id,
        workflow_ids: [],
        error: 'Droplet IP not set in partition_registry — ignition may not be complete',
      };
    }

    // ── 2. Determine email provider (gmail vs smtp) ─────────────────
    let emailProvider: 'gmail' | 'smtp' = 'gmail';

    const { data: providerRow } = await supabaseAdmin
      .schema('genesis')
      .from('email_provider_config')
      .select('provider')
      .eq('workspace_id', config.workspace_id)
      .maybeSingle();

    if (providerRow) {
      emailProvider = (providerRow as EmailProviderConfigRow).provider;
    }

    // ── 3. Deploy each template ─────────────────────────────────────
    const workflowIds: string[] = [];

    for (const template of DEFAULT_TEMPLATES) {
      const templateJson = loadTemplateJson(template.template_name, emailProvider, templateDir);

      // Workflow name: [{workspace_name}] {display_name} — {campaign_name}
      const workflowName = `[${config.workspace_name}] ${template.display_name} — ${config.campaign_name}`;

      // Build campaign-specific variable map
      const variableMap: Record<string, string> = {
        YOUR_WORKSPACE_ID: config.workspace_id,
        YOUR_WORKSPACE_SLUG: config.workspace_slug,
        YOUR_WORKSPACE_NAME: config.workspace_name,
        YOUR_COMPANY_NAME: config.workspace_name,
        YOUR_CAMPAIGN_NAME: config.campaign_name,
        YOUR_CAMPAIGN_GROUP_ID: config.campaign_group_id ?? config.workspace_id,
        YOUR_LEADS_TABLE: `genesis.leads_p_${config.workspace_slug}`,
      };

      const result = await workflowDeployer.deploy(droplet_ip, {
        name: workflowName,
        json: templateJson,
        credential_map: {},  // Credentials already injected at ignition; not re-mapped here
        variable_map: variableMap,
      });

      if (!result.success) {
        return {
          success: false,
          campaign_id: config.campaign_id,
          workflow_ids: workflowIds,
          error: `Failed to deploy template '${template.display_name}': ${result.error}`,
        };
      }

      if (result.workflow_id) {
        workflowIds.push(result.workflow_id);
      }

      // Activate workflow immediately after deploy
      if (result.workflow_id) {
        await workflowDeployer.activate(droplet_ip, result.workflow_id);
      }
    }

    return {
      success: true,
      campaign_id: config.campaign_id,
      workflow_ids: workflowIds,
    };
  } catch (err) {
    return {
      success: false,
      campaign_id: config.campaign_id,
      workflow_ids: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Load a workflow template JSON from disk.
 * Selects the SMTP variant when the workspace uses SMTP credentials.
 */
function loadTemplateJson(
  templateName: string,
  emailProvider: 'gmail' | 'smtp',
  templateDir: string
): Record<string, unknown> {
  const fileMap = TEMPLATE_FILE_MAP[templateName];
  if (!fileMap) {
    throw new Error(`Unknown template: ${templateName}. Add it to TEMPLATE_FILE_MAP.`);
  }

  const fileName =
    emailProvider === 'smtp' && fileMap.smtp ? fileMap.smtp : fileMap.gmail;

  const filePath = path.join(templateDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Template file not found: ${filePath}. ` +
      `Ensure base-cold-email/ is present in the project root.`
    );
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Failed to parse template ${fileName}: ${(e as Error).message}`);
  }
}
