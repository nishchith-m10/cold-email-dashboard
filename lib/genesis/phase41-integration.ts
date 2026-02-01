/**
 * PHASE 42: INTEGRATION WITH PHASE 41
 * 
 * Provides provisioning token generation during ignition
 * and handshake status monitoring.
 */

import type { TokenGenerator } from './handshake-types';
import { hashToken, calculateProvisioningTokenExpiry } from './token-manager';

// ============================================
// PROVISIONING TOKEN GENERATION
// ============================================

/**
 * Generate provisioning token for Phase 41 ignition.
 * 
 * This function should be called by the Ignition Orchestrator (Phase 41)
 * during droplet provisioning to create a one-time handshake token.
 * 
 * The token and its hash are returned so that:
 * 1. Token is injected into droplet via Cloud-Init
 * 2. Hash is stored in database for later validation
 * 
 * @param tokenGenerator - Token generator instance
 * @param workspaceId - Workspace ID being provisioned
 * @param ignitionId - Ignition operation ID (for audit trail)
 * @returns Token info for Cloud-Init and database storage
 */
export function generateProvisioningTokenForIgnition(
  tokenGenerator: TokenGenerator,
  workspaceId: string,
  ignitionId?: string
): {
  token: string;
  hash: string;
  expires_at: Date;
  metadata: {
    workspace_id: string;
    ignition_id?: string;
    created_by: string;
  };
} {
  const { token, hash } = tokenGenerator.generateProvisioningToken();
  const expires_at = calculateProvisioningTokenExpiry();
  
  return {
    token,
    hash,
    expires_at,
    metadata: {
      workspace_id: workspaceId,
      ignition_id: ignitionId,
      created_by: 'ignition_orchestrator',
    },
  };
}

// ============================================
// HANDSHAKE STATUS MONITORING
// ============================================

/**
 * Handshake wait configuration.
 */
export interface HandshakeWaitConfig {
  /** Maximum time to wait for handshake (milliseconds) */
  timeoutMs: number;
  
  /** Polling interval (milliseconds) */
  pollIntervalMs: number;
  
  /** Callback for status updates */
  onProgress?: (status: HandshakeWaitStatus) => void;
}

/**
 * Handshake wait status.
 */
export interface HandshakeWaitStatus {
  elapsed_ms: number;
  attempts: number;
  status: 'waiting' | 'completed' | 'timeout' | 'error';
  message?: string;
}

/**
 * Handshake status checker interface.
 */
export interface HandshakeStatusChecker {
  /**
   * Check if handshake has completed for a workspace.
   */
  isHandshakeComplete(workspaceId: string): Promise<boolean>;
  
  /**
   * Get handshake attempt count.
   */
  getAttemptCount(workspaceId: string): Promise<number>;
}

/**
 * Wait for handshake to complete.
 * 
 * This function should be called by the Ignition Orchestrator after
 * droplet provisioning to wait for the Sidecar to complete handshake.
 * 
 * @param workspaceId - Workspace ID to monitor
 * @param statusChecker - Interface to check handshake status
 * @param config - Wait configuration
 * @returns Handshake completion result
 */
export async function waitForHandshake(
  workspaceId: string,
  statusChecker: HandshakeStatusChecker,
  config: HandshakeWaitConfig
): Promise<{
  success: boolean;
  elapsed_ms: number;
  attempts: number;
  error?: string;
}> {
  const startTime = Date.now();
  let attempts = 0;
  
  while (true) {
    attempts++;
    const elapsed_ms = Date.now() - startTime;
    
    // Check timeout
    if (elapsed_ms >= config.timeoutMs) {
      config.onProgress?.({
        elapsed_ms,
        attempts,
        status: 'timeout',
        message: `Handshake timeout after ${elapsed_ms}ms`,
      });
      
      return {
        success: false,
        elapsed_ms,
        attempts,
        error: `Handshake timeout after ${config.timeoutMs}ms`,
      };
    }
    
    // Check handshake status
    try {
      const complete = await statusChecker.isHandshakeComplete(workspaceId);
      
      if (complete) {
        config.onProgress?.({
          elapsed_ms,
          attempts,
          status: 'completed',
          message: `Handshake completed in ${elapsed_ms}ms`,
        });
        
        return {
          success: true,
          elapsed_ms,
          attempts,
        };
      }
    } catch (error) {
      const attemptCount = await statusChecker.getAttemptCount(workspaceId);
      
      config.onProgress?.({
        elapsed_ms,
        attempts,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        success: false,
        elapsed_ms,
        attempts: attemptCount,
        error: error instanceof Error ? error.message : 'Handshake check failed',
      };
    }
    
    // Progress update
    config.onProgress?.({
      elapsed_ms,
      attempts,
      status: 'waiting',
      message: `Waiting for handshake... (${Math.floor(elapsed_ms / 1000)}s elapsed)`,
    });
    
    // Wait before next poll
    await sleep(config.pollIntervalMs);
  }
}

/**
 * Sleep helper.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * Default handshake wait configuration.
 */
export const DEFAULT_HANDSHAKE_WAIT_CONFIG: Partial<HandshakeWaitConfig> = {
  timeoutMs: 5 * 60 * 1000, // 5 minutes
  pollIntervalMs: 2000, // 2 seconds
};

// ============================================
// CLOUD-INIT TEMPLATE
// ============================================

/**
 * Generate Cloud-Init environment variables for Sidecar.
 * 
 * These variables should be injected into the droplet's Cloud-Init script.
 */
export function generateCloudInitEnvVars(config: {
  provisioning_token: string;
  workspace_id: string;
  dashboard_url: string;
}): Record<string, string> {
  return {
    PROVISIONING_TOKEN: config.provisioning_token,
    WORKSPACE_ID: config.workspace_id,
    DASHBOARD_URL: config.dashboard_url,
  };
}

/**
 * Generate Cloud-Init script snippet for handshake.
 */
export function generateHandshakeScript(config: {
  provisioning_token: string;
  workspace_id: string;
  dashboard_url: string;
}): string {
  return `
# Handshake environment variables
export PROVISIONING_TOKEN="${config.provisioning_token}"
export WORKSPACE_ID="${config.workspace_id}"
export DASHBOARD_URL="${config.dashboard_url}"

# Wait for Sidecar to start and complete handshake
echo "Waiting for Sidecar to start..."
while ! systemctl is-active --quiet sidecar; do
  sleep 1
done

echo "Sidecar started, initiating handshake..."
# Sidecar will automatically initiate handshake using env vars
`.trim();
}

// ============================================
// MOCK HANDSHAKE STATUS CHECKER
// ============================================

/**
 * Mock handshake status checker for testing.
 */
export class MockHandshakeStatusChecker implements HandshakeStatusChecker {
  private completedWorkspaces: Set<string> = new Set();
  private attempts: Map<string, number> = new Map();
  
  /**
   * Mark workspace handshake as complete.
   */
  markComplete(workspaceId: string): void {
    this.completedWorkspaces.add(workspaceId);
  }
  
  /**
   * Increment attempt count.
   */
  incrementAttempts(workspaceId: string): void {
    const current = this.attempts.get(workspaceId) || 0;
    this.attempts.set(workspaceId, current + 1);
  }
  
  async isHandshakeComplete(workspaceId: string): Promise<boolean> {
    this.incrementAttempts(workspaceId);
    return this.completedWorkspaces.has(workspaceId);
  }
  
  async getAttemptCount(workspaceId: string): Promise<number> {
    return this.attempts.get(workspaceId) || 0;
  }
  
  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.completedWorkspaces.clear();
    this.attempts.clear();
  }
}
