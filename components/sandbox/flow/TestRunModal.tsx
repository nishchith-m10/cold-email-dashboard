'use client';

/**
 * TestRunModal — Simplified dialog for triggering test campaign runs.
 *
 * Pre-selects the current campaign. Only shows a test email field.
 * No MAX_EMAILS_PER_DAY, OFFICE_HOURS, or other config knobs.
 *
 * @module components/sandbox/flow/TestRunModal
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Play, X, Loader2 } from 'lucide-react';

/* ---------- Types ---------- */

export interface TestRunModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current campaign ID */
  campaignId: string;
  /** Campaign name for display */
  campaignName: string;
  /** Workspace ID */
  workspaceId: string;
  /** Callback when execution starts — passes executionId */
  onExecutionStart?: (executionId: string) => void;
}

/* ---------- Component ---------- */

function TestRunModalComponent({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  workspaceId,
  onExecutionStart,
}: TestRunModalProps) {
  const [testEmail, setTestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus email input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        const res = await fetch('/api/sandbox/test-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            campaignId,
            testEmail: testEmail.trim() || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to trigger test run');
          setIsSubmitting(false);
          return;
        }

        // Success — pass executionId to parent and close
        if (data.executionId && onExecutionStart) {
          onExecutionStart(data.executionId);
        }

        setTestEmail('');
        setIsSubmitting(false);
        onClose();
      } catch (err) {
        setError('Network error — please try again');
        setIsSubmitting(false);
      }
    },
    [workspaceId, campaignId, testEmail, onExecutionStart, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Run Test</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Campaign info */}
        <div className="mb-4 p-2.5 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">Campaign</p>
          <p className="text-sm font-medium truncate">{campaignName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="testEmail"
              className="block text-xs font-medium mb-1.5"
            >
              Test Email (optional)
            </label>
            <input
              ref={inputRef}
              id="testEmail"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="
                w-full h-9 px-3
                bg-background border border-border rounded-md
                text-sm placeholder:text-muted-foreground
                focus:ring-2 focus:ring-ring focus:outline-none
              "
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Leave blank to use the default test email
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-500">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs border border-border rounded-md hover:bg-muted transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                flex items-center gap-1.5 px-4 py-2
                bg-primary text-primary-foreground
                text-xs font-medium rounded-md
                hover:bg-primary/90 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Triggering…
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run Test
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const TestRunModal = memo(TestRunModalComponent);
