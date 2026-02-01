/**
 * PHASE 43: STATE RECONCILIATION WATCHDOG - MOCK IMPLEMENTATIONS
 * 
 * Mock implementations for testing the Watchdog service.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 43
 */

import type {
  WatchdogDB,
  N8nClient,
  WatchdogRunConfig,
  WatchdogEvent,
  WatchdogRunResult,
  OrphanWorkflow,
  OrphanDbRecord,
  StateMismatch,
  CredentialIssue,
  DriftResult,
} from './watchdog-types';

// ============================================
// MOCK WATCHDOG DB
// ============================================

export class MockWatchdogDB implements WatchdogDB {
  private drifts = new Map<string, DriftResult[]>();
  private runs = new Map<string, WatchdogRunResult>();
  
  // For testing - inject data
  private _orphanWorkflows = new Map<string, OrphanWorkflow[]>();
  private _orphanDbRecords = new Map<string, OrphanDbRecord[]>();
  private _stateMismatches = new Map<string, StateMismatch[]>();
  private _credentialIssues = new Map<string, CredentialIssue[]>();

  async detectOrphanWorkflows(workspaceId: string): Promise<OrphanWorkflow[]> {
    return this._orphanWorkflows.get(workspaceId) || [];
  }

  async detectOrphanDbRecords(workspaceId: string): Promise<OrphanDbRecord[]> {
    return this._orphanDbRecords.get(workspaceId) || [];
  }

  async detectStateMismatches(workspaceId: string): Promise<StateMismatch[]> {
    return this._stateMismatches.get(workspaceId) || [];
  }

  async detectCredentialIssues(workspaceId: string): Promise<CredentialIssue[]> {
    return this._credentialIssues.get(workspaceId) || [];
  }

  async storeDrift(drift: DriftResult): Promise<void> {
    const drifts = this.drifts.get(drift.workspaceId) || [];
    drifts.push(drift);
    this.drifts.set(drift.workspaceId, drifts);
  }

  async updateDrift(workspaceId: string, updates: Partial<DriftResult>): Promise<void> {
    const drifts = this.drifts.get(workspaceId) || [];
    // Update the last drift (simple implementation)
    if (drifts.length > 0) {
      Object.assign(drifts[drifts.length - 1], updates);
    }
  }

  async createRun(config: WatchdogRunConfig, event: WatchdogEvent): Promise<string> {
    const runId = `run_${Date.now()}`;
    // Will be updated by updateRun
    return runId;
  }

  async updateRun(runId: string, result: Partial<WatchdogRunResult>): Promise<void> {
    const existing = this.runs.get(runId) || {} as WatchdogRunResult;
    this.runs.set(runId, { ...existing, ...result } as WatchdogRunResult);
  }

  async getRecentRuns(limit: number = 10): Promise<WatchdogRunResult[]> {
    return Array.from(this.runs.values()).slice(-limit);
  }

  // ============================================
  // TEST HELPERS
  // ============================================

  injectOrphanWorkflows(workspaceId: string, workflows: OrphanWorkflow[]): void {
    this._orphanWorkflows.set(workspaceId, workflows);
  }

  injectOrphanDbRecords(workspaceId: string, records: OrphanDbRecord[]): void {
    this._orphanDbRecords.set(workspaceId, records);
  }

  injectStateMismatches(workspaceId: string, mismatches: StateMismatch[]): void {
    this._stateMismatches.set(workspaceId, mismatches);
  }

  injectCredentialIssues(workspaceId: string, issues: CredentialIssue[]): void {
    this._credentialIssues.set(workspaceId, issues);
  }

  getStoredDrifts(workspaceId: string): DriftResult[] {
    return this.drifts.get(workspaceId) || [];
  }

  getRun(runId: string): WatchdogRunResult | undefined {
    return this.runs.get(runId);
  }

  reset(): void {
    this.drifts.clear();
    this.runs.clear();
    this._orphanWorkflows.clear();
    this._orphanDbRecords.clear();
    this._stateMismatches.clear();
    this._credentialIssues.clear();
  }
}

// ============================================
// MOCK N8N CLIENT
// ============================================

export class MockN8nClient implements N8nClient {
  private workflows = new Map<string, Array<{
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    nodes?: Array<{ type: string; credentials?: Record<string, string> }>;
  }>>();
  
  private credentials = new Map<string, Array<{
    id: string;
    name: string;
    type: string;
  }>>();

  private deletedWorkflows = new Set<string>();
  private activatedWorkflows = new Set<string>();
  private deactivatedWorkflows = new Set<string>();

  async listWorkflows(workspaceId: string): Promise<Array<{
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.workflows.get(workspaceId) || [];
  }

  async getWorkflow(workflowId: string): Promise<{
    id: string;
    name: string;
    active: boolean;
    nodes: Array<{ type: string; credentials?: Record<string, string> }>;
  }> {
    // Find workflow across all workspaces
    for (const workflows of this.workflows.values()) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        return {
          id: workflow.id,
          name: workflow.name,
          active: workflow.active,
          nodes: workflow.nodes || [],
        };
      }
    }
    throw new Error(`Workflow ${workflowId} not found`);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    // Check if workflow exists
    let found = false;
    for (const [workspaceId, workflows] of this.workflows.entries()) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        found = true;
        const filtered = workflows.filter(w => w.id !== workflowId);
        this.workflows.set(workspaceId, filtered);
        this.deletedWorkflows.add(workflowId);
        return;
      }
    }
    
    // If not found, throw error
    if (!found) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
  }

  async activateWorkflow(workflowId: string): Promise<void> {
    this.activatedWorkflows.add(workflowId);
    
    // Update active status
    for (const workflows of this.workflows.values()) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        workflow.active = true;
      }
    }
  }

  async deactivateWorkflow(workflowId: string): Promise<void> {
    this.deactivatedWorkflows.add(workflowId);
    
    // Update active status
    for (const workflows of this.workflows.values()) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        workflow.active = false;
      }
    }
  }

  async listCredentials(workspaceId: string): Promise<Array<{
    id: string;
    name: string;
    type: string;
  }>> {
    return this.credentials.get(workspaceId) || [];
  }

  async testCredential(credentialId: string): Promise<{ success: boolean; error?: string }> {
    // Default to success for testing
    return { success: true };
  }

  // ============================================
  // TEST HELPERS
  // ============================================

  addWorkflow(workspaceId: string, workflow: {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    nodes?: Array<{ type: string; credentials?: Record<string, string> }>;
  }): void {
    const workflows = this.workflows.get(workspaceId) || [];
    workflows.push(workflow);
    this.workflows.set(workspaceId, workflows);
  }

  addCredential(workspaceId: string, credential: {
    id: string;
    name: string;
    type: string;
  }): void {
    const credentials = this.credentials.get(workspaceId) || [];
    credentials.push(credential);
    this.credentials.set(workspaceId, credentials);
  }

  wasWorkflowDeleted(workflowId: string): boolean {
    return this.deletedWorkflows.has(workflowId);
  }

  wasWorkflowActivated(workflowId: string): boolean {
    return this.activatedWorkflows.has(workflowId);
  }

  wasWorkflowDeactivated(workflowId: string): boolean {
    return this.deactivatedWorkflows.has(workflowId);
  }

  reset(): void {
    this.workflows.clear();
    this.credentials.clear();
    this.deletedWorkflows.clear();
    this.activatedWorkflows.clear();
    this.deactivatedWorkflows.clear();
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createMockWatchdogDB(): MockWatchdogDB {
  return new MockWatchdogDB();
}

export function createMockN8nClient(): MockN8nClient {
  return new MockN8nClient();
}
