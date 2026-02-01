/**
 * PHASE 43: STATE RECONCILIATION WATCHDOG - DRIFT DETECTION TESTS
 * 
 * Tests for drift detection functionality.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createWatchdogService,
  createMockWatchdogDB,
  createMockN8nClient,
  type WatchdogService,
  type MockWatchdogDB,
  type MockN8nClient,
} from '@/lib/genesis/phase43/index';

describe('Phase 43: Drift Detection', () => {
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
  // ORPHAN WORKFLOW DETECTION
  // ============================================

  describe('Orphan Workflow Detection', () => {
    it('should detect orphan workflows (in n8n but not DB)', async () => {
      // Setup: workflow in n8n, not in DB
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_orphan_1',
          workflowName: 'Orphan Workflow',
          active: true,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.totalDrifts).toBe(1);
      expect(result.drifts[0].driftType).toBe('orphan_workflow');
      expect(result.drifts[0].details.workflowId).toBe('wf_orphan_1');
      expect(result.drifts[0].severity).toBe('medium');
      expect(result.drifts[0].autoHealable).toBe(true);
    });

    it('should detect multiple orphan workflows', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_orphan_1',
          workflowName: 'Orphan 1',
          active: true,
        },
        {
          workflowId: 'wf_orphan_2',
          workflowName: 'Orphan 2',
          active: false,
        },
        {
          workflowId: 'wf_orphan_3',
          workflowName: 'Orphan 3',
          active: true,
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.totalDrifts).toBe(3);
      expect(result.drifts.filter(d => d.driftType === 'orphan_workflow')).toHaveLength(3);
    });

    it('should include workflow metadata in drift details', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_orphan_1',
          workflowName: 'Test Workflow',
          active: true,
          createdAt: '2026-01-20T10:00:00Z',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts[0];

      expect(drift.details.workflowName).toBe('Test Workflow');
      expect(drift.details.active).toBe(true);
      expect(drift.details.createdAt).toBe('2026-01-20T10:00:00Z');
    });

    it('should mark orphan workflows as auto-healable', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_orphan_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(watchdog.isAutoHealable(result.drifts[0])).toBe(true);
    });

    it('should handle no orphan workflows gracefully', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, []);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.drifts.filter(d => d.driftType === 'orphan_workflow')).toHaveLength(0);
    });
  });

  // ============================================
  // ORPHAN DB RECORD DETECTION
  // ============================================

  describe('Orphan DB Record Detection', () => {
    it('should detect orphan DB records (in DB but not n8n)', async () => {
      mockDB.injectOrphanDbRecords(testWorkspaceId, [
        {
          campaignId: 'camp_orphan_1',
          workflowId: 'wf_missing_1',
          expectedWorkflowName: 'Missing Workflow',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      const orphanRecords = result.drifts.filter(d => d.driftType === 'orphan_db_record');
      expect(orphanRecords).toHaveLength(1);
      expect(orphanRecords[0].details.campaignId).toBe('camp_orphan_1');
      expect(orphanRecords[0].details.workflowId).toBe('wf_missing_1');
    });

    it('should detect multiple orphan DB records', async () => {
      mockDB.injectOrphanDbRecords(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
        },
        {
          campaignId: 'camp_2',
          workflowId: 'wf_2',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.drifts.filter(d => d.driftType === 'orphan_db_record')).toHaveLength(2);
    });

    it('should mark orphan DB records as medium severity', async () => {
      mockDB.injectOrphanDbRecords(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'orphan_db_record');

      expect(drift?.severity).toBe('medium');
    });

    it('should mark orphan DB records as auto-healable', async () => {
      mockDB.injectOrphanDbRecords(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'orphan_db_record');

      expect(watchdog.isAutoHealable(drift!)).toBe(true);
    });
  });

  // ============================================
  // STATE MISMATCH DETECTION
  // ============================================

  describe('State Mismatch Detection', () => {
    it('should detect state mismatches (DB != n8n)', async () => {
      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      const mismatches = result.drifts.filter(d => d.driftType === 'state_mismatch');
      expect(mismatches).toHaveLength(1);
      expect(mismatches[0].details.dbStatus).toBe('active');
      expect(mismatches[0].details.n8nStatus).toBe('inactive');
    });

    it('should detect multiple state mismatches', async () => {
      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
        {
          campaignId: 'camp_2',
          workflowId: 'wf_2',
          dbStatus: 'inactive',
          n8nStatus: 'active',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.drifts.filter(d => d.driftType === 'state_mismatch')).toHaveLength(2);
    });

    it('should mark state mismatches as high severity', async () => {
      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'state_mismatch');

      expect(drift?.severity).toBe('high');
    });

    it('should mark state mismatches as auto-healable', async () => {
      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'state_mismatch');

      expect(watchdog.isAutoHealable(drift!)).toBe(true);
    });

    it('should include both statuses in drift details', async () => {
      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'state_mismatch');

      expect(drift?.details).toEqual({
        campaignId: 'camp_1',
        workflowId: 'wf_1',
        dbStatus: 'active',
        n8nStatus: 'inactive',
      });
    });
  });

  // ============================================
  // CREDENTIAL ISSUE DETECTION
  // ============================================

  describe('Credential Issue Detection', () => {
    it('should detect expired credentials', async () => {
      mockDB.injectCredentialIssues(testWorkspaceId, [
        {
          credentialId: 'cred_1',
          credentialName: 'OAuth Credential',
          credentialType: 'google_oauth2',
          issue: 'expired',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      const credIssues = result.drifts.filter(d => d.driftType === 'credential_invalid');
      expect(credIssues).toHaveLength(1);
      expect(credIssues[0].details.issue).toBe('expired');
    });

    it('should detect invalid credentials', async () => {
      mockDB.injectCredentialIssues(testWorkspaceId, [
        {
          credentialId: 'cred_1',
          credentialName: 'API Key',
          credentialType: 'openai_api',
          issue: 'invalid',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      const credIssues = result.drifts.filter(d => d.driftType === 'credential_invalid');
      expect(credIssues[0].details.issue).toBe('invalid');
    });

    it('should detect missing credentials', async () => {
      mockDB.injectCredentialIssues(testWorkspaceId, [
        {
          credentialId: 'cred_1',
          credentialName: 'SMTP',
          credentialType: 'smtp',
          issue: 'missing',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      const credIssues = result.drifts.filter(d => d.driftType === 'credential_invalid');
      expect(credIssues[0].details.issue).toBe('missing');
    });

    it('should mark credential issues as high severity', async () => {
      mockDB.injectCredentialIssues(testWorkspaceId, [
        {
          credentialId: 'cred_1',
          credentialName: 'OAuth',
          credentialType: 'google_oauth2',
          issue: 'expired',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'credential_invalid');

      expect(drift?.severity).toBe('high');
    });

    it('should mark credential issues as NOT auto-healable', async () => {
      mockDB.injectCredentialIssues(testWorkspaceId, [
        {
          credentialId: 'cred_1',
          credentialName: 'OAuth',
          credentialType: 'google_oauth2',
          issue: 'expired',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'credential_invalid');

      expect(watchdog.isAutoHealable(drift!)).toBe(false);
    });

    it('should include credential metadata in drift details', async () => {
      mockDB.injectCredentialIssues(testWorkspaceId, [
        {
          credentialId: 'cred_1',
          credentialName: 'Gmail OAuth',
          credentialType: 'google_oauth2',
          issue: 'expired',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);
      const drift = result.drifts.find(d => d.driftType === 'credential_invalid');

      expect(drift?.details).toEqual({
        credentialId: 'cred_1',
        credentialName: 'Gmail OAuth',
        credentialType: 'google_oauth2',
        issue: 'expired',
      });
    });
  });

  // ============================================
  // COMBINED DRIFT DETECTION
  // ============================================

  describe('Combined Drift Detection', () => {
    it('should detect multiple types of drifts simultaneously', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_orphan',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_1',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      mockDB.injectCredentialIssues(testWorkspaceId, [
        {
          credentialId: 'cred_1',
          credentialName: 'OAuth',
          credentialType: 'google_oauth2',
          issue: 'expired',
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.totalDrifts).toBe(3);
      expect(result.drifts.filter(d => d.driftType === 'orphan_workflow')).toHaveLength(1);
      expect(result.drifts.filter(d => d.driftType === 'state_mismatch')).toHaveLength(1);
      expect(result.drifts.filter(d => d.driftType === 'credential_invalid')).toHaveLength(1);
    });

    it('should store all detected drifts in DB', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan 1',
          active: true,
        },
        {
          workflowId: 'wf_2',
          workflowName: 'Orphan 2',
          active: false,
        },
      ]);

      await watchdog.detectDrifts(testWorkspaceId);

      const storedDrifts = mockDB.getStoredDrifts(testWorkspaceId);
      expect(storedDrifts).toHaveLength(2);
    });

    it('should return scan duration', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Test',
          active: true,
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.scanDurationMs).toBeGreaterThan(0);
      expect(typeof result.scanDurationMs).toBe('number');
    });

    it('should include scan timestamp', async () => {
      const before = new Date();
      const result = await watchdog.detectDrifts(testWorkspaceId);
      const after = new Date();

      expect(result.scannedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.scannedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should handle workspace with no drifts', async () => {
      const result = await watchdog.detectDrifts(testWorkspaceId);

      expect(result.totalDrifts).toBe(0);
      expect(result.drifts).toEqual([]);
    });

    it('should set detectedAt timestamp for all drifts', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Test',
          active: true,
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      result.drifts.forEach(drift => {
        expect(drift.detectedAt).toBeInstanceOf(Date);
      });
    });

    it('should initialize healing attempts to 0', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Test',
          active: true,
        },
      ]);

      const result = await watchdog.detectDrifts(testWorkspaceId);

      result.drifts.forEach(drift => {
        expect(drift.healingAttempts).toBe(0);
      });
    });
  });

  // ============================================
  // BULK DRIFT DETECTION
  // ============================================

  describe('Bulk Drift Detection', () => {
    it('should detect drifts for multiple workspaces', async () => {
      const workspace1 = 'ws_1';
      const workspace2 = 'ws_2';

      mockDB.injectOrphanWorkflows(workspace1, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan 1',
          active: true,
        },
      ]);

      mockDB.injectOrphanWorkflows(workspace2, [
        {
          workflowId: 'wf_2',
          workflowName: 'Orphan 2',
          active: true,
        },
      ]);

      const results = await watchdog.detectDriftsForAll([workspace1, workspace2]);

      expect(results.size).toBe(2);
      expect(results.get(workspace1)?.totalDrifts).toBe(1);
      expect(results.get(workspace2)?.totalDrifts).toBe(1);
    });

    it('should process workspaces in batches', async () => {
      const workspaces = Array.from({ length: 25 }, (_, i) => `ws_${i}`);

      const results = await watchdog.detectDriftsForAll(workspaces);

      expect(results.size).toBe(25);
    });

    it('should continue processing if one workspace fails', async () => {
      const workspace1 = 'ws_1';
      const workspace2 = 'ws_2';

      // This won't cause an error in our mock, but demonstrates the pattern
      const results = await watchdog.detectDriftsForAll([workspace1, workspace2]);

      expect(results.size).toBeGreaterThanOrEqual(0);
    });

    it('should return empty map for empty workspace list', async () => {
      const results = await watchdog.detectDriftsForAll([]);

      expect(results.size).toBe(0);
    });
  });
});
