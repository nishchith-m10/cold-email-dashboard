/**
 * PHASE 45: WORKFLOW TRIGGER SERVICE
 * 
 * Triggers n8n workflows via the Sidecar Agent for sandbox testing.
 * Handles both real Sidecar execution and mock fallback.
 * 
 * Flow:
 * 1. Resolve workspace → Sidecar URL
 * 2. POST to Sidecar /trigger-test
 * 3. Sidecar triggers n8n, gets executionId
 * 4. Return { executionId, streamUrl }
 */

import type {
  TriggerTestRequest,
  TriggerTestResponse,
  SidecarTriggerPayload,
  SidecarTriggerResponse,
} from './types';

// ============================================
// DATABASE INTERFACE (for workspace/sidecar lookup)
// ============================================

export interface WorkspaceLookupDB {
  getSidecarUrl(workspaceId: string): Promise<string | null>;
}

// ============================================
// SIDECAR CLIENT INTERFACE
// ============================================

export interface SidecarClient {
  triggerTest(sidecarUrl: string, payload: SidecarTriggerPayload): Promise<SidecarTriggerResponse>;
}

// ============================================
// DEFAULT SIDECAR CLIENT (HTTP)
// ============================================

export class HttpSidecarClient implements SidecarClient {
  private readonly timeout: number;

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }

  async triggerTest(sidecarUrl: string, payload: SidecarTriggerPayload): Promise<SidecarTriggerResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${sidecarUrl}/trigger-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sidecar-Auth': process.env.SIDECAR_AUTH_TOKEN || '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        return { executionId: '', status: 'error', error: `Sidecar returned ${response.status}: ${text}` };
      }

      const data = await response.json() as SidecarTriggerResponse;
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { executionId: '', status: 'error', error: `Sidecar request failed: ${message}` };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ============================================
// WORKFLOW TRIGGER SERVICE
// ============================================

export class WorkflowTriggerService {
  private readonly db: WorkspaceLookupDB;
  private readonly sidecar: SidecarClient;

  constructor(db: WorkspaceLookupDB, sidecar?: SidecarClient) {
    this.db = db;
    this.sidecar = sidecar ?? new HttpSidecarClient();
  }

  /**
   * Trigger a test campaign workflow.
   */
  async triggerTest(request: TriggerTestRequest): Promise<TriggerTestResponse> {
    // 1. Resolve workspace → Sidecar URL
    const sidecarUrl = await this.db.getSidecarUrl(request.workspaceId);

    if (!sidecarUrl) {
      throw new WorkflowTriggerError(
        'NO_SIDECAR',
        `No Sidecar found for workspace ${request.workspaceId}. Is the droplet provisioned?`
      );
    }

    // 2. Build the Sidecar payload
    const payload: SidecarTriggerPayload = {
      campaignId: request.campaignId,
      testEmail: request.testEmail,
      testMode: true,
      testData: request.testLeadData,
    };

    // 3. Trigger via Sidecar
    const result = await this.sidecar.triggerTest(sidecarUrl, payload);

    if (result.status === 'error' || !result.executionId) {
      throw new WorkflowTriggerError(
        'TRIGGER_FAILED',
        result.error || 'Sidecar returned an error without details'
      );
    }

    // 4. Return trigger response with SSE stream URL
    return {
      success: true,
      executionId: result.executionId,
      streamUrl: `/api/sandbox/execution-stream/${result.executionId}`,
    };
  }
}

// ============================================
// ERROR CLASS
// ============================================

export type WorkflowTriggerErrorCode = 'NO_SIDECAR' | 'TRIGGER_FAILED' | 'RATE_LIMITED';

export class WorkflowTriggerError extends Error {
  code: WorkflowTriggerErrorCode;

  constructor(code: WorkflowTriggerErrorCode, message: string) {
    super(message);
    this.name = 'WorkflowTriggerError';
    this.code = code;
  }
}

// ============================================
// MOCK WORKSPACE LOOKUP (for testing/dev)
// ============================================

export class MockWorkspaceLookupDB implements WorkspaceLookupDB {
  private urls: Map<string, string> = new Map();

  setSidecarUrl(workspaceId: string, url: string): void {
    this.urls.set(workspaceId, url);
  }

  async getSidecarUrl(workspaceId: string): Promise<string | null> {
    return this.urls.get(workspaceId) ?? null;
  }
}

// ============================================
// MOCK SIDECAR CLIENT (for testing/dev)
// ============================================

export class MockSidecarClient implements SidecarClient {
  public triggerCount = 0;
  public lastPayload: SidecarTriggerPayload | null = null;
  public shouldFail = false;
  public failError = 'Mock sidecar failure';

  async triggerTest(_sidecarUrl: string, payload: SidecarTriggerPayload): Promise<SidecarTriggerResponse> {
    this.triggerCount++;
    this.lastPayload = payload;

    if (this.shouldFail) {
      return { executionId: '', status: 'error', error: this.failError };
    }

    return {
      executionId: `mock-exec-${Date.now()}`,
      workflowId: 'mock-workflow-1',
      status: 'triggered',
    };
  }

  reset(): void {
    this.triggerCount = 0;
    this.lastPayload = null;
    this.shouldFail = false;
  }
}
