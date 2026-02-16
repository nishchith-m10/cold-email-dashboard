/**
 * GENESIS PHASE 46 - MIGRATION STATUS HOOK
 *
 * SWR-based React hook for polling migration status.
 * Follows existing pattern from use-api-health.ts.
 */

import useSWR from 'swr';
import { useState } from 'react';
import type { MigrationStateRow } from '@/lib/genesis/phase46/types';
import { fetcher } from '@/lib/fetcher';

// ============================================
// TYPES
// ============================================

export interface MigrationStatusResponse {
  success: boolean;
  data?: MigrationStateRow | MigrationStateRow[];
  error?: string;
}

export interface MigrationActionResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

// ============================================
// PRIMARY HOOK: Get Migration Status
// ============================================

/**
 * Fetch migration status for specific workspace or all migrations.
 * Polls every 60 seconds by default.
 */
export function useMigrationStatus(
  workspaceId?: string,
  options?: {
    refreshInterval?: number;
    dryRun?: boolean;
  }
) {
  const {
    refreshInterval = 60000, // 60 seconds
    dryRun = false,
  } = options || {};

  const url = workspaceId
    ? `/api/admin/migration/status?workspaceId=${encodeURIComponent(workspaceId)}&dryRun=${dryRun}`
    : `/api/admin/migration/status?dryRun=${dryRun}`;

  const { data, error, isLoading, mutate } = useSWR<MigrationStatusResponse>(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    migrationState: data?.data as MigrationStateRow | undefined,
    migrationStates: data?.data as MigrationStateRow[] | undefined,
    isLoading,
    error: error ||  (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}

// ============================================
// ACTION HOOKS: Trigger Migration Operations
// ============================================

/**
 * Initialize new migration.
 */
export function useInitializeMigration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = async (params: {
    workspaceId: string;
    sourceTable: string;
    targetTable: string;
    batchSize?: number;
    metadata?: Record<string, unknown>;
    dryRun?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { dryRun, ...body } = params;
      const url = `/api/admin/migration/init${dryRun ? '?dryRun=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result: MigrationActionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize migration');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { initialize, isLoading, error };
}

/**
 * Enable dual-write mode.
 */
export function useEnableDualWrite() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enable = async (workspaceId: string, dryRun = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/admin/migration/dual-write/enable${dryRun ? '?dryRun=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      const result: MigrationActionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to enable dual-write');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { enable, isLoading, error };
}

/**
 * Start backfill process.
 */
export function useStartBackfill() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (params: {
    workspaceId: string;
    resumeFromId?: string;
    dryRun?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { dryRun, ...body } = params;
      const url = `/api/admin/migration/backfill/start${dryRun ? '?dryRun=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result: MigrationActionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start backfill');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { start, isLoading, error };
}

/**
 * Run parity check.
 */
export function useCheckParity() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async (workspaceId: string, dryRun = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/admin/migration/parity/check${dryRun ? '?dryRun=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      const result: MigrationActionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check parity');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { check, isLoading, error };
}

/**
 * Execute cutover to target table.
 */
export function useExecuteCutover() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (workspaceId: string, dryRun = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/admin/migration/cutover/execute${dryRun ? '?dryRun=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      const result: MigrationActionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to execute cutover');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error };
}

/**
 * Rollback migration.
 */
export function useRollbackMigration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rollback = async (params: {
    workspaceId: string;
    reason?: string;
    dryRun?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { dryRun, ...body } = params;
      const url = `/api/admin/migration/rollback${dryRun ? '?dryRun=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result: MigrationActionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to rollback migration');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { rollback, isLoading, error };
}
