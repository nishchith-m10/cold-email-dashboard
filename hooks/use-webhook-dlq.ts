/**
 * ADMIN PANELS EXPANSION: Webhook DLQ Hook
 *
 * SWR-based hook for fetching webhook Dead Letter Queue data.
 * Consumes GET /api/admin/webhook-dlq which already exists.
 *
 * Ralph Loop: Research ✅ (API exists) → Analyze ✅ (returns entries + stats) →
 * Log ✅ → Plan ✅ → Execute ✅
 */

'use client';

import useSWR from 'swr';

// ============================================
// TYPES
// ============================================

export type DLQStatus = 'pending' | 'retrying' | 'resolved' | 'abandoned';

export interface DLQEntry {
  id: string;
  workspace_id: string;
  webhook_url: string;
  http_method: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  error_message: string;
  error_code?: string;
  error_stack?: string;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  status: DLQStatus;
  created_at: string;
  resolved_at?: string | null;
  abandoned_at?: string | null;
}

export interface DLQStats {
  pending: number;
  retrying: number;
  resolved: number;
  abandoned: number;
  total: number;
}

interface DLQResponse {
  entries: DLQEntry[];
  stats: DLQStats;
  filters: {
    workspaceId: string | null;
    status: DLQStatus | null;
    limit: number;
  };
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string): Promise<DLQResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ============================================
// HOOK
// ============================================

export function useWebhookDLQ(options?: {
  workspaceId?: string;
  status?: DLQStatus;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.workspaceId) params.set('workspace_id', options.workspaceId);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const url = `/api/admin/webhook-dlq${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<DLQResponse>(url, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  });

  return {
    entries: data?.entries ?? [],
    stats: data?.stats ?? { pending: 0, retrying: 0, resolved: 0, abandoned: 0, total: 0 },
    filters: data?.filters ?? null,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

// ============================================
// RETRY ACTION
// ============================================

export async function retryDLQEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/webhook-dlq?action=retry&id=${entryId}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
