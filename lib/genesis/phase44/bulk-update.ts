/**
 * PHASE 44: Bulk Update Engine
 * 
 * Fleet-wide template/workflow updates with rate limiting,
 * canary deployment, and automatic halt on failure threshold.
 * 
 * The engine creates a job record in genesis.bulk_update_jobs (future table),
 * then processes workspaces sequentially with configurable rate limits.
 * 
 * NOTE: The actual BullMQ worker that processes jobs runs in the
 * Control Plane (Phase 68), not in the Next.js app. This service
 * manages the job lifecycle and status tracking only.
 */

import type { BulkUpdateConfig, BulkUpdateJob, BulkUpdateStatus } from './types';

// ============================================
// TYPES
// ============================================

export interface BulkUpdateDB {
  schema(name: string): {
    from(table: string): {
      select(columns?: string): {
        eq(col: string, val: unknown): any;
        order(col: string, opts?: { ascending?: boolean }): any;
        limit(n: number): any;
        single(): any;
      };
      insert(row: Record<string, unknown>): { select(): { single(): Promise<{ data: unknown; error: unknown }> } };
      update(vals: Record<string, unknown>): { eq(col: string, val: unknown): Promise<{ data: unknown; error: unknown }> };
    };
  };
}

export interface BulkUpdateEvent {
  jobId: string;
  type: 'started' | 'progress' | 'completed' | 'halted' | 'failed';
  processed: number;
  failed: number;
  total: number;
  reason?: string;
  timestamp: string;
}

export type BulkUpdateEventCallback = (event: BulkUpdateEvent) => void;

// ============================================
// BULK UPDATE SERVICE
// ============================================

export class BulkUpdateService {
  constructor(private db: BulkUpdateDB) {}

  /**
   * Create a new bulk update job.
   * Returns the job ID. The actual processing is triggered separately
   * (via BullMQ in the Control Plane, or a cron-based processor).
   */
  async createJob(config: BulkUpdateConfig, createdBy: string): Promise<BulkUpdateJob> {
    // Validate config
    this.validateConfig(config);

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Determine target workspace count
    let totalWorkspaces = 0;
    if (config.targetWorkspaceIds && config.targetWorkspaceIds.length > 0) {
      totalWorkspaces = config.targetWorkspaceIds.length;
    } else {
      // Count all provisioned workspaces
      const genesisDb = this.db.schema('genesis');
      const { data } = await genesisDb
        .from('partition_registry')
        .select('workspace_id')
        .eq('status', 'active');
      totalWorkspaces = ((data || []) as any[]).length;
    }

    if (totalWorkspaces === 0) {
      throw new BulkUpdateError('No target workspaces found', 'NO_TARGETS');
    }

    const job: BulkUpdateJob = {
      id: jobId,
      config,
      status: 'pending',
      totalWorkspaces,
      processedCount: 0,
      failedCount: 0,
      startedAt: null,
      completedAt: null,
      haltReason: null,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // Note: bulk_update_jobs table is not in the Phase 44 migration
    // because the actual table lives in the Control Plane schema.
    // For now, store in scale_alerts as metadata or in a dedicated table.
    // This is a stub that will be wired when the Control Plane is ready.

    return job;
  }

  /**
   * Get job status by ID.
   */
  async getJob(jobId: string): Promise<BulkUpdateJob | null> {
    // Stub: will be implemented when bulk_update_jobs table exists
    return null;
  }

  /**
   * Cancel a running or pending job.
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Stub: will send cancellation signal via BullMQ
    return false;
  }

  /**
   * List recent jobs.
   */
  async listJobs(limit: number = 20): Promise<BulkUpdateJob[]> {
    // Stub: will query bulk_update_jobs table
    return [];
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateConfig(config: BulkUpdateConfig): void {
    if (!config.blueprintId) {
      throw new BulkUpdateError('blueprintId is required', 'INVALID_CONFIG');
    }
    if (!config.rateLimit || config.rateLimit < 1 || config.rateLimit > 1000) {
      throw new BulkUpdateError('rateLimit must be between 1 and 1000 workspaces/minute', 'INVALID_CONFIG');
    }
    if (config.canaryPercentage !== undefined && (config.canaryPercentage < 0 || config.canaryPercentage > 100)) {
      throw new BulkUpdateError('canaryPercentage must be between 0 and 100', 'INVALID_CONFIG');
    }
    if (config.rollbackThreshold !== undefined && (config.rollbackThreshold < 0 || config.rollbackThreshold > 1)) {
      throw new BulkUpdateError('rollbackThreshold must be between 0 and 1', 'INVALID_CONFIG');
    }
  }
}

// ============================================
// ERROR CLASS
// ============================================

export type BulkUpdateErrorCode = 'NO_TARGETS' | 'INVALID_CONFIG' | 'JOB_NOT_FOUND' | 'JOB_ALREADY_RUNNING';

export class BulkUpdateError extends Error {
  code: BulkUpdateErrorCode;

  constructor(message: string, code: BulkUpdateErrorCode) {
    super(message);
    this.name = 'BulkUpdateError';
    this.code = code;
  }
}
