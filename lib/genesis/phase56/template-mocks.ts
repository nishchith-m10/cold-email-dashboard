/**
 * PHASE 56: FLEET-WIDE TEMPLATE RECONCILIATION - MOCK IMPLEMENTATIONS
 */

import type {
  TemplateDB,
  UpdateClient,
  TemplateVersion,
  WorkspaceTemplateStatus,
  RolloutProgress,
  VersionReport,
  VersionMismatch,
  UpdateResult,
  UpdateRequest,
} from './template-types';

export class MockTemplateDB implements TemplateDB {
  private templates = new Map<string, TemplateVersion>();
  private workspaceStatus = new Map<string, WorkspaceTemplateStatus>();
  private rollouts = new Map<string, RolloutProgress>();
  private versionReports = new Map<string, VersionReport>();
  private updateResults: UpdateResult[] = [];
  private latestVersion: string | null = null;

  async getLatestTemplateVersion(): Promise<TemplateVersion | null> {
    if (!this.latestVersion) return null;
    return this.templates.get(this.latestVersion) || null;
  }

  async getTemplateVersion(version: string): Promise<TemplateVersion | null> {
    return this.templates.get(version) || null;
  }

  async createTemplateVersion(template: TemplateVersion): Promise<void> {
    this.templates.set(template.version, template);
    this.latestVersion = template.version;
  }

  async getWorkspaceTemplateStatus(workspaceId: string): Promise<WorkspaceTemplateStatus | null> {
    return this.workspaceStatus.get(workspaceId) || null;
  }

  async updateWorkspaceTemplateVersion(workspaceId: string, version: string): Promise<void> {
    const status = this.workspaceStatus.get(workspaceId);
    if (status) {
      status.current_version = version;
      status.needs_update = false;
      status.last_updated_at = new Date();
    }
  }

  async findWorkspacesNeedingUpdate(targetVersion: string): Promise<WorkspaceTemplateStatus[]> {
    return Array.from(this.workspaceStatus.values()).filter(
      s => s.target_version === targetVersion && s.needs_update
    );
  }

  async createRollout(progress: RolloutProgress): Promise<void> {
    this.rollouts.set(progress.rollout_id, progress);
  }

  async updateRollout(rolloutId: string, updates: Partial<RolloutProgress>): Promise<void> {
    const existing = this.rollouts.get(rolloutId);
    if (existing) {
      this.rollouts.set(rolloutId, { ...existing, ...updates });
    }
  }

  async getRollout(rolloutId: string): Promise<RolloutProgress | null> {
    return this.rollouts.get(rolloutId) || null;
  }

  async recordVersionReport(report: VersionReport): Promise<void> {
    this.versionReports.set(report.workspace_id, report);
  }

  async findVersionMismatches(expectedVersion: string): Promise<VersionMismatch[]> {
    const mismatches: VersionMismatch[] = [];
    
    for (const [workspaceId, report] of this.versionReports.entries()) {
      if (report.n8n_version !== expectedVersion) {
        mismatches.push({
          workspace_id: workspaceId,
          expected_version: expectedVersion,
          actual_version: report.n8n_version,
          component: 'n8n',
          detected_at: new Date(),
        });
      }
    }
    
    return mismatches;
  }

  async recordUpdateResult(result: UpdateResult): Promise<void> {
    this.updateResults.push(result);
  }

  async getUpdateResults(rolloutId: string): Promise<UpdateResult[]> {
    return this.updateResults;
  }

  // Test helpers
  setWorkspaceStatus(status: WorkspaceTemplateStatus): void {
    this.workspaceStatus.set(status.workspace_id, status);
  }

  setVersionReport(report: VersionReport): void {
    this.versionReports.set(report.workspace_id, report);
  }

  reset(): void {
    this.templates.clear();
    this.workspaceStatus.clear();
    this.rollouts.clear();
    this.versionReports.clear();
    this.updateResults = [];
    this.latestVersion = null;
  }
}

export class MockUpdateClient implements UpdateClient {
  private updateResults = new Map<string, boolean>();
  private healthStatus = new Map<string, boolean>();

  async triggerUpdate(request: UpdateRequest): Promise<UpdateResult> {
    const success = this.updateResults.get(request.workspace_id) ?? true;
    const startTime = new Date();
    
    return {
      workspace_id: request.workspace_id,
      success,
      from_version: request.from_version,
      to_version: request.to_version,
      started_at: startTime,
      completed_at: new Date(),
      duration_seconds: 1,
      verification_passed: success,
      rollback_performed: !success,
      error: success ? undefined : 'Simulated update failure',
    };
  }

  async pullImage(dropletId: string, image: string): Promise<void> {
    // Simulated
  }

  async swapContainers(dropletId: string, newVersion: string): Promise<void> {
    // Simulated
  }

  async rollbackContainer(dropletId: string, oldVersion: string): Promise<void> {
    // Simulated
  }

  async checkHealth(dropletId: string): Promise<boolean> {
    return this.healthStatus.get(dropletId) ?? true;
  }

  async waitForQuietPeriod(dropletId: string, timeoutSeconds: number): Promise<boolean> {
    return true; // Simulated quiet period achieved
  }

  async verifyVersion(dropletId: string, expectedVersion: string): Promise<boolean> {
    return true;
  }

  // Test helpers
  setUpdateResult(workspaceId: string, success: boolean): void {
    this.updateResults.set(workspaceId, success);
  }

  setHealthStatus(dropletId: string, healthy: boolean): void {
    this.healthStatus.set(dropletId, healthy);
  }

  reset(): void {
    this.updateResults.clear();
    this.healthStatus.clear();
  }
}

export function createMockTemplateDB(): MockTemplateDB {
  return new MockTemplateDB();
}

export function createMockUpdateClient(): MockUpdateClient {
  return new MockUpdateClient();
}
