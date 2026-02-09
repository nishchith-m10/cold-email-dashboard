/**
 * PHASE 45: SANDBOX RATE LIMITER
 * 
 * Enforces per-workspace rate limits on sandbox test runs.
 * Default: 10 runs per workspace per hour.
 * 
 * Uses a database-backed counter (genesis.sandbox_test_runs) for
 * distributed rate limiting. Falls back to in-memory if DB unavailable.
 */

import { type SandboxRateLimitResult, SANDBOX_RATE_LIMIT } from './types';

// ============================================
// DATABASE INTERFACE (for testability)
// ============================================

export interface SandboxRateLimitDB {
  countRunsInWindow(workspaceId: string, windowSeconds: number): Promise<number>;
}

// ============================================
// SANDBOX RATE LIMITER
// ============================================

export class SandboxRateLimiter {
  private readonly db: SandboxRateLimitDB;
  private readonly maxRunsPerHour: number;
  private readonly windowSeconds: number;

  constructor(db: SandboxRateLimitDB, config?: { maxRunsPerHour?: number; windowSeconds?: number }) {
    this.db = db;

    const envLimit = parseInt(process.env.SANDBOX_TEST_RUNS_PER_HOUR || '', 10);
    this.maxRunsPerHour = config?.maxRunsPerHour != null
      ? config.maxRunsPerHour
      : (envLimit > 0 ? envLimit : SANDBOX_RATE_LIMIT.maxRunsPerHour);

    this.windowSeconds = config?.windowSeconds != null
      ? config.windowSeconds
      : SANDBOX_RATE_LIMIT.windowSeconds;
  }

  /**
   * Check if a workspace can run another sandbox test.
   */
  async checkLimit(workspaceId: string): Promise<SandboxRateLimitResult> {
    const currentCount = await this.db.countRunsInWindow(workspaceId, this.windowSeconds);
    const remaining = Math.max(0, this.maxRunsPerHour - currentCount);
    const allowed = currentCount < this.maxRunsPerHour;

    const resetAt = new Date(Date.now() + this.windowSeconds * 1000).toISOString();

    const result: SandboxRateLimitResult = {
      allowed,
      remaining,
      limit: this.maxRunsPerHour,
      resetAt,
    };

    if (!allowed) {
      result.retryAfterSeconds = this.windowSeconds;
    }

    return result;
  }

  /**
   * Get current usage stats for a workspace.
   */
  async getUsage(workspaceId: string): Promise<{ used: number; limit: number; remaining: number }> {
    const count = await this.db.countRunsInWindow(workspaceId, this.windowSeconds);
    return {
      used: count,
      limit: this.maxRunsPerHour,
      remaining: Math.max(0, this.maxRunsPerHour - count),
    };
  }
}

// ============================================
// SUPABASE ADAPTER
// ============================================

/**
 * Creates a SandboxRateLimitDB backed by Supabase.
 */
export function createSupabaseRateLimitDB(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: number | null; error: unknown }> }
): SandboxRateLimitDB {
  return {
    async countRunsInWindow(workspaceId: string, windowSeconds: number): Promise<number> {
      const { data, error } = await supabase.rpc('genesis_count_sandbox_runs_in_window', {
        p_workspace_id: workspaceId,
        p_window_seconds: windowSeconds,
      });

      if (error) {
        /* eslint-disable-next-line no-console */
        console.warn('[SandboxRateLimiter] DB count failed, allowing request:', error);
        return 0; // Fail open: allow the run if counting fails
      }

      return data ?? 0;
    },
  };
}

// ============================================
// IN-MEMORY FALLBACK (for tests / dev)
// ============================================

export class InMemoryRateLimitDB implements SandboxRateLimitDB {
  private runs: Map<string, number[]> = new Map();

  async countRunsInWindow(workspaceId: string, windowSeconds: number): Promise<number> {
    const timestamps = this.runs.get(workspaceId) || [];
    const cutoff = Date.now() - windowSeconds * 1000;
    const recent = timestamps.filter(t => t > cutoff);
    this.runs.set(workspaceId, recent); // Prune old entries
    return recent.length;
  }

  recordRun(workspaceId: string): void {
    const timestamps = this.runs.get(workspaceId) || [];
    timestamps.push(Date.now());
    this.runs.set(workspaceId, timestamps);
  }

  reset(): void {
    this.runs.clear();
  }
}
