/**
 * PHASE 42: ATOMIC HANDSHAKE PROTOCOL
 * TypeScript Type Definitions
 * 
 * Implements the V35 Atomic Handshake Protocol for secure Sidecar->Dashboard registration.
 */

// ============================================
// HANDSHAKE REQUEST/RESPONSE
// ============================================

/**
 * Handshake request sent by Sidecar to Dashboard.
 * POST /api/sidecar/handshake
 */
export interface HandshakeRequest {
  /** One-time provisioning token (generated during ignition) */
  provisioning_token: string;
  
  /** Workspace ID from Cloud-Init */
  workspace_id: string;
  
  /** n8n webhook URL (discovered by Sidecar) */
  webhook_url: string;
  
  /** Droplet IP address */
  droplet_ip: string;
  
  /** n8n version running on droplet */
  n8n_version: string;
  
  /** Optional: Sidecar version for diagnostics */
  sidecar_version?: string;
  
  /** Optional: System info for diagnostics */
  system_info?: {
    cpu_count?: number;
    memory_total_mb?: number;
    disk_total_gb?: number;
  };
}

/**
 * Handshake response sent by Dashboard to Sidecar.
 */
export interface HandshakeResponse {
  success: boolean;
  
  /** Long-lived token for Sidecar->Dashboard auth (heartbeats, reports) */
  sidecar_token?: string;
  
  /** Configuration for Sidecar operation */
  config?: SidecarConfig;
  
  /** Error details if handshake failed */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Configuration provided to Sidecar after successful handshake.
 */
export interface SidecarConfig {
  /** Dashboard API base URL */
  dashboard_url: string;
  
  /** How often to send heartbeats (seconds) */
  heartbeat_interval: number;
  
  /** n8n API key (if needed for Sidecar operations) */
  n8n_api_key?: string;
  
  /** Webhook secret for validating Dashboard->Sidecar commands */
  webhook_secret?: string;
  
  /** Feature flags */
  features?: {
    heartbeat_enabled: boolean;
    metrics_collection_enabled: boolean;
    auto_updates_enabled: boolean;
  };
  
  /** Rate limits */
  rate_limits?: {
    heartbeat_max_per_hour: number;
    event_publish_max_per_minute: number;
  };
}

// ============================================
// TOKEN TYPES
// ============================================

/**
 * Provisioning token (one-time use).
 */
export interface ProvisioningToken {
  id: string;
  workspace_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  usage_count: number;
  max_usage: number;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  created_by: string;
  ignition_id: string | null;
  last_attempt_ip: string | null;
  last_attempt_at: string | null;
}

/**
 * Sidecar token (long-lived).
 */
export interface SidecarToken {
  id: string;
  workspace_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  usage_count: number;
  last_usage_ip: string | null;
  previous_token_id: string | null;
  rotation_scheduled_at: string | null;
}

/**
 * Token validation result.
 */
export interface TokenValidationResult {
  valid: boolean;
  token_id?: string;
  error_code?: string;
  error_message?: string;
}

// ============================================
// HANDSHAKE STATE
// ============================================

/**
 * Handshake attempt record (audit log).
 */
export interface HandshakeAttempt {
  id: string;
  workspace_id: string;
  provisioning_token_hash: string | null;
  droplet_ip: string;
  webhook_url: string | null;
  n8n_version: string | null;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  attempted_at: string;
  duration_ms: number | null;
  request_ip: string;
  user_agent: string | null;
  sidecar_token_id: string | null;
  request_payload: Record<string, unknown> | null;
}

/**
 * Droplet health status.
 */
export interface DropletHealth {
  workspace_id: string;
  droplet_ip: string;
  webhook_url: string | null;
  status: DropletStatus;
  n8n_version: string | null;
  last_handshake_at: string | null;
  last_heartbeat_at: string | null;
  heartbeat_interval: number;
  missed_heartbeats: number;
  cpu_usage_percent: number | null;
  memory_usage_percent: number | null;
  disk_usage_percent: number | null;
  active_executions: number | null;
  created_at: string;
  updated_at: string;
  first_degradation_at: string | null;
  degradation_reason: string | null;
}

export type DropletStatus = 
  | 'provisioning'   // Droplet created, waiting for handshake
  | 'online'         // Handshake complete, receiving heartbeats
  | 'degraded'       // Missing heartbeats or errors
  | 'offline'        // No heartbeats for extended period
  | 'terminated';    // Droplet terminated

/**
 * Workspace webhook registry.
 */
export interface WorkspaceWebhook {
  workspace_id: string;
  webhook_url: string;
  webhook_secret: string | null;
  discovered_at: string;
  discovered_via: string;
  verified: boolean;
  last_verification_at: string | null;
  verification_failures: number;
  last_event_received_at: string | null;
  total_events_received: number;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  previous_webhook_url: string | null;
  updated_at: string;
}

// ============================================
// HANDSHAKE SERVICE INTERFACES
// ============================================

/**
 * Database interface for handshake operations.
 */
export interface HandshakeDB {
  /**
   * Validate a provisioning token.
   */
  validateProvisioningToken(
    tokenHash: string,
    workspaceId: string,
    requestIp: string
  ): Promise<TokenValidationResult>;
  
