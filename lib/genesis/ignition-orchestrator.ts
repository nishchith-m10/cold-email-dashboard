/**
 * PHASE 41: IGNITION ORCHESTRATOR
 * 
 * Coordinates the complete workspace provisioning process:
 * 1. Create database partition (Phase 40)
 * 2. Provision DigitalOcean droplet (Phase 50)
 * 3. Wait for Sidecar handshake (Phase 42 - prepared for)
 * 4. Inject credentials via Sidecar (Phase 51)
 * 5. Deploy workflows with UUID mapping (Phase 53)
 * 6. Activate workflows
 * 
 * Features:
 * - Atomic rollback on failure
 * - Step-by-step progress tracking
 * - Comprehensive error handling
 * - Integration with BullMQ for async processing (Phase 52)
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 41
 */

import fs from 'fs';
import path from 'path';

import {
  IgnitionConfig,
  IgnitionState,
  IgnitionResult,
  IgnitionStatus,
  IgnitionError,
  RollbackResult,
  CreatedResources,
  IgnitionProgressCallback,
  STEP_TIMEOUTS,
  DEFAULT_TEMPLATES,
} from './ignition-types';

import { CredentialVault } from './credential-vault';

// ============================================
// TEMPLATE FILE NAME MAP
// Maps template_name → { gmail: string, smtp?: string }
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
// STATE PERSISTENCE INTERFACE
// ============================================

/**
 * Interface for persisting ignition state.
 */
export interface IgnitionStateDB {
  save(state: IgnitionState): Promise<void>;
  load(workspaceId: string): Promise<IgnitionState | null>;
  delete(workspaceId: string): Promise<void>;
  logOperation(operation: {
    workspace_id: string;
    operation: string;
    status: string;
    result?: unknown;
    error?: string;
  }): Promise<void>;
}

/**
 * In-memory state storage for testing.
 */
export class MockIgnitionStateDB implements IgnitionStateDB {
  private states: Map<string, IgnitionState> = new Map();
  private operations: Array<any> = [];

  async save(state: IgnitionState): Promise<void> {
    this.states.set(state.workspace_id, { ...state });
  }

  async load(workspaceId: string): Promise<IgnitionState | null> {
    const state = this.states.get(workspaceId);
    return state ? { ...state } : null;
  }

  async delete(workspaceId: string): Promise<void> {
    this.states.delete(workspaceId);
  }

  async logOperation(operation: {
    workspace_id: string;
    operation: string;
    status: string;
    result?: unknown;
    error?: string;
  }): Promise<void> {
    this.operations.push({ ...operation, created_at: new Date().toISOString() });
  }

  getOperations(workspaceId: string): Array<any> {
    return this.operations.filter(op => op.workspace_id === workspaceId);
  }
}

// ============================================
// STEP EXECUTORS (Integration Points)
// ============================================

/**
 * Integration interface for partition management (Phase 40).
 */
export interface PartitionManager {
  create(workspaceId: string, workspaceSlug: string): Promise<{
    success: boolean;
    partition_name?: string;
    error?: string;
  }>;
  drop(workspaceId: string): Promise<{ success: boolean }>;
}

/**
 * Integration interface for droplet provisioning (Phase 50).
 */
export interface DropletFactory {
  provision(config: {
    workspace_id: string;
    workspace_slug: string;
    region: string;
    size_slug: string;
  }): Promise<{
    success: boolean;
    droplet_id?: string;
    ip_address?: string;
    error?: string;
  }>;
  terminate(dropletId: string): Promise<{ success: boolean }>;
}

/**
 * Integration interface for Sidecar client (Phase 51).
 */
export interface SidecarClient {
  sendCommand(dropletIp: string, command: {
    action: string;
    payload: unknown;
  }): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
}

/**
 * Integration interface for workflow deployment (Phase 53).
 */
