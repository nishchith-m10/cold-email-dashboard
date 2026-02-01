/**
 * PHASE 53: INTEGRATION TESTS
 * 
 * End-to-end tests for complete workflow mapping and validation.
 */

import { describe, it, expect } from '@jest/globals';
import {
  TemplateManager,
  mapAndValidateWorkflow,
  isWorkflowReady,
  buildDeploymentContext,
} from '@/lib/genesis';
import type { N8nWorkflow, GoldenTemplate, VariableContext } from '@/lib/genesis/mapper-types';

// ============================================
// TEST FIXTURES
// ============================================

const TEMPLATE_GMAIL_UUID = '11111111-1111-1111-1111-111111111111';
const TEMPLATE_POSTGRES_UUID = '22222222-2222-2222-2222-222222222222';
const TENANT_GMAIL_UUID = '99999999-9999-9999-9999-999999999999';
const TENANT_POSTGRES_UUID = '88888888-8888-8888-8888-888888888888';

const EMAIL_TEMPLATE: N8nWorkflow = {
  name: 'Email 1 - YOUR_WORKSPACE_NAME',
  nodes: [
    {
      id: 'trigger-1',
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      position: [100, 100],
      parameters: {
        rule: {
          interval: [{ field: 'hours', hoursInterval: 1 }],
        },
      },
    },
    {
      id: 'postgres-1',
      name: 'Get Leads from YOUR_LEADS_TABLE',
      type: 'n8n-nodes-base.postgres',
      position: [200, 200],
      parameters: {
        query: 'SELECT * FROM YOUR_LEADS_TABLE WHERE sent = false LIMIT 10',
      },
      credentials: {
        postgres: {
          id: TEMPLATE_POSTGRES_UUID,
          name: 'Template Postgres',
        },
      },
    },
    {
      id: 'gmail-1',
      name: 'Send Email from YOUR_SENDER_EMAIL',
      type: 'n8n-nodes-base.gmail',
      position: [300, 300],
      parameters: {
        fromEmail: 'YOUR_SENDER_EMAIL',
        subject: 'Hello from YOUR_NAME at YOUR_COMPANY_NAME',
        message: 'Visit YOUR_DASHBOARD_URL for more info.',
      },
      credentials: {
        gmailOAuth2: {
          id: TEMPLATE_GMAIL_UUID,
          name: 'Template Gmail',
        },
      },
    },
  ],
  connections: {
    'trigger-1': {
      main: [[{ node: 'postgres-1', type: 'main', index: 0 }]],
    },
    'postgres-1': {
      main: [[{ node: 'gmail-1', type: 'main', index: 0 }]],
    },
  },
};

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Phase 53 Integration', () => {
  it('should complete full workflow mapping pipeline', () => {
    const credentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const variableMap = {
      YOUR_WORKSPACE_NAME: 'Acme Corp',
      YOUR_WORKSPACE_ID: 'ws_123',
      YOUR_LEADS_TABLE: 'genesis.leads_p_acme',
      YOUR_SENDER_EMAIL: 'sales@acme.com',
      YOUR_NAME: 'John Doe',
      YOUR_COMPANY_NAME: 'Acme Corporation',
      YOUR_DASHBOARD_URL: 'https://dashboard.acme.com',
    };

    const result = mapAndValidateWorkflow(
      EMAIL_TEMPLATE,
      credentialMap,
      variableMap,
      'email_1'
    );

    if (!result.success) {
      console.log('Mapping failed:', result.errors, result.warnings);
    }
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Verify credentials were mapped
    const gmailNode = result.workflow.nodes.find((n: any) => n.name.includes('Send Email'));
    expect(gmailNode?.credentials?.gmailOAuth2.id).toBe(TENANT_GMAIL_UUID);

    const postgresNode = result.workflow.nodes.find((n: any) => n.name.includes('Get Leads'));
    expect(postgresNode?.credentials?.postgres.id).toBe(TENANT_POSTGRES_UUID);

    // Verify variables were replaced
    expect(result.workflow.name).toBe('Email 1 - Acme Corp');
    expect(postgresNode?.parameters.query).toContain('genesis.leads_p_acme');
    
    const gmailParams = gmailNode?.parameters as any;
    expect(gmailParams.fromEmail).toBe('sales@acme.com');
    expect(gmailParams.subject).toContain('John Doe');
    expect(gmailParams.subject).toContain('Acme Corporation');
    expect(gmailParams.message).toContain('https://dashboard.acme.com');
  });

  it('should detect missing credentials', () => {
    const incompleteCredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      // Missing TEMPLATE_POSTGRES_UUID
    };

    const variableMap = {
      YOUR_WORKSPACE_NAME: 'Test',
      YOUR_WORKSPACE_ID: 'ws_test',
      YOUR_LEADS_TABLE: 'genesis.leads_p_test',
      YOUR_SENDER_EMAIL: 'test@test.com',
      YOUR_NAME: 'Test User',
      YOUR_COMPANY_NAME: 'Test Co',
      YOUR_DASHBOARD_URL: 'https://test.com',
    };

    const result = mapAndValidateWorkflow(
      EMAIL_TEMPLATE,
      incompleteCredentialMap,
      variableMap,
      'email_1'
    );

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect missing variables', () => {
    const credentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const incompleteVariableMap = {
      YOUR_WORKSPACE_NAME: 'Test',
      // Missing other variables
    };

    const result = mapAndValidateWorkflow(
      EMAIL_TEMPLATE,
      credentialMap,
      incompleteVariableMap,
      'email_1'
    );

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should check workflow readiness', () => {
    const credentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const variableMap = {
      YOUR_WORKSPACE_NAME: 'Acme Corp',
      YOUR_WORKSPACE_ID: 'ws_123',
      YOUR_LEADS_TABLE: 'genesis.leads_p_acme',
      YOUR_SENDER_EMAIL: 'sales@acme.com',
      YOUR_NAME: 'John Doe',
      YOUR_COMPANY_NAME: 'Acme Corporation',
      YOUR_DASHBOARD_URL: 'https://dashboard.acme.com',
    };

    const readiness = isWorkflowReady(
      EMAIL_TEMPLATE,
      credentialMap,
      variableMap,
      'email_1'
    );

    expect(readiness.ready).toBe(true);
  });

  it('should build deployment context correctly', () => {
    const context = buildDeploymentContext(
      { id: 'ws_123', slug: 'acme-corp', name: 'Acme Corp' },
      { id: 'user_456', name: 'John Doe', email: 'john@acme.com' },
      'https://dashboard.acme.com',
      'https://supabase.acme.com',
      { CUSTOM_KEY: 'custom_value' }
    );

    expect(context.workspace.id).toBe('ws_123');
    expect(context.workspace.slug).toBe('acme-corp');
    expect(context.workspace.partition_name).toBe('genesis.leads_p_acme-corp');
    expect(context.user.name).toBe('John Doe');
    expect(context.system.dashboard_url).toBe('https://dashboard.acme.com');
    expect(context.custom?.CUSTOM_KEY).toBe('custom_value');
  });

  it('should validate workflow against template requirements', () => {
    const manager = new TemplateManager();

    const credentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const variableMap = {
      YOUR_WORKSPACE_NAME: 'Test',
      YOUR_WORKSPACE_ID: 'ws_test',
      YOUR_LEADS_TABLE: 'genesis.leads_p_test',
      YOUR_SENDER_EMAIL: 'test@test.com',
      YOUR_NAME: 'Test',
      YOUR_COMPANY_NAME: 'Test',
      YOUR_DASHBOARD_URL: 'https://test.com',
    };

    const result = manager.prepareDeployment(
      EMAIL_TEMPLATE,
      credentialMap,
      variableMap,
      'email_1'
    );

    expect(result.success).toBe(true);
    expect(result.validation.valid).toBe(true);
    
    // Should have required nodes
    const hasScheduleTrigger = result.workflow.nodes.some(
      n => n.type === 'n8n-nodes-base.scheduleTrigger'
    );
    expect(hasScheduleTrigger).toBe(true);

    const hasPostgres = result.workflow.nodes.some(
      n => n.type === 'n8n-nodes-base.postgres'
    );
    expect(hasPostgres).toBe(true);
  });

  it('should handle malformed workflow', () => {
    const malformedWorkflow: any = {
      name: 'Malformed',
      nodes: [
        {
          id: 'bad-node',
          name: '',  // Empty name (invalid)
          type: 'invalid-type',  // Doesn't start with n8n-nodes- (invalid)
          position: [100, 100],
          parameters: {},
        },
      ],
      connections: {},
    };

    const result = mapAndValidateWorkflow(
      malformedWorkflow,
      {},
      {},
      'email_1'
    );

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should preserve workflow structure during mapping', () => {
    const credentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const variableMap = {
      YOUR_WORKSPACE_NAME: 'Test',
      YOUR_WORKSPACE_ID: 'ws_test',
      YOUR_LEADS_TABLE: 'genesis.leads_p_test',
      YOUR_SENDER_EMAIL: 'test@test.com',
      YOUR_NAME: 'Test',
      YOUR_COMPANY_NAME: 'Test',
      YOUR_DASHBOARD_URL: 'https://test.com',
    };

    const result = mapAndValidateWorkflow(
      EMAIL_TEMPLATE,
      credentialMap,
      variableMap
    );

    expect(result.success).toBe(true);

    // Structure should be preserved
    expect(result.workflow.nodes).toHaveLength(EMAIL_TEMPLATE.nodes.length);
    expect(result.workflow.connections).toEqual(EMAIL_TEMPLATE.connections);
    
    // Node IDs and types should remain unchanged
    result.workflow.nodes.forEach((node: any, index: number) => {
      expect(node.id).toBe(EMAIL_TEMPLATE.nodes[index].id);
      expect(node.type).toBe(EMAIL_TEMPLATE.nodes[index].type);
    });
  });

  it('should handle workflows with no placeholders', () => {
    const simpleWorkflow: N8nWorkflow = {
      name: 'Simple Workflow',
      nodes: [
        {
          id: 'node-1',
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          position: [100, 100],
          parameters: {},
        },
      ],
      connections: {},
    };

    const result = mapAndValidateWorkflow(simpleWorkflow, {}, {});

    expect(result.success).toBe(true);
    expect(result.workflow.name).toBe('Simple Workflow');
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Phase 53 Performance', () => {
  it('should map large workflow in reasonable time', () => {
    // Create a workflow with 50 nodes
    const largeWorkflow: N8nWorkflow = {
      name: 'Large Workflow',
      nodes: Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        name: `Node ${i}`,
        type: 'n8n-nodes-base.set',
        position: [100 * i, 100],
        parameters: {
          value: `YOUR_WORKSPACE_ID_${i}`,
        },
      })),
      connections: {},
    };

    const variableMap: Record<string, string> = {};
    for (let i = 0; i < 50; i++) {
      variableMap[`YOUR_WORKSPACE_ID_${i}`] = `ws_${i}`;
    }

    const start = Date.now();
    const result = mapAndValidateWorkflow(largeWorkflow, {}, variableMap);
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second

    console.log(`Mapped 50-node workflow in ${duration}ms`);
  });

  it('should handle 100 variable replacements efficiently', () => {
    const workflow: N8nWorkflow = {
      name: 'Many Variables',
      nodes: [
        {
          id: 'node-1',
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          position: [100, 100],
          parameters: {
            url: Array.from({ length: 100 }, (_, i) => `VAR_${i}`).join('/'),
          },
        },
      ],
      connections: {},
    };

    const variableMap: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      variableMap[`VAR_${i}`] = `value_${i}`;
    }

    const start = Date.now();
    const result = mapAndValidateWorkflow(workflow, {}, variableMap);
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(500);

    console.log(`Replaced 100 variables in ${duration}ms`);
  });
});
