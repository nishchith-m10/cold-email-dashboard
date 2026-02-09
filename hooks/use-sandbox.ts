/**
 * PHASE 45: SANDBOX HOOKS
 * 
 * SWR hooks for sandbox test runs, execution history,
 * and trigger/stream functions.
 */

'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type {
  SandboxTestRun,
  ExecutionEvent,
  ExecutionSummary,
} from '@/lib/genesis/phase45/types';

// ============================================
// SANDBOX HISTORY HOOK
// ============================================

interface SandboxHistoryData {
  success: boolean;
  runs: SandboxTestRun[];
  total: number;
}

export function useSandboxHistory(workspaceId: string | null, limit: number = 20) {
  const { data, error, isLoading, mutate } = useSWR<SandboxHistoryData>(
    workspaceId ? `/api/sandbox/history?workspaceId=${workspaceId}&limit=${limit}` : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  return {
    runs: data?.runs ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// EXECUTION DETAIL HOOK
// ============================================

interface ExecutionDetailData {
  success: boolean;
  events: ExecutionEvent[];
  summary: ExecutionSummary;
}

export function useExecutionDetail(executionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ExecutionDetailData>(
    executionId ? `/api/sandbox/execution/${executionId}` : null,
    fetcher,
    { refreshInterval: 2000 } // Poll every 2s while active
  );

  return {
    events: data?.events ?? [],
    summary: data?.summary ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// TRIGGER TEST CAMPAIGN
// ============================================

export async function triggerTestCampaign(params: {
  workspaceId: string;
  campaignId: string;
  testEmail?: string;
  testLeadData?: Record<string, unknown>;
}): Promise<{
  success: boolean;
  executionId?: string;
  streamUrl?: string;
  testRunId?: string;
  error?: string;
}> {
  const response = await fetch('/api/sandbox/test-campaign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, error: data.error || `HTTP ${response.status}` };
  }

  return data;
}

// ============================================
// SSE EVENT SOURCE HOOK HELPER
// ============================================

/**
 * Creates an EventSource connection to the execution stream.
 * Returns a cleanup function.
 */
export function connectExecutionStream(
  executionId: string,
  callbacks: {
    onNodeEvent?: (event: ExecutionEvent) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
): () => void {
  const eventSource = new EventSource(`/api/sandbox/execution-stream/${executionId}`);

  eventSource.onmessage = (e) => {
    try {
      const message = JSON.parse(e.data);

      switch (message.type) {
        case 'node_event':
          callbacks.onNodeEvent?.(message.data);
          break;
        case 'complete':
          callbacks.onComplete?.();
          eventSource.close();
          break;
        case 'error':
          callbacks.onError?.(message.data?.message || 'Unknown error');
          break;
        case 'timeout':
          callbacks.onError?.('Execution monitoring timed out');
          eventSource.close();
          break;
        // heartbeat — ignore
      }
    } catch {
      // Ignore parse errors
    }
  };

  eventSource.onerror = () => {
    callbacks.onError?.('Connection lost');
    eventSource.close();
  };

  return () => eventSource.close();
}