  /**
   * Mark provisioning token as used.
   */
  markTokenUsed(tokenId: string): Promise<void>;
  
  /**
   * Create a new sidecar token.
   */
  createSidecarToken(
    workspaceId: string,
    tokenHash: string
  ): Promise<string>; // Returns token ID
  
  /**
   * Complete handshake (atomic update of droplet_health, workspace_webhooks).
   */
  completeHandshake(
    workspaceId: string,
    dropletIp: string,
    webhookUrl: string,
    n8nVersion: string
  ): Promise<boolean>;
  
  /**
   * Log handshake attempt.
   */
  logHandshakeAttempt(attempt: Omit<HandshakeAttempt, 'id' | 'attempted_at'>): Promise<void>;
  
  /**
   * Get droplet health status.
   */
  getDropletHealth(workspaceId: string): Promise<DropletHealth | null>;
  
  /**
   * Get workspace webhook.
   */
  getWorkspaceWebhook(workspaceId: string): Promise<WorkspaceWebhook | null>;
}

/**
 * Token generator interface.
 */
export interface TokenGenerator {
  /**
   * Generate a cryptographically secure random token.
   */
  generateToken(length?: number): string;
  
  /**
   * Hash a token using SHA-256.
   */
  hashToken(token: string): string;
  
  /**
   * Generate provisioning token (one-time use).
   */
  generateProvisioningToken(): {
    token: string;
    hash: string;
  };
  
  /**
   * Generate sidecar token (long-lived).
   */
  generateSidecarToken(): {
    token: string;
    hash: string;
  };
}

// ============================================
// HANDSHAKE RESULT
// ============================================

/**
 * Result of handshake processing.
 */
export interface HandshakeResult {
  success: boolean;
  workspace_id: string;
  sidecar_token?: string;
  config?: SidecarConfig;
  error?: {
    code: HandshakeErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  duration_ms: number;
}

/**
 * Handshake error codes.
 */
export enum HandshakeErrorCode {
  // Validation errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Token errors
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_ALREADY_USED = 'TOKEN_ALREADY_USED',
  TOKEN_INVALIDATED = 'TOKEN_INVALIDATED',
  TOKEN_MAX_USAGE_EXCEEDED = 'TOKEN_MAX_USAGE_EXCEEDED',
  
  // Workspace errors
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  WORKSPACE_ALREADY_ONLINE = 'WORKSPACE_ALREADY_ONLINE',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Security errors
  IP_MISMATCH = 'IP_MISMATCH',
  REPLAY_ATTACK_DETECTED = 'REPLAY_ATTACK_DETECTED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// ============================================
// HANDSHAKE CONFIGURATION
// ============================================

/**
 * Configuration for handshake service.
 */
export interface HandshakeServiceConfig {
  /** Master key for token generation */
  masterKey: string;
  
  /** Dashboard URL for Sidecar callbacks */
  dashboardUrl: string;
  
  /** Heartbeat interval (seconds) */
  heartbeatInterval: number;
  
  /** Provisioning token lifetime (milliseconds) */
  provisioningTokenLifetimeMs: number;
  
  /** Sidecar token lifetime (milliseconds) */
  sidecarTokenLifetimeMs: number;
  
  /** Enable rate limiting */
  rateLimitEnabled: boolean;
  
  /** Maximum handshake attempts per IP per hour */
  maxHandshakeAttemptsPerIpPerHour: number;
}

/**
 * Default configuration values.
 */
export const DEFAULT_HANDSHAKE_CONFIG: Partial<HandshakeServiceConfig> = {
  heartbeatInterval: 60, // 60 seconds
  provisioningTokenLifetimeMs: 15 * 60 * 1000, // 15 minutes
  sidecarTokenLifetimeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  rateLimitEnabled: true,
  maxHandshakeAttemptsPerIpPerHour: 10,
};

// ============================================
// EVENTS
// ============================================

/**
 * Handshake event types for pub/sub.
 */
export type HandshakeEvent =
  | {
      type: 'handshake_started';
      workspace_id: string;
      droplet_ip: string;
      timestamp: string;
    }
  | {
      type: 'handshake_success';
      workspace_id: string;
      droplet_ip: string;
      webhook_url: string;
      n8n_version: string;
      duration_ms: number;
      timestamp: string;
    }
  | {
      type: 'handshake_failed';
      workspace_id: string;
      droplet_ip: string;
      error_code: string;
      error_message: string;
      timestamp: string;
    }
  | {
      type: 'token_expired';
      workspace_id: string;
      token_type: 'provisioning' | 'sidecar';
      timestamp: string;
    }
  | {
      type: 'replay_attack_detected';
      workspace_id: string;
      request_ip: string;
      token_hash: string;
      timestamp: string;
    };

/**
 * Callback for handshake events.
 */
export type HandshakeEventCallback = (event: HandshakeEvent) => void;

// ============================================
// TOKEN METADATA (imported from token-manager)
// ============================================

/**
 * Token metadata for diagnostics.
 */
export interface TokenMetadata {
  type: 'provisioning' | 'sidecar' | 'unknown';
  valid_format: boolean;
  length: number;
  prefix: string | null;
}
