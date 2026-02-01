/**
 * PHASE 42: ATOMIC HANDSHAKE PROTOCOL
 * Handshake Service
 * 
 * Orchestrates the complete handshake flow:
 * 1. Validate provisioning token
 * 2. Generate sidecar token
 * 3. Atomic database updates (droplet_health, workspace_webhooks)
 * 4. Log attempt
 * 5. Return configuration to Sidecar
 */

import {
  DEFAULT_HANDSHAKE_CONFIG,
} from './handshake-types';

import type {
  HandshakeRequest,
  HandshakeResponse,
  HandshakeResult,
  HandshakeDB,
  TokenGenerator,
  HandshakeServiceConfig,
  HandshakeEventCallback,
  HandshakeEvent,
  SidecarConfig,
  HandshakeErrorCode,
} from './handshake-types';
import { hashToken, validateToken, isTokenExpired } from './token-manager';

// ============================================
// HANDSHAKE SERVICE
// ============================================

export class HandshakeService {
  private db: HandshakeDB;
  private tokenGenerator: TokenGenerator;
  private config: HandshakeServiceConfig;
  private eventCallback?: HandshakeEventCallback;
  
  constructor(
    db: HandshakeDB,
    tokenGenerator: TokenGenerator,
    config: Partial<HandshakeServiceConfig> = {}
  ) {
    this.db = db;
    this.tokenGenerator = tokenGenerator;
    this.config = {
      ...DEFAULT_HANDSHAKE_CONFIG,
      ...config,
    } as HandshakeServiceConfig;
  }
  
  /**
   * Set event callback for monitoring.
   */
  setEventCallback(callback: HandshakeEventCallback): void {
    this.eventCallback = callback;
  }
  
  /**
   * Emit event (if callback is set).
   */
  private emitEvent(event: HandshakeEvent): void {
    if (this.eventCallback) {
      try {
        this.eventCallback(event);
      } catch (error) {
        // Don't let callback errors break handshake
        console.error('Handshake event callback error:', error);
      }
    }
  }
  
