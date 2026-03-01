/**
 * ADMIN PANELS EXPANSION: Watchdog Hook
 *
 * SWR-based hook for fetching watchdog run history and triggering
 * manual drift-detection scans.
 *
 * Ralph Loop: Research ✅ (GET /api/admin/watchdog/run exists, returns run results)
 * → Execute ✅
 */

'use client';

import useSWR from 'swr';
import type { WatchdogRunResult, DriftType, DriftSeverity } from '@/lib/genesis/phase43/watchdog-types';

// ============================================
// TYPES
// ============================================

export interface WatchdogRunSummary {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  workspaces_scanned: number;
  drifts_found: number;
  drifts_healed: number;
  drifts_failed: number;
  dry_run: boolean;
  drifts_by_type: Record<DriftType, number>;
  drifts_by_severity: Record<DriftSeverity, number>;
  errors: string[];
}

interface WatchdogRunResponse {
  success: boolean;
  run_id: string | null;
  drifts_found: number;
  drifts_healed?: number;
  drifts_failed?: number;
  workspaces_scanned: number;
  duration_ms: number;
  drifts_by_type?: Record<DriftType, number>;
  drifts_by_severity?: Record<DriftSeverity, number>;
  dry_run?: boolean;
  errors?: string[];
  message?: string;
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string): Promise<WatchdogRunResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ============================================
// HOOK
// ============================================

export function useWatchdog() {
  const { data, error, isLoading, mutate } = useSWR<WatchdogRunResponse>(
    null, // Don't auto-fetch — watchdog is triggered manually
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    lastRun: data ?? null,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

// ============================================
// ACTIONS
// ============================================

export async function triggerWatchdogRun(options?: {
  workspaceId?: string;
  dryRun?: boolean;
}): Promise<WatchdogRunResponse> {
  const params = new URLSearchParams();
  if (options?.workspaceId) params.set('workspace_id', options.workspaceId);
  if (options?.dryRun) params.set('dry_run', 'true');

  const url = `/api/admin/watchdog/run${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return res.json();
}