export interface WorkflowDeployer {
  deploy(dropletIp: string, workflow: {
    name: string;
    json: Record<string, unknown>;
    credential_map: Record<string, string>;
    variable_map: Record<string, string>;
  }): Promise<{
    success: boolean;
    workflow_id?: string;
    error?: string;
  }>;
  activate(dropletIp: string, workflowId: string): Promise<{ success: boolean }>;
}

// ============================================
// IGNITION ORCHESTRATOR CLASS
// ============================================

/**
 * Orchestrates the complete workspace provisioning process.
 * 
 * State machine implementation with atomic rollback on failure.
 */
export class IgnitionOrchestrator {
  private stateDB: IgnitionStateDB;
  private credentialVault: CredentialVault;
  private partitionManager: PartitionManager;
  private dropletFactory: DropletFactory;
  private sidecarClient: SidecarClient;
  private workflowDeployer: WorkflowDeployer;
  private progressCallback?: IgnitionProgressCallback;
  private handshakeDelayMs: number;
  private templateDir: string;
  private cancellationFlags: Map<string, boolean> = new Map();

  constructor(
    stateDB: IgnitionStateDB,
    credentialVault: CredentialVault,
    partitionManager: PartitionManager,
    dropletFactory: DropletFactory,
    sidecarClient: SidecarClient,
    workflowDeployer: WorkflowDeployer,
    options?: { handshakeDelayMs?: number; templateDir?: string }
  ) {
    this.stateDB = stateDB;
    this.credentialVault = credentialVault;
    this.partitionManager = partitionManager;
    this.dropletFactory = dropletFactory;
    this.sidecarClient = sidecarClient;
    this.workflowDeployer = workflowDeployer;
    this.handshakeDelayMs = options?.handshakeDelayMs ?? 5000;
    // Default to <project-root>/base-cold-email (bundled with the app)
    this.templateDir = options?.templateDir ?? path.join(process.cwd(), 'base-cold-email');
  }

