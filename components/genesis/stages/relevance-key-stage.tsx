/**
 * PHASE 64: Relevance AI Configuration Stage
 * 
 * Stage 7: Full Relevance AI configuration including:
 * - Base URL (region-specific)
 * - Project ID
 * - Studio ID
 * - Auth Token
 * - LinkedIn Research Tool import instructions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, 
  Check, 
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

// Relevance AI region examples
const RELEVANCE_REGIONS = [
  { region: 'US', baseUrl: 'https://api-bcbe5a.stack.tryrelevance.com', description: 'US Region' },
  { region: 'EU', baseUrl: 'https://api-eu.stack.tryrelevance.com', description: 'EU Region' },
  { region: 'AU', baseUrl: 'https://api-au.stack.tryrelevance.com', description: 'Australia Region' },
];

export function RelevanceKeyStage({ workspaceId, onComplete }: StageComponentProps) {
  // Form state
  const [baseUrl, setBaseUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [studioId, setStudioId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [toolImported, setToolImported] = useState(false);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, 'relevance_key');

  // Save non-secret fields as draft
  const persistDraft = useCallback(
    (overrides?: Record<string, unknown>) => {
      saveDraft({ baseUrl, projectId, studioId, toolImported, ...overrides });
    },
    [baseUrl, projectId, studioId, toolImported, saveDraft],
  );

  // Load existing config, fall back to draft
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const res = await fetch(`/api/onboarding/credentials?workspace_id=${workspaceId}&type=relevance_config`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.config) {
            setBaseUrl(data.config.baseUrl || '');
            setProjectId(data.config.projectId || '');
            setStudioId(data.config.studioId || '');
            setToolImported(data.config.toolImported || false);
          } else if (draft) {
            if (draft.baseUrl) setBaseUrl(draft.baseUrl as string);
            if (draft.projectId) setProjectId(draft.projectId as string);
            if (draft.studioId) setStudioId(draft.studioId as string);
            if (draft.toolImported) setToolImported(draft.toolImported as boolean);
          }
        }
      } catch (err) {
        console.error('Failed to load Relevance config:', err);
        if (!cancelled && draft) {
          if (draft.baseUrl) setBaseUrl(draft.baseUrl as string);
          if (draft.projectId) setProjectId(draft.projectId as string);
          if (draft.studioId) setStudioId(draft.studioId as string);
        }
      }
    }

    if (!isDraftLoading) {
      loadConfig();
    }

    return () => { cancelled = true; };
  }, [workspaceId, draft, isDraftLoading]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleValidate = async () => {
    if (!baseUrl || !projectId || !studioId || !authToken) {
      setError('All fields are required');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationStatus('idle');

    try {
      const res = await fetch('/api/onboarding/validate-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'relevance_config',
          config: {
            baseUrl: baseUrl.trim(),
            projectId: projectId.trim(),
            studioId: studioId.trim(),
            authToken: authToken.trim(),
          },
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setValidationStatus('valid');
      } else {
        setValidationStatus('invalid');
        setError(data.error || 'Validation failed');
      }
    } catch (err) {
      setValidationStatus('invalid');
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = async () => {
    if (!baseUrl || !projectId || !studioId || !authToken) {
      setError('All fields are required');
      return;
    }

    if (!toolImported) {
      setError('Please confirm that you have imported the LinkedIn Research Tool');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          type: 'relevance_config',
          config: {
            baseUrl: baseUrl.trim(),
            projectId: projectId.trim(),
            studioId: studioId.trim(),
            authToken: authToken.trim(),
            toolImported,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save configuration');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadToolFile = () => {
    // Download the .rai tool file
    window.open('/api/onboarding/relevance-tool-download', '_blank');
  };

  const isFormValid = baseUrl && projectId && studioId && authToken && toolImported;

  return (
    <div className="space-y-5">
      {/* Getting Started guidance */}
      <div className="text-sm text-text-secondary space-y-1">
        <p>
          Relevance AI powers LinkedIn profile research. If you don&apos;t have an account yet,{' '}
          <a href="https://relevanceai.com" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            create one here
          </a>.
        </p>
      </div>

      {/* Step 1: Import the tool */}
      <div className="border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-bold">1</span>
            Import LinkedIn Research Tool
          </div>
          {toolImported && <Check className="h-4 w-4 text-accent-success" />}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-text-secondary">
            Download the tool file below, then import it into your Relevance AI dashboard.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadToolFile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated border border-border rounded-md text-xs font-medium text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download .rai file
            </button>
            <a
              href="https://relevanceai.com/docs/tools/importing-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-secondary hover:text-accent-primary transition-colors"
            >
              Import instructions →
            </a>
          </div>
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={toolImported}
              onChange={(e) => { setToolImported(e.target.checked); persistDraft({ toolImported: e.target.checked }); }}
              className="h-3.5 w-3.5 rounded border-border text-accent-primary focus:ring-accent-primary"
            />
            <span className="text-xs text-text-secondary">I&apos;ve imported the tool</span>
          </label>
        </div>
      </div>

      {/* Step 2: Credentials — all in one container */}
      <div className="border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-bold">2</span>
            Enter your credentials
          </div>
        </div>
        <div className="divide-y divide-border">
          {/* Base URL */}
          <div className="p-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              Base URL
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => { setBaseUrl(e.target.value); persistDraft({ baseUrl: e.target.value }); }}
              placeholder="https://api-bcbe5a.stack.tryrelevance.com"
              className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-xs text-text-secondary">Region:</span>
              {RELEVANCE_REGIONS.map((r) => (
                <button
                  key={r.region}
                  onClick={() => { setBaseUrl(r.baseUrl); persistDraft({ baseUrl: r.baseUrl }); }}
                  className={cn(
                    'px-1.5 py-0.5 text-xs rounded transition-colors',
                    baseUrl === r.baseUrl
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:text-accent-primary'
                  )}
                >
                  {r.region}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              Settings → API → Region Base URL
            </p>
          </div>

          {/* Project ID */}
          <div className="p-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              Project ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); persistDraft({ projectId: e.target.value }); }}
              placeholder="1c7dae110947-495a-b439-7578c53dea94"
              className="w-full px-3 py-2 rounded-md text-sm font-mono bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Found in your browser URL: relevanceai.com/project/<strong>PROJECT_ID</strong>/…
            </p>
          </div>

          {/* Studio ID */}
          <div className="p-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              Studio ID (Tool ID)
            </label>
            <input
              type="text"
              value={studioId}
              onChange={(e) => { setStudioId(e.target.value); persistDraft({ studioId: e.target.value }); }}
              placeholder="f9a70da4-2d80-4e17-ad1b-a37716c423c8"
              className="w-full px-3 py-2 rounded-md text-sm font-mono bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Open the LinkedIn Research Tool → URL contains /tool/<strong>STUDIO_ID</strong>
            </p>
          </div>

          {/* Auth Token */}
          <div className="p-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              Authorization Token
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Your Relevance AI API key"
              className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Settings → API → API Key
            </p>
          </div>
        </div>
      </div>

      {/* Validate */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleValidate}
          disabled={isValidating || !baseUrl || !projectId || !studioId || !authToken}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            validationStatus === 'valid'
              ? 'bg-accent-success/10 text-accent-success'
              : 'bg-surface-elevated border border-border text-text-primary hover:bg-surface-hover disabled:opacity-50'
          )}
        >
          {isValidating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Validating…
            </>
          ) : validationStatus === 'valid' ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Valid
            </>
          ) : (
            'Validate'
          )}
        </button>

        <a
          href="https://relevanceai.com/docs/quickstart"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-secondary hover:text-accent-primary transition-colors"
        >
          Documentation →
        </a>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
          {error}
        </div>
      )}

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isSaving || !isFormValid}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
