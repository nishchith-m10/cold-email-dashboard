/**
 * WORKFLOW DEPLOYER - Phase 64.B Email Provider Abstraction
 * 
 * Deploys the correct workflow templates based on email provider selection:
 * - Gmail: Email 1.json, Email 2.json, Email 3.json
 * - SMTP: Email 1-SMTP.json, Email 2-SMTP.json, Email 3-SMTP.json
 * 
 * Architecture:
 * - 1 workspace = 1 droplet = 1 email provider
 * - Reads email_provider_config from Supabase
 * - Injects workspace_id, campaign_name, env vars
 * - Deploys ONLY selected provider's workflows
 */

import * as fs from 'fs';
import * as path from 'path';
import { N8nManager, N8nWorkflow } from './n8n-manager';
import axios from 'axios';

// ============================================
// INTERFACES
// ============================================

export interface EmailProviderConfig {
  provider: 'gmail' | 'smtp';
  workspace_id: string;
  
  // SMTP-specific fields (if provider = smtp)
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string; // DECRYPTED by API
  smtp_encryption?: 'ssl' | 'starttls' | 'none';
  from_name?: string;
  from_email?: string;
}

export interface WorkflowDeploymentRequest {
  workspace_id: string;
  campaign_name: string;
  dashboard_url: string;
  dashboard_api_url: string;

  // --- Credential IDs (n8n credential UUIDs per workspace) ---
  credential_gmail_id?: string;
  credential_google_sheets_id?: string;
  credential_postgres_id?: string;
  credential_openai_id?: string;
  credential_anthropic_id?: string;
  credential_google_cse_query_id?: string;

  // --- Content variables ---
  leads_table?: string;          // e.g. "leads_ohio"
  webhook_token?: string;
  company_name?: string;
  sender_name?: string;
  unsubscribe_redirect_url?: string;
  relevance_ai_auth_token?: string;
  relevance_ai_base_url?: string;
  relevance_ai_studio_id?: string;
  relevance_ai_project_id?: string;

  // --- Escape hatch: any additional YOUR_* replacements ---
  extra_placeholders?: Record<string, string>;
}

export interface WorkflowDeploymentResult {
  success: boolean;
  provider: 'gmail' | 'smtp';
  deployed_workflows: Array<{
    name: string;
    id: string;
    active: boolean;
  }>;
  error?: string;
}

// ============================================
// WORKFLOW DEPLOYER CLASS
// ============================================