  /**
   * Load a workflow template JSON from disk.
   * Selects the SMTP variant when the workspace uses SMTP credentials.
   */
  private loadTemplateJson(
    templateName: string,
    emailProvider: 'gmail' | 'smtp'
  ): Record<string, unknown> {
    const fileMap = TEMPLATE_FILE_MAP[templateName];
    if (!fileMap) {
      throw new Error(`Unknown template: ${templateName}. Add it to TEMPLATE_FILE_MAP.`);
    }

    const fileName =
      emailProvider === 'smtp' && fileMap.smtp ? fileMap.smtp : fileMap.gmail;

    const filePath = path.join(this.templateDir, fileName);

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

  /**
   * Set progress callback for real-time updates.
   */
  setProgressCallback(callback: IgnitionProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Main ignition method - provisions complete Sovereign Stack.
   *
   * Idempotency guard (D1-006):
   *   - If the workspace is already `active`, return early success.
   *   - If an ignition is in-progress, reject to prevent double-provisioning.
   *   - If the previous attempt `failed`, clear old state and retry.
   */
  async ignite(config: IgnitionConfig): Promise<IgnitionResult> {
    const startTime = Date.now();

    // ── Idempotency guard ─────────────────────────────────────────────
    const existing = await this.stateDB.load(config.workspace_id);

    if (existing) {
      // Already fully provisioned – nothing to do.
      if (existing.status === 'active') {
        await this.stateDB.logOperation({
          workspace_id: config.workspace_id,
          operation: 'ignite',
          status: 'skipped',
          result: { reason: 'already_active' },
        });
        return {
          success: true,
          workspace_id: config.workspace_id,
          partition_name: existing.partition_name,
          droplet_id: existing.droplet_id,
          droplet_ip: existing.droplet_ip,
          workflow_ids: existing.workflow_ids,
          credential_count: existing.credential_ids.length,
          duration_ms: Date.now() - startTime,
          steps_completed: existing.total_steps,
        };
      }

      // Another ignition (or rollback) is still running – reject.
      const inProgressStatuses: IgnitionStatus[] = [
        'pending',
        'partition_creating',
        'droplet_provisioning',
        'handshake_pending',
        'credentials_injecting',
        'workflows_deploying',
        'activating',
        'rollback_in_progress',
      ];
      if (inProgressStatuses.includes(existing.status)) {
        await this.stateDB.logOperation({
          workspace_id: config.workspace_id,
          operation: 'ignite',
          status: 'rejected',
          result: { reason: 'in_progress', current_status: existing.status },
        });
        return {
          success: false,
          workspace_id: config.workspace_id,
          duration_ms: Date.now() - startTime,
          steps_completed: existing.current_step,
          error: `Ignition already in progress (status: ${existing.status})`,
          error_step: existing.status,
        };
      }

      // Previous attempt failed – clean up and allow retry.
      if (existing.status === 'failed') {
        await this.stateDB.logOperation({
          workspace_id: config.workspace_id,
          operation: 'ignite',
          status: 'retrying',
          result: { reason: 'previous_failed', previous_error: existing.error_message },
        });
        await this.stateDB.delete(config.workspace_id);
      }
    }
    // ── End idempotency guard ─────────────────────────────────────────

    // Initialize state
    const state: IgnitionState = {
      workspace_id: config.workspace_id,
      status: 'pending',
      current_step: 0,
      total_steps: 6,
      workflow_ids: [],
      credential_ids: [],
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      requested_by: config.requested_by,
      region: config.region,
      droplet_size: config.droplet_size,
    };

    await this.saveState(state);
    this.emitEvent({ type: 'started', workspace_id: config.workspace_id });

    // Clear any previous cancellation flag
    this.cancellationFlags.delete(config.workspace_id);

    const resources: CreatedResources = {
      credential_ids: [],
      workflow_ids: [],
      n8n_credential_ids: [],
    };

    try {
      // STEP 1: Create partition
      this.checkCancellation(config.workspace_id);
      await this.executeStep(
        state,
        'partition_creating',
        1,
        async () => {
          const result = await this.partitionManager.create(
            config.workspace_id,
            config.workspace_slug
          );

          if (!result.success) {
            throw new IgnitionError(
              result.error || 'Partition creation failed',
              'partition_creating',
              config.workspace_id
            );
          }

          resources.partition_name = result.partition_name;
          state.partition_name = result.partition_name;
        }
      );

      // STEP 2: Provision droplet (or use local mode)
      this.checkCancellation(config.workspace_id);
      await this.executeStep(
        state,
        'droplet_provisioning',
        2,
        async () => {
          const isLocalMode = config.local_mode === true
            || process.env.LOCAL_MODE === 'true';

          if (isLocalMode) {
            // LOCAL MODE: skip DigitalOcean API call, use a manually-supplied IP.
            // Useful for beta testing without spending DO API quota.
            // Spin up n8n locally: docker run -p 5678:5678 n8nio/n8n
            const localIp = config.local_n8n_ip
              || process.env.LOCAL_N8N_IP
              || '127.0.0.1';
            console.warn(
              `[Ignition] LOCAL_MODE enabled — skipping DigitalOcean provisioning.` +
              ` Using local n8n at ${localIp}`
            );
            state.droplet_id = 'local';
            state.droplet_ip = localIp;
            return;
          }

          const result = await this.dropletFactory.provision({
            workspace_id: config.workspace_id,
            workspace_slug: config.workspace_slug,
            region: config.region,
            size_slug: config.droplet_size,
          });

          if (!result.success) {
            throw new IgnitionError(
              result.error || 'Droplet provisioning failed',
              'droplet_provisioning',
              config.workspace_id
            );
          }

          resources.droplet_id = result.droplet_id;
          state.droplet_id = result.droplet_id;
          state.droplet_ip = result.ip_address;
        }
      );

      // STEP 3: Wait for Sidecar health check
      this.checkCancellation(config.workspace_id);
      await this.executeStep(
        state,
        'handshake_pending',
        3,
        async () => {
          const sidecarUrl = state.droplet_ip
            ? `http://${state.droplet_ip}:3001`
            : undefined;

          if (!sidecarUrl) {
            throw new IgnitionError(
              'No droplet IP available for health check',
              'handshake_pending',
              config.workspace_id
            );
          }

          const isLocal = config.local_mode || process.env.LOCAL_MODE === 'true';
          const pollIntervalMs = isLocal ? 1000 : 5000;
          const maxWaitMs = isLocal ? 30000 : (STEP_TIMEOUTS.handshake_pending || 300000);
          const started = Date.now();
          let healthy = false;

          while (Date.now() - started < maxWaitMs) {
            this.checkCancellation(config.workspace_id);
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const resp = await fetch(`${sidecarUrl}/health`, {
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              if (resp.ok) {
                const body = await resp.json() as { status?: string };
                if (body.status === 'ok') {
                  healthy = true;
                  break;
                }
              }
            } catch {
              // Sidecar not ready yet — continue polling
            }

            this.emitEvent({
              type: 'step_progress',
              workspace_id: config.workspace_id,
              step: 'handshake_pending',
              message: `Waiting for Sidecar... (${Math.round((Date.now() - started) / 1000)}s)`,
            });

            await this.sleep(pollIntervalMs);
          }

          if (!healthy) {
            throw new IgnitionError(
              `Sidecar did not become healthy within ${Math.round(maxWaitMs / 1000)}s`,
              'handshake_pending',
              config.workspace_id
            );
          }

          state.webhook_url = `https://${state.droplet_ip}.sslip.io/webhook`;
        }
      );

      // STEP 4: Inject credentials
      this.checkCancellation(config.workspace_id);
      await this.executeStep(
        state,
        'credentials_injecting',
        4,
        async () => {
          for (const cred of config.credentials) {
            // Store in vault
            const storeResult = await this.credentialVault.store(
              config.workspace_id,
              cred,
              config.requested_by
            );

            if (!storeResult.success) {
              throw new IgnitionError(
                storeResult.error || 'Credential storage failed',
                'credentials_injecting',
                config.workspace_id
              );
            }

            resources.credential_ids.push(storeResult.credential_id!);
            state.credential_ids.push(storeResult.credential_id!);

            // Send to Sidecar
            if (state.droplet_ip) {
              const injectResult = await this.sidecarClient.sendCommand(
                state.droplet_ip,
                {
                  action: 'INJECT_CREDENTIAL',
                  payload: {
                    credential_type: cred.type,
                    credential_name: cred.name,
                    encrypted_data: cred.data,
                  },
                }
              );

              if (!injectResult.success) {
                throw new IgnitionError(
                  injectResult.error || 'Sidecar credential injection failed',
                  'credentials_injecting',
                  config.workspace_id
                );
              }

              if (injectResult.result) {
                // Track n8n credential ID
                const n8nCredId = (injectResult.result as any).credential_id;
                resources.n8n_credential_ids.push(n8nCredId);
              }
            }
          }
        }
      );

      // STEP 5: Deploy workflows
      this.checkCancellation(config.workspace_id);
      await this.executeStep(
        state,
        'workflows_deploying',
        5,
        async () => {
          const templates = config.workflow_templates
            ? DEFAULT_TEMPLATES.filter(t => config.workflow_templates!.includes(t.template_name))
            : DEFAULT_TEMPLATES;

          // Detect email provider from injected credentials
          const emailProvider: 'gmail' | 'smtp' = config.credentials.some(
            c => c.type === 'smtp'
          ) ? 'smtp' : 'gmail';

          for (const template of templates) {
            if (!state.droplet_ip) {
              throw new IgnitionError(
                'Droplet IP not available',
                'workflows_deploying',
                config.workspace_id
              );
            }

            // Load the raw template JSON from disk
            const templateJson = this.loadTemplateJson(template.template_name, emailProvider);

            // Build variable map
            // ---------------------------------------------------------------
            // Precedence (lowest → highest):
            //  1. Derived defaults (workspace identity, droplet URLs, env keys)
            //  2. config.variables — caller-supplied overrides (highest priority)
            //
            // Callers MUST include in config.variables:
            //   YOUR_SENDER_EMAIL   — the Gmail/SMTP address for this workspace
            //   YOUR_TEST_EMAIL     — (optional) sandbox test recipient
            //   YOUR_COMPANY_NAME   — if different from workspace_name
            // ---------------------------------------------------------------
            // Determine instance URL — for LOCAL_MODE, use http://localhost:port
            const isLocalMode = config.local_mode === true || process.env.LOCAL_MODE === 'true';
            const instanceBase = isLocalMode
              ? `http://${state.droplet_ip}:5678`
              : `https://${state.droplet_ip}.sslip.io`;

            const variableMap: Record<string, string> = {
              // Workspace identity
              YOUR_WORKSPACE_ID:   config.workspace_id,
              YOUR_WORKSPACE_SLUG: config.workspace_slug,
              YOUR_WORKSPACE_NAME: config.workspace_name,
              YOUR_COMPANY_NAME:   config.workspace_name, // overridable via config.variables
              YOUR_NAME:           config.workspace_name, // used in n8n credential display names

              // Campaign group — used to tag events and attribute LLM costs per campaign
              YOUR_CAMPAIGN_GROUP_ID:   config.campaign_group_id ?? config.workspace_id,
              YOUR_CAMPAIGN_NAME:       config.campaign_group_name ?? config.workspace_name,

              // Database routing — resolves to this tenant's Supabase partition
              YOUR_LEADS_TABLE: `genesis.leads_p_${config.workspace_slug}`,

              // Per-droplet / instance URLs
              YOUR_N8N_INSTANCE_URL:         instanceBase,
              YOUR_UNSUBSCRIBE_REDIRECT_URL: `${instanceBase}/webhook/opt-out`,

              // Dashboard callback URLs
              YOUR_DASHBOARD_URL: process.env.NEXT_PUBLIC_APP_URL
                || process.env.BASE_URL
                || '',

              // Operator-level secrets (shared across all tenants, from env)
              YOUR_WEBHOOK_TOKEN:           process.env.DASH_WEBHOOK_TOKEN || '',
              YOUR_RELEVANCE_AI_AUTH_TOKEN: process.env.RELEVANCE_AI_API_KEY
                || process.env.RELEVANCE_API_KEY
                || '',
              YOUR_RELEVANCE_AI_BASE_URL:   process.env.RELEVANCE_AI_BASE_URL
                || 'https://api-d7b62b.stack.tryrelevance.com',
              YOUR_RELEVANCE_AI_PROJECT_ID: process.env.RELEVANCE_AI_PROJECT_ID
                || process.env.RELEVANCE_API_REGION
                || '',
              YOUR_RELEVANCE_AI_STUDIO_ID:  process.env.RELEVANCE_AI_STUDIO_ID || '',

              // Google Custom Search Engine
              YOUR_GOOGLE_CSE_API_KEY: process.env.GOOGLE_CSE_API_KEY || '',
              YOUR_GOOGLE_CSE_CX:      process.env.GOOGLE_CSE_CX || '',

              // Apify
              YOUR_APIFY_API_TOKEN: process.env.APIFY_API_KEY || '',

              // Workspace-specific defaults (caller should override these via config.variables)
              YOUR_SENDER_EMAIL: '',
              YOUR_TEST_EMAIL:   '',

              // Calendly links — workspace-specific, must be passed via config.variables
              YOUR_CALENDLY_LINK_1: '',
              YOUR_CALENDLY_LINK_2: '',

              // Caller overrides — MUST come last (highest priority)
              ...config.variables,
            };

            // Populate credential ID placeholders from n8n-assigned UUIDs.
            // Each credential in config.credentials may declare a template_placeholder
            // matching YOUR_CREDENTIAL_*_ID in the template JSON. After the sidecar
            // creates the credential in n8n, we get back the real n8n UUID and map it here.
            for (let i = 0; i < config.credentials.length; i++) {
              const cred = config.credentials[i];
              const n8nId = resources.n8n_credential_ids[i];
              if (cred.template_placeholder && n8nId) {
                variableMap[cred.template_placeholder] = n8nId;
              }
            }

            // Guard: sender email is required for all email workflows
            if (!variableMap.YOUR_SENDER_EMAIL) {
              throw new IgnitionError(
                'YOUR_SENDER_EMAIL must be provided in config.variables. ' +
                'Pass the workspace Gmail/SMTP address before calling ignite().',
                'workflows_deploying',
                config.workspace_id
              );
            }

            // credential_map is now populated in variableMap above.
            // Pass an empty map here so the deployer doesn't double-replace.
            const credentialMap: Record<string, string> = {};

            // Deploy workflow
            const deployResult = await this.workflowDeployer.deploy(
              state.droplet_ip,
              {
                name: `[${config.workspace_name}] ${template.display_name}`,
                json: templateJson,
                credential_map: credentialMap,
                variable_map: variableMap,
              }
            );

            if (!deployResult.success) {
              throw new IgnitionError(
                deployResult.error || 'Workflow deployment failed',
                'workflows_deploying',
                config.workspace_id
              );
            }

            resources.workflow_ids.push(deployResult.workflow_id!);
            state.workflow_ids.push(deployResult.workflow_id!);
          }
        }
      );

      // STEP 6: Activate workflows
      if (!config.skip_activation) {
        this.checkCancellation(config.workspace_id);
        await this.executeStep(
          state,
          'activating',
          6,
          async () => {
            if (!state.droplet_ip) {
              throw new IgnitionError(
                'Droplet IP not available',
                'activating',
                config.workspace_id
              );
            }

            for (const workflowId of resources.workflow_ids) {
              const activateResult = await this.workflowDeployer.activate(
                state.droplet_ip,
                workflowId
              );

              if (!activateResult.success) {
                throw new IgnitionError(
                  'Workflow activation failed',
                  'activating',
                  config.workspace_id
                );
              }
            }
          }
        );
      }

      // SUCCESS
      state.status = 'active';
      state.completed_at = new Date().toISOString();
      await this.saveState(state);

      const result: IgnitionResult = {
        success: true,
        workspace_id: config.workspace_id,
        partition_name: resources.partition_name,
        droplet_id: resources.droplet_id,
        droplet_ip: state.droplet_ip,
        workflow_ids: resources.workflow_ids,
        credential_count: resources.credential_ids.length,
        duration_ms: Date.now() - startTime,
        steps_completed: state.current_step,
      };

      this.emitEvent({ type: 'completed', workspace_id: config.workspace_id, result });

      return result;
    } catch (error) {
      // ROLLBACK
      state.status = 'rollback_in_progress';
      state.error_message = error instanceof Error ? error.message : 'Unknown error';
      state.error_step = error instanceof IgnitionError ? error.step : 'unknown';
      state.rollback_started_at = new Date().toISOString();
      await this.saveState(state);

      this.emitEvent({
        type: 'rollback_started',
        workspace_id: config.workspace_id,
        reason: state.error_message,
      });

      const rollbackResult = await this.rollback(config.workspace_id, resources);

      state.rollback_completed_at = new Date().toISOString();
      state.rollback_success = rollbackResult.success;
      state.status = 'failed';
      state.completed_at = new Date().toISOString();
      await this.saveState(state);

      this.emitEvent({
        type: 'rollback_completed',
        workspace_id: config.workspace_id,
        success: rollbackResult.success,
      });

      this.emitEvent({
        type: 'failed',
        workspace_id: config.workspace_id,
        error: state.error_message,
      });

      return {
        success: false,
        workspace_id: config.workspace_id,
        duration_ms: Date.now() - startTime,
        steps_completed: Math.max(0, state.current_step - 1), // Last COMPLETED step, not failed step
        error: state.error_message,
        error_step: state.error_step,
        rollback_performed: true,
      };
    }
  }

  /**
   * Execute a single step with timeout and error handling.
   */
  private async executeStep(
    state: IgnitionState,
    status: IgnitionStatus,
    stepNumber: number,
    executor: () => Promise<void>
  ): Promise<void> {
    const stepStart = Date.now();

    state.status = status;
    state.current_step = stepNumber;
    state.updated_at = new Date().toISOString();
    await this.saveState(state);

    this.emitEvent({
      type: 'step_started',
      workspace_id: state.workspace_id,
      step: status,
      step_number: stepNumber,
    });

    await this.stateDB.logOperation({
      workspace_id: state.workspace_id,
      operation: status,
      status: 'running',
    });

    try {
      // Execute with timeout
      const timeout = STEP_TIMEOUTS[status] || 60000;
      await this.withTimeout(executor(), timeout, `Step ${status} timed out`);

      const duration = Date.now() - stepStart;

      await this.stateDB.logOperation({
        workspace_id: state.workspace_id,
        operation: status,
        status: 'completed',
        result: { duration_ms: duration },
      });

      this.emitEvent({
        type: 'step_completed',
        workspace_id: state.workspace_id,
        step: status,
        duration_ms: duration,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.stateDB.logOperation({
        workspace_id: state.workspace_id,
        operation: status,
        status: 'failed',
        error: message,
      });

      this.emitEvent({
        type: 'step_failed',
        workspace_id: state.workspace_id,
        step: status,
        error: message,
      });

      // Re-throw as IgnitionError to preserve step context
      if (error instanceof IgnitionError) {
        throw error;
      } else {
        throw new IgnitionError(message, status, state.workspace_id, error as Error);
      }
    }
  }

  /**
   * Atomic rollback of all created resources.
   */
  private async rollback(
    workspaceId: string,
    resources: CreatedResources
  ): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: true,
      rolled_back: {
        partition: false,
        droplet: false,
        credentials: 0,
        workflows: 0,
      },
      errors: [],
    };

    // Rollback workflows (reverse order)
    for (const workflowId of resources.workflow_ids.reverse()) {
      try {
        // Workflows are on the droplet - if droplet is deleted, workflows go with it
        result.rolled_back.workflows++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Workflow ${workflowId}: ${message}`);
        result.success = false;
      }
    }

    // Rollback credentials
    for (const credentialId of resources.credential_ids) {
      try {
        await this.credentialVault.delete(workspaceId, credentialId);
        result.rolled_back.credentials++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Credential ${credentialId}: ${message}`);
        result.success = false;
      }
    }

    // Rollback droplet
    if (resources.droplet_id) {
      try {
        await this.dropletFactory.terminate(resources.droplet_id);
        result.rolled_back.droplet = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Droplet ${resources.droplet_id}: ${message}`);
        result.success = false;
      }
    }

    // Rollback partition
    if (resources.partition_name) {
      try {
        await this.partitionManager.drop(workspaceId);
        result.rolled_back.partition = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Partition ${resources.partition_name}: ${message}`);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Get ignition state for a workspace.
   */
  async getState(workspaceId: string): Promise<IgnitionState | null> {
    return this.stateDB.load(workspaceId);
  }

  /**
   * Cancel an in-progress ignition.
   */
  async cancel(workspaceId: string): Promise<{ success: boolean; error?: string }> {
    const state = await this.stateDB.load(workspaceId);

    if (!state) {
      return { success: false, error: 'Ignition not found' };
    }

    if (state.status === 'active' || state.status === 'failed') {
      return { success: false, error: 'Ignition already completed' };
    }

    // Set cancellation flag - will be checked before each step
    this.cancellationFlags.set(workspaceId, true);

    return { success: true };
  }

  /**
   * Check if ignition has been cancelled.
   */
  private checkCancellation(workspaceId: string): void {
    if (this.cancellationFlags.get(workspaceId)) {
      throw new IgnitionError(
        'Cancelled by user',
        'pending', // Will be overridden by current step
        workspaceId
      );
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async saveState(state: IgnitionState): Promise<void> {
    state.updated_at = new Date().toISOString();
    await this.stateDB.save(state);
  }

  private emitEvent(event: Parameters<IgnitionProgressCallback>[0]): void {
    if (this.progressCallback) {
      try {
        this.progressCallback(event);
      } catch (error) {
        console.error('[Orchestrator] Progress callback error:', error);
      }
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// MOCK IMPLEMENTATIONS FOR TESTING
// ============================================

/**
 * Mock partition manager.
 */
export class MockPartitionManager implements PartitionManager {
  async create(workspaceId: string, workspaceSlug: string): Promise<{
    success: boolean;
    partition_name?: string;
    error?: string;
  }> {
    return {
      success: true,
      partition_name: `genesis.leads_p_${workspaceSlug}`,
    };
  }

  async drop(workspaceId: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}

/**
 * Mock droplet factory.
 */
export class MockDropletFactory implements DropletFactory {
  async provision(config: any): Promise<{
    success: boolean;
    droplet_id?: string;
    ip_address?: string;
    error?: string;
  }> {
    return {
      success: true,
      droplet_id: `droplet-${config.workspace_slug}`,
      ip_address: '10.0.0.1',
    };
  }

  async terminate(dropletId: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}

/**
 * Mock Sidecar client.
 */
export class MockSidecarClient implements SidecarClient {
  async sendCommand(dropletIp: string, command: any): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
    return {
      success: true,
      result: { credential_id: `n8n-cred-${Date.now()}` },
    };
  }
}

// ============================================
// REAL WORKFLOW DEPLOYER
// ============================================

/**
 * Production workflow deployer.
 *
 * Applies the variable map (incl. credential ID placeholders) to the workflow
 * JSON client-side, then sends the substituted payload to the Sidecar via
 * DEPLOY_WORKFLOW / ACTIVATE_WORKFLOW commands.
 *
 * Substitution is a simple global string-replace over the JSON string so it
 * correctly handles values inside strings, node parameters, etc.
 */
export class HttpWorkflowDeployer implements WorkflowDeployer {
  constructor(private sidecarClient: SidecarClient) {}

  async deploy(
    dropletIp: string,
    workflow: {
      name: string;
      json: Record<string, unknown>;
      credential_map: Record<string, string>;
      variable_map: Record<string, string>;
    }
  ): Promise<{ success: boolean; workflow_id?: string; error?: string }> {
    // Merge credential_map into variable_map for a single-pass substitution
    const allSubstitutions: Record<string, string> = {
      ...workflow.variable_map,
      ...workflow.credential_map,
    };

    // Apply substitutions to the full JSON string
    let jsonStr = JSON.stringify(workflow.json);
    for (const [placeholder, value] of Object.entries(allSubstitutions)) {
      // Escape regex special chars in placeholder, then replace globally
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      jsonStr = jsonStr.replace(new RegExp(escaped, 'g'), value);
    }

    const substitutedJson: Record<string, unknown> = JSON.parse(jsonStr);
    // Set canonical workflow name from orchestrator
    substitutedJson.name = workflow.name;

    const result = await this.sidecarClient.sendCommand(dropletIp, {
      action: 'DEPLOY_WORKFLOW',
      payload: { workflow_json: substitutedJson },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const workflowId = (result.result as any)?.id
      || (result.result as any)?.workflow_id;

    return { success: true, workflow_id: workflowId };
  }

  async activate(
    dropletIp: string,
    workflowId: string
  ): Promise<{ success: boolean }> {
    const result = await this.sidecarClient.sendCommand(dropletIp, {
      action: 'ACTIVATE_WORKFLOW',
      payload: { workflow_id: workflowId },
    });
    return { success: result.success };
  }
}

/**
 * Mock workflow deployer.
 */
export class MockWorkflowDeployer implements WorkflowDeployer {
  async deploy(dropletIp: string, workflow: any): Promise<{
    success: boolean;
    workflow_id?: string;
    error?: string;
  }> {
    return {
      success: true,
      workflow_id: `wf-${workflow.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
    };
  }

  async activate(dropletIp: string, workflowId: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}
