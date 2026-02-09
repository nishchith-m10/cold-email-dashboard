/**
 * PHASE 45: TEST RUNNER COMPONENT
 * 
 * Allows users to trigger a test campaign run.
 * Inputs: campaign selector, test email, optional lead data.
 */

'use client';

import { useState } from 'react';
import { triggerTestCampaign } from '@/hooks/use-sandbox';

interface TestRunnerProps {
  workspaceId: string;
  campaignId?: string;
  onExecutionStart?: (executionId: string) => void;
}

export function TestRunner({ workspaceId, campaignId, onExecutionStart }: TestRunnerProps) {
  const [testEmail, setTestEmail] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaignId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    executionId: string;
    streamUrl: string;
  } | null>(null);

  const handleRun = async () => {
    if (!selectedCampaignId) {
      setError('Please enter a campaign ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastResult(null);

    const result = await triggerTestCampaign({
      workspaceId,
      campaignId: selectedCampaignId,
      testEmail: testEmail || 'test@example.com',
    });

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to trigger test');
      return;
    }

    if (result.executionId && result.streamUrl) {
      setLastResult({
        executionId: result.executionId,
        streamUrl: result.streamUrl,
      });
      onExecutionStart?.(result.executionId);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Run Test Campaign</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Trigger a real workflow execution with test data.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Campaign ID</label>
          <input
            type="text"
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            placeholder="Enter campaign UUID"
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Test Email</label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Emails will be sent to this address instead of real leads.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={isLoading || !selectedCampaignId}
          className="w-full px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Triggering...' : 'Run Test'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
          {error}
        </div>
      )}

      {lastResult && (
        <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3">
          Test triggered! Execution ID: <code className="text-xs">{lastResult.executionId}</code>
        </div>
      )}
    </div>
  );
}
