/**
 * PHASE 42: ATOMIC HANDSHAKE PROTOCOL
 * Mock Database Implementation (for testing)
 */

import type {
  HandshakeDB,
  TokenValidationResult,
  DropletHealth,
  WorkspaceWebhook,
  HandshakeAttempt,
} from './handshake-types';

/**
 * In-memory mock database for testing.
 */
export class MockHandshakeDB implements HandshakeDB {
  private provisioningTokens: Map<string, {
    id: string;
    workspace_id: string;
    token_hash: string;
    expires_at: Date;
    used_at: Date | null;
    invalidated_at: Date | null;
  }> = new Map();
  
  private sidecarTokens: Map<string, {
    id: string;
    workspace_id: string;
    token_hash: string;
  }> = new Map();
  
  private dropletHealth: Map<string, DropletHealth> = new Map();
  private webhooks: Map<string, WorkspaceWebhook> = new Map();
  private attempts: HandshakeAttempt[] = [];
  
  /**
   * Add provisioning token for testing.
   */
  addProvisioningToken(
    workspaceId: string,
    tokenHash: string,
    expiresAt: Date = new Date(Date.now() + 15 * 60 * 1000)
  ): string {
    const id = `prov_token_${this.provisioningTokens.size + 1}`;
    this.provisioningTokens.set(tokenHash, {
      id,
      workspace_id: workspaceId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used_at: null,
      invalidated_at: null,
    });
    return id;
  }
  
  /**
   * Validate provisioning token.
   */
  async validateProvisioningToken(
    tokenHash: string,
    workspaceId: string,
    requestIp: string
  ): Promise<TokenValidationResult> {
    const token = this.provisioningTokens.get(tokenHash);
    
    if (!token) {
      return {
        valid: false,
        error_code: 'TOKEN_NOT_FOUND',
        error_message: 'Provisioning token not found',
      };
    }
    
    if (token.workspace_id !== workspaceId) {
      return {
        valid: false,
        error_code: 'TOKEN_INVALID',
        error_message: 'Token workspace mismatch',
      };
    }
    
    if (token.used_at) {
      return {
        valid: false,
        token_id: token.id,
        error_code: 'TOKEN_ALREADY_USED',
        error_message: 'Provisioning token already used',
      };
    }
    
    if (token.invalidated_at) {
      return {
        valid: false,
        token_id: token.id,
        error_code: 'TOKEN_INVALIDATED',
        error_message: 'Provisioning token invalidated',
      };
    }
    
    if (token.expires_at < new Date()) {
      return {
        valid: false,
        token_id: token.id,
        error_code: 'TOKEN_EXPIRED',
        error_message: 'Provisioning token expired',
      };
    }
    
    return {
      valid: true,
      token_id: token.id,
    };
  }
  
  /**
   * Mark provisioning token as used.
   */
  async markTokenUsed(tokenId: string): Promise<void> {
    for (const token of this.provisioningTokens.values()) {
      if (token.id === tokenId) {
        token.used_at = new Date();
        break;
      }
    }
  }
  
  /**
   * Create sidecar token.
   */
  async createSidecarToken(
    workspaceId: string,
    tokenHash: string
  ): Promise<string> {
    const id = `sidecar_token_${this.sidecarTokens.size + 1}`;
    this.sidecarTokens.set(workspaceId, {
      id,
      workspace_id: workspaceId,
      token_hash: tokenHash,
    });
    return id;
  }
  
  /**
   * Complete handshake (atomic update).
   */
  async completeHandshake(
    workspaceId: string,
    dropletIp: string,
    webhookUrl: string,
    n8nVersion: string
  ): Promise<boolean> {
    // Update droplet health
    this.dropletHealth.set(workspaceId, {
      workspace_id: workspaceId,
      droplet_ip: dropletIp,
      webhook_url: webhookUrl,
      status: 'online',
      n8n_version: n8nVersion,
      last_handshake_at: new Date().toISOString(),
      last_heartbeat_at: null,
      heartbeat_interval: 60,
      missed_heartbeats: 0,
      cpu_usage_percent: null,
      memory_usage_percent: null,
      disk_usage_percent: null,
      active_executions: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_degradation_at: null,
      degradation_reason: null,
    });
    
    // Update webhook registry
    this.webhooks.set(workspaceId, {
      workspace_id: workspaceId,
      webhook_url: webhookUrl,
      webhook_secret: null,
      discovered_at: new Date().toISOString(),
      discovered_via: 'handshake',
      verified: false,
      last_verification_at: null,
      verification_failures: 0,
      last_event_received_at: null,
      total_events_received: 0,
      invalidated_at: null,
      invalidation_reason: null,
      previous_webhook_url: null,
      updated_at: new Date().toISOString(),
    });
    
    return true;
  }
  
  /**
   * Log handshake attempt.
   */
  async logHandshakeAttempt(
    attempt: Omit<HandshakeAttempt, 'id' | 'attempted_at'>
  ): Promise<void> {
    this.attempts.push({
      id: `attempt_${this.attempts.length + 1}`,
      attempted_at: new Date().toISOString(),
      ...attempt,
    } as HandshakeAttempt);
  }
  
  /**
   * Get droplet health.
   */
  async getDropletHealth(workspaceId: string): Promise<DropletHealth | null> {
    return this.dropletHealth.get(workspaceId) || null;
  }
  
  /**
   * Get workspace webhook.
   */
  async getWorkspaceWebhook(workspaceId: string): Promise<WorkspaceWebhook | null> {
    return this.webhooks.get(workspaceId) || null;
  }
  
  /**
   * Get all handshake attempts (for testing).
   */
  getAttempts(): HandshakeAttempt[] {
    return [...this.attempts];
  }
  
  /**
   * Get provisioning token by hash (for testing).
   */
  getProvisioningToken(tokenHash: string) {
    return this.provisioningTokens.get(tokenHash);
  }
  
  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.provisioningTokens.clear();
    this.sidecarTokens.clear();
    this.dropletHealth.clear();
    this.webhooks.clear();
    this.attempts = [];
  }
}
