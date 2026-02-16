/**
 * PHASE 64: Apify Selection Stage
 * 
 * Stage 8: Choose between BYO Apify or Managed Service.
 */

'use client';

import { useState, useEffect } from 'react';
import { Globe, DollarSign, Shield, ChevronRight, Loader2, Key, Eye, EyeOff, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';
import type { ApifyMode } from '@/lib/genesis/phase64/credential-vault-types';

export function ApifySelectionStage({ workspaceId, onComplete }: StageComponentProps) {
  const [mode, setMode] = useState<ApifyMode>('managed');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing selection
  useEffect(() => {
    async function loadSelection() {
      try {
        const res = await fetch(`/api/onboarding/apify?workspace_id=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.mode) setMode(data.mode);
          if (data.mode === 'byo' && data.validated) setIsValid(true);
        }
      } catch (err) {
        console.error('Failed to load Apify selection:', err);
      }
    }

    loadSelection();
  }, [workspaceId]);

  const handleValidate = async () => {
    if (!apiToken.trim()) {
      setError('API token is required');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/validate-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'apify_api_token',
          value: apiToken.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setError(data.error || 'Invalid API token');
        setIsValid(false);
      } else {
        setIsValid(true);
      }
    } catch (err) {
      setError('Failed to validate token');
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = async () => {
    if (mode === 'byo' && !isValid) {
      setError('Please validate your API token first');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          mode,
          apiToken: mode === 'byo' ? apiToken.trim() : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save selection');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="grid gap-4">
        {/* BYO Option */}
        <button
          onClick={() => {
            setMode('byo');
            setIsValid(false);
          }}
          className={cn(
            'relative flex items-start gap-4 p-5 rounded-lg border-2 transition-all text-left',
            mode === 'byo'
              ? 'border-accent-primary bg-accent-primary/5'
              : 'border-border bg-surface-elevated hover:border-border-hover'
          )}
        >
          <div className={cn(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1',
            mode === 'byo'
              ? 'border-accent-primary bg-accent-primary'
              : 'border-border'
          )}>
            {mode === 'byo' && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>

          <div className="flex-1">
            <div className="font-semibold text-text-primary mb-1">
              Bring Your Own Apify Account
            </div>
            <div className="text-sm text-text-secondary mb-3">
              Use your existing Apify subscription
            </div>
            <ul className="space-y-1.5 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-accent-success" />
                You manage your own Apify subscription
              </li>
              <li className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-accent-success" />
                Direct billing to your Apify account
              </li>
              <li className="flex items-center gap-2">
                <Key className="h-3 w-3 text-accent-success" />
                Full control over your API limits
              </li>
            </ul>
          </div>
        </button>

        {/* Managed Option */}
        <button
          onClick={() => setMode('managed')}
          className={cn(
            'relative flex items-start gap-4 p-5 rounded-lg border-2 transition-all text-left',
            mode === 'managed'
              ? 'border-accent-primary bg-accent-primary/5'
              : 'border-border bg-surface-elevated hover:border-border-hover'
          )}
        >
          <div className={cn(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1',
            mode === 'managed'
              ? 'border-accent-primary bg-accent-primary'
              : 'border-border'
          )}>
            {mode === 'managed' && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary">
                Use Genesis Managed Service
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                Recommended
              </span>
            </div>
            <div className="text-sm text-text-secondary mb-3">
              Pay $0.02 per scrape from your Genesis Wallet
            </div>
            <ul className="space-y-1.5 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-accent-purple" />
                No Apify account needed
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-accent-purple" />
                Automatic rate limiting and failover
              </li>
              <li className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-accent-purple" />
                Predictable pricing with bulk discounts
              </li>
            </ul>
          </div>
        </button>
      </div>

      {/* BYO Token Input */}
      {mode === 'byo' && (
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Apify API Token
            </label>
            
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={apiToken}
                onChange={(e) => {
                  setApiToken(e.target.value);
                  setIsValid(false);
                }}
                placeholder="apify_api_..."
                className={cn(
                  'w-full pl-10 pr-20 py-3 rounded-lg text-sm',
                  'bg-surface-elevated border-2 transition-all',
                  'text-text-primary placeholder:text-text-secondary/50',
                  'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary',
                  isValid && 'border-accent-success'
                )}
              />
              
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-surface transition-colors"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-text-secondary" />
                ) : (
                  <Eye className="h-4 w-4 text-text-secondary" />
                )}
              </button>
              
              {isValid && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <Check className="h-5 w-5 text-accent-success" />
                </div>
              )}
            </div>
          </div>

          {!isValid && (
            <button
              onClick={handleValidate}
              disabled={!apiToken.trim() || isValidating}
              className="w-full flex items-center justify-center gap-2 h-11 bg-surface-elevated border-2 border-border text-text-primary rounded-lg font-medium hover:bg-accent-primary/5 hover:border-accent-primary/50 transition-all disabled:opacity-50"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Validate Token
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
          {error}
        </div>
      )}

      {/* Continue */}
      <button
        onClick={handleContinue}
        disabled={isSaving || (mode === 'byo' && !isValid)}
        className="w-full flex items-center justify-center gap-2 h-12 bg-accent-primary text-white rounded-lg font-semibold shadow-lg shadow-accent-primary/25 hover:bg-accent-primary/90 transition-all disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Continue
            <ChevronRight className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
  );
}
