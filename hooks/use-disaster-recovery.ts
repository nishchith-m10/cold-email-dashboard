/**
 * GENESIS PHASE 70 - DISASTER RECOVERY HOOKS
 * 
 * SWR-based React hooks for disaster recovery operations.
 * Manages snapshots, regional health, and failover operations.
 */

import useSWR from 'swr';
import { useState } from 'react';
import { fetcher } from '@/lib/fetcher';
import type { Snapshot } from '@/lib/genesis/phase70/types';

// ============================================
// TYPES
// ============================================

export interface RegionalHealthStatus {
  region: string;
  status: 'healthy' | 'degraded' | 'outage';
  lastHeartbeatAt: string;
  latencyMs?: number;
  errorMessage?: string;
  consecutiveFailures: number;
}

export interface DisasterRecoveryStats {
  totalSnapshots: number;
  totalWorkspaces: number;
  workspacesWithRecentBackups: number;
  coverage: number;
  totalSizeGb: number;
  estimatedMonthlyCost: number;
}

export interface SnapshotsResponse {
  success: boolean;
  data?: Snapshot[];
  error?: string;
}

export interface RegionalHealthResponse {
  success: boolean;
  data?: RegionalHealthStatus[];
  error?: string;
}

export interface StatsResponse {
  success: boolean;
  data?: DisasterRecoveryStats;
  error?: string;
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

// ============================================
// PRIMARY HOOKS: Fetch DR Data
// ============================================

/**
 * Fetch disaster recovery snapshots.
 * Polls every 60 seconds by default.
 */
export function useDisasterRecoverySnapshots(
  workspaceId?: string,
  options?: {
    refreshInterval?: number;
    region?: string;
  }
) {
  const {
    refreshInterval = 60000, // 60 seconds
    region,
  } = options || {};

  let url = '/api/admin/disaster-recovery/snapshots';
  const params = new URLSearchParams();
  if (workspaceId) params.append('workspaceId', workspaceId);
  if (region) params.append('region', region);
  if (params.toString()) url += `?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<SnapshotsResponse>(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    snapshots: data?.data || [],
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}

/**
 * Fetch regional health status.
 * Polls every 30 seconds by default (more frequent than snapshots).
 */
export function useRegionalHealth(options?: { refreshInterval?: number }) {
  const { refreshInterval = 30000 } = options || {}; // 30 seconds

  const { data, error, isLoading, mutate } = useSWR<RegionalHealthResponse>(
    '/api/admin/disaster-recovery/health',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    regionalHealth: data?.data || [],
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}

/**
 * Fetch disaster recovery statistics.
 */
export function useDisasterRecoveryStats() {
  const { data, error, isLoading, mutate } = useSWR<StatsResponse>(
    '/api/admin/disaster-recovery/stats',
    fetcher,
    {
      refreshInterval: 60000, // 60 seconds
      revalidateOnFocus: false,
    }
  );

  return {
    stats: data?.data,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate,
  };
}

// ============================================
// ACTION HOOKS: Trigger DR Operations
// ============================================

/**
 * Create manual snapshot.
 */
export function useCreateSnapshot() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSnapshot = async (params: {
    workspaceId: string;
    dropletId: string;
    type?: 'full' | 'incremental';
  }): Promise<ActionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/disaster-recovery/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create snapshot');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { createSnapshot, isLoading, error };
}

/**
 * Delete snapshot.
 */
export function useDeleteSnapshot() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSnapshot = async (snapshotId: string): Promise<ActionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/disaster-recovery/snapshots/${snapshotId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete snapshot');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteSnapshot, isLoading, error };
}

/**
 * Trigger regional failover.
 */
export function useTriggerFailover() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerFailover = async (params: {
    workspaceId: string;
    targetRegion: string;
    reason?: string;
  }): Promise<ActionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/disaster-recovery/failover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to trigger failover');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { triggerFailover, isLoading, error };
}

/**
 * Restore from snapshot.
 */
export function useRestoreSnapshot() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restoreSnapshot = async (params: {
    snapshotId: string;
    targetRegion: string;
  }): Promise<ActionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/disaster-recovery/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to restore snapshot');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { restoreSnapshot, isLoading, error };
}
