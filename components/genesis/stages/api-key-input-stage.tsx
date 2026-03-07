/**
 * PHASE 64: API Key Input Stage (Reusable)
 * 
 * Generic component for collecting and validating API keys.
 * Used for OpenAI, Anthropic, Google CSE, Relevance AI.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Loader2, AlertCircle, Eye, EyeOff, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';
import type { CredentialType } from '@/lib/genesis/phase64/credential-vault-types';

interface ApiKeyInputStageProps extends StageComponentProps {
  credentialType: CredentialType;
  title: string;
  description: string;
  placeholder: string;
  helpText?: string;
  docsUrl?: string;
  /** @deprecated icon no longer rendered — wizard provides the header */
  icon?: React.ComponentType<{ className?: string }>;
  extraFields?: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
  }>;
}

export function ApiKeyInputStage({
  workspaceId,
  credentialType,
  title,
  description,
  placeholder,
  helpText,
  docsUrl,
  icon: _Icon,
  extraFields,
  onComplete,
}: ApiKeyInputStageProps) {
  const [apiKey, setApiKey] = useState('');
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, credentialType);

  // Restore from draft (only non-secret extra fields)
  useEffect(() => {
    if (!isDraftLoading && draft && !isValid) {
      if (draft.extraValues && typeof draft.extraValues === 'object') {
        setExtraValues(draft.extraValues as Record<string, string>);
      }
    }
  }, [isDraftLoading, draft, isValid]);

  const persistDraft = useCallback(
    (overrides?: Record<string, unknown>) => {
      saveDraft({ extraValues, ...overrides });
    },
    [extraValues, saveDraft],
  );

  // Check if credential already exists in the vault
  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch(
          `/api/onboarding/credentials?type=${credentialType}&workspace_id=${workspaceId}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setIsValid(true);
            setIsSaved(true);
          }
        }
      } catch (err) {
        console.error('Failed to check credential:', err);
      }
    }

    checkExisting();
  }, [workspaceId, credentialType]);

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setValidationError('API key is required');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const res = await fetch('/api/onboarding/validate-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: credentialType,
          value: apiKey.trim(),
          metadata: extraValues,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setValidationError(data.error || 'Invalid API key');
        setIsValid(false);
      } else {
        setIsValid(true);
        setValidationError(null);
      }
    } catch (err) {
      setValidationError('Failed to validate API key');
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setIsValid(false);
    setIsSaved(false);
    setApiKey('');
    setValidationError(null);
  };

  const handleContinue = async () => {
    // If already saved in vault (from a previous session), just advance
    if (isSaved && !apiKey.trim()) {
      onComplete();
      return;
    }

    if (!isValid) {
      setValidationError('Please validate your API key first');
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const res = await fetch('/api/onboarding/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          type: credentialType,
          value: apiKey.trim(),
          metadata: extraValues,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Save failed (HTTP ${res.status})`);
      }

      setIsSaved(true);
      onComplete();
    } catch (err) {
      setIsValid(false);
      setValidationError(err instanceof Error ? err.message : 'Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // The input is only locked when we've confirmed the credential is saved in the vault.
  // After validation but before save, the input stays editable via the "Change" button.
  const inputLocked = isValid || isSaved;

  return (
    <div className="space-y-5">
      {/* Saved indicator — shows when credential is already in vault (from reload) */}
      {isSaved && !apiKey.trim() && (
        <div className="p-3 bg-accent-success/10 border border-accent-success/20 rounded-lg flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-accent-success">
            <Check className="h-4 w-4" />
            Credential saved and encrypted
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Change
          </button>
        </div>
      )}

      {/* Fields container */}
      <div className="bg-surface border border-border rounded-lg divide-y divide-border">
        {/* API Key Input */}
        <div className="p-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setIsValid(false);
                setIsSaved(false);
                setValidationError(null);
              }}
              placeholder={isSaved ? '••••••••  (saved — enter new key to replace)' : placeholder}
              className={cn(
                'w-full px-3 pr-16 py-2 rounded-md text-sm',
                'bg-surface-elevated border border-border transition-all',
                'text-text-primary placeholder:text-text-secondary',
                'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary',
                isValid && 'border-accent-success',
                validationError && 'border-accent-danger'
              )}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface transition-colors"
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? (
                <EyeOff className="h-3.5 w-3.5 text-text-secondary" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-text-secondary" />
              )}
            </button>
            {isValid && apiKey.trim() && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Check className="h-4 w-4 text-accent-success" />
              </div>
            )}
          </div>
        </div>

        {/* Extra Fields */}
        {extraFields?.map((field) => (
          <div key={field.key} className="p-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              {field.label}
              {field.required && <span className="text-accent-danger ml-1">*</span>}
            </label>
            <input
              type="text"
              value={extraValues[field.key] || ''}
              onChange={(e) => {
                const updated = { ...extraValues, [field.key]: e.target.value };
                setExtraValues(updated);
                persistDraft({ extraValues: updated });
              }}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
          </div>
        ))}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-accent-danger flex-shrink-0 mt-0.5" />
          <span className="text-sm text-accent-danger">{validationError}</span>
        </div>
      )}

      {/* Validate + Change + Docs row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isValid ? (
            <button
              onClick={handleValidate}
              disabled={!apiKey.trim() || isValidating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-elevated border border-border text-text-primary hover:bg-surface-hover transition-all disabled:opacity-50"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Validating…
                </>
              ) : (
                'Validate'
              )}
            </button>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-xs text-accent-success">
                <Check className="h-3.5 w-3.5" />
                Valid
              </span>
              {apiKey.trim() && (
                <button
                  onClick={handleReset}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Change
                </button>
              )}
            </>
          )}
        </div>

        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-secondary hover:text-accent-primary transition-colors"
          >
            View documentation →
          </a>
        )}
      </div>

      {/* Help text below */}
      {helpText && (
        <p className="text-xs text-text-tertiary">
          {helpText}
        </p>
      )}

      {/* Continue */}
      {(isValid || isSaved) && (
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            disabled={isSaving}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  );
}
