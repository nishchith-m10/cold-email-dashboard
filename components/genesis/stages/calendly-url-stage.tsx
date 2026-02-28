/**
 * PHASE 65.3: Calendly URL Stage (Enhanced with Validation)
 * 
 * Stage 10: Collect and validate booking link.
 * 
 * Enhancements:
 * - Real-time format validation
 * - Accessibility check (link returns 200)
 * - Content validation (optional, checks for booking keywords)
 * - Supports: Calendly, Cal.com, SavvyCal, Chili Piper, custom systems
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronRight, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

interface ValidationResult {
  valid: boolean;
  provider?: string;
  error?: string;
  warnings?: string[];
  checks: {
    formatValid: boolean;
    linkAccessible: boolean;
    contentValid?: boolean;
  };
}

export function CalendlyUrlStage({ workspaceId, onComplete }: StageComponentProps) {
  const [bookingUrl, setBookingUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, 'calendly_url');

  // Load existing booking URL, fall back to draft
  useEffect(() => {
    let cancelled = false;

    async function loadBookingUrl() {
      try {
        const res = await fetch(`/api/onboarding/credentials?workspace_id=${workspaceId}&type=calendly_url`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.value) {
            setBookingUrl(data.value);
          } else if (draft?.bookingUrl) {
            setBookingUrl(draft.bookingUrl as string);
          }
        }
      } catch (err) {
        console.error('Failed to load booking URL:', err);
        if (!cancelled && draft?.bookingUrl) {
          setBookingUrl(draft.bookingUrl as string);
        }
      }
    }

    if (!isDraftLoading) {
      loadBookingUrl();
    }

    return () => { cancelled = true; };
  }, [workspaceId, draft, isDraftLoading]);

  const handleValidate = async () => {
    if (!bookingUrl.trim()) {
      setError('Please enter your booking URL');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const res = await fetch('/api/onboarding/validate-calendly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingUrl: bookingUrl.trim(),
          skipContentCheck: false,
        }),
      });

      if (!res.ok) {
        throw new Error('Validation failed');
      }

      const result: ValidationResult = await res.json();
      setValidationResult(result);

      if (!result.valid) {
        setError(result.error || 'Booking link validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = async () => {
    if (!bookingUrl.trim()) {
      setError('Booking URL is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          credential_type: 'calendly_url',
          value: bookingUrl.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save booking URL');
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
      {/* Input Section */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Booking Link <span className="text-accent-danger">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => {
                setBookingUrl(e.target.value);
                setValidationResult(null);
                setError(null);
                saveDraft({ bookingUrl: e.target.value });
              }}
              placeholder="https://calendly.com/your-name/30min"
              className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
          </div>
          <button
            onClick={handleValidate}
            disabled={isValidating || !bookingUrl.trim()}
            className="px-4 py-3 bg-surface-elevated border border-border hover:border-border-focus text-text-primary rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isValidating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Validate'
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          We&apos;ll validate your booking link to ensure it&apos;s working properly
        </p>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={cn(
          'p-4 rounded-lg border',
          validationResult.valid
            ? 'bg-accent-success/10 border-accent-success/20'
            : 'bg-accent-danger/10 border-accent-danger/20'
        )}>
          <div className="flex items-start gap-3">
            {validationResult.valid ? (
              <Check className="h-5 w-5 text-accent-success flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-accent-danger flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className={cn(
                'text-sm font-medium mb-2',
                validationResult.valid ? 'text-accent-success' : 'text-accent-danger'
              )}>
                {validationResult.valid ? 'Booking link validated!' : 'Validation failed'}
              </div>

              {/* Checks */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  {validationResult.checks.formatValid ? (
                    <Check className="h-3.5 w-3.5 text-accent-success" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-accent-danger" />
                  )}
                  <span className={validationResult.checks.formatValid ? 'text-text-secondary' : 'text-accent-danger'}>
                    URL format {validationResult.provider && `(${validationResult.provider})`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {validationResult.checks.linkAccessible ? (
                    <Check className="h-3.5 w-3.5 text-accent-success" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-accent-danger" />
                  )}
                  <span className={validationResult.checks.linkAccessible ? 'text-text-secondary' : 'text-accent-danger'}>
                    Link is accessible
                  </span>
                </div>
                {validationResult.checks.contentValid !== undefined && (
                  <div className="flex items-center gap-2">
                    {validationResult.checks.contentValid ? (
                      <Check className="h-3.5 w-3.5 text-accent-success" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-accent-warning" />
                    )}
                    <span className="text-text-secondary">
                      Page content verified
                    </span>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {validationResult.warnings && validationResult.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {validationResult.warnings.map((warning, idx) => (
                    <div key={idx} className="text-xs text-accent-warning flex items-start gap-1.5">
                      <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
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

      {/* Info Box */}
      <div className="bg-surface-elevated border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-text-primary mb-2">
          Supported Booking Platforms:
        </h4>
        <ul className="space-y-1.5 text-xs text-text-secondary">
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0" />
            Calendly (calendly.com)
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0" />
            Cal.com (cal.com)
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0" />
            SavvyCal (savvycal.com)
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0" />
            Chili Piper (chilipiper.com)
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0" />
            Custom booking systems
          </li>
        </ul>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={isSaving}
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
