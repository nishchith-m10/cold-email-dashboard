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
  private cancellationFlags: Map<string, boolean> = new Map();

  constructor(
    stateDB: IgnitionStateDB,
    credentialVault: CredentialVault,
    partitionManager: PartitionManager,
    dropletFactory: DropletFactory,
    sidecarClient: SidecarClient,
    workflowDeployer: WorkflowDeployer,
    options?: { handshakeDelayMs?: number }
  ) {
    this.stateDB = stateDB;
    this.credentialVault = credentialVault;
    this.partitionManager = partitionManager;
    this.dropletFactory = dropletFactory;
    this.sidecarClient = sidecarClient;
    this.workflowDeployer = workflowDeployer;
    this.handshakeDelayMs = options?.handshakeDelayMs ?? 5000;
  }

  /**
   * Set progress callback for real-time updates.
   */
  setProgressCallback(callback: IgnitionProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Main ignition method - provisions complete Sovereign Stack.
   */
  async ignite(config: IgnitionConfig): Promise<IgnitionResult> {
    const startTime = Date.now();

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

      // STEP 2: Provision droplet
      this.checkCancellation(config.workspace_id);
      await this.executeStep(
        state,
        'droplet_provisioning',
        2,
        async () => {
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

      // STEP 3: Wait for handshake (Phase 42 - placeholder for now)
      this.checkCancellation(config.workspace_id);
      await this.executeStep(
        state,
        'handshake_pending',
        3,
        async () => {
          // In Phase 42, we'll implement the actual handshake wait
          // For now, we assume the Sidecar will be ready after boot
          if (this.handshakeDelayMs > 0) {
            await this.sleep(this.handshakeDelayMs);
          }
          
          // Mock webhook URL (Phase 42 will provide actual URL)
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

          for (const template of templates) {
            if (!state.droplet_ip) {
              throw new IgnitionError(
                'Droplet IP not available',
                'workflows_deploying',
                config.workspace_id
              );
            }

            // Build variable map
            const variableMap = {
              YOUR_WORKSPACE_ID: config.workspace_id,
              YOUR_WORKSPACE_SLUG: config.workspace_slug,
              YOUR_WORKSPACE_NAME: config.workspace_name,
              YOUR_LEADS_TABLE: `genesis.leads_p_${config.workspace_slug}`,
              ...config.variables,
            };

            // Build credential map (template placeholder → n8n UUID)
            const credentialMap: Record<string, string> = {};
            for (let i = 0; i < config.credentials.length; i++) {
              const cred = config.credentials[i];
              if (cred.template_placeholder && resources.n8n_credential_ids[i]) {
                credentialMap[cred.template_placeholder] = resources.n8n_credential_ids[i];
              }
            }

            // Deploy workflow
            const deployResult = await this.workflowDeployer.deploy(
              state.droplet_ip,
              {
                name: `[${config.workspace_name}] ${template.display_name}`,
                json: {}, // Would load actual template JSON
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
