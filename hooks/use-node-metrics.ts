'use client';

/**
 * useNodeMetrics — SWR hook for fetching per-node performance metrics.
 *
 * Returns avg duration, error rate, and execution count for each
 * node in the selected workflow.
 *
 * @module hooks/use-node-metrics
 */

import useSWR from 'swr';
import { useMemo } from 'react';
import { fetcher } from '@/lib/fetcher';
import type { WorkflowTemplateType } from '@/lib/workflow-graph/types';

/* ---------- Types ---------- */

export interface NodeMetrics {
  nodeId: string;
  nodeName: string;
  avgDurationMs: number;
  errorRate: number;
  executionCount: number;
}

interface MetricsResponse {
  metrics: NodeMetrics[];
}

interface UseNodeMetricsOptions {
  campaignId: string | null;
  workflowType: WorkflowTemplateType;
  workspaceId: string | null;
  /** Whether to fetch metrics (default: true) */
  enabled?: boolean;
}

interface UseNodeMetricsReturn {
  /** Map of nodeId → metrics for quick lookup */
  metricsMap: Map<string, NodeMetrics>;
  /** Raw metrics array */
  metrics: NodeMetrics[];
  /** SWR loading */
  isLoading: boolean;
  /** SWR error */
  error: Error | undefined;
}

/* ---------- Hook ---------- */

export function useNodeMetrics({
  campaignId,
  workflowType,
  workspaceId,
  enabled = true,
}: UseNodeMetricsOptions): UseNodeMetricsReturn {
  const swrKey =
    enabled && campaignId && workspaceId
      ? `/api/sandbox/workflow/metrics?campaignId=${campaignId}&workflowType=${workflowType}&workspace_id=${workspaceId}`
      : null;

  const { data, error, isLoading } = useSWR<MetricsResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // metrics don't change rapidly
    },
  );

  const metrics = data?.metrics ?? [];

  const metricsMap = useMemo(() => {
    const map = new Map<string, NodeMetrics>();
    for (const m of metrics) {
      map.set(m.nodeId, m);
    }
    return map;
  }, [metrics]);

  return {
    metricsMap,
    metrics,
    isLoading,
    error,
  };
}
