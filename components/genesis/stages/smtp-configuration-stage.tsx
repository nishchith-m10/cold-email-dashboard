/**
 * PHASE 64.B: SMTP Configuration Stage
 * 
 * Stage 3b: Configure custom SMTP server settings
 * Only shown when user selects SMTP in email_provider_selection stage.
 * 
 * Architecture: 
 * - Credentials stored encrypted in email_provider_config table
 * - Sidecar reads these and injects to SMTP service env vars
 * - n8n workflows call Sidecar's /send and /check-reply endpoints
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

interface SMTPFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: 'ssl' | 'starttls' | 'none';
  smtp_from_name: string;
  smtp_from_email: string;
}

const DEFAULT_FORM: SMTPFormData = {
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_encryption: 'starttls',
  smtp_from_name: '',
  smtp_from_email: '',
};

const ENCRYPTION_OPTIONS = [
  { value: 'starttls', label: 'STARTTLS (Port 587)', port: 587 },
  { value: 'ssl', label: 'SSL/TLS (Port 465)', port: 465 },
  { value: 'none', label: 'None (Port 25)', port: 25 },
] as const;

export function SMTPConfigurationStage({ workspaceId, onComplete }: StageComponentProps) {
  const [form, setForm] = useState<SMTPFormData>(DEFAULT_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, 'smtp_configuration');

  // Save non-secret form fields as draft
  const persistDraft = useCallback(
    (overrides?: Partial<SMTPFormData>) => {
      const merged = { ...form, ...overrides };
      // Exclude password from draft for security
      const { smtp_password: _, ...safe } = merged;
      saveDraft(safe);
    },
    [form, saveDraft],
  );

  // Load existing configuration, fall back to draft
  useEffect(() => {
    let cancelled = false;

    async function loadExisting() {
      try {
        const res = await fetch(`/api/workspace/email-config?workspace_id=${workspaceId}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.provider === 'smtp' && data.smtp_host) {
            setForm({
              smtp_host: data.smtp_host || '',
              smtp_port: data.smtp_port || 587,
              smtp_username: data.smtp_username || '',
              smtp_password: '', // Never returned from API
              smtp_encryption: data.smtp_encryption || 'starttls',
              smtp_from_name: data.from_name || '',
              smtp_from_email: data.from_email || '',
            });
            setIsConfigured(true);
          } else if (draft && !cancelled) {
            // No server data — restore from draft
            setForm(prev => ({
              ...prev,
              smtp_host: (draft.smtp_host as string) || prev.smtp_host,
              smtp_port: (draft.smtp_port as number) || prev.smtp_port,
              smtp_username: (draft.smtp_username as string) || prev.smtp_username,
              smtp_encryption: (draft.smtp_encryption as SMTPFormData['smtp_encryption']) || prev.smtp_encryption,
              smtp_from_name: (draft.smtp_from_name as string) || prev.smtp_from_name,
              smtp_from_email: (draft.smtp_from_email as string) || prev.smtp_from_email,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load SMTP config:', err);
        // Restore from draft on error
        if (!cancelled && draft) {
          setForm(prev => ({
            ...prev,
            smtp_host: (draft.smtp_host as string) || prev.smtp_host,
            smtp_port: (draft.smtp_port as number) || prev.smtp_port,
            smtp_username: (draft.smtp_username as string) || prev.smtp_username,
            smtp_encryption: (draft.smtp_encryption as SMTPFormData['smtp_encryption']) || prev.smtp_encryption,
            smtp_from_name: (draft.smtp_from_name as string) || prev.smtp_from_name,
            smtp_from_email: (draft.smtp_from_email as string) || prev.smtp_from_email,
          }));
        }
      }
    }

    if (!isDraftLoading) {
      loadExisting();
    }

    return () => { cancelled = true; };
  }, [workspaceId, draft, isDraftLoading]);

  const handleChange = (field: keyof SMTPFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
    setTestResult(null);
    // Draft-save non-password fields
    if (field !== 'smtp_password') {
      persistDraft({ [field]: value } as Partial<SMTPFormData>);
    }
  };

  const handleEncryptionChange = (encryption: SMTPFormData['smtp_encryption']) => {
    const option = ENCRYPTION_OPTIONS.find(o => o.value === encryption);
    const newPort = option?.port || form.smtp_port;
    setForm(prev => ({
      ...prev,
      smtp_encryption: encryption,
      smtp_port: newPort,
    }));
    persistDraft({ smtp_encryption: encryption, smtp_port: newPort });
  };

  const validateForm = (): string | null => {
    if (!form.smtp_host) return 'SMTP host is required';
    if (!form.smtp_port) return 'SMTP port is required';
    if (!form.smtp_username) return 'Username is required';
    if (!form.smtp_password && !isConfigured) return 'Password is required';
    if (!form.smtp_from_email) return 'From email is required';
    if (!form.smtp_from_name) return 'From name is required';
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.smtp_from_email)) {
      return 'Invalid from email address';
    }
    
    return null;
  };

  const handleTest = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const res = await fetch('/api/workspace/email-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider: 'smtp',
          ...form,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: 'SMTP connection verified successfully!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection test failed',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/workspace/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider: 'smtp',
          ...form,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save SMTP configuration');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      {isConfigured && (
        <div className="p-3 bg-accent-success/10 border border-accent-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-accent-success" />
            <span className="text-sm text-accent-success font-medium">SMTP already configured</span>
            <span className="text-xs text-text-secondary">- Update below or continue</span>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Host & Port Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              SMTP Host
            </label>
            <input
              type="text"
              value={form.smtp_host}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              placeholder="smtp.example.com"
              className="w-full h-10 px-3 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Port
            </label>
            <input
              type="number"
              value={form.smtp_port}
              onChange={(e) => handleChange('smtp_port', parseInt(e.target.value) || 587)}
              className="w-full h-10 px-3 bg-surface-elevated border border-border rounded-lg text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Encryption */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Encryption
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ENCRYPTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleEncryptionChange(option.value)}
                className={cn(
                  'h-10 px-3 rounded-lg border text-sm font-medium transition-all',
                  form.smtp_encryption === option.value
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border bg-surface-elevated text-text-secondary hover:border-border-focus'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Username
          </label>
          <input
            type="text"
            value={form.smtp_username}
            onChange={(e) => handleChange('smtp_username', e.target.value)}
            placeholder="your-email@example.com or username"
            className="w-full h-10 px-3 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Password {isConfigured && <span className="text-text-tertiary">(leave blank to keep existing)</span>}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.smtp_password}
              onChange={(e) => handleChange('smtp_password', e.target.value)}
              placeholder={isConfigured ? '••••••••' : 'App password or SMTP password'}
              className="w-full h-10 px-3 pr-10 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* From Name & Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              From Name
            </label>
            <input
              type="text"
              value={form.smtp_from_name}
              onChange={(e) => handleChange('smtp_from_name', e.target.value)}
              placeholder="John Doe"
              className="w-full h-10 px-3 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              From Email
            </label>
            <input
              type="email"
              value={form.smtp_from_email}
              onChange={(e) => handleChange('smtp_from_email', e.target.value)}
              placeholder="outreach@example.com"
              className="w-full h-10 px-3 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          'p-3 rounded-lg border text-sm',
          testResult.success
            ? 'bg-accent-success/10 border-accent-success/20 text-accent-success'
            : 'bg-accent-danger/10 border-accent-danger/20 text-accent-danger'
        )}>
          <div className="flex items-center gap-2">
            {testResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {testResult.message}
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
          How it works:
        </h4>
        <ul className="space-y-1.5 text-xs text-text-secondary">
          <li className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0 mt-0.5" />
            Credentials are encrypted and stored securely
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0 mt-0.5" />
            Sidecar service handles email sending via SMTP
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0 mt-0.5" />
            Reply detection uses IMAP (same credentials)
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 text-accent-success flex-shrink-0 mt-0.5" />
            Threading handled via In-Reply-To/References headers
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleTest}
          disabled={isTesting || isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm font-medium text-text-primary hover:border-border-focus transition-colors disabled:opacity-50"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing…
            </>
          ) : (
            'Test Connection'
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || isTesting}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : (isConfigured ? 'Update & Continue →' : 'Save & Continue →')}
        </button>
      </div>
    </div>
  );
}

export type { StageComponentProps };
