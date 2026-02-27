'use client';

/**
 * ExecutionTimeline — Vertical timeline sidebar showing execution events
 * in chronological order with status indicators, durations, and
 * focus-to-node buttons.
 *
 * @module components/sandbox/flow/ExecutionTimeline
 */

import { memo, useEffect, useRef } from 'react';
import type { ExecutionEvent } from '@/lib/genesis/phase45/types';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Crosshair,
} from 'lucide-react';

/* ---------- Types ---------- */

export interface ExecutionTimelineProps {
  /** Ordered array of execution events */
  events: ExecutionEvent[];
  /** Whether the execution is still running */
  isRunning: boolean;
  /** Callback to focus/center a node on the canvas */
  onFocusNode?: (nodeId: string) => void;
}

/* ---------- Helpers ---------- */

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; colorClass: string; label: string }
> = {
  started: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
    colorClass: 'border-blue-500 bg-blue-500',
    label: 'Started',
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
    colorClass: 'border-blue-500 bg-blue-500',
    label: 'Running',
  },
  success: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    colorClass: 'border-green-500 bg-green-500',
    label: 'Success',
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    colorClass: 'border-green-500 bg-green-500',
    label: 'Completed',
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    colorClass: 'border-red-500 bg-red-500',
    label: 'Error',
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    colorClass: 'border-red-500 bg-red-500',
    label: 'Failed',
  },
};

const DEFAULT_STATUS_CONFIG = {
  icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  colorClass: 'border-muted-foreground bg-muted-foreground',
  label: 'Unknown',
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? DEFAULT_STATUS_CONFIG;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimestamp(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return createdAt;
  }
}

/* ---------- Component ---------- */

function ExecutionTimelineComponent({
  events,
  isRunning,
  onFocusNode,
}: ExecutionTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0 && !isRunning) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-sm text-muted-foreground">
        No execution events yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Execution Timeline</h3>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-blue-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </span>
        )}
      </div>

      {/* Timeline list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0"
      >
        {events.map((event, idx) => {
          const config = getStatusConfig(event.status);
          const isLast = idx === events.length - 1;

          return (
            <div key={event.id || `${event.nodeName}-${idx}`} className="flex gap-3">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${config.colorClass}`}
                />
                {!isLast && (
                  <div className="w-px flex-1 min-h-[24px] bg-border" />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 pb-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  {config.icon}
                  <span className="text-xs font-medium truncate">
                    {event.nodeName}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimestamp(event.createdAt)}
                  </span>
                  {event.executionTimeMs !== null && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDuration(event.executionTimeMs)}
                    </span>
                  )}
                </div>
                {event.errorMessage && (
                  <p className="text-[10px] text-red-500 mt-0.5 truncate">
                    {event.errorMessage}
                  </p>
                )}
                {onFocusNode && (
                  <button
                    onClick={() => onFocusNode(event.nodeId)}
                    className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    title="Focus node on canvas"
                  >
                    <Crosshair className="h-2.5 w-2.5" />
                    Focus
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ExecutionTimeline = memo(ExecutionTimelineComponent);
