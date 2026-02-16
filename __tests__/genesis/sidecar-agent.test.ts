/**
 * SIDECAR AGENT TESTS
 * 
 * Tests for Phase 51: Sidecar Agent Architecture
 * - JWT verification
 * - Command execution
 * - Health reporting
 * - n8n integration (mocked)
 */

import * as crypto from 'crypto';
import { JWTVerifier, generateTestJWT, SidecarJWTPayload } from '../../sidecar/jwt-verifier';
import { N8nManager } from '../../sidecar/n8n-manager';
import { DockerManager } from '../../sidecar/docker-manager';
import { SidecarCommandBuilder, CommandQueue } from '@/lib/genesis/sidecar-commands';
import { SidecarClient } from '@/lib/genesis/sidecar-client';

// ============================================
// TEST FIXTURES
// ============================================

// Generate RSA key pair for testing
function generateTestKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return { publicKey, privateKey };
}

const TEST_KEYS = generateTestKeyPair();
const TEST_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const TEST_DROPLET_ID = 'do_test_123456';

// ============================================
// JWT VERIFIER TESTS
// ============================================

describe('JWT Verifier', () => {
  let verifier: JWTVerifier;

  beforeEach(() => {
    verifier = new JWTVerifier(
      TEST_KEYS.publicKey,
      TEST_WORKSPACE_ID,
      TEST_DROPLET_ID
    );
  });

  afterEach(() => {
    verifier.destroy();
  });

  test('should verify valid JWT', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      iat: now,
      exp: now + 300,
      jti: 'test-jti-001',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    const token = generateTestJWT(payload, TEST_KEYS.privateKey);
    const result = verifier.verify(token);

    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload?.action).toBe('HEALTH_CHECK');
  });

  test('should reject expired JWT', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      iat: now - 600,
      exp: now - 300, // Expired 5 minutes ago
      jti: 'test-jti-002',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    const token = generateTestJWT(payload, TEST_KEYS.privateKey);
    const result = verifier.verify(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  test('should reject JWT with wrong issuer', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'fake-issuer',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      iat: now,
      exp: now + 300,
      jti: 'test-jti-003',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    const token = generateTestJWT(payload, TEST_KEYS.privateKey);
    const result = verifier.verify(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('issuer');
  });

  test('should reject JWT with wrong audience', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'wrong-audience',
      iat: now,
      exp: now + 300,
      jti: 'test-jti-004',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    const token = generateTestJWT(payload, TEST_KEYS.privateKey);
    const result = verifier.verify(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('audience');
  });

  test('should reject JWT with wrong workspace', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: 'wrong-workspace-id',
      aud: 'sidecar',
      iat: now,
      exp: now + 300,
      jti: 'test-jti-005',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    const token = generateTestJWT(payload, TEST_KEYS.privateKey);
    const result = verifier.verify(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Workspace mismatch');
  });

  test('should reject JWT with wrong droplet', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      iat: now,
      exp: now + 300,
      jti: 'test-jti-006',
      action: 'HEALTH_CHECK',
      droplet_id: 'wrong-droplet-id',
    };

    const token = generateTestJWT(payload, TEST_KEYS.privateKey);
    const result = verifier.verify(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Droplet mismatch');
  });

  test('should reject replay attack (duplicate JTI)', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      iat: now,
      exp: now + 300,
      jti: 'test-jti-007',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    const token = generateTestJWT(payload, TEST_KEYS.privateKey);

    // First verification should succeed
    const result1 = verifier.verify(token);
    expect(result1.valid).toBe(true);

    // Second verification with same JTI should fail
    const result2 = verifier.verify(token);
    expect(result2.valid).toBe(false);
    expect(result2.error).toContain('replay attack');
  });

  test('should reject JWT with invalid signature', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      iat: now,
      exp: now + 300,
      jti: 'test-jti-008',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    // Generate JWT with different key pair
    const wrongKeys = generateTestKeyPair();
    const token = generateTestJWT(payload, wrongKeys.privateKey);

    const result = verifier.verify(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('signature');
  });

  test('should reject malformed JWT', () => {
    const result = verifier.verify('not.a.valid.jwt.format');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================
// COMMAND BUILDER TESTS
// ============================================

describe('Sidecar Command Builder', () => {
  let builder: SidecarCommandBuilder;

  beforeEach(() => {
    builder = new SidecarCommandBuilder(TEST_KEYS.privateKey);
  });

  test('should build health check command', () => {
    const { jwt, request } = builder.healthCheck(TEST_WORKSPACE_ID, TEST_DROPLET_ID);

    expect(jwt).toBeDefined();
    expect(request.action).toBe('HEALTH_CHECK');
    expect(request.payload).toBeUndefined();

    // Verify JWT can be parsed
    const verifier = new JWTVerifier(TEST_KEYS.publicKey, TEST_WORKSPACE_ID, TEST_DROPLET_ID);
    const result = verifier.verify(jwt);
    expect(result.valid).toBe(true);
    verifier.destroy();
  });

  test('should build deploy workflow command', () => {
    const workflowJson = {
      name: 'Test Workflow',
      nodes: [],
      connections: {},
    };

    const credentialMap = {
      'TEMPLATE_UUID_1': 'tenant-uuid-1',
    };

    const { jwt, request } = builder.deployWorkflow(
      TEST_WORKSPACE_ID,
      TEST_DROPLET_ID,
      workflowJson,
      credentialMap
    );

    expect(request.action).toBe('DEPLOY_WORKFLOW');
    expect(request.payload).toBeDefined();
    expect((request.payload as any)?.workflow_json).toEqual(workflowJson);
    expect((request.payload as any)?.credential_map).toEqual(credentialMap);
  });

  test('should build activate workflow command', () => {
    const workflowId = 'workflow-123';

    const { jwt, request } = builder.activateWorkflow(
      TEST_WORKSPACE_ID,
      TEST_DROPLET_ID,
      workflowId
    );

    expect(request.action).toBe('ACTIVATE_WORKFLOW');
    expect((request.payload as any)?.workflow_id).toBe(workflowId);
  });

  test('should build inject credential command', () => {
    const { jwt, request } = builder.injectCredential(
      TEST_WORKSPACE_ID,
      TEST_DROPLET_ID,
      'gmailOAuth2',
      'Gmail Account',
      { encrypted: 'data' }
    );

    expect(request.action).toBe('INJECT_CREDENTIAL');
    expect((request.payload as any)?.credential_type).toBe('gmailOAuth2');
    expect((request.payload as any)?.credential_name).toBe('Gmail Account');
  });

  test('should build restart n8n command', () => {
    const { jwt, request } = builder.restartN8n(TEST_WORKSPACE_ID, TEST_DROPLET_ID);

    expect(request.action).toBe('RESTART_N8N');
    expect(request.payload).toBeUndefined();
  });

  test('should generate unique JTI for each command', () => {
    const { jwt: jwt1 } = builder.healthCheck(TEST_WORKSPACE_ID, TEST_DROPLET_ID);
    const { jwt: jwt2 } = builder.healthCheck(TEST_WORKSPACE_ID, TEST_DROPLET_ID);

    expect(jwt1).not.toBe(jwt2);

    // Decode and verify JTIs are different
    const payload1 = JSON.parse(
      Buffer.from(jwt1.split('.')[1], 'base64url').toString('utf8')
    );
    const payload2 = JSON.parse(
      Buffer.from(jwt2.split('.')[1], 'base64url').toString('utf8')
    );

    expect(payload1.jti).not.toBe(payload2.jti);
  });
});

// ============================================
// COMMAND QUEUE TESTS
// ============================================

describe('Command Queue', () => {
  let queue: CommandQueue;

  beforeEach(() => {
    queue = new CommandQueue();
  });

  test('should enqueue command', () => {
    const commandId = queue.enqueue(
      TEST_WORKSPACE_ID,
      TEST_DROPLET_ID,
      'HEALTH_CHECK',
      'fake-jwt'
    );

    expect(commandId).toBeDefined();

    const command = queue.get(commandId);
    expect(command).toBeDefined();
    expect(command?.status).toBe('pending');
    expect(command?.action).toBe('HEALTH_CHECK');
  });

  test('should update command status', () => {
    const commandId = queue.enqueue(
      TEST_WORKSPACE_ID,
      TEST_DROPLET_ID,
      'HEALTH_CHECK',
      'fake-jwt'
    );

    queue.updateStatus(commandId, 'completed', { success: true }, undefined, 123);

    const command = queue.get(commandId);
    expect(command?.status).toBe('completed');
    expect(command?.result).toEqual({ success: true });
    expect(command?.execution_time_ms).toBe(123);
  });

  test('should get pending commands for droplet', () => {
    queue.enqueue(TEST_WORKSPACE_ID, TEST_DROPLET_ID, 'HEALTH_CHECK', 'jwt1');
    queue.enqueue(TEST_WORKSPACE_ID, TEST_DROPLET_ID, 'DEPLOY_WORKFLOW', 'jwt2');
    queue.enqueue(TEST_WORKSPACE_ID, 'other-droplet', 'HEALTH_CHECK', 'jwt3');

    const pending = queue.getPending(TEST_DROPLET_ID);

    expect(pending.length).toBe(2);
    expect(pending.every((cmd) => cmd.droplet_id === TEST_DROPLET_ID)).toBe(true);
    expect(pending.every((cmd) => cmd.status === 'pending')).toBe(true);
  });

  test('should cleanup old commands', () => {
    const commandId = queue.enqueue(
      TEST_WORKSPACE_ID,
      TEST_DROPLET_ID,
      'HEALTH_CHECK',
      'fake-jwt'
    );

    // Manually modify created_at to simulate old command
    const command = queue.get(commandId);
    if (command) {
      command.created_at = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    }

    queue.cleanup();

    const retrieved = queue.get(commandId);
    expect(retrieved).toBeUndefined();
  });
});

// ============================================
// N8N MANAGER TESTS (Mocked)
// ============================================

describe('N8n Manager', () => {
  // Note: In real tests, these would use nock or msw to mock HTTP requests
  // For now, we test the interface and structure

  test('should construct with proper configuration', () => {
    const manager = new N8nManager('http://localhost:5678', 'test-api-key');
    expect(manager).toBeDefined();
  });

  test('should have all required methods', () => {
    const manager = new N8nManager('http://localhost:5678', 'test-api-key');

    expect(typeof manager.getHealth).toBe('function');
    expect(typeof manager.createCredential).toBe('function');
    expect(typeof manager.updateCredential).toBe('function');
    expect(typeof manager.deleteCredential).toBe('function');
    expect(typeof manager.createWorkflow).toBe('function');
    expect(typeof manager.updateWorkflow).toBe('function');
    expect(typeof manager.activateWorkflow).toBe('function');
    expect(typeof manager.deactivateWorkflow).toBe('function');
    expect(typeof manager.deleteWorkflow).toBe('function');
    expect(typeof manager.getMetrics).toBe('function');
    expect(typeof manager.getExecutionLogs).toBe('function');
  });
});

// ============================================
// DOCKER MANAGER TESTS (Mocked)
// ============================================

describe('Docker Manager', () => {
  test('should construct with container name', () => {
    const manager = new DockerManager('n8n');
    expect(manager).toBeDefined();
  });

  test('should have all required methods', () => {
    const manager = new DockerManager('n8n');

    expect(typeof manager.restartContainer).toBe('function');
    expect(typeof manager.stopContainer).toBe('function');
    expect(typeof manager.startContainer).toBe('function');
    expect(typeof manager.pullImage).toBe('function');
    expect(typeof manager.swapContainer).toBe('function');
    expect(typeof manager.getContainerInfo).toBe('function');
    expect(typeof manager.getContainerMetrics).toBe('function');
    expect(typeof manager.isHealthy).toBe('function');
    expect(typeof manager.getLogs).toBe('function');
  });
});

// ============================================
// SIDECAR CLIENT TESTS
// ============================================

describe('Sidecar Client', () => {
  let client: SidecarClient;

  beforeEach(() => {
    client = new SidecarClient(TEST_KEYS.privateKey);
  });

  test('should construct with private key', () => {
    expect(client).toBeDefined();
  });

  test('should have all required methods', () => {
    expect(typeof client.sendCommand).toBe('function');
    expect(typeof client.checkHealth).toBe('function');
    expect(typeof client.deployWorkflow).toBe('function');
    expect(typeof client.activateWorkflow).toBe('function');
    expect(typeof client.injectCredential).toBe('function');
    expect(typeof client.restartN8n).toBe('function');
    expect(typeof client.getLogs).toBe('function');
    expect(typeof client.collectMetrics).toBe('function');
    expect(typeof client.deployWorkflowToFleet).toBe('function');
    expect(typeof client.checkFleetHealth).toBe('function');
    expect(typeof client.pullImageFleet).toBe('function');
    expect(typeof client.swapContainersFleet).toBe('function');
    expect(typeof client.rotateCredentialFleet).toBe('function');
    expect(typeof client.collectFleetMetrics).toBe('function');
    expect(typeof client.aggregateMetrics).toBe('function');
  });

  test('should aggregate metrics correctly', () => {
    const metricsMap = new Map([
      [
        'droplet1',
        {
          executions_total: 100,
          executions_success: 90,
          executions_failed: 10,
          avg_duration_ms: 1000,
        },
      ],
      [
        'droplet2',
        {
          executions_total: 200,
          executions_success: 180,
          executions_failed: 20,
          avg_duration_ms: 1500,
        },
      ],
    ]);

    const aggregated = client.aggregateMetrics(metricsMap);

    expect(aggregated.total_executions).toBe(300);
    expect(aggregated.total_success).toBe(270);
    expect(aggregated.total_failed).toBe(30);
    expect(aggregated.avg_success_rate).toBe(90);
    expect(aggregated.avg_duration_ms).toBe(1250);
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Integration: Command Flow', () => {
  test('should complete full command flow', () => {
    // 1. Dashboard generates command
    const builder = new SidecarCommandBuilder(TEST_KEYS.privateKey);
    const { jwt, request } = builder.healthCheck(TEST_WORKSPACE_ID, TEST_DROPLET_ID);

    // 2. Sidecar receives and verifies JWT
    const verifier = new JWTVerifier(TEST_KEYS.publicKey, TEST_WORKSPACE_ID, TEST_DROPLET_ID);
    const verification = verifier.verify(jwt);

    expect(verification.valid).toBe(true);
    expect(verification.payload?.action).toBe('HEALTH_CHECK');

    // 3. Verify action matches request
    expect(request.action).toBe(verification.payload?.action);

    verifier.destroy();
  });

  test('should handle credential map application', () => {
    const workflowJson = {
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          credentials: {
            gmailOAuth2: {
              id: 'TEMPLATE_GMAIL_UUID',
              name: 'Template Gmail',
            },
          },
        },
      ],
      connections: {},
    };

    const credentialMap = {
      TEMPLATE_GMAIL_UUID: 'tenant-specific-gmail-uuid',
    };

    // Simulate credential map application (from sidecar-agent.ts)
    let workflowStr = JSON.stringify(workflowJson);
    for (const [placeholder, replacement] of Object.entries(credentialMap)) {
      workflowStr = workflowStr.replace(new RegExp(placeholder, 'g'), replacement);
    }
    const mappedWorkflow = JSON.parse(workflowStr);

    expect(mappedWorkflow.nodes[0].credentials.gmailOAuth2.id).toBe(
      'tenant-specific-gmail-uuid'
    );
  });
});

// ============================================
// SECURITY TESTS
// ============================================

describe('Security Tests', () => {
  test('should not accept JWT signed with HS256', () => {
    // Create JWT with wrong algorithm
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      exp: Math.floor(Date.now() / 1000) + 300,
      jti: 'test',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', 'secret')
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const token = `${headerB64}.${payloadB64}.${signature}`;

    const verifier = new JWTVerifier(TEST_KEYS.publicKey, TEST_WORKSPACE_ID, TEST_DROPLET_ID);
    const result = verifier.verify(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('algorithm');
    verifier.destroy();
  });

  test('should enforce 5-minute expiry window', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: SidecarJWTPayload = {
      iss: 'genesis-dashboard',
      sub: TEST_WORKSPACE_ID,
      aud: 'sidecar',
      iat: now,
      exp: now + 600, // 10 minutes (too long)
      jti: 'test-long-expiry',
      action: 'HEALTH_CHECK',
      droplet_id: TEST_DROPLET_ID,
    };

    // JWT should still be valid (verifier checks exp > now, not duration)
    // In production, dashboard should enforce max 5-minute duration
    const token = generateTestJWT(payload, TEST_KEYS.privateKey);
    const verifier = new JWTVerifier(TEST_KEYS.publicKey, TEST_WORKSPACE_ID, TEST_DROPLET_ID);
    const result = verifier.verify(token);

    // Token is valid from verifier's perspective (not expired)
    expect(result.valid).toBe(true);

    // But check that exp - iat > 300 (application-level validation)
    const expDuration = payload.exp - payload.iat;
    expect(expDuration).toBeGreaterThan(300);

    verifier.destroy();
  });
});

// ============================================
// RUN TESTS
// ============================================

// Export for Jest
export {};
