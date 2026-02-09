/**
 * PHASE 45: SANDBOX PANEL
 * 
 * Main sandbox UI component. Contains:
 * - Test runner (trigger test campaigns)
 * - Real-time execution monitor
 * - Test run history
 */

'use client';

import { useState } from 'react';
import { ExecutionMonitor } from './execution-monitor';
import { TestRunner } from './test-runner';
import { useSandboxHistory } from '@/hooks/use-sandbox';
import type { SandboxTestRun } from '@/lib/genesis/phase45/types';

interface SandboxPanelProps {
  workspaceId: string;
}

export function SandboxPanel({ workspaceId }: SandboxPanelProps) {
  const [activeExecution, setActiveExecution] = useState<string | null>(null);
  const { runs, isLoading: historyLoading, refresh } = useSandboxHistory(workspaceId);

  const handleExecutionStart = (executionId: string) => {
    setActiveExecution(executionId);
  };

  const handleExecutionComplete = () => {
    // Refresh history when execution completes
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-r-md">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Test Mode
        </h3>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
          Run your campaigns with test data. Emails will be sent to your test address.
          See real-time execution for every node.
        </p>
      </div>

      {/* Test runner */}
      <TestRunner
        workspaceId={workspaceId}
        onExecutionStart={handleExecutionStart}
      />

      {/* Active execution monitor */}
      {activeExecution && (
        <ExecutionMonitor
          executionId={activeExecution}
          onComplete={handleExecutionComplete}
        />
      )}

      {/* History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Recent Test Runs</h3>
        {historyLoading ? (
          <p className="text-xs text-muted-foreground">Loading history...</p>
        ) : runs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No test runs yet.</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {runs.map((run: SandboxTestRun) => (
              <div
                key={run.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                onClick={() => run.executionId && setActiveExecution(run.executionId)}
              >
                <div>
                  <div className="text-sm font-medium">
                    {run.testEmail}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(run.startedAt).toLocaleString()}
                    {run.totalDurationMs !== null && ` · ${(run.totalDurationMs / 1000).toFixed(1)}s`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {run.nodeCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {run.nodeCount} nodes
                    </span>
                  )}
                  <StatusBadge status={run.status} errorCount={run.errorCount} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, errorCount }: { status: string; errorCount: number }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300',
  };

  const label = status === 'completed' && errorCount > 0
    ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
    : status;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {label}
    </span>
  );
}
