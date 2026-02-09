/**
 * PHASE 45: MOCK N8N SERVICE TESTS
 */

import {
  executeMockWorkflow,
  getMockResponseFn,
  getSupportedMockNodeTypes,
} from '@/lib/genesis/phase45/mock-n8n';
import type { MockWorkflowDefinition } from '@/lib/genesis/phase45/types';

describe('Mock N8N Service', () => {
  describe('executeMockWorkflow', () => {
    it('executes a simple workflow with one node', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', parameters: { url: 'https://api.example.com' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);

      expect(result.executionId).toMatch(/^mock-exec-/);
      expect(result.status).toBe('success');
      expect(result.startedAt).toBeTruthy();
      expect(result.completedAt).toBeTruthy();
      expect(result.nodeResults).toHaveLength(1);
      expect(result.nodeResults[0].nodeName).toBe('HTTP Request');
      expect(result.nodeResults[0].nodeType).toBe('n8n-nodes-base.httpRequest');
      expect(result.nodeResults[0].duration).toBeGreaterThan(0);
    });

    it('executes a multi-node workflow in sequence', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
          { name: 'OpenAI', type: 'n8n-nodes-base.openAi', parameters: { prompt: 'research company' } },
          { name: 'Send Email', type: 'n8n-nodes-base.emailSend', parameters: { to: 'test@example.com' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);

      expect(result.nodeResults).toHaveLength(3);
      expect(result.nodeResults[0].nodeName).toBe('Webhook');
      expect(result.nodeResults[1].nodeName).toBe('OpenAI');
      expect(result.nodeResults[2].nodeName).toBe('Send Email');
    });

    it('handles empty workflow', async () => {
      const workflow: MockWorkflowDefinition = { nodes: [] };
      const result = await executeMockWorkflow(workflow);
      expect(result.nodeResults).toHaveLength(0);
      expect(result.status).toBe('success');
    });

    it('uses fallback mock for unknown node types', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'Custom Node', type: 'n8n-nodes-custom.myNode', parameters: { foo: 'bar' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);
      expect(result.nodeResults[0].output).toHaveProperty('_mock', true);
    });
  });

  describe('OpenAI mock responses', () => {
    it('generates research response for research prompts', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'AI', type: 'n8n-nodes-base.openAi', parameters: { prompt: 'research this company' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);
      const output = result.nodeResults[0].output as any;
      const content = JSON.parse(output.choices[0].message.content);
      expect(content.company_summary).toBeTruthy();
      expect(content.key_contacts).toBeTruthy();
    });

    it('generates email response for email prompts', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'AI', type: 'n8n-nodes-base.openAi', parameters: { prompt: 'write an email to the CEO' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);
      const output = result.nodeResults[0].output as any;
      expect(output.choices[0].message.content).toContain('Subject:');
    });

    it('generates scoring response for qualify prompts', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'AI', type: 'n8n-nodes-base.openAi', parameters: { prompt: 'qualify this lead and score' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);
      const output = result.nodeResults[0].output as any;
      const content = JSON.parse(output.choices[0].message.content);
      expect(content.score).toBeGreaterThanOrEqual(60);
      expect(content.score).toBeLessThanOrEqual(100);
    });
  });

  describe('specific node type mocks', () => {
    it('Postgres SELECT returns mock rows', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'DB', type: 'n8n-nodes-base.postgres', parameters: { operation: 'select' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);
      const output = result.nodeResults[0].output as any[];
      expect(output).toHaveLength(1);
      expect(output[0].email_address).toBe('mock@example.com');
    });

    it('Gmail mock returns message ID', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'Gmail', type: 'n8n-nodes-base.gmail', parameters: { to: 'test@example.com' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);
      const output = result.nodeResults[0].output as any;
      expect(output.messageId).toMatch(/^mock-gmail-/);
    });

    it('emailSend mock returns accepted addresses', async () => {
      const workflow: MockWorkflowDefinition = {
        nodes: [
          { name: 'Email', type: 'n8n-nodes-base.emailSend', parameters: { to: 'user@acme.com' } },
        ],
      };

      const result = await executeMockWorkflow(workflow);
      const output = result.nodeResults[0].output as any;
      expect(output.accepted).toContain('user@acme.com');
      expect(output.response).toBe('250 2.0.0 OK');
    });
  });

  describe('getMockResponseFn', () => {
    it('returns function for known types', () => {
      const fn = getMockResponseFn('n8n-nodes-base.openAi');
      expect(fn).toBeInstanceOf(Function);
    });

    it('returns null for unknown types', () => {
      const fn = getMockResponseFn('unknown.type');
      expect(fn).toBeNull();
    });
  });

  describe('getSupportedMockNodeTypes', () => {
    it('returns array of supported types', () => {
      const types = getSupportedMockNodeTypes();
      expect(types).toContain('n8n-nodes-base.openAi');
      expect(types).toContain('n8n-nodes-base.httpRequest');
      expect(types).toContain('n8n-nodes-base.emailSend');
      expect(types).toContain('n8n-nodes-base.gmail');
      expect(types.length).toBeGreaterThanOrEqual(8);
    });
  });
});
