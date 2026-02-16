/**
 * PHASE 71: API Health SWR Hooks
 * 
 * Hooks for fetching API health data from the admin API.
 * Follows the same SWR pattern as use-scale-health.ts.
 */

'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { fetcher, fetcherWithOptions } from '@/lib/fetcher';
import type { HealthReport } from '@/lib/genesis/phase71/types';

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIHealthResponse {
  success: boolean;
  report: HealthReport;
  fromCache: boolean;
  cacheAge?: number;
}

export interface APIHealthHistoryResponse {
  success: boolean;
  snapshots: {
    id: string;
    timestamp: string;
    overall_status: string;
    error_count: number;
    degraded_count: number;
    total_latency_ms: number;
    slowest_service?: string;
  }[];
  totalCount: number;
  days: number;
}

export interface RunHealthCheckResponse {
  success: boolean;
  report: HealthReport;
  durationMs: number;
  checksRun: number;
  stored: boolean;
}

export interface RunSingleCheckResponse {
  success: boolean;
  service: {
    id: string;
    name: string;
    status: string;
    result: {
      status: string;
      latencyMs?: number;
      quotaUsed?: number;
      quotaLimit?: number;
      message?: string;
      error?: string;
      checkedAt: string;
    };
  };
  durationMs: number;
}

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  keepPreviousData: true,
};

// ============================================
// HOOKS
// ============================================

/**
 * Fetch current API health report.
 * Returns latest cached report or triggers fresh check if cache expired.
 */
export function useAPIHealth() {
  const { data, error, isLoading, mutate } = useSWR<APIHealthResponse>(
    '/api/admin/api-health',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // Refresh every 60s
    }
  );

  return {
    report: data?.report ?? null,
    fromCache: data?.fromCache ?? false,
    cacheAge: data?.cacheAge,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Fetch historical API health snapshots.
 * 
 * @param days - Number of days of history to fetch (default: 7)
 */
export function useAPIHealthHistory(days: number = 7) {
  const { data, error, isLoading } = useSWR<APIHealthHistoryResponse>(
    `/api/admin/api-health/history?days=${days}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 300000, // Refresh every 5 min
    }
  );

  return {
    snapshots: data?.snapshots ?? [],
    totalCount: data?.totalCount ?? 0,
    days: data?.days ?? days,
    isLoading,
    isError: error,
  };
}

/**
 * Trigger a manual health check for all services.
 * Stores snapshot and returns full report.
 */
export async function triggerHealthCheck(): Promise<RunHealthCheckResponse> {
  return fetcherWithOptions<RunHealthCheckResponse>('/api/admin/api-health', {
    method: 'POST',
  });
}

/**
 * Run health check for a single service.
 * Does NOT store snapshot - for quick diagnostics only.
 * 
 * @param serviceId - Service ID to check (e.g., 'openai', 'relevance', etc.)
 */
export async function runSingleCheck(serviceId: string): Promise<RunSingleCheckResponse> {
  return fetcherWithOptions<RunSingleCheckResponse>(
    `/api/admin/api-health/check/${serviceId}`,
    { method: 'POST' }
  );
}
