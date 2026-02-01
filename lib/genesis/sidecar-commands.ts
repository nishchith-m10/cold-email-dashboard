/**
 * SIDECAR COMMANDS - Dashboard → Sidecar Communication
 * 
 * Implements command generation with JWT signing for Zero-Trust security.
 * All commands to Sidecar agents must be signed with Dashboard's private key.
 */

import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// COMMAND TYPES
// ============================================

export type SidecarCommand =
  | 'HEALTH_CHECK'
  | 'DEPLOY_WORKFLOW'
  | 'UPDATE_WORKFLOW'
  | 'ACTIVATE_WORKFLOW'
  | 'DEACTIVATE_WORKFLOW'
  | 'DELETE_WORKFLOW'
  | 'INJECT_CREDENTIAL'
  | 'ROTATE_CREDENTIAL'
  | 'RESTART_N8N'
  | 'PULL_IMAGE'
  | 'SWAP_CONTAINER'
  | 'GET_LOGS'
  | 'COLLECT_METRICS';

// ============================================
// COMMAND PAYLOADS
// ============================================

export interface HealthCheckPayload {}

export interface DeployWorkflowPayload {
  workflow_json: any;
  credential_map?: Record<string, string>;
}

export interface UpdateWorkflowPayload {
  workflow_id: string;
  workflow_json: any;
}

export interface ActivateWorkflowPayload {
  workflow_id: string;
}

export interface DeactivateWorkflowPayload {
  workflow_id: string;
}

export interface DeleteWorkflowPayload {
  workflow_id: string;
}

export interface InjectCredentialPayload {
  credential_type: string;
  credential_name: string;
  encrypted_data: any;
}

export interface RotateCredentialPayload {
  credential_id: string;
  encrypted_data: any;
}

export interface RestartN8nPayload {}

export interface PullImagePayload {
  image_name: string;
  tag: string;
}

export interface SwapContainerPayload {
  new_image_tag: string;
}

export interface GetLogsPayload {
  lines?: number;
  since?: string;
}

export interface CollectMetricsPayload {
  since?: string;
}

export type CommandPayload =
  | HealthCheckPayload
  | DeployWorkflowPayload
  | UpdateWorkflowPayload
  | ActivateWorkflowPayload
  | DeactivateWorkflowPayload
  | DeleteWorkflowPayload
  | InjectCredentialPayload
  | RotateCredentialPayload
  | RestartN8nPayload
  | PullImagePayload
  | SwapContainerPayload
  | GetLogsPayload
  | CollectMetricsPayload;

// ============================================
// JWT PAYLOAD
// ============================================

export interface SidecarJWTPayload {
  iss: string;           // "genesis-dashboard"
  sub: string;           // workspace_uuid
  aud: string;           // "sidecar"
  iat: number;           // Issued at timestamp
  exp: number;           // Expiry timestamp (5 min from iat)
  jti: string;           // Unique request ID (for replay prevention)
  action: SidecarCommand; // Command action
  droplet_id: string;    // Target droplet ID
}

// ============================================
// COMMAND REQUEST
// ============================================

export interface SidecarCommandRequest {
  action: SidecarCommand;
  payload?: CommandPayload;
}

export interface SidecarCommandResponse {
  success: boolean;
  result?: any;
  error?: string;
  execution_time_ms: number;
}

// ============================================
// JWT SIGNER
// ============================================

export class JWTSigner {
  private privateKey: string;

  constructor(privateKey: string) {
    this.privateKey = privateKey;
  }

  /**
   * Generate signed JWT for Sidecar command
   */
  generateCommandJWT(
    workspaceId: string,
    dropletId: string,
    action: SidecarCommand
  ): string {
    const now = Math.floor(Date.now() / 1000);

    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: workspaceId,
      aud: 'sidecar',
      iat: now,
      exp: now + 300, // 5 minutes
      jti: uuidv4(),
      action,
      droplet_id: dropletId,
    };

