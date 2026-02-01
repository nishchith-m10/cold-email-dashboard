/**
 * PHASE 43: STATE RECONCILIATION WATCHDOG - RUN TESTS
 * 
 * Tests for complete watchdog run functionality.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createWatchdogService,
  createMockWatchdogDB,
  createMockN8nClient,
  type WatchdogService,
  type MockWatchdogDB,
  type MockN8nClient,
  type WatchdogEvent,
} from '@/lib/genesis/phase43/index';

describe('Phase 43: Watchdog Run', () => {
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
  // BASIC RUN FUNCTIONALITY
  // ============================================

  describe('Basic Run', () => {
    it('should complete a full watchdog run', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
        initiatedBy: 'user_123',
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.runId).toBeTruthy();
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('should scan specified workspaces', async () => {
      const event: WatchdogEvent = {
        trigger: 'scheduled',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId, 'ws_2', 'ws_3'],
      }, event);

      expect(result.workspacesScanned).toBe(3);
    });

    it('should detect drifts during run', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsDetected).toBe(1);
      expect(result.drifts).toHaveLength(1);
    });

    it('should return zero drifts when none detected', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.totalDrifts).toBe(0);
      expect(result.driftsDetected).toBe(0);
    });
  });

  // ============================================
  // AUTO-HEALING
  // ============================================

  describe('Auto-Healing During Run', () => {
    it('should heal drifts when autoHeal is true', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_1',
        name: 'Orphan',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsHealed).toBe(1);
      expect(result.driftsFailed).toBe(0);
    });

    it('should not heal drifts when autoHeal is false', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsHealed).toBe(0);
    });

    it('should not heal drifts in dry run mode', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: true,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsHealed).toBe(0);
    });

    it('should track failed healing attempts', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_nonexistent',
          workflowName: 'Will Fail',
          active: true,
        },
      ]);

      // Don't add workflow to n8n, so healing will fail

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsFailed).toBe(1);
      expect(result.driftsHealed).toBe(0);
    });

    it('should heal multiple drifts in a single run', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan 1',
          active: true,
        },
        {
          workflowId: 'wf_2',
          workflowName: 'Orphan 2',
          active: true,
        },
      ]);

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_1',
        name: 'Orphan 1',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      mockN8n.addWorkflow(testWorkspaceId, {
        id: 'wf_2',
        name: 'Orphan 2',
        active: true,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      });

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsHealed).toBe(2);
    });
  });

  // ============================================
  // DRIFT FILTERING
  // ============================================

  describe('Drift Type Filtering', () => {
    it('should filter drifts by type when specified', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_2',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
        driftTypes: ['orphan_workflow'],
      }, event);

      expect(result.totalDrifts).toBe(1);
      expect(result.drifts[0].driftType).toBe('orphan_workflow');
    });

    it('should include multiple drift types when specified', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_2',
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

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
        driftTypes: ['orphan_workflow', 'state_mismatch'],
      }, event);

      expect(result.totalDrifts).toBe(2);
    });
  });

  // ============================================
  // STATISTICS
  // ============================================

  describe('Run Statistics', () => {
    it('should calculate drifts by type', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan 1',
          active: true,
        },
        {
          workflowId: 'wf_2',
          workflowName: 'Orphan 2',
          active: true,
        },
      ]);

      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_3',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsByType.orphan_workflow).toBe(2);
      expect(result.driftsByType.state_mismatch).toBe(1);
    });

    it('should calculate drifts by severity', async () => {
      mockDB.injectOrphanWorkflows(testWorkspaceId, [
        {
          workflowId: 'wf_1',
          workflowName: 'Orphan',
          active: true,
        },
      ]);

      mockDB.injectStateMismatches(testWorkspaceId, [
        {
          campaignId: 'camp_1',
          workflowId: 'wf_2',
          dbStatus: 'active',
          n8nStatus: 'inactive',
        },
      ]);

      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.driftsBySeverity.medium).toBe(1); // orphan_workflow
      expect(result.driftsBySeverity.high).toBe(1); // state_mismatch
    });

    it('should measure total duration', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.completedAt.getTime() - result.startedAt.getTime()).toBeGreaterThanOrEqual(result.durationMs);
    });

    it('should track workspace count', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: ['ws_1', 'ws_2', 'ws_3', 'ws_4', 'ws_5'],
      }, event);

      expect(result.workspacesScanned).toBe(5);
    });
  });

  // ============================================
  // TRIGGER TYPES
  // ============================================

  describe('Trigger Types', () => {
    it('should handle scheduled trigger', async () => {
      const event: WatchdogEvent = {
        trigger: 'scheduled',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.runId).toBeTruthy();
    });

    it('should handle heartbeat trigger', async () => {
      const event: WatchdogEvent = {
        trigger: 'heartbeat',
        workspaceId: testWorkspaceId,
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.runId).toBeTruthy();
    });

    it('should handle manual trigger with initiator', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        initiatedBy: 'user_admin_123',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.runId).toBeTruthy();
    });

    it('should handle post_deployment trigger', async () => {
      const event: WatchdogEvent = {
        trigger: 'post_deployment',
        timestamp: new Date(),
        metadata: {
          deploymentId: 'deploy_123',
        },
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.runId).toBeTruthy();
    });

    it('should handle post_rotation trigger', async () => {
      const event: WatchdogEvent = {
        trigger: 'post_rotation',
        timestamp: new Date(),
        metadata: {
          rotationId: 'rotation_123',
        },
      };

      const result = await watchdog.run({
        autoHeal: true,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.runId).toBeTruthy();
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should include errors in result', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should have empty errors array on successful run', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        dryRun: false,
        workspaceIds: [testWorkspaceId],
      }, event);

      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================
  // DEFAULT CONFIG
  // ============================================

  describe('Default Configuration', () => {
    it('should use default config when not specified', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        workspaceIds: [testWorkspaceId],
      } as any, event);

      expect(result.runId).toBeTruthy();
    });

    it('should merge provided config with defaults', async () => {
      const event: WatchdogEvent = {
        trigger: 'manual',
        timestamp: new Date(),
      };

      const result = await watchdog.run({
        autoHeal: false,
        workspaceIds: [testWorkspaceId],
      } as any, event);

      expect(result.runId).toBeTruthy();
    });
  });
});
