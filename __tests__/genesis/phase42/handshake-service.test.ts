/**
 * PHASE 42: HANDSHAKE SERVICE TESTS
 * 
 * Comprehensive tests for handshake processing, validation, and atomic updates.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  HandshakeService,
  createHandshakeService,
  buildHandshakeResponse,
  validateHandshakeRequest,
  MockHandshakeDB,
  createTokenGenerator,
  createTestProvisioningToken,
  HandshakeErrorCode,
} from '@/lib/genesis';
import type { HandshakeRequest, HandshakeEvent } from '@/lib/genesis/handshake-types';

describe('Handshake Service', () => {
  let service: HandshakeService;
  let db: MockHandshakeDB;
  let workspaceId: string;
  let provisioningToken: string;
  
  beforeEach(() => {
    db = new MockHandshakeDB();
    const tokenGenerator = createTokenGenerator();
    service = createHandshakeService(db, tokenGenerator, {
      masterKey: 'test-key',
      dashboardUrl: 'https://dashboard.test',
      heartbeatInterval: 60,
      provisioningTokenLifetimeMs: 15 * 60 * 1000,
      sidecarTokenLifetimeMs: 30 * 24 * 60 * 60 * 1000,
      rateLimitEnabled: false,
      maxHandshakeAttemptsPerIpPerHour: 10,
    });
    
    workspaceId = '11111111-1111-1111-1111-111111111111';
    const tokenInfo = createTestProvisioningToken(db, workspaceId);
    provisioningToken = tokenInfo.token;
  });
  
  describe('Successful Handshake', () => {
    it('should complete successful handshake', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(true);
      expect(result.sidecar_token).toBeDefined();
      expect(result.sidecar_token).toMatch(/^side_[0-9a-f]{64}$/);
      expect(result.config).toBeDefined();
      expect(result.config?.dashboard_url).toBe('https://dashboard.test');
      expect(result.config?.heartbeat_interval).toBe(60);
      expect(result.error).toBeUndefined();
    });
    
    it('should update droplet health', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      await service.processHandshake(request, '192.168.1.1');
      
      const health = await service.getDropletHealth(workspaceId);
      expect(health).not.toBeNull();
      expect(health?.status).toBe('online');
      expect(health?.droplet_ip).toBe('10.0.0.1');
      expect(health?.webhook_url).toBe('https://n8n.example.com/webhook/test');
      expect(health?.n8n_version).toBe('1.0.0');
    });
    
    it('should register webhook URL', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      await service.processHandshake(request, '192.168.1.1');
      
      const webhook = await service.getWorkspaceWebhook(workspaceId);
      expect(webhook).not.toBeNull();
      expect(webhook?.webhook_url).toBe('https://n8n.example.com/webhook/test');
      expect(webhook?.discovered_via).toBe('handshake');
    });
    
    it('should mark provisioning token as used', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      await service.processHandshake(request, '192.168.1.1');
      
      const tokenInfo = createTestProvisioningToken(db, workspaceId);
      const tokenData = db.getProvisioningToken(tokenInfo.hash);
      const originalTokenData = db.getProvisioningToken(createTokenGenerator().hashToken(provisioningToken));
      
      expect(originalTokenData?.used_at).not.toBeNull();
    });
    
    it('should log successful attempt', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      await service.processHandshake(request, '192.168.1.1');
      
      const attempts = db.getAttempts();
      expect(attempts).toHaveLength(1);
      expect(attempts[0].success).toBe(true);
      expect(attempts[0].workspace_id).toBe(workspaceId);
    });
    
    it('should include system info if provided', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
        sidecar_version: '2.0.0',
        system_info: {
          cpu_count: 4,
          memory_total_mb: 8192,
          disk_total_gb: 100,
        },
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('Token Validation Failures', () => {
    it('should reject non-existent token', async () => {
      const request: HandshakeRequest = {
        provisioning_token: 'prov_' + '0'.repeat(64),
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_NOT_FOUND');
    });
    
    it('should reject already-used token', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      // First handshake succeeds
      await service.processHandshake(request, '192.168.1.1');
      
      // Second handshake with same token fails
      const result2 = await service.processHandshake(request, '192.168.1.1');
      
      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe('TOKEN_ALREADY_USED');
    });
    
    it('should reject expired token', async () => {
      const expiredToken = createTestProvisioningToken(
        db,
        workspaceId
      );
      
      // Manually expire the token
      const tokenData = db.getProvisioningToken(expiredToken.hash);
      if (tokenData) {
        (tokenData as any).expires_at = new Date(Date.now() - 1000);
      }
      
      const request: HandshakeRequest = {
        provisioning_token: expiredToken.token,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_EXPIRED');
    });
    
    it('should reject token with wrong workspace ID', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: '22222222-2222-2222-2222-222222222222', // Different workspace
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_INVALID'); // Token/workspace mismatch
    });
  });
  
  describe('Request Validation', () => {
    it('should reject missing provisioning_token', async () => {
      const request = {
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      } as HandshakeRequest;
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_REQUIRED_FIELD');
    });
    
    it('should reject missing workspace_id', async () => {
      const request = {
        provisioning_token: provisioningToken,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      } as HandshakeRequest;
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_REQUIRED_FIELD');
    });
    
    it('should reject invalid workspace_id format', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: 'not-a-uuid',
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });
    
    it('should reject invalid webhook_url', async () => {
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'not-a-url',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });
    
    it('should reject invalid provisioning token format', async () => {
      const request: HandshakeRequest = {
        provisioning_token: 'invalid-token',
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_INVALID');
    });
  });
  
  describe('Event Callbacks', () => {
    it('should emit handshake_started event', async () => {
      const events: HandshakeEvent[] = [];
      service.setEventCallback((event) => events.push(event));
      
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      await service.processHandshake(request, '192.168.1.1');
      
      const startedEvent = events.find(e => e.type === 'handshake_started');
      expect(startedEvent).toBeDefined();
      expect(startedEvent?.workspace_id).toBe(workspaceId);
    });
    
    it('should emit handshake_success event', async () => {
      const events: HandshakeEvent[] = [];
      service.setEventCallback((event) => events.push(event));
      
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      await service.processHandshake(request, '192.168.1.1');
      
      const successEvent = events.find(e => e.type === 'handshake_success');
      expect(successEvent).toBeDefined();
      expect((successEvent as any)?.webhook_url).toBe('https://n8n.example.com/webhook/test');
    });
    
    it('should emit handshake_failed event', async () => {
      const events: HandshakeEvent[] = [];
      service.setEventCallback((event) => events.push(event));
      
      const request: HandshakeRequest = {
        provisioning_token: 'prov_' + '0'.repeat(64),
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      await service.processHandshake(request, '192.168.1.1');
      
      const failedEvent = events.find(e => e.type === 'handshake_failed');
      expect(failedEvent).toBeDefined();
      expect((failedEvent as any)?.error_code).toBe('TOKEN_NOT_FOUND');
    });
    
    it('should not crash if callback throws error', async () => {
      service.setEventCallback(() => {
        throw new Error('Callback error');
      });
      
      const request: HandshakeRequest = {
        provisioning_token: provisioningToken,
        workspace_id: workspaceId,
        webhook_url: 'https://n8n.example.com/webhook/test',
        droplet_ip: '10.0.0.1',
        n8n_version: '1.0.0',
      };
      
      const result = await service.processHandshake(request, '192.168.1.1');
      
      expect(result.success).toBe(true);
    });
  });
});

describe('Response Builder', () => {
  it('should build success response', () => {
    const result = {
      success: true,
      workspace_id: 'ws_123',
      sidecar_token: 'side_abc',
      config: {
        dashboard_url: 'https://test.com',
        heartbeat_interval: 60,
      },
      duration_ms: 100,
    };
    
    const response = buildHandshakeResponse(result as any);
    
    expect(response.success).toBe(true);
    expect(response.sidecar_token).toBe('side_abc');
    expect(response.config).toBeDefined();
    expect(response.error).toBeUndefined();
  });
  
  it('should build error response', () => {
    const result = {
      success: false,
      workspace_id: 'ws_123',
      error: {
        code: 'TOKEN_EXPIRED' as HandshakeErrorCode,
        message: 'Token expired',
      },
      duration_ms: 50,
    };
    
    const response = buildHandshakeResponse(result);
    
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe('TOKEN_EXPIRED');
    expect(response.sidecar_token).toBeUndefined();
  });
});

describe('Request Validator', () => {
  it('should validate correct request', () => {
    const body = {
      provisioning_token: 'prov_abc',
      workspace_id: 'ws_123',
      webhook_url: 'https://test.com',
      droplet_ip: '10.0.0.1',
      n8n_version: '1.0.0',
    };
    
    const result = validateHandshakeRequest(body);
    
    expect(result.valid).toBe(true);
    expect(result.request).toBeDefined();
    expect(result.error).toBeUndefined();
  });
  
  it('should reject non-object body', () => {
    const result = validateHandshakeRequest('not-an-object');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be an object');
  });
  
  it('should reject missing field', () => {
    const body = {
      provisioning_token: 'prov_abc',
      workspace_id: 'ws_123',
      // Missing webhook_url
      droplet_ip: '10.0.0.1',
      n8n_version: '1.0.0',
    };
    
    const result = validateHandshakeRequest(body);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('webhook_url');
  });
  
  it('should reject non-string field', () => {
    const body = {
      provisioning_token: 'prov_abc',
      workspace_id: 123, // Should be string
      webhook_url: 'https://test.com',
      droplet_ip: '10.0.0.1',
      n8n_version: '1.0.0',
    };
    
    const result = validateHandshakeRequest(body);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('workspace_id');
  });
});
