/**
 * PHASE 64: Ignition Stage
 * 
 * Stage 11: Final review and engine provisioning.
 */

'use client';

import { useState, useEffect } from 'react';
import { Rocket, Check, Loader2, Zap, Server, Database, Globe, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

interface ProvisioningStep {
  key: string;
  label: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
}

export function IgnitionStage({ workspaceId, onComplete }: StageComponentProps) {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningSteps, setProvisioningSteps] = useState<ProvisioningStep[]>([
    { key: 'droplet', label: 'Provisioning droplet', status: 'pending' },
    { key: 'database', label: 'Creating database partition', status: 'pending' },
    { key: 'credentials', label: 'Injecting credentials', status: 'pending' },
    { key: 'workflows', label: 'Deploying workflows', status: 'pending' },
    { key: 'handshake', label: 'Establishing connection', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const handleStartIgnition = async () => {
    setIsProvisioning(true);
    setError(null);

    try {
      // Call ignition API
      const res = await fetch('/api/campaigns/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          fromOnboarding: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Provisioning failed');
      }

      const data = await res.json();
      setCampaignId(data.campaignId);

      // Poll for provisioning status
      pollProvisioningStatus(data.campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Provisioning failed');
      setIsProvisioning(false);
    }
  };

  const pollProvisioningStatus = async (id: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaigns/${id}/provision-status`);
        if (!res.ok) {
          clearInterval(pollInterval);
          setError('Failed to check provisioning status');
          setIsProvisioning(false);
          return;
        }

        const data = await res.json();

        // Update steps based on status
        if (data.dropletCreated) {
          updateStepStatus('droplet', 'complete');
        }
        if (data.partitionCreated) {
          updateStepStatus('database', 'complete');
        }
        if (data.credentialsInjected) {
          updateStepStatus('credentials', 'complete');
        }
        if (data.workflowsDeployed) {
          updateStepStatus('workflows', 'complete');
        }
        if (data.handshakeComplete) {
          updateStepStatus('handshake', 'complete');
          clearInterval(pollInterval);
          
          // Wait a moment then complete
          setTimeout(() => {
            setIsProvisioning(false);
            onComplete();
          }, 1500);
        }
      } catch (err) {
        clearInterval(pollInterval);
        setError('Provisioning status check failed');
        setIsProvisioning(false);
      }
    }, 2000);
  };

  const updateStepStatus = (key: string, status: ProvisioningStep['status']) => {
    setProvisioningSteps(steps =>
      steps.map(step =>
        step.key === key ? { ...step, status } : step
      )
    );
  };

  const allComplete = provisioningSteps.every(s => s.status === 'complete');

  return (
    <div className="space-y-6">
      {!isProvisioning && !allComplete && (
        <>
          {/* Ready to Launch */}
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-primary mb-4 shadow-lg shadow-accent-primary/25">
              <Rocket className="h-10 w-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Ready to Launch
            </h3>
            
            <p className="text-text-secondary max-w-md mx-auto">
              All credentials configured. Click below to provision your automation engine.
            </p>
          </div>

          {/* What Will Happen */}
          <div className="bg-surface-elevated border border-border rounded-lg p-5">
            <h4 className="text-sm font-semibold text-text-primary mb-4">
              What happens next:
            </h4>
            
            <ul className="space-y-3">
              {provisioningSteps.map((step, i) => (
                <li key={step.key} className="flex items-center gap-3 text-sm text-text-secondary">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
                    {i + 1}
                  </div>
                  {step.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Time Estimate */}
          <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-accent-primary" />
              <span className="font-medium text-text-primary">
                Estimated time: ~60 seconds
              </span>
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleStartIgnition}
            className="w-full flex items-center justify-center gap-2 h-14 bg-accent-primary text-white rounded-lg font-bold text-lg shadow-xl shadow-accent-primary/30 hover:bg-accent-primary/90 transition-all"
          >
            <Rocket className="h-6 w-6" />
            Start Engine
          </button>
        </>
      )}

      {isProvisioning && (
        <>
          {/* Provisioning Progress */}
          <div className="space-y-4">
            {provisioningSteps.map((step) => (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border-2 transition-all',
                  step.status === 'complete' && 'border-accent-success/30 bg-accent-success/5',
                  step.status === 'in_progress' && 'border-accent-primary/30 bg-accent-primary/5',
                  step.status === 'pending' && 'border-border bg-surface-elevated',
                  step.status === 'failed' && 'border-accent-danger/30 bg-accent-danger/5'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  step.status === 'complete' && 'bg-accent-success text-white',
                  step.status === 'in_progress' && 'bg-accent-primary text-white',
                  step.status === 'pending' && 'bg-border text-text-secondary',
                  step.status === 'failed' && 'bg-accent-danger text-white'
                )}>
                  {step.status === 'complete' ? (
                    <Check className="h-5 w-5" />
                  ) : step.status === 'in_progress' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-current" />
                  )}
                </div>

                <div className="flex-1">
                  <div className={cn(
                    'text-sm font-medium',
                    step.status === 'complete' && 'text-accent-success',
                    step.status === 'in_progress' && 'text-accent-primary',
                    step.status === 'pending' && 'text-text-secondary',
                    step.status === 'failed' && 'text-accent-danger'
                  )}>
                    {step.label}
                  </div>
                  
                  {step.status === 'complete' && (
                    <div className="text-xs text-accent-success mt-0.5">
                      Complete
                    </div>
                  )}
                  {step.status === 'in_progress' && (
                    <div className="text-xs text-accent-primary mt-0.5">
                      In progress...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-sm text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-accent-primary" />
            Provisioning your automation engine...
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent-danger flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-accent-danger mb-1">
                Provisioning Failed
              </div>
              <div className="text-sm text-text-secondary">
                {error}
              </div>
              <button
                onClick={handleStartIgnition}
                className="mt-3 text-sm text-accent-primary hover:underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