export class WorkflowDeployer {
  private n8nManager: N8nManager;
  private templateDir: string;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(
    n8nManager: N8nManager,
    templateDir: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.n8nManager = n8nManager;
    this.templateDir = templateDir;
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  /**
   * Deploy workflows for a campaign based on email provider selection
   */
  async deployWorkflows(
    request: WorkflowDeploymentRequest
  ): Promise<WorkflowDeploymentResult> {
    try {
      console.log(`\n🚀 Phase 64.B: Deploying workflows for workspace ${request.workspace_id}`);
      
      // 1. Fetch email provider config from Supabase
      const providerConfig = await this.fetchEmailProviderConfig(request.workspace_id);
      console.log(`  ✅ Provider detected: ${providerConfig.provider.toUpperCase()}`);

      // 2. Determine workflow templates based on provider
      const templateFiles = this.getTemplateFiles(providerConfig.provider);
      console.log(`  📄 Loading templates:`, templateFiles);

      // 3. Load and inject variables into workflows
      const workflows = await this.loadAndInjectWorkflows(
        templateFiles,
        request,
        providerConfig
      );
      console.log(`  ✅ Loaded ${workflows.length} workflows`);

      // 4. Deploy workflows to n8n
      const deployedWorkflows = [];
      for (const workflow of workflows) {
        try {
          const result = await this.n8nManager.createWorkflow(workflow);
          
          // Activate workflow
          await this.n8nManager.activateWorkflow(result.id);
          
          deployedWorkflows.push({
            name: workflow.name,
            id: result.id,
            active: true,
          });
          
          console.log(`  ✅ Deployed & activated: ${workflow.name} (ID: ${result.id})`);
        } catch (error) {
          console.error(`  ❌ Failed to deploy ${workflow.name}:`, error);
          throw error;
        }
      }

      console.log(`\n✅ Phase 64.B deployment complete: ${deployedWorkflows.length} workflows deployed\n`);

      return {
        success: true,
        provider: providerConfig.provider,
        deployed_workflows: deployedWorkflows,
      };
    } catch (error) {
      console.error('\n❌ Phase 64.B deployment failed:', error);
      return {
        success: false,
        provider: 'gmail', // fallback
        deployed_workflows: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Fetch email provider config from Supabase
   */
  private async fetchEmailProviderConfig(workspaceId: string): Promise<EmailProviderConfig> {
    try {
      const response = await axios.get(
        `${this.supabaseUrl}/rest/v1/genesis.email_provider_config`,
        {
          params: {
            workspace_id: `eq.${workspaceId}`,
            select: '*',
          },
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
          },
        }
      );

      const configs = response.data;
      
      if (!configs || configs.length === 0) {
        console.log('  ⚠️  No email provider config found, defaulting to Gmail');
        return {
          provider: 'gmail',
          workspace_id: workspaceId,
        };
      }

      const config = configs[0];
      
      return {
        provider: config.provider as 'gmail' | 'smtp',
        workspace_id: workspaceId,
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_username: config.smtp_username,
        smtp_password: config.smtp_password, // Already decrypted by Dashboard API
        smtp_encryption: config.smtp_encryption,
        from_name: config.smtp_from_name || config.from_name,
        from_email: config.smtp_from_email || config.from_email,
      };
    } catch (error) {
      console.error('  ❌ Failed to fetch email provider config:', error);
      // Fallback to Gmail
      return {
        provider: 'gmail',
        workspace_id: workspaceId,
      };
    }
  }

  /**
   * Get template files based on provider
   */
  private getTemplateFiles(provider: 'gmail' | 'smtp'): string[] {
    if (provider === 'smtp') {
      return [
        'Email 1-SMTP.json',
        'Email 2-SMTP.json',
        'Email 3-SMTP.json',
      ];
    } else {
      return [
        'Email 1.json',
        'Email 2.json',
        'Email 3.json',
      ];
    }
  }

  /**
   * Load workflow templates and inject variables
   */
  private async loadAndInjectWorkflows(
    templateFiles: string[],
    request: WorkflowDeploymentRequest,
    providerConfig: EmailProviderConfig
  ): Promise<N8nWorkflow[]> {
    const workflows: N8nWorkflow[] = [];

    for (const filename of templateFiles) {
      const filepath = path.join(this.templateDir, filename);
      
      try {
        const content = fs.readFileSync(filepath, 'utf-8');
        let workflowJson = content;

        // Pass 1: Replace {{ $env.VAR_NAME }} placeholders
        workflowJson = this.injectVariables(workflowJson, {
          WORKSPACE_ID: request.workspace_id,
          CAMPAIGN_NAME: request.campaign_name,
          DASHBOARD_URL: request.dashboard_url,
          DASHBOARD_API_URL: request.dashboard_api_url,
          // SMTP-specific (only used if provider = smtp)
          SMTP_HOST: providerConfig.smtp_host || '',
          SMTP_PORT: providerConfig.smtp_port?.toString() || '587',
          SMTP_USER: providerConfig.smtp_username || '',
          SMTP_FROM_EMAIL: providerConfig.from_email || '',
          SMTP_FROM_NAME: providerConfig.from_name || '',
        });

        // Pass 2: Replace YOUR_* credential & content placeholders
        workflowJson = this.injectCredentialPlaceholders(workflowJson, request);

        const workflow: N8nWorkflow = JSON.parse(workflowJson);
        
        // Ensure workflow has a unique name (append campaign)
        workflow.name = `${workflow.name} - ${request.campaign_name}`;
        
        workflows.push(workflow);
      } catch (error) {
        throw new Error(`Failed to load template ${filename}: ${error}`);
      }
    }

    return workflows;
  }

  /**
   * Inject environment variables into workflow JSON
   * Replaces {{ $env.VAR_NAME }} placeholders
   */
  private injectVariables(json: string, vars: Record<string, string>): string {
    let result = json;
    
    for (const [key, value] of Object.entries(vars)) {
      // Replace {{ $env.VAR_NAME }} patterns
      const regex = new RegExp(`\\{\\{\\s*\\$env\\.${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  /**
   * Inject YOUR_* credential and content placeholders.
   * Performs literal string replacement on all YOUR_* tokens in
   * the template JSON so credential IDs and config values are
   * wired to the workspace's actual n8n credentials.
   */
  private injectCredentialPlaceholders(
    json: string,
    request: WorkflowDeploymentRequest
  ): string {
    // Build the YOUR_* → value map
    const map: Record<string, string> = {
      YOUR_CREDENTIAL_GMAIL_ID:         request.credential_gmail_id ?? '',
      YOUR_CREDENTIAL_GOOGLE_SHEETS_ID: request.credential_google_sheets_id ?? '',
      YOUR_CREDENTIAL_POSTGRES_ID:      request.credential_postgres_id ?? '',
      YOUR_CREDENTIAL_OPENAI_ID:        request.credential_openai_id ?? '',
      YOUR_CREDENTIAL_ANTHROPIC_ID:     request.credential_anthropic_id ?? '',
      YOUR_CREDENTIAL_GOOGLE_CSE_QUERY_ID: request.credential_google_cse_query_id ?? '',

      YOUR_LEADS_TABLE:            request.leads_table ?? 'leads_default',
      YOUR_WEBHOOK_TOKEN:          request.webhook_token ?? '',
      YOUR_DASHBOARD_URL:          request.dashboard_url,
      YOUR_COMPANY_NAME:           request.company_name ?? '',
      YOUR_NAME:                   request.sender_name ?? '',
      YOUR_UNSUBSCRIBE_REDIRECT_URL: request.unsubscribe_redirect_url ?? request.dashboard_url,

      YOUR_RELEVANCE_AI_AUTH_TOKEN: request.relevance_ai_auth_token ?? '',
      YOUR_RELEVANCE_AI_BASE_URL:   request.relevance_ai_base_url ?? '',
      YOUR_RELEVANCE_AI_STUDIO_ID:  request.relevance_ai_studio_id ?? '',
      YOUR_RELEVANCE_AI_PROJECT_ID: request.relevance_ai_project_id ?? '',

      // Merge any caller-supplied extras
      ...(request.extra_placeholders ?? {}),
    };

    // Sort keys longest-first so longer tokens are replaced before shorter prefixes
    // (avoids YOUR_CREDENTIAL_GMAIL_ID being partially matched by YOUR_CREDENTIAL_G...)
    const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);

    let result = json;
    for (const key of sortedKeys) {
      const value = map[key];
      if (value === '') continue; // leave unresolved placeholders intact if no value
      // Escape key for use inside a RegExp (dots etc.)
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), value);
    }

    return result;
  }

  /**
   * Update SMTP credentials in Sidecar environment
   * (Used when provider = smtp)
   */
  async updateSMTPEnvironment(config: EmailProviderConfig): Promise<void> {
    if (config.provider !== 'smtp') {
      return;
    }

    console.log('\n📧 Updating Sidecar SMTP environment variables...');
    
    // Update process.env (for current runtime)
    process.env.SMTP_HOST = config.smtp_host || '';
    process.env.SMTP_PORT = config.smtp_port?.toString() || '587';
    process.env.SMTP_USER = config.smtp_username || '';
    process.env.SMTP_PASS = config.smtp_password || '';
    process.env.SMTP_SECURE = (config.smtp_encryption === 'ssl').toString();
    process.env.SMTP_FROM_EMAIL = config.from_email || '';
    process.env.SMTP_FROM_NAME = config.from_name || '';
    
    console.log('  ✅ SMTP environment updated');
    console.log(`  - Host: ${config.smtp_host}`);
    console.log(`  - Port: ${config.smtp_port}`);
    console.log(`  - From: ${config.from_name} <${config.from_email}>`);
  }
}
