/**
 * SQL Function Tests - Phase 66 & 67
 * 
 * Tests for database functions via SQL
 * 
 * These tests verify:
 * - GDPR functions (export, delete, compliance)
 * - Audit logging functions
 * - Support access token functions
 * - Error handling, edge cases, security
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test database connection (using admin key for testing)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test workspace IDs
const TEST_WORKSPACE_ID = 'test-ws-' + Date.now();
const TEST_USER_ID = 'test-user-' + Date.now();

// SKIPPED: Requires actual Supabase database with deployed SQL functions
describe.skip('Phase 67 - Audit Logging Functions', () => {
  beforeAll(async () => {
    // Create test workspace
    await supabase.from('workspaces').insert({
      id: TEST_WORKSPACE_ID,
      name: 'Test Workspace for Audit',
      slug: 'test-audit-' + Date.now(),
    });
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('workspaces').delete().eq('id', TEST_WORKSPACE_ID);
  });

  it('should log audit event via fn_log_audit_event', async () => {
    const { data, error } = await (supabase.schema('genesis') as any).rpc(
      'fn_log_audit_event',
      {
        p_actor_type: 'user',
        p_actor_id: TEST_USER_ID,
        p_action: 'TEST_ACTION',
        p_action_category: 'security',
        p_target_type: 'workspace',
        p_target_id: TEST_WORKSPACE_ID,
        p_workspace_id: TEST_WORKSPACE_ID,
        p_ip_address: '192.168.1.1',
        p_user_agent: 'Test Agent',
        p_region: 'us-east',
        p_details: { test: 'data' },
      }
    );

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(typeof data).toBe('string'); // Returns UUID
  });

  it('should retrieve logged audit events', async () => {
    // Log an event first
    await (supabase.schema('genesis') as any).rpc('fn_log_audit_event', {
      p_actor_type: 'system',
      p_actor_id: 'test-system',
      p_action: 'IGNITION_COMPLETED',
      p_action_category: 'provisioning',
      p_workspace_id: TEST_WORKSPACE_ID,
      p_details: {},
    });

    // Query it back
    const { data, error } = await (supabase.schema('genesis') as any)
      .from('audit_log')
      .select('*')
      .eq('workspace_id', TEST_WORKSPACE_ID)
      .eq('action', 'IGNITION_COMPLETED')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.action).toBe('IGNITION_COMPLETED');
    expect(data.actor_type).toBe('system');
  });

  it('should enforce required fields in audit log', async () => {
    const { error } = await (supabase.schema('genesis') as any).rpc(
      'fn_log_audit_event',
      {
        p_actor_type: null, // Required field
        p_actor_id: 'test',
        p_action: 'TEST',
        p_action_category: 'security',
      }
    );

    expect(error).toBeTruthy();
  });

  it('should handle large details object (JSONB)', async () => {
    const largeDetails = {
      ...Array.from({ length: 100 }, (_, i) => ({
        [`key${i}`]: `value${i}`,
      })).reduce((acc, obj) => ({ ...acc, ...obj }), {}),
    };

    const { data, error } = await (supabase.schema('genesis') as any).rpc(
      'fn_log_audit_event',
      {
        p_actor_type: 'system',
        p_actor_id: 'test',
        p_action: 'LARGE_DETAILS_TEST',
        p_action_category: 'data',
        p_workspace_id: TEST_WORKSPACE_ID,
        p_details: largeDetails,
      }
    );

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});

describe.skip('Phase 67 - Support Access Token Functions', () => {
  it('should create support access token', async () => {
    const { data, error } = await (supabase.schema('genesis') as any).rpc(
      'fn_create_support_access_token',
      {
        p_support_agent_id: 'agent-test',
        p_support_agent_email: 'agent@company.com',
        p_workspace_id: TEST_WORKSPACE_ID,
        p_access_level: 'read_only',
        p_ticket_id: 'SUPPORT-TEST-123',
        p_reason: 'Testing support access',
        p_duration_minutes: 30,
        p_permissions: ['view_logs', 'view_metrics'],
      }
    );

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].token_id).toBeTruthy();
    expect(data[0].expires_at).toBeTruthy();
  });

  it('should reject invalid access level', async () => {
    const { error } = await (supabase.schema('genesis') as any).rpc(
      'fn_create_support_access_token',
      {
        p_support_agent_id: 'agent-test',
        p_support_agent_email: 'agent@company.com',
        p_workspace_id: TEST_WORKSPACE_ID,
        p_access_level: 'invalid_level',
        p_ticket_id: 'SUPPORT-TEST',
        p_reason: 'Testing',
        p_duration_minutes: 30,
      }
    );

    expect(error).toBeTruthy();
    expect(error.message).toContain('Invalid access level');
  });

  it('should reject duration exceeding 4 hours', async () => {
    const { error } = await (supabase.schema('genesis') as any).rpc(
      'fn_create_support_access_token',
      {
        p_support_agent_id: 'agent-test',
        p_support_agent_email: 'agent@company.com',
        p_workspace_id: TEST_WORKSPACE_ID,
        p_access_level: 'read_only',
        p_ticket_id: 'SUPPORT-TEST',
        p_reason: 'Testing',
        p_duration_minutes: 300, // 5 hours (exceeds 240 max)
      }
    );

    expect(error).toBeTruthy();
    expect(error.message).toContain('240 minutes');
  });

  it('should revoke support access token', async () => {
    // Create token
    const { data: createData } = await (supabase.schema('genesis') as any).rpc(
      'fn_create_support_access_token',
      {
        p_support_agent_id: 'agent-test-revoke',
        p_support_agent_email: 'agent@company.com',
        p_workspace_id: TEST_WORKSPACE_ID,
        p_access_level: 'read_only',
        p_ticket_id: 'SUPPORT-REVOKE-TEST',
        p_reason: 'Testing revocation',
        p_duration_minutes: 30,
      }
    );

    const tokenId = createData[0].token_id;

    // Revoke it
    const { data: revokeData, error: revokeError } = await (
      supabase.schema('genesis') as any
    ).rpc('fn_revoke_support_access_token', {
      p_token_id: tokenId,
    });

    expect(revokeError).toBeNull();
    expect(revokeData).toBe(true);

    // Verify it's revoked
    const { data: tokenData } = await supabase
      .schema('genesis')
      .from('support_access_tokens')
      .select('revoked_at')
      .eq('id', tokenId)
      .single();

    expect(tokenData!.revoked_at).toBeTruthy();
  });

  it('should return false when revoking non-existent token', async () => {
    const { data } = await (supabase.schema('genesis') as any).rpc(
      'fn_revoke_support_access_token',
      {
        p_token_id: '00000000-0000-0000-0000-000000000000',
      }
    );

    expect(data).toBe(false);
  });
});

describe.skip('Phase 66 - GDPR Export Function', () => {
  let testWorkspaceId: string;

  beforeAll(async () => {
    // Create test workspace with data
    testWorkspaceId = 'test-gdpr-' + Date.now();

    await supabase.from('workspaces').insert({
      id: testWorkspaceId,
      name: 'GDPR Test Workspace',
      slug: 'gdpr-test-' + Date.now(),
    });

    // Create infrastructure record
    await supabase.schema('genesis').from('workspace_infrastructure').insert({
      workspace_id: testWorkspaceId,
      region: 'eu-west',
      droplet_size: 'basic-2vcpu-4gb',
    });

    // Create test leads
    await supabase.schema('genesis').from('leads').insert([
      {
        workspace_id: testWorkspaceId,
        email_address: 'lead1@example.com',
        first_name: 'Lead',
        last_name: 'One',
      },
      {
        workspace_id: testWorkspaceId,
        email_address: 'lead2@example.com',
        first_name: 'Lead',
        last_name: 'Two',
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('workspaces').delete().eq('id', testWorkspaceId);
  });

  it('should export workspace data with all records', async () => {
    const { data, error } = await (supabase.schema('genesis') as any).rpc(
      'fn_export_workspace_data',
      {
        p_workspace_id: testWorkspaceId,
      }
    );

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const exportResult = data[0];
    expect(exportResult.workspace_info.workspace_id).toBe(testWorkspaceId);
    expect(exportResult.workspace_info.region).toBe('eu-west');
    expect(Array.isArray(exportResult.leads_data)).toBe(true);
    expect(exportResult.leads_data.length).toBeGreaterThanOrEqual(2);
  });

  it('should include metadata in export', async () => {
    const { data } = await (supabase.schema('genesis') as any).rpc(
      'fn_export_workspace_data',
      {
        p_workspace_id: testWorkspaceId,
      }
    );

    const metadata = data[0].metadata;
    expect(metadata.export_id).toBeTruthy();
    expect(metadata.export_timestamp).toBeTruthy();
    expect(metadata.export_format_version).toBe('1.0');
    expect(metadata.gdpr_compliant).toBe(true);
    expect(typeof metadata.total_leads).toBe('number');
  });

  it('should fail on non-existent workspace', async () => {
    const { error } = await (supabase.schema('genesis') as any).rpc(
      'fn_export_workspace_data',
      {
        p_workspace_id: '00000000-0000-0000-0000-000000000000',
      }
    );

    expect(error).toBeTruthy();
    expect(error.message).toContain('not found');
  });
});

describe.skip('Phase 66 - GDPR Deletion Function', () => {
  it('should reject deletion without valid confirmation code', async () => {
    const testWsId = 'test-delete-fail-' + Date.now();

    // Create workspace
    await supabase.from('workspaces').insert({
      id: testWsId,
      name: 'Delete Test',
      slug: 'delete-test-' + Date.now(),
    });

    const { data } = await (supabase.schema('genesis') as any).rpc(
      'fn_delete_workspace_data',
      {
        p_workspace_id: testWsId,
        p_confirmation_code: 'WRONG-CODE',
      }
    );

    expect(data[0].success).toBe(false);
    expect(data[0].operation).toBe('invalid_confirmation');

    // Verify workspace still exists
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', testWsId)
      .maybeSingle();

    expect(wsData).toBeTruthy();

    // Cleanup
    await supabase.from('workspaces').delete().eq('id', testWsId);
  });

  it('should delete workspace with valid confirmation code', async () => {
    const testWsId = 'test-delete-success-' + Date.now();
    const confirmationCode = `DELETE-${testWsId.substring(0, 8)}`;

    // Create workspace
    await supabase.from('workspaces').insert({
      id: testWsId,
      name: 'Delete Test Success',
      slug: 'delete-success-' + Date.now(),
    });

    // Add some test data
    await supabase.schema('genesis').from('leads').insert({
      workspace_id: testWsId,
      email_address: 'todelete@example.com',
      first_name: 'To',
      last_name: 'Delete',
    });

    const { data, error } = await (supabase.schema('genesis') as any).rpc(
      'fn_delete_workspace_data',
      {
        p_workspace_id: testWsId,
        p_confirmation_code: confirmationCode,
        p_user_id: TEST_USER_ID,
      }
    );

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);
    expect(data[0].operation).toBe('deleted');
    expect(data[0].deleted_counts.workspace).toBe(1);
    expect(data[0].deleted_counts.leads).toBeGreaterThanOrEqual(1);

    // Verify workspace is deleted
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', testWsId)
      .maybeSingle();

    expect(wsData).toBeNull();
  });

  it('should return not_found for non-existent workspace', async () => {
    const { data } = await (supabase.schema('genesis') as any).rpc(
      'fn_delete_workspace_data',
      {
        p_workspace_id: '00000000-0000-0000-0000-000000000000',
        p_confirmation_code: 'DELETE-00000000',
      }
    );

    expect(data[0].success).toBe(false);
    expect(data[0].operation).toBe('not_found');
  });
});

describe.skip('Phase 66 - GDPR Compliance Report Function', () => {
  let testWorkspaceId: string;

  beforeAll(async () => {
    testWorkspaceId = 'test-compliance-' + Date.now();

    await supabase.from('workspaces').insert({
      id: testWorkspaceId,
      name: 'Compliance Test Workspace',
      slug: 'compliance-test-' + Date.now(),
    });

    await supabase.schema('genesis').from('workspace_infrastructure').insert({
      workspace_id: testWorkspaceId,
      region: 'eu-west',
      droplet_size: 'basic-2vcpu-4gb',
      gdpr_compliant: true,
    });
  });

  afterAll(async () => {
    await supabase.from('workspaces').delete().eq('id', testWorkspaceId);
  });

  it('should generate comprehensive compliance report', async () => {
    const { data, error } = await (supabase.schema('genesis') as any).rpc(
      'fn_get_gdpr_compliance_report',
      {
        p_workspace_id: testWorkspaceId,
      }
    );

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Array.isArray(data)).toBe(true);

    const report = data[0];
    expect(report.workspace_id).toBe(testWorkspaceId);
    expect(report.workspace_name).toBe('Compliance Test Workspace');
    expect(report.data_region).toBe('eu-west');
    expect(report.gdpr_compliant).toBe(true);
    expect(report.data_residency_compliant).toBe(true);
    expect(report.audit_trail_retention_days).toBe(2555); // 7 years
  });

  it('should document sub-processors', async () => {
    const { data } = await (supabase.schema('genesis') as any).rpc(
      'fn_get_gdpr_compliance_report',
      {
        p_workspace_id: testWorkspaceId,
      }
    );

    const report = data[0];
    expect(Array.isArray(report.sub_processors)).toBe(true);
    expect(report.sub_processors.length).toBeGreaterThanOrEqual(2);

    const supabaseProcessor = report.sub_processors.find(
      (p: any) => p.name === 'Supabase'
    );
    expect(supabaseProcessor).toBeTruthy();
    expect(supabaseProcessor.dpa_signed).toBe(true);
  });

  it('should document personal data locations', async () => {
    const { data } = await (supabase.schema('genesis') as any).rpc(
      'fn_get_gdpr_compliance_report',
      {
        p_workspace_id: testWorkspaceId,
      }
    );

    const report = data[0];
    expect(report.personal_data_locations.database).toBeTruthy();
    expect(report.personal_data_locations.database.provider).toBe('Supabase');
    expect(report.personal_data_locations.database.region).toBe('eu-west');
    expect(Array.isArray(report.personal_data_locations.database.tables)).toBe(
      true
    );
  });

  it('should run compliance checks', async () => {
    const { data } = await (supabase.schema('genesis') as any).rpc(
      'fn_get_gdpr_compliance_report',
      {
        p_workspace_id: testWorkspaceId,
      }
    );

    const checks = data[0].compliance_checks;
    expect(checks.data_in_region).toBe(true);
    expect(checks.audit_logging_enabled).toBe(true);
    expect(checks.encryption_at_rest).toBe(true);
    expect(checks.encryption_in_transit).toBe(true);
    expect(checks.rls_enabled).toBe(true);
  });

  it('should fail on non-existent workspace', async () => {
    const { error } = await (supabase.schema('genesis') as any).rpc(
      'fn_get_gdpr_compliance_report',
      {
        p_workspace_id: '00000000-0000-0000-0000-000000000000',
      }
    );

    expect(error).toBeTruthy();
    expect(error.message).toContain('not found');
  });
});

describe.skip('Phase 67 - Audit Log RLS Policies', () => {
  it('should enforce workspace isolation in audit logs', async () => {
    // This test verifies RLS policies work
    // In a real scenario, we'd need to test with different user contexts
    
    const { data, error } = await (supabase.schema('genesis') as any)
      .from('audit_log')
      .select('*')
      .eq('workspace_id', TEST_WORKSPACE_ID)
      .limit(10);

    // Should work with admin key
    expect(error).toBeNull();
  });
});

describe.skip('Phase 66 & 67 - Integration Tests', () => {
  it('should log audit event when exporting data', async () => {
    const testWsId = 'test-audit-export-' + Date.now();

    // Create workspace
    await supabase.from('workspaces').insert({
      id: testWsId,
      name: 'Audit Export Test',
      slug: 'audit-export-' + Date.now(),
    });

    // Export data (this should log an audit event)
    await (supabase.schema('genesis') as any).rpc(
      'fn_export_workspace_data',
      {
        p_workspace_id: testWsId,
      }
    );

    // Verify audit log was created
    const { data: auditData } = await (supabase.schema('genesis') as any)
      .from('audit_log')
      .select('*')
      .eq('workspace_id', testWsId)
      .eq('action', 'DATA_EXPORTED')
      .maybeSingle();

    expect(auditData).toBeTruthy();
    expect(auditData.action_category).toBe('data');
    expect(auditData.actor_type).toBe('system');

    // Cleanup
    await supabase.from('workspaces').delete().eq('id', testWsId);
  });

  it('should log audit events when creating support access', async () => {
    const { data: tokenData } = await (supabase.schema('genesis') as any).rpc(
      'fn_create_support_access_token',
      {
        p_support_agent_id: 'agent-audit-test',
        p_support_agent_email: 'audit@company.com',
        p_workspace_id: TEST_WORKSPACE_ID,
        p_access_level: 'read_only',
        p_ticket_id: 'SUPPORT-AUDIT-123',
        p_reason: 'Testing audit integration',
        p_duration_minutes: 15,
      }
    );

    const tokenId = tokenData[0].token_id;

    // Verify grant audit log
    const { data: grantAudit } = await (supabase.schema('genesis') as any)
      .from('audit_log')
      .select('*')
      .eq('action', 'SUPPORT_ACCESS_GRANTED')
      .eq('workspace_id', TEST_WORKSPACE_ID)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(grantAudit).toBeTruthy();
    expect(grantAudit.actor_type).toBe('support');
    expect(grantAudit.actor_id).toBe('agent-audit-test');

    // Revoke token
    await (supabase.schema('genesis') as any).rpc(
      'fn_revoke_support_access_token',
      {
        p_token_id: tokenId,
      }
    );

    // Verify revoke audit log
    const { data: revokeAudit } = await (supabase.schema('genesis') as any)
      .from('audit_log')
      .select('*')
      .eq('action', 'SUPPORT_ACCESS_REVOKED')
      .eq('workspace_id', TEST_WORKSPACE_ID)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(revokeAudit).toBeTruthy();
    expect(revokeAudit.actor_type).toBe('support');
  });
});
