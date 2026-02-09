/**
 * PHASE 45: TEST RUNNER COMPONENT
 * 
 * Allows users to trigger a test campaign run.
 * Inputs: campaign selector, test email, optional lead data.
 */

'use client';

import { useState } from 'react';
import { triggerTestCampaign } from '@/hooks/use-sandbox';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { AlertCircle, Clock, Calendar } from 'lucide-react';

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

  // Fetch campaigns for the workspace
  const { campaigns, isLoading: campaignsLoading } = useCampaigns({ workspaceId });
  
  // Fetch config for validation
  const { getValue } = useWorkspaceConfig();

  // Get config values
  const officeStart = getValue<string>('OFFICE_HOURS_START') || '09:00';
  const officeEnd = getValue<string>('OFFICE_HOURS_END') || '17:00';
  const weekendSendsEnabled = getValue<boolean>('ENABLE_WEEKEND_SENDS') || false;
  const maxEmailsPerDay = getValue<number>('MAX_EMAILS_PER_DAY') || 100;

  // Calculate current status
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const [startHour, startMinute] = officeStart.split(':').map(Number);
  const [endHour, endMinute] = officeEnd.split(':').map(Number);
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  const startTimeMinutes = startHour * 60 + startMinute;
  const endTimeMinutes = endHour * 60 + endMinute;
  const withinOfficeHours =
    currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;

  // Build validation warnings (non-blocking for test mode)
  const warnings: Array<{ icon: React.ReactNode; message: string; type: 'warning' | 'info' }> = [];

  if (isWeekend && !weekendSendsEnabled) {
    warnings.push({
      icon: <Calendar className="h-4 w-4" />,
      message: 'Weekend. Production emails will queue until Monday.',
      type: 'warning',
    });
  }

  if (!withinOfficeHours && !isWeekend) {
    warnings.push({
      icon: <Clock className="h-4 w-4" />,
      message: `Outside office hours (${officeStart}-${officeEnd}). Production emails will queue.`,
      type: 'warning',
    });
  }

  // Mock daily count (TODO: fetch from API)
  const dailyEmailCount = 47;
  if (dailyEmailCount >= maxEmailsPerDay) {
    warnings.push({
      icon: <AlertCircle className="h-4 w-4" />,
      message: `Daily email limit reached (${dailyEmailCount}/${maxEmailsPerDay}). Test mode only.`,
      type: 'warning',
    });
  }

  const handleRun = async () => {
    if (!selectedCampaignId) {
      setError('Please select a campaign');
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
          Real workflow execution with test data. Configuration above applies to production.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Campaign</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            disabled={isLoading || campaignsLoading}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select a campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          {campaigns.length === 0 && !campaignsLoading && (
            <p className="text-xs text-muted-foreground mt-1">
              No campaigns found. Create a campaign first.
            </p>
          )}
        </div>

        {/* Config Validation Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                  warning.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                }`}
              >
                {warning.icon}
                <p>{warning.message}</p>
              </div>
            ))}
          </div>
        )}

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
