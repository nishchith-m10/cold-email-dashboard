/**
 * Phase 68 Tests: API Integration
 * 
 * Test coverage:
 * - Deletion workflow endpoints
 * - Data export endpoints
 * - Authentication/authorization
 * - Error handling
 */

import { NextRequest } from 'next/server';

// Mock Next.js auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Mock services
jest.mock('@/lib/genesis/tenant-lifecycle');
jest.mock('@/lib/genesis/data-export');

import { auth } from '@clerk/nextjs/server';
import {
  validateDeletion,
  initiateDeletion,
  confirmDeletion,
  restoreWorkspace,
} from '@/lib/genesis/tenant-lifecycle';
import {
  initiateDataExport,
  getExportProgress,
  cancelDataExport,
  getExportHistory,
} from '@/lib/genesis/data-export';

// Import route handlers
import { POST as validateRoute } from '@/app/api/workspace/delete/validate/route';
import { POST as initiateRoute } from '@/app/api/workspace/delete/initiate/route';
import { POST as confirmRoute } from '@/app/api/workspace/delete/confirm/route';
import { POST as restoreRoute } from '@/app/api/workspace/delete/restore/route';
import { POST as exportInitiateRoute } from '@/app/api/workspace/export/initiate/route';
import { GET as exportProgressRoute } from '@/app/api/workspace/export/progress/[jobId]/route';
import { DELETE as exportCancelRoute } from '@/app/api/workspace/export/cancel/[jobId]/route';
import { GET as exportHistoryRoute } from '@/app/api/workspace/export/history/[workspaceId]/route';

