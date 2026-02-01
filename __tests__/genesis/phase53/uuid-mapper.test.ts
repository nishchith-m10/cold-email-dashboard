/**
 * PHASE 53: UUID MAPPER TESTS
 * 
 * Tests for credential UUID mapping functionality.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  UUIDMapper,
  mapWorkflowCredentials,
  validateCredentialMapping,
} from '@/lib/genesis/uuid-mapper';
import type { N8nWorkflow, CredentialMap } from '@/lib/genesis/mapper-types';

// ============================================
// TEST FIXTURES
// ============================================

const TEMPLATE_GMAIL_UUID = '11111111-1111-1111-1111-111111111111';
const TEMPLATE_POSTGRES_UUID = '22222222-2222-2222-2222-222222222222';
const TENANT_GMAIL_UUID = '99999999-9999-9999-9999-999999999999';
const TENANT_POSTGRES_UUID = '88888888-8888-8888-8888-888888888888';

const SAMPLE_WORKFLOW: N8nWorkflow = {
  name: 'Test Email Workflow',
  nodes: [
    {
      id: 'node-1',
      name: 'Gmail Send',
      type: 'n8n-nodes-base.gmail',
      position: [100, 100],
      parameters: {},
      credentials: {
        gmailOAuth2: {
          id: TEMPLATE_GMAIL_UUID,
          name: 'Template Gmail',
        },
      },
    },
    {
      id: 'node-2',
      name: 'Postgres',
      type: 'n8n-nodes-base.postgres',
      position: [200, 200],
      parameters: {},
      credentials: {
        postgres: {
          id: TEMPLATE_POSTGRES_UUID,
          name: 'Template Postgres',
        },
      },
    },
  ],
  connections: {},
};

// ============================================
// UUID MAPPER TESTS
// ============================================

describe('UUIDMapper', () => {
  let mapper: UUIDMapper;

  beforeEach(() => {
    mapper = new UUIDMapper();
  });

  it('should map credential UUIDs correctly', () => {
    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const result = mapper.mapWorkflow(SAMPLE_WORKFLOW, credentialMap);

    expect(result.result.success).toBe(true);
    expect(result.result.mapped_count).toBe(2);
    expect(result.result.missing_credentials).toHaveLength(0);

    // Verify UUIDs were replaced
    const workflow = result.workflow;
    expect(workflow.nodes[0].credentials?.gmailOAuth2.id).toBe(TENANT_GMAIL_UUID);
    expect(workflow.nodes[1].credentials?.postgres.id).toBe(TENANT_POSTGRES_UUID);
  });

  it('should detect missing credentials', () => {
    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      // Missing TEMPLATE_POSTGRES_UUID
    };

    const result = mapper.mapWorkflow(SAMPLE_WORKFLOW, credentialMap);

    expect(result.result.success).toBe(false);
    expect(result.result.missing_credentials.length).toBeGreaterThan(0);
  });

  it('should validate UUID format', () => {
    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: 'invalid-uuid',
    };

    const result = mapper.mapWorkflow(SAMPLE_WORKFLOW, credentialMap);

    expect(result.result.success).toBe(false);
    expect(result.result.errors.length).toBeGreaterThan(0);
    expect(result.result.errors[0]).toContain('Invalid tenant UUID format');
  });

  it('should track replacements', () => {
    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    mapper.mapWorkflow(SAMPLE_WORKFLOW, credentialMap);
    const replacements = mapper.getReplacements();

    expect(replacements).toHaveLength(2);
    expect(replacements[0].type).toBe('credential');
    expect(replacements[0].original).toBe(TEMPLATE_GMAIL_UUID);
    expect(replacements[0].replacement).toBe(TENANT_GMAIL_UUID);
  });

  it('should extract credential references', () => {
    const references = UUIDMapper.extractCredentialReferences(SAMPLE_WORKFLOW);

    expect(references.size).toBe(2);
    expect(references.get('gmailOAuth2')?.has(TEMPLATE_GMAIL_UUID)).toBe(true);
    expect(references.get('postgres')?.has(TEMPLATE_POSTGRES_UUID)).toBe(true);
  });

  it('should check for template placeholders', () => {
    const hasPlaceholders = UUIDMapper.hasTemplatePlaceholders(
      SAMPLE_WORKFLOW,
      [TEMPLATE_GMAIL_UUID, TEMPLATE_POSTGRES_UUID]
    );

    expect(hasPlaceholders).toBe(true);
  });

  it('should build credential map from arrays', () => {
    const templatePlaceholders = [
      { placeholder_uuid: TEMPLATE_GMAIL_UUID, credential_type: 'gmailOAuth2' },
      { placeholder_uuid: TEMPLATE_POSTGRES_UUID, credential_type: 'postgres' },
    ];

    const workspaceCredentials = [
      { credential_type: 'gmailOAuth2', credential_uuid: TENANT_GMAIL_UUID },
      { credential_type: 'postgres', credential_uuid: TENANT_POSTGRES_UUID },
    ];

    const result = UUIDMapper.buildCredentialMap(templatePlaceholders, workspaceCredentials);

    expect(result.credentialMap[TEMPLATE_GMAIL_UUID]).toBe(TENANT_GMAIL_UUID);
    expect(result.credentialMap[TEMPLATE_POSTGRES_UUID]).toBe(TENANT_POSTGRES_UUID);
    expect(result.missingTypes).toHaveLength(0);
  });

  it('should detect missing credential types', () => {
    const templatePlaceholders = [
      { placeholder_uuid: TEMPLATE_GMAIL_UUID, credential_type: 'gmailOAuth2' },
      { placeholder_uuid: TEMPLATE_POSTGRES_UUID, credential_type: 'postgres' },
    ];

    const workspaceCredentials = [
      { credential_type: 'gmailOAuth2', credential_uuid: TENANT_GMAIL_UUID },
      // Missing postgres
    ];

    const result = UUIDMapper.buildCredentialMap(templatePlaceholders, workspaceCredentials);

    expect(result.missingTypes).toContain('postgres');
  });
});

// ============================================
// HELPER FUNCTIONS TESTS
// ============================================

describe('UUID Mapper Helper Functions', () => {
  it('should map workflow credentials with helper', () => {
    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const result = mapWorkflowCredentials(SAMPLE_WORKFLOW, credentialMap);

    expect(result.result.success).toBe(true);
    expect(result.workflow.nodes[0].credentials?.gmailOAuth2.id).toBe(TENANT_GMAIL_UUID);
  });

  it('should validate credential mapping', () => {
    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      [TEMPLATE_POSTGRES_UUID]: TENANT_POSTGRES_UUID,
    };

    const { workflow } = mapWorkflowCredentials(SAMPLE_WORKFLOW, credentialMap);

    const validation = validateCredentialMapping(
      workflow,
      [TEMPLATE_GMAIL_UUID, TEMPLATE_POSTGRES_UUID]
    );

    expect(validation.valid).toBe(true);
    expect(validation.unmappedPlaceholders).toHaveLength(0);
  });

  it('should detect unmapped placeholders', () => {
    const validation = validateCredentialMapping(
      SAMPLE_WORKFLOW,
      [TEMPLATE_GMAIL_UUID, TEMPLATE_POSTGRES_UUID]
    );

    expect(validation.valid).toBe(false);
    expect(validation.unmappedPlaceholders).toContain(TEMPLATE_GMAIL_UUID);
    expect(validation.unmappedPlaceholders).toContain(TEMPLATE_POSTGRES_UUID);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('UUID Mapper Edge Cases', () => {
  let mapper: UUIDMapper;

  beforeEach(() => {
    mapper = new UUIDMapper();
  });

  it('should handle empty workflow', () => {
    const emptyWorkflow: N8nWorkflow = {
      name: 'Empty',
      nodes: [],
      connections: {},
    };

    const result = mapper.mapWorkflow(emptyWorkflow, {});

    // Empty workflows are valid (no credentials to map)
    expect(result.result.success).toBe(true);
    expect(result.result.mapped_count).toBe(0);
  });

  it('should handle workflow with no credentials', () => {
    const noCredsWorkflow: N8nWorkflow = {
      name: 'No Creds',
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

    const result = mapper.mapWorkflow(noCredsWorkflow, {});

    expect(result.result.success).toBe(true);
    expect(result.result.mapped_count).toBe(0);
  });

  it('should handle multiple occurrences of same UUID', () => {
    const multiOccurrenceWorkflow: N8nWorkflow = {
      name: 'Multi Occurrence',
      nodes: [
        {
          id: 'node-1',
          name: 'Gmail 1',
          type: 'n8n-nodes-base.gmail',
          position: [100, 100],
          parameters: {},
          credentials: {
            gmailOAuth2: {
              id: TEMPLATE_GMAIL_UUID,
              name: 'Gmail',
            },
          },
        },
        {
          id: 'node-2',
          name: 'Gmail 2',
          type: 'n8n-nodes-base.gmail',
          position: [200, 200],
          parameters: {},
          credentials: {
            gmailOAuth2: {
              id: TEMPLATE_GMAIL_UUID, // Same UUID
              name: 'Gmail',
            },
          },
        },
      ],
      connections: {},
    };

    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
    };

    const result = mapper.mapWorkflow(multiOccurrenceWorkflow, credentialMap);

    expect(result.result.success).toBe(true);
    expect(result.result.mapped_count).toBe(2); // Both occurrences replaced
    expect(result.workflow.nodes[0].credentials?.gmailOAuth2.id).toBe(TENANT_GMAIL_UUID);
    expect(result.workflow.nodes[1].credentials?.gmailOAuth2.id).toBe(TENANT_GMAIL_UUID);
  });

  it('should work in non-strict mode', () => {
    const nonStrictMapper = new UUIDMapper({ strict_mode: false });

    const credentialMap: CredentialMap = {
      [TEMPLATE_GMAIL_UUID]: TENANT_GMAIL_UUID,
      // Missing TEMPLATE_POSTGRES_UUID
    };

    const result = nonStrictMapper.mapWorkflow(SAMPLE_WORKFLOW, credentialMap);

    expect(result.result.success).toBe(true); // Succeeds in non-strict mode
    expect(result.result.missing_credentials.length).toBeGreaterThan(0);
  });
});
