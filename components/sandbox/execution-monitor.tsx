/**
 * PHASE 45: EXECUTION MONITOR COMPONENT
 * 
 * Real-time node-by-node execution viewer using SSE.
 * Shows each node's status, timing, and output.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { connectExecutionStream } from '@/hooks/use-sandbox';
import type { ExecutionEvent } from '@/lib/genesis/phase45/types';

interface ExecutionMonitorProps {
  executionId: string;
  onComplete?: () => void;
}

export function ExecutionMonitor({ executionId, onComplete }: ExecutionMonitorProps) {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const cleanup = connectExecutionStream(executionId, {
      onNodeEvent: (event) => {
        setEvents(prev => [...prev, event]);
      },
      onComplete: handleComplete,
      onError: (err) => {
        setError(err);
      },
    });

    return cleanup;
  }, [executionId, handleComplete]);

  const totalDuration = events.reduce(
    (sum, e) => sum + (e.executionTimeMs ?? 0),
    0
  );

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Execution Monitor</h3>
        <div className="flex items-center gap-2">
          {totalDuration > 0 && (
            <span className="text-xs text-muted-foreground">
              {(totalDuration / 1000).toFixed(1)}s total
            </span>
          )}
          {isComplete ? (
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              ✓ Complete
            </span>
          ) : error ? (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              ✕ {error}
            </span>
          ) : (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 animate-pulse">
              ⏱ Running...
            </span>
          )}
        </div>
      </div>

      {events.length === 0 && !error && (
        <p className="text-xs text-muted-foreground">Waiting for events...</p>
      )}

      <div className="space-y-2">
        {events
          .filter(e => e.nodeType !== '_execution_complete')
          .map((event, idx) => (
          <div
            key={`${event.nodeId}-${idx}`}
            className={`border-l-4 pl-3 py-2 rounded-r-sm ${
              event.status === 'success'
                ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                : event.status === 'error'
                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                : event.status === 'skipped'
                ? 'border-gray-400 bg-gray-50 dark:bg-gray-900/30'
                : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{event.nodeName}</span>
              {event.executionTimeMs !== null && (
                <span className="text-xs text-muted-foreground">
                  {event.executionTimeMs}ms
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{event.nodeType}</div>

            {event.outputData && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  View Output
                </summary>
                <pre className="mt-1 text-xs bg-background border rounded p-2 overflow-x-auto max-h-32">
                  {JSON.stringify(event.outputData, null, 2)}
                </pre>
              </details>
            )}

            {event.errorMessage && (
              <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                Error: {event.errorMessage}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