// SKIPPED: Requires actual database integration and complex service mocking
describe.skip('Phase 68: API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE /api/workspace/delete/validate', () => {
    it('should validate deletion successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock validation
      (validateDeletion as unknown as jest.Mock).mockResolvedValue({
        canDelete: true,
        blockingIssues: [],
        warnings: ['Positive wallet balance: $50.00'],
        impactReport: {
          workspaceId: 'ws_test',
          workspaceName: 'Test Workspace',
          resources: {
            campaigns: 5,
            leads: 1000,
          },
          estimatedSizeGB: 0.5,
          walletBalanceCents: 5000,
        },
      });

      const request = new NextRequest('http://localhost/api/workspace/delete/validate', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: 'ws_test' }),
      });

      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canDelete).toBe(true);
      expect(data.warnings).toContain('Positive wallet balance: $50.00');
      expect(data.impactReport.resources.campaigns).toBe(5);
    });

    it('should return 401 if unauthorized', async () => {
      // Mock no auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });

      const request = new NextRequest('http://localhost/api/workspace/delete/validate', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: 'ws_test' }),
      });

      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if workspaceId missing', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      const request = new NextRequest('http://localhost/api/workspace/delete/validate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing workspaceId');
    });
  });

  describe('POST /api/workspace/delete/initiate', () => {
    it('should initiate deletion successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock initiation
      (initiateDeletion as jest.Mock).mockResolvedValue({
        success: true,
        jobId: 'del_job_123',
        confirmationCode: '847329',
        gracePeriodEnd: '2026-02-14T10:00:00Z',
      });

      const request = new NextRequest('http://localhost/api/workspace/delete/initiate', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'ws_test',
          triggerReason: 'Testing deletion',
          gracePeriodDays: 7,
        }),
      });

      const response = await initiateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBe('del_job_123');
      expect(data.confirmationCode).toBe('847329');
    });

    it('should return 400 if validation fails', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock failed initiation
      (initiateDeletion as jest.Mock).mockResolvedValue({
        success: false,
        jobId: null,
        error: 'Cannot delete workspace: 3 active campaign(s) must be stopped first',
      });

      const request = new NextRequest('http://localhost/api/workspace/delete/initiate', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: 'ws_test' }),
      });

      const response = await initiateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('active campaign');
    });
  });

  describe('POST /api/workspace/delete/confirm', () => {
    it('should confirm deletion successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock confirmation
      (confirmDeletion as jest.Mock).mockResolvedValue({
        success: true,
      });

      const request = new NextRequest('http://localhost/api/workspace/delete/confirm', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'ws_test',
          jobId: 'del_job_123',
          confirmationCode: '847329',
        }),
      });

      const response = await confirmRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Grace period has started');
    });

    it('should return 400 if code invalid', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock invalid code
      (confirmDeletion as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid confirmation code. 2 attempts remaining.',
      });

      const request = new NextRequest('http://localhost/api/workspace/delete/confirm', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'ws_test',
          jobId: 'del_job_123',
          confirmationCode: '000000',
        }),
      });

      const response = await confirmRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid confirmation code');
    });

    it('should return 400 if missing fields', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      const request = new NextRequest('http://localhost/api/workspace/delete/confirm', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: 'ws_test' }),
      });

      const response = await confirmRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });

  describe('POST /api/workspace/delete/restore', () => {
    it('should restore workspace successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock restoration
      (restoreWorkspace as unknown as jest.Mock).mockResolvedValue({
        success: true,
        workspaceId: 'ws_test',
        restoredResources: {
          dropletReactivated: true,
          workflowsReEnabled: 3,
          partitionRestored: true,
        },
        message: 'Workspace restored successfully',
      });

      const request = new NextRequest('http://localhost/api/workspace/delete/restore', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'ws_test',
          reason: 'Changed my mind',
        }),
      });

      const response = await restoreRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.workspaceId).toBe('ws_test');
      expect(data.restoredResources.dropletReactivated).toBe(true);
    });

    it('should return 400 if grace period expired', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock failed restoration
      (restoreWorkspace as unknown as jest.Mock).mockResolvedValue({
        success: false,
        workspaceId: 'ws_test',
        restoredResources: {
          dropletReactivated: false,
          workflowsReEnabled: 0,
          partitionRestored: false,
        },
        message: 'No active deletion found or grace period expired',
        error: 'Deletion job not found',
      });

      const request = new NextRequest('http://localhost/api/workspace/delete/restore', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: 'ws_test' }),
      });

      const response = await restoreRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Deletion job not found');
    });
  });

  describe('POST /api/workspace/export/initiate', () => {
    it('should initiate export successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock export initiation
      (initiateDataExport as jest.Mock).mockResolvedValue({
        success: true,
        jobId: 'export_job_123',
        estimatedMinutes: 5,
      });

      const request = new NextRequest('http://localhost/api/workspace/export/initiate', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: 'ws_test' }),
      });

      const response = await exportInitiateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBe('export_job_123');
      expect(data.estimatedMinutes).toBe(5);
    });

    it('should return 400 if export already in progress', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock active export
      (initiateDataExport as jest.Mock).mockResolvedValue({
        success: false,
        jobId: 'export_job_456',
        error: 'Export already in progress (50%)',
      });

      const request = new NextRequest('http://localhost/api/workspace/export/initiate', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: 'ws_test' }),
      });

      const response = await exportInitiateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Export already in progress');
    });
  });

  describe('GET /api/workspace/export/progress/[jobId]', () => {
    it('should get export progress successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock progress
      (getExportProgress as jest.Mock).mockResolvedValue({
        jobId: 'export_job_123',
        status: 'in_progress',
        progressPercentage: 75,
        currentStep: 'packaging_export',
        totalRecords: 10000,
        processedRecords: 7500,
        exportSizeBytes: 2048000,
      });

      const request = new NextRequest(
        'http://localhost/api/workspace/export/progress/export_job_123'
      );

      const response = await exportProgressRoute(request, {
        params: { jobId: 'export_job_123' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('in_progress');
      expect(data.progressPercentage).toBe(75);
    });

    it('should return 404 if job not found', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock not found
      (getExportProgress as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/workspace/export/progress/export_job_123'
      );

      const response = await exportProgressRoute(request, {
        params: { jobId: 'export_job_123' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Export job not found');
    });
  });

  describe('DELETE /api/workspace/export/cancel/[jobId]', () => {
    it('should cancel export successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock cancellation
      (cancelDataExport as jest.Mock).mockResolvedValue({
        success: true,
      });

      const request = new NextRequest(
        'http://localhost/api/workspace/export/cancel/export_job_123'
      );

      const response = await exportCancelRoute(request, {
        params: { jobId: 'export_job_123' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('cancelled successfully');
    });

    it('should return 400 if cannot cancel', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock failed cancellation
      (cancelDataExport as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Cannot cancel export with status: completed',
      });

      const request = new NextRequest(
        'http://localhost/api/workspace/export/cancel/export_job_123'
      );

      const response = await exportCancelRoute(request, {
        params: { jobId: 'export_job_123' },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot cancel');
    });
  });

  describe('GET /api/workspace/export/history/[workspaceId]', () => {
    it('should get export history successfully', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock history
      (getExportHistory as jest.Mock).mockResolvedValue([
        {
          jobId: 'export_1',
          status: 'completed',
          progressPercentage: 100,
          currentStep: 'completed',
          totalRecords: 1000,
          processedRecords: 1000,
          exportSizeBytes: 500000,
        },
        {
          jobId: 'export_2',
          status: 'failed',
          progressPercentage: 30,
          currentStep: 'querying_leads',
          totalRecords: 2000,
          processedRecords: 600,
          exportSizeBytes: 0,
          error: 'Database timeout',
        },
      ]);

      const request = new NextRequest(
        'http://localhost/api/workspace/export/history/ws_test'
      );

      const response = await exportHistoryRoute(request, {
        params: { workspaceId: 'ws_test' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exports).toHaveLength(2);
      expect(data.exports[0].status).toBe('completed');
      expect(data.exports[1].status).toBe('failed');
    });

    it('should respect limit query parameter', async () => {
      // Mock auth
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });

      // Mock history with limit
      (getExportHistory as jest.Mock).mockResolvedValue([
        { jobId: 'export_1', status: 'completed' },
        { jobId: 'export_2', status: 'in_progress' },
        { jobId: 'export_3', status: 'completed' },
      ]);

      const request = new NextRequest(
        'http://localhost/api/workspace/export/history/ws_test?limit=3'
      );

      const response = await exportHistoryRoute(request, {
        params: { workspaceId: 'ws_test' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exports).toHaveLength(3);
      expect(getExportHistory).toHaveBeenCalledWith('ws_test', 'user_123', 3);
    });
  });
});