    return this.signJWT(payload);
  }

  /**
   * Sign JWT with RS256
   */
  private signJWT(payload: SidecarJWTPayload): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${headerB64}.${payloadB64}`);
    signer.end();

    const signature = signer.sign(this.privateKey);
    const signatureB64 = signature.toString('base64url');

    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }
}

// ============================================
// COMMAND BUILDER
// ============================================

/**
 * Builder class for constructing Sidecar commands with proper typing
 */
export class SidecarCommandBuilder {
  private signer: JWTSigner;

  constructor(privateKey: string) {
    this.signer = new JWTSigner(privateKey);
  }

  /**
   * Build command request with JWT
   */
  buildCommand(
    workspaceId: string,
    dropletId: string,
    action: SidecarCommand,
    payload?: CommandPayload
  ): { jwt: string; request: SidecarCommandRequest } {
    const jwt = this.signer.generateCommandJWT(workspaceId, dropletId, action);

    const request: SidecarCommandRequest = {
      action,
      payload,
    };

    return { jwt, request };
  }

  /**
   * Convenience methods for each command type
   */

  healthCheck(workspaceId: string, dropletId: string) {
    return this.buildCommand(workspaceId, dropletId, 'HEALTH_CHECK');
  }

  deployWorkflow(
    workspaceId: string,
    dropletId: string,
    workflowJson: any,
    credentialMap?: Record<string, string>
  ) {
    return this.buildCommand(workspaceId, dropletId, 'DEPLOY_WORKFLOW', {
      workflow_json: workflowJson,
      credential_map: credentialMap,
    });
  }

  updateWorkflow(
    workspaceId: string,
    dropletId: string,
    workflowId: string,
    workflowJson: any
  ) {
    return this.buildCommand(workspaceId, dropletId, 'UPDATE_WORKFLOW', {
      workflow_id: workflowId,
      workflow_json: workflowJson,
    });
  }

  activateWorkflow(workspaceId: string, dropletId: string, workflowId: string) {
    return this.buildCommand(workspaceId, dropletId, 'ACTIVATE_WORKFLOW', {
      workflow_id: workflowId,
    });
  }

  deactivateWorkflow(workspaceId: string, dropletId: string, workflowId: string) {
    return this.buildCommand(workspaceId, dropletId, 'DEACTIVATE_WORKFLOW', {
      workflow_id: workflowId,
    });
  }

  deleteWorkflow(workspaceId: string, dropletId: string, workflowId: string) {
    return this.buildCommand(workspaceId, dropletId, 'DELETE_WORKFLOW', {
      workflow_id: workflowId,
    });
  }

  injectCredential(
    workspaceId: string,
    dropletId: string,
    credentialType: string,
    credentialName: string,
    encryptedData: any
  ) {
    return this.buildCommand(workspaceId, dropletId, 'INJECT_CREDENTIAL', {
      credential_type: credentialType,
      credential_name: credentialName,
      encrypted_data: encryptedData,
    });
  }

  rotateCredential(
    workspaceId: string,
    dropletId: string,
    credentialId: string,
    encryptedData: any
  ) {
    return this.buildCommand(workspaceId, dropletId, 'ROTATE_CREDENTIAL', {
      credential_id: credentialId,
      encrypted_data: encryptedData,
    });
  }

  restartN8n(workspaceId: string, dropletId: string) {
    return this.buildCommand(workspaceId, dropletId, 'RESTART_N8N');
  }

  pullImage(workspaceId: string, dropletId: string, imageName: string, tag: string) {
    return this.buildCommand(workspaceId, dropletId, 'PULL_IMAGE', {
      image_name: imageName,
      tag,
    });
  }

  swapContainer(workspaceId: string, dropletId: string, newImageTag: string) {
    return this.buildCommand(workspaceId, dropletId, 'SWAP_CONTAINER', {
      new_image_tag: newImageTag,
    });
  }

  getLogs(workspaceId: string, dropletId: string, lines?: number, since?: string) {
    return this.buildCommand(workspaceId, dropletId, 'GET_LOGS', {
      lines,
      since,
    });
  }

  collectMetrics(workspaceId: string, dropletId: string, since?: string) {
    return this.buildCommand(workspaceId, dropletId, 'COLLECT_METRICS', {
      since,
    });
  }
}

// ============================================
// COMMAND QUEUE MANAGEMENT
// ============================================

export interface QueuedCommand {
  id: string;
  workspace_id: string;
  droplet_id: string;
  action: SidecarCommand;
  payload?: any;
  jwt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  processed_at?: Date;
  result?: any;
  error?: string;
  execution_time_ms?: number;
}

/**
 * Command Queue for managing async command execution
 * (In production, this would use BullMQ backed by Redis)
 */
export class CommandQueue {
  private commands: Map<string, QueuedCommand> = new Map();

  /**
   * Enqueue a command for execution
   */
  enqueue(
    workspaceId: string,
    dropletId: string,
    action: SidecarCommand,
    jwt: string,
    payload?: any
  ): string {
    const commandId = uuidv4();

    const command: QueuedCommand = {
      id: commandId,
      workspace_id: workspaceId,
      droplet_id: dropletId,
      action,
      payload,
      jwt,
      status: 'pending',
      created_at: new Date(),
    };

    this.commands.set(commandId, command);

    return commandId;
  }

  /**
   * Get command by ID
   */
  get(commandId: string): QueuedCommand | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Update command status
   */
  updateStatus(
    commandId: string,
    status: QueuedCommand['status'],
    result?: any,
    error?: string,
    executionTimeMs?: number
  ): void {
    const command = this.commands.get(commandId);
    if (command) {
      command.status = status;
      command.processed_at = new Date();
      command.result = result;
      command.error = error;
      command.execution_time_ms = executionTimeMs;
    }
  }

  /**
   * Get pending commands for a droplet
   */
  getPending(dropletId: string): QueuedCommand[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => cmd.droplet_id === dropletId && cmd.status === 'pending'
    );
  }

  /**
   * Clear old commands (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [id, command] of this.commands.entries()) {
      if (command.created_at.getTime() < oneHourAgo) {
        this.commands.delete(id);
      }
    }
  }
}
