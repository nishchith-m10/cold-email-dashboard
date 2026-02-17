/**
 * PHASE 43: STATE RECONCILIATION WATCHDOG - HEALING TESTS
 * 
 * Tests for drift healing functionality.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createWatchdogService,
  createMockWatchdogDB,
  createMockN8nClient,
  type WatchdogService,
  type MockWatchdogDB,
  type MockN8nClient,
  type DriftResult,
} from '@/lib/genesis/phase43/index';

describe('Phase 43: Drift Healing', () => {
  let watchdog: WatchdogService;
  let mockDB: MockWatchdogDB;
  let mockN8n: MockN8nClient;
  const testWorkspaceId = 'ws_test_123';

  beforeEach(() => {
    mockDB = createMockWatchdogDB();
    mockN8n = createMockN8nClient();
    watchdog = createWatchdogService(mockDB, mockN8n);
  });

  // ============================================
  // ORPHAN WORKFLOW HEALING
  // ============================================

  describe('Orphan Workflow Healing', () => {
    it('should heal orphan workflow by deleting it', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_orphan_1',
          workflowName: 'Orphan Workflow',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_orphan_1',
        name: 'Orphan Workflow',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const result = await watchdog.healDrift(drift);

      expect(result.success).toBe(true);
      expect(result.action).toBe('delete_workflow');
      expect(mockN8n.wasWorkflowDeleted('wf_orphan_1')).toBe(true);
    });

    it('should return workflow ID in healing result', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_orphan_1',
          workflowName: 'Test',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_orphan_1',
        name: 'Test',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const result = await watchdog.healDrift(drift);

      expect(result.details.workflowId).toBe('wf_orphan_1');
      expect(result.details.workflowName).toBe('Test');
    });

    it('should measure healing duration', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_orphan_1',
          workflowName: 'Test',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_orphan_1',
        name: 'Test',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const result = await watchdog.healDrift(drift);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('should update drift healedAt timestamp after successful healing', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_orphan_1',
          workflowName: 'Test',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_orphan_1',
        name: 'Test',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      await watchdog.healDrift(drift);

      expect(drift.healedAt).toBeInstanceOf(Date);
    });
  });

  // ============================================
  // STATE MISMATCH HEALING
  // ============================================

  describe('State Mismatch Healing', () => {
    it('should heal state mismatch by syncing to n8n state', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'state_mismatch',
        details: {
          workflowId: 'wf_1',
          campaignId: 'camp_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
        severity: 'high',
        autoHealable: true,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.success).toBe(true);
      expect(result.action).toBe('sync_state');
      expect(result.details.updatedStatus).toBe('inactive');
    });

    it('should use n8n state as source of truth', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'state_mismatch',
        details: {
          workflowId: 'wf_1',
          campaignId: 'camp_1',
          dbStatus: 'inactive',
          n8nStatus: 'active',
        },
        severity: 'high',
        autoHealable: true,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.success).toBe(true);
      expect(result.details.updatedStatus).toBe('active');
    });

    it('should include workflow ID in healing result', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'state_mismatch',
        details: {
          workflowId: 'wf_123',
          campaignId: 'camp_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
        severity: 'high',
        autoHealable: true,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.details.workflowId).toBe('wf_123');
    });
  });

  // ============================================
  // NON-AUTO-HEALABLE DRIFTS
  // ============================================

  describe('Non-Auto-Healable Drifts', () => {
    it('should skip healing for non-auto-healable drifts', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'credential_invalid',
        details: {
          credentialId: 'cred_1',
          credentialName: 'OAuth',
          credentialType: 'google_oauth2',
          issue: 'expired',
        },
        severity: 'high',
        autoHealable: false,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.success).toBe(false);
      expect(result.action).toBe('skipped');
      expect(result.error).toContain('manual intervention');
    });

    it('should return appropriate error message for non-auto-healable drift', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'missing_partition',
        details: {},
        severity: 'critical',
        autoHealable: false,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing_partition');
    });

    it('should not increment healing attempts for skipped drifts', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'credential_invalid',
        details: {
          credentialId: 'cred_1',
        },
        severity: 'high',
        autoHealable: false,
        healingAttempts: 0,
      };

      await watchdog.healDrift(drift);

      expect(drift.healingAttempts).toBe(0);
    });
  });

  // ============================================
  // HEALING FAILURES
  // ============================================

  describe('Healing Failures', () => {
    it('should increment healing attempts on failure', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_nonexistent',
          workflowName: 'Test',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      // Don't add the workflow to mock n8n, so deletion will fail
      await watchdog.healDrift(drift);

      expect(drift.healingAttempts).toBe(1);
    });

    it('should store last error message on failure', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_nonexistent',
          workflowName: 'Test',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      await watchdog.healDrift(drift);

      expect(drift.lastError).toBeTruthy();
      expect(typeof drift.lastError).toBe('string');
    });

    it('should return failure result with error details', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_nonexistent',
          workflowName: 'Test',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.success).toBe(false);
      expect(result.action).toBe('failed');
      expect(result.error).toBeTruthy();
    });

    it('should include attempt count in failure result', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'orphan_workflow',
        details: {
          workflowId: 'wf_nonexistent',
          workflowName: 'Test',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 2,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.details.attempts).toBe(3); // 2 + 1
    });
  });

  // ============================================
  // BULK HEALING
  // ============================================

  describe('Bulk Healing', () => {
    it('should heal multiple drifts', async () => {
      const drifts: DriftResult[] = [
        {
          workspaceId: testWorkspaceId,
          driftType: 'orphan_workflow',
          details: {
            workflowId: 'wf_1',
            workflowName: 'Test 1',
          },
          severity: 'medium',
          autoHealable: true,
          healingAttempts: 0,
        },
        {
          workspaceId: testWorkspaceId,
          driftType: 'orphan_workflow',
          details: {
            workflowId: 'wf_2',
            workflowName: 'Test 2',
          },
          severity: 'medium',
          autoHealable: true,
          healingAttempts: 0,
        },
      ];

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_1',
        name: 'Test 1',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_2',
        name: 'Test 2',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const results = await watchdog.healAllDrifts(drifts);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should skip already healed drifts', async () => {
      const drifts: DriftResult[] = [
        {
          workspaceId: testWorkspaceId,
          driftType: 'orphan_workflow',
          details: {
            workflowId: 'wf_1',
            workflowName: 'Test',
          },
          severity: 'medium',
          autoHealable: true,
          healingAttempts: 0,
          healedAt: new Date(), // Already healed
        },
      ];

      const results = await watchdog.healAllDrifts(drifts);

      expect(results).toHaveLength(0); // Skipped
    });

    it('should skip drifts that reached max attempts', async () => {
      const drifts: DriftResult[] = [
        {
          workspaceId: testWorkspaceId,
          driftType: 'orphan_workflow',
          details: {
            workflowId: 'wf_1',
            workflowName: 'Test',
          },
          severity: 'medium',
          autoHealable: true,
          healingAttempts: 3, // Max attempts reached
        },
      ];

      const results = await watchdog.healAllDrifts(drifts);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].action).toBe('skipped');
      expect(results[0].error).toContain('Max healing attempts');
    });

    it('should continue healing if one drift fails', async () => {
      const drifts: DriftResult[] = [
        {
          workspaceId: testWorkspaceId,
          driftType: 'orphan_workflow',
          details: {
            workflowId: 'wf_nonexistent',
            workflowName: 'Will Fail',
          },
          severity: 'medium',
          autoHealable: true,
          healingAttempts: 0,
        },
        {
          workspaceId: testWorkspaceId,
          driftType: 'orphan_workflow',
          details: {
            workflowId: 'wf_success',
            workflowName: 'Will Succeed',
          },
          severity: 'medium',
          autoHealable: true,
          healingAttempts: 0,
        },
      ];

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_success',
        name: 'Will Succeed',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const results = await watchdog.healAllDrifts(drifts);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false); // Failed
      expect(results[1].success).toBe(true); // Succeeded
    });

    it('should handle empty drift list', async () => {
      const results = await watchdog.healAllDrifts([]);

      expect(results).toHaveLength(0);
    });

    it('should return results in same order as input drifts', async () => {
      const drifts: DriftResult[] = [
        {
          workspaceId: testWorkspaceId,
          driftType: 'orphan_workflow',
          details: {
            workflowId: 'wf_1',
            workflowName: 'First',
          },
          severity: 'medium',
          autoHealable: true,
          healingAttempts: 0,
        },
        {
          workspaceId: testWorkspaceId,
          driftType: 'state_mismatch',
          details: {
            workflowId: 'wf_2',
            campaignId: 'camp_2',
            dbStatus: 'active',
            n8nStatus: 'inactive',
          },
          severity: 'high',
          autoHealable: true,
          healingAttempts: 0,
        },
      ];

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_1',
        name: 'First',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const results = await watchdog.healAllDrifts(drifts);

      expect(results[0].action).toBe('delete_workflow');
      expect(results[1].action).toBe('sync_state');
    });
  });

  // ============================================
  // HEALING STRATEGIES
  // ============================================

  describe('Healing Strategies', () => {
    it('should return healing strategy for orphan_workflow', () => {
      const strategy = watchdog.getHealingStrategy('orphan_workflow');

      expect(strategy).toBeTruthy();
      expect(strategy?.action).toBe('delete_workflow');
      expect(strategy?.autoHealable).toBe(true);
    });

    it('should return healing strategy for state_mismatch', () => {
      const strategy = watchdog.getHealingStrategy('state_mismatch');

      expect(strategy).toBeTruthy();
      expect(strategy?.action).toBe('sync_state');
      expect(strategy?.autoHealable).toBe(true);
    });

    it('should return healing strategy for credential_invalid', () => {
      const strategy = watchdog.getHealingStrategy('credential_invalid');

      expect(strategy).toBeTruthy();
      expect(strategy?.action).toBe('credential_rotation');
      expect(strategy?.autoHealable).toBe(false);
    });

    it('should return healing strategy for missing_partition', () => {
      const strategy = watchdog.getHealingStrategy('missing_partition');

      expect(strategy).toBeTruthy();
      expect(strategy?.action).toBe('manual_partition_creation');
      expect(strategy?.autoHealable).toBe(false);
    });

    it('should include description in healing strategy', () => {
      const strategy = watchdog.getHealingStrategy('orphan_workflow');

      expect(strategy?.description).toBeTruthy();
      expect(typeof strategy?.description).toBe('string');
    });
  });

  // ============================================
  // WEBHOOKMISMATCH HEALING
  // ============================================

  describe('Webhook Mismatch Healing', () => {
    it('should heal webhook mismatch', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'webhook_mismatch',
        details: {
          workflowId: 'wf_1',
          expectedUrl: 'https://correct.url',
          actualUrl: 'https://wrong.url',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.success).toBe(true);
      expect(result.action).toBe('update_webhook');
    });

    it('should include drift details in result', async () => {
      const drift: DriftResult = {
        workspaceId: testWorkspaceId,
        driftType: 'webhook_mismatch',
        details: {
          workflowId: 'wf_1',
          expectedUrl: 'https://correct.url',
        },
        severity: 'medium',
        autoHealable: true,
        healingAttempts: 0,
      };

      const result = await watchdog.healDrift(drift);

      expect(result.details.workflowId).toBe('wf_1');
      expect(result.details.expectedUrl).toBe('https://correct.url');
    });
  });
});
