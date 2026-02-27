'use client';

/**
 * ExecutionHistory — List of recent workflow executions with ability
 * to click and replay/overlay execution events on the canvas.
 *
 * @module components/sandbox/flow/ExecutionHistory
 */

import { memo, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { WorkflowTemplateType } from '@/lib/workflow-graph/types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
} from 'lucide-react';

/* ---------- Types ---------- */

export interface ExecutionHistoryEntry {
  executionId: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: 'running' | 'success' | 'error' | 'partial';
  nodeCount: number;
  errorCount: number;
}

export interface ExecutionHistoryResponse {
  executions: ExecutionHistoryEntry[];
}

export interface ExecutionHistoryProps {
  /** Campaign ID */
  campaignId: string | null;
  /** Workflow type */
  workflowType: WorkflowTemplateType;
  /** Workspace ID */
  workspaceId: string | null;
  /** Currently selected execution ID */
  activeExecutionId?: string | null;
  /** Callback when user selects an execution to replay */
  onSelectExecution?: (executionId: string) => void;
  /** Max entries to display */
  limit?: number;
}

/* ---------- Helpers ---------- */

const STATUS_ICONS: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  error: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  partial: <Clock className="h-3.5 w-3.5 text-amber-500" />,
};

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ---------- Component ---------- */

function ExecutionHistoryComponent({
  campaignId,
  workflowType,
  workspaceId,
  activeExecutionId,
  onSelectExecution,
  limit = 10,
}: ExecutionHistoryProps) {
  const swrKey =
    campaignId && workspaceId
      ? `/api/sandbox/workflow/history?campaignId=${campaignId}&workflowType=${workflowType}&workspace_id=${workspaceId}&limit=${limit}`
      : null;

  const { data, isLoading, error } = useSWR<ExecutionHistoryResponse>(
    swrKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  const handleSelect = useCallback(
    (executionId: string) => {
      onSelectExecution?.(executionId);
    },
    [onSelectExecution],
  );

  /* Loading state */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] text-sm text-red-500">
        Failed to load execution history
      </div>
    );
  }

  /* Empty state */
  const executions = data?.executions ?? [];
  if (executions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] text-sm text-muted-foreground">
        No execution history for this workflow
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Execution History</h3>
        <span className="text-xs text-muted-foreground">
          {executions.length} run{executions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {executions.map((exec) => {
          const isActive = exec.executionId === activeExecutionId;
          return (
            <button
              key={exec.executionId}
              onClick={() => handleSelect(exec.executionId)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5
                text-left transition-colors border-b border-border/50
                hover:bg-muted/50
                ${isActive ? 'bg-accent' : ''}
              `}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {STATUS_ICONS[exec.status] ?? STATUS_ICONS.partial}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">
                    {formatTimestamp(exec.startedAt)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDuration(exec.durationMs)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {exec.nodeCount} node{exec.nodeCount !== 1 ? 's' : ''}
                  </span>
                  {exec.errorCount > 0 && (
                    <span className="text-[10px] text-red-500">
                      {exec.errorCount} error{exec.errorCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Replay indicator */}
              <Play className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const ExecutionHistory = memo(ExecutionHistoryComponent);