  /**
   * Process handshake request from Sidecar.
   */
  async processHandshake(
    request: HandshakeRequest,
    requestIp: string
  ): Promise<HandshakeResult> {
    const startTime = Date.now();
    
    this.emitEvent({
      type: 'handshake_started',
      workspace_id: request.workspace_id,
      droplet_ip: request.droplet_ip,
      timestamp: new Date().toISOString(),
    });
    
    try {
      // 1. Validate request
      const validationError = this.validateRequest(request);
      if (validationError) {
        return this.fail(
          request.workspace_id,
          validationError.code,
          validationError.message,
          request.droplet_ip,
          requestIp,
          request,
          startTime
        );
      }
      
      // 2. Validate provisioning token
      const tokenHash = hashToken(request.provisioning_token);
      const tokenValidation = await this.db.validateProvisioningToken(
        tokenHash,
        request.workspace_id,
        requestIp
      );
      
      if (!tokenValidation.valid) {
        return this.fail(
          request.workspace_id,
          tokenValidation.error_code as HandshakeErrorCode,
          tokenValidation.error_message || 'Token validation failed',
          request.droplet_ip,
          requestIp,
          request,
          startTime,
          tokenHash
        );
      }
      
      // 3. Generate sidecar token
      const { token: sidecarToken, hash: sidecarTokenHash } = 
        this.tokenGenerator.generateSidecarToken();
      
      const sidecarTokenId = await this.db.createSidecarToken(
        request.workspace_id,
        sidecarTokenHash
      );
      
      // 4. Atomic database updates
      await this.db.completeHandshake(
        request.workspace_id,
        request.droplet_ip,
        request.webhook_url,
        request.n8n_version
      );
      
      // 5. Mark provisioning token as used
      await this.db.markTokenUsed(tokenValidation.token_id!);
      
      // 6. Log successful attempt
      await this.db.logHandshakeAttempt({
        workspace_id: request.workspace_id,
        provisioning_token_hash: tokenHash,
        droplet_ip: request.droplet_ip,
        webhook_url: request.webhook_url,
        n8n_version: request.n8n_version,
        success: true,
        error_code: null,
        error_message: null,
        duration_ms: Date.now() - startTime,
        request_ip: requestIp,
        user_agent: null,
        sidecar_token_id: sidecarTokenId,
        request_payload: request as any,
      });
      
      // 7. Build configuration
      const config = this.buildSidecarConfig();
      
      const duration_ms = Date.now() - startTime;
      
      this.emitEvent({
        type: 'handshake_success',
        workspace_id: request.workspace_id,
        droplet_ip: request.droplet_ip,
        webhook_url: request.webhook_url,
        n8n_version: request.n8n_version,
        duration_ms,
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
        workspace_id: request.workspace_id,
        sidecar_token: sidecarToken,
        config,
        duration_ms,
      };
      
    } catch (error) {
      return this.fail(
        request.workspace_id,
        'INTERNAL_ERROR' as HandshakeErrorCode,
        error instanceof Error ? error.message : 'Unknown error',
        request.droplet_ip,
        requestIp,
        request,
        startTime
      );
    }
  }
  
  /**
   * Validate handshake request structure.
   */
  private validateRequest(request: HandshakeRequest): {
    code: HandshakeErrorCode;
    message: string;
  } | null {
    // Check required fields
    const requiredFields: (keyof HandshakeRequest)[] = [
      'provisioning_token',
      'workspace_id',
      'webhook_url',
      'droplet_ip',
      'n8n_version',
    ];
    
    for (const field of requiredFields) {
      if (!request[field]) {
        return {
          code: 'MISSING_REQUIRED_FIELD' as HandshakeErrorCode,
          message: `Missing required field: ${field}`,
        };
      }
    }
    
    // Validate provisioning token format
    const tokenValidation = validateToken(request.provisioning_token, 'provisioning');
    if (!tokenValidation.valid) {
      return {
        code: 'TOKEN_INVALID' as HandshakeErrorCode,
        message: tokenValidation.error || 'Invalid provisioning token format',
      };
    }
    
    // Validate workspace_id format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.workspace_id)) {
      return {
        code: 'INVALID_REQUEST' as HandshakeErrorCode,
        message: 'Invalid workspace_id format (must be UUID)',
      };
    }
    
    // Validate webhook_url format
    try {
      const url = new URL(request.webhook_url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      return {
        code: 'INVALID_REQUEST' as HandshakeErrorCode,
        message: 'Invalid webhook_url format',
      };
    }
    
    return null;
  }
  
  /**
   * Build Sidecar configuration.
   */
  private buildSidecarConfig(): SidecarConfig {
    return {
      dashboard_url: this.config.dashboardUrl,
      heartbeat_interval: this.config.heartbeatInterval,
      features: {
        heartbeat_enabled: true,
        metrics_collection_enabled: true,
        auto_updates_enabled: false,
      },
      rate_limits: {
        heartbeat_max_per_hour: 120, // 2 per minute max
        event_publish_max_per_minute: 60,
      },
    };
  }
  
  /**
   * Handle handshake failure.
   */
  private async fail(
    workspaceId: string,
    errorCode: HandshakeErrorCode,
    errorMessage: string,
    dropletIp: string,
    requestIp: string,
    request: HandshakeRequest,
    startTime: number,
    tokenHash?: string
  ): Promise<HandshakeResult> {
    const duration_ms = Date.now() - startTime;
    
    // Log failed attempt
    try {
      await this.db.logHandshakeAttempt({
        workspace_id: workspaceId,
        provisioning_token_hash: tokenHash || null,
        droplet_ip: dropletIp,
        webhook_url: request.webhook_url,
        n8n_version: request.n8n_version,
        success: false,
        error_code: errorCode,
        error_message: errorMessage,
        duration_ms,
        request_ip: requestIp,
        user_agent: null,
        sidecar_token_id: null,
        request_payload: request as any,
      });
    } catch (logError) {
      // Don't fail the entire request if logging fails
      console.error('Failed to log handshake attempt:', logError);
    }
    
    this.emitEvent({
      type: 'handshake_failed',
      workspace_id: workspaceId,
      droplet_ip: dropletIp,
      error_code: errorCode,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    return {
      success: false,
      workspace_id: workspaceId,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      duration_ms,
    };
  }
  
  /**
   * Get droplet health status.
   */
  async getDropletHealth(workspaceId: string) {
    return this.db.getDropletHealth(workspaceId);
  }
  
  /**
   * Get workspace webhook.
   */
  async getWorkspaceWebhook(workspaceId: string) {
    return this.db.getWorkspaceWebhook(workspaceId);
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create handshake service instance.
 */
export function createHandshakeService(
  db: HandshakeDB,
  tokenGenerator: TokenGenerator,
  config?: Partial<HandshakeServiceConfig>
): HandshakeService {
  return new HandshakeService(db, tokenGenerator, config);
}

// ============================================
// RESPONSE BUILDER
// ============================================

/**
 * Build HandshakeResponse from HandshakeResult.
 */
export function buildHandshakeResponse(result: HandshakeResult): HandshakeResponse {
  if (result.success) {
    return {
      success: true,
      sidecar_token: result.sidecar_token,
      config: result.config,
    };
  } else {
    return {
      success: false,
      error: result.error,
    };
  }
}

// ============================================
// REQUEST VALIDATOR
// ============================================

/**
 * Standalone request validator for API layer.
 */
export function validateHandshakeRequest(body: unknown): {
  valid: boolean;
  request?: HandshakeRequest;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }
  
  const req = body as any;
  
  const requiredFields = [
    'provisioning_token',
    'workspace_id',
    'webhook_url',
    'droplet_ip',
    'n8n_version',
  ];
  
  for (const field of requiredFields) {
    if (!req[field] || typeof req[field] !== 'string') {
      return { valid: false, error: `Missing or invalid field: ${field}` };
    }
  }
  
  return {
    valid: true,
    request: {
      provisioning_token: req.provisioning_token,
      workspace_id: req.workspace_id,
      webhook_url: req.webhook_url,
      droplet_ip: req.droplet_ip,
      n8n_version: req.n8n_version,
      sidecar_version: req.sidecar_version,
      system_info: req.system_info,
    },
  };
}
