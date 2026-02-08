/**
 * PHASE 44: Scale Health SWR Hooks
 * 
 * Hooks for fetching scale health data from the admin API.
 * Follows the same SWR pattern as use-metrics.ts.
 */

'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { fetcherWithOptions } from '@/lib/fetcher';
import type {
  ScaleHealthApiResponse,
  ScaleAlertsApiResponse,
  ScaleHistoryApiResponse,
  RunChecksApiResponse,
  AlertActionApiResponse,
} from '@/lib/genesis/phase44/types';

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  keepPreviousData: true,
};

/**
 * Fetch current scale health summary + fleet overview.
 */
export function useScaleHealth() {
  const { data, error, isLoading, mutate } = useSWR<ScaleHealthApiResponse>(
    '/api/admin/scale-health',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // Refresh every 60s
    }
  );

  return {
    summary: data?.summary ?? null,
    fleetOverview: data?.fleetOverview ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Fetch scale alerts with optional status filter.
 */
export function useScaleAlerts(status?: string) {
  const params = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR<ScaleAlertsApiResponse>(
    `/api/admin/scale-health/alerts${params}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000, // Refresh every 30s
    }
  );

  return {
    alerts: data?.alerts ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Fetch historical scale metrics with trends.
 */
export function useScaleHistory(days: number = 30) {
  const { data, error, isLoading } = useSWR<ScaleHistoryApiResponse>(
    `/api/admin/scale-health/history?days=${days}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 300000, // Refresh every 5 min
    }
  );

  return {
    snapshots: data?.snapshots ?? [],
    trends: data?.trends ?? [],
    isLoading,
    isError: error,
  };
}

/**
 * Trigger a manual health check run.
 */
export async function triggerHealthCheck(): Promise<RunChecksApiResponse> {
  return fetcherWithOptions<RunChecksApiResponse>('/api/admin/scale-health/run-checks', {
    method: 'POST',
  });
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(alertId: string): Promise<AlertActionApiResponse> {
  return fetcherWithOptions<AlertActionApiResponse>(
    `/api/admin/scale-health/alerts/${alertId}/acknowledge`,
    { method: 'POST' }
  );
}

/**
 * Resolve an alert with notes.
 */
export async function resolveAlert(alertId: string, notes: string): Promise<AlertActionApiResponse> {
  return fetcherWithOptions<AlertActionApiResponse>(
    `/api/admin/scale-health/alerts/${alertId}/resolve`,
    {
      method: 'POST',
      body: JSON.stringify({ resolution_notes: notes }),
    }
  );
}
