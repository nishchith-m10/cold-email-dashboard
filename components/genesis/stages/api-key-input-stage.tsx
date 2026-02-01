/**
 * PHASE 64: API Key Input Stage (Reusable)
 * 
 * Generic component for collecting and validating API keys.
 * Used for OpenAI, Anthropic, Google CSE, Relevance AI.
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle, ChevronRight, Eye, EyeOff, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';
import type { CredentialType } from '@/lib/genesis/phase64/credential-vault-types';

interface ApiKeyInputStageProps extends StageComponentProps {
  credentialType: CredentialType;
  title: string;
  description: string;
  placeholder: string;
  helpText?: string;
  docsUrl?: string;
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
  icon: Icon = Key,
  extraFields,
  onComplete,
}: ApiKeyInputStageProps) {
  const [apiKey, setApiKey] = useState('');
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check if credential already exists
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

  const handleContinue = async () => {
    if (!isValid) {
      setValidationError('Please validate your API key first');
      return;
    }

    setIsSaving(true);

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
        throw new Error('Failed to save credential');
      }

      onComplete();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-primary/10 mb-3">
          <Icon className="h-6 w-6 text-accent-primary" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          {title}
        </h3>
        <p className="text-sm text-text-secondary">
          {description}
        </p>
      </div>

      {/* Help Text */}
      {helpText && (
        <div className="bg-surface-elevated border border-border rounded-lg p-4">
          <p className="text-sm text-text-secondary">
            {helpText}
          </p>
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-primary hover:underline mt-2 inline-block"
            >
              View documentation →
            </a>
          )}
        </div>
      )}

      {/* API Key Input */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          API Key
        </label>
        
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsValid(false);
              setValidationError(null);
            }}
            placeholder={placeholder}
            className={cn(
              'w-full pl-10 pr-20 py-3 rounded-lg text-sm',
              'bg-surface-elevated border-2 transition-all',
              'text-text-primary placeholder:text-text-secondary/50',
              'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary',
              isValid && 'border-accent-success',
              validationError && 'border-accent-danger'
            )}
            disabled={isValid}
          />
          
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
          
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-surface transition-colors"
            title={showKey ? 'Hide' : 'Show'}
          >
            {showKey ? (
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

      {/* Extra Fields */}
      {extraFields?.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {field.label}
            {field.required && <span className="text-accent-danger ml-1">*</span>}
          </label>
          
          <input
            type="text"
            value={extraValues[field.key] || ''}
            onChange={(e) =>
              setExtraValues({ ...extraValues, [field.key]: e.target.value })
            }
            placeholder={field.placeholder}
            className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
          />
        </div>
      ))}

      {/* Validation Error */}
      {validationError && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-accent-danger flex-shrink-0 mt-0.5" />
          <span className="text-sm text-accent-danger">{validationError}</span>
        </div>
      )}

      {/* Validate Button */}
      {!isValid && (
        <button
          onClick={handleValidate}
          disabled={!apiKey.trim() || isValidating}
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
              Validate API Key
            </>
          )}
        </button>
      )}

      {/* Continue Button */}
      {isValid && (
        <button
          onClick={handleContinue}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 h-12 bg-gradient-to-r from-accent-primary to-accent-purple text-white rounded-lg font-semibold shadow-lg shadow-accent-primary/25 hover:opacity-90 transition-opacity disabled:opacity-50"
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
      )}
    </div>
  );
}
