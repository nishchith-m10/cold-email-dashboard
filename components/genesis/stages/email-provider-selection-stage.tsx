/**
 * PHASE 64.B: Email Provider Selection Stage
 * 
 * Stage 3: Choose email provider (Gmail OAuth or Custom SMTP)
 * This selection determines which subsequent stage is shown:
 * - Gmail → gmail_oauth stage
 * - SMTP → smtp_configuration stage
 * 
 * Architecture Note: Each workspace = 1 droplet = 1 email provider
 * The Sidecar will deploy only the workflows for the selected provider.
 */

'use client';

import { useState, useEffect } from 'react';
import { Mail, Server, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';
import type { EmailProviderChoice } from '@/lib/genesis/phase64/credential-vault-types';

interface ProviderOption {
  id: EmailProviderChoice;
  name: string;
  description: string;
  icon: typeof Mail;
  features: string[];
  recommended?: boolean;
  comingSoon?: boolean;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Connect your Google Workspace or personal Gmail account',
    icon: Mail,
    features: [
      'OAuth 2.0 authentication (most secure)',
      'Native Gmail threading support',
      'Automatic reply detection',
      'Up to 2,000 emails/day (Workspace)',
    ],
    recommended: true,
  },
  {
    id: 'smtp',
    name: 'Custom SMTP',
    description: 'Use your own SMTP server or email service',
    icon: Server,
    features: [
      'Full control over sending infrastructure',
      'Works with any SMTP-compatible server',
      'IMAP reply detection via Sidecar',
      'No daily sending limits (server-dependent)',
    ],
  },
];

export function EmailProviderSelectionStage({ workspaceId, onComplete }: StageComponentProps) {
  const [selectedProvider, setSelectedProvider] = useState<EmailProviderChoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingProvider, setExistingProvider] = useState<EmailProviderChoice | null>(null);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, 'email_provider_selection');

  // Check for existing provider selection, fall back to draft
  useEffect(() => {
    let cancelled = false;

    async function checkExisting() {
      try {
        const res = await fetch(`/api/workspace/email-config?workspace_id=${workspaceId}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.provider) {
            setExistingProvider(data.provider);
            setSelectedProvider(data.provider);
          } else if (draft?.provider) {
            setSelectedProvider(draft.provider as EmailProviderChoice);
          }
        }
      } catch (err) {
        console.error('Failed to check existing provider:', err);
        if (!cancelled && draft?.provider) {
          setSelectedProvider(draft.provider as EmailProviderChoice);
        }
      }
    }

    if (!isDraftLoading) {
      checkExisting();
    }

    return () => { cancelled = true; };
  }, [workspaceId, draft, isDraftLoading]);

  const handleSelect = (provider: EmailProviderChoice) => {
    setSelectedProvider(provider);
    setError(null);
    saveDraft({ provider });
  };

  const handleContinue = async () => {
    if (!selectedProvider) {
      setError('Please select an email provider');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save provider selection to email_provider_config table
      const res = await fetch('/api/workspace/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider: selectedProvider,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save provider selection');
      }

      // Mark stage complete and pass provider to wizard for conditional routing
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider selection');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border border-border rounded-lg divide-y divide-border">
        {/* Provider Options */}
        <div className="p-4">
          <div className="grid gap-4">
        {PROVIDER_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedProvider === option.id;
          const isDisabled = option.comingSoon;

          return (
            <button
              key={option.id}
              onClick={() => !isDisabled && handleSelect(option.id)}
              disabled={isDisabled}
              className={cn(
                'relative w-full text-left p-4 rounded-lg border-2 transition-all',
                isSelected 
                  ? 'border-accent-primary bg-accent-primary/5' 
                  : 'border-border hover:border-border-focus',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Recommended Badge */}
              {option.recommended && (
                <div className="absolute -top-2 right-4 px-2 py-0.5 bg-accent-primary text-white text-xs font-medium rounded-full">
                  Recommended
                </div>
              )}

              {/* Coming Soon Badge */}
              {option.comingSoon && (
                <div className="absolute -top-2 right-4 px-2 py-0.5 bg-text-secondary text-white text-xs font-medium rounded-full">
                  Coming Soon
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
                  isSelected 
                    ? 'bg-accent-primary text-white' 
                    : 'bg-surface-elevated text-text-secondary'
                )}>
                  <Icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      'text-base font-semibold',
                      isSelected ? 'text-accent-primary' : 'text-text-primary'
                    )}>
                      {option.name}
                    </h3>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-text-secondary mb-3">
                    {option.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-1.5">
                    {option.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <Check className={cn(
                          'h-3.5 w-3.5 flex-shrink-0 mt-0.5',
                          isSelected ? 'text-accent-success' : 'text-text-tertiary'
                        )} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
          </div>
        </div>

        {/* Architecture Note */}
        <div className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-accent-purple flex-shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">Important:</span>{' '}
              Your email provider is set per workspace. All campaigns in this workspace will use the same provider.
              The Sidecar will automatically deploy only the workflows for your selected provider.
            </div>
          </div>
        </div>
      </div>

      {/* Warning if changing from existing */}
      {existingProvider && selectedProvider !== existingProvider && (
        <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-accent-warning flex-shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary">
              <span className="font-semibold text-accent-warning">Warning:</span>{' '}
              You previously selected <strong>{existingProvider === 'gmail' ? 'Gmail' : 'Custom SMTP'}</strong>. 
              Changing providers will require reconfiguration and may affect existing campaigns.
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
          {error}
        </div>
      )}

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!selectedProvider || isSaving}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}

export type { StageComponentProps };
