/**
 * PHASE 45: EXECUTION MONITOR COMPONENT
 * 
 * Real-time node-by-node execution viewer using SSE.
 * Shows each node's status, timing, and output.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { connectExecutionStream } from '@/hooks/use-sandbox';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import type { ExecutionEvent } from '@/lib/genesis/phase45/types';
import { Clock, CheckCircle, FlaskConical } from 'lucide-react';

interface ExecutionMonitorProps {
  executionId: string;
  onComplete?: () => void;
}

export function ExecutionMonitor({ executionId, onComplete }: ExecutionMonitorProps) {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getValue } = useWorkspaceConfig();

  // Get config for contextual annotations
  const replyDelay = getValue<number>('REPLY_DELAY_MINUTES') || 30;
  const officeStart = getValue<string>('OFFICE_HOURS_START') || '09:00';
  const officeEnd = getValue<string>('OFFICE_HOURS_END') || '17:00';
  const maxEmailsPerDay = getValue<number>('MAX_EMAILS_PER_DAY') || 100;

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

  // Helper to get config context annotation for a node
  const getConfigAnnotation = (event: ExecutionEvent): React.ReactNode | null => {
    const nodeType = event.nodeType.toLowerCase();

    // Email send nodes
    if (nodeType.includes('gmail') || nodeType.includes('smtp') || nodeType.includes('sendgrid')) {
      if (event.status === 'success') {
        // Mock email count (TODO: fetch from API)
        const emailCount = 48;
        return (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
            <CheckCircle className="h-3 w-3" />
            <span>
              Daily count: {emailCount}/{maxEmailsPerDay} emails
              {emailCount < maxEmailsPerDay && ` (${maxEmailsPerDay - emailCount} remaining)`}
            </span>
          </div>
        );
      }
    }

    // Wait/delay nodes
    if (nodeType.includes('wait') || nodeType.includes('delay')) {
      return (
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
          <Clock className="h-3 w-3" />
          <span>Reply Delay: {replyDelay}min (test mode: skipped)</span>
        </div>
      );
    }

    // Schedule validation
    if (nodeType.includes('schedule') || nodeType.includes('filter')) {
      return (
        <div className="mt-2 text-xs text-muted-foreground">
          Office Hours: {officeStart} - {officeEnd}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Execution Monitor</h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <FlaskConical className="h-3 w-3" />
            Test Mode
          </span>
        </div>
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

            {/* Config-aware annotation */}
            {getConfigAnnotation(event)}
          </div>
        ))}
      </div>
    </div>
  );
}
