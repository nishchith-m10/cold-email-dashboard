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

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  ExternalLink, 
  Check, 
  AlertCircle,
  Copy,
  FileJson,
  Download,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

  // Load existing config
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/onboarding/credentials?workspace_id=${workspaceId}&type=relevance_config`);
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setBaseUrl(data.config.baseUrl || '');
            setProjectId(data.config.projectId || '');
            setStudioId(data.config.studioId || '');
            // Don't load auth token for security
            setToolImported(data.config.toolImported || false);
          }
        }
      } catch (err) {
        console.error('Failed to load Relevance config:', err);
      }
    }
    loadConfig();
  }, [workspaceId]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-accent-purple/10">
          <Sparkles className="h-5 w-5 text-accent-purple" />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary">Relevance AI Configuration</h3>
          <p className="text-sm text-text-secondary">
            Configure Relevance AI for LinkedIn profile research
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-accent-primary/5 border border-accent-primary/20 rounded-lg">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-accent-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary">
            <p className="mb-2">
              Relevance AI powers the LinkedIn research capabilities. You&apos;ll need to:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a Relevance AI account at <a href="https://relevanceai.com" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">relevanceai.com</a></li>
              <li>Import the LinkedIn Research Tool (provided below)</li>
              <li>Copy your credentials from the Relevance AI dashboard</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Step 1: Import Tool */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-surface-elevated border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-primary text-white text-xs font-bold">1</span>
              <span className="font-medium text-text-primary">Import LinkedIn Research Tool</span>
            </div>
            {toolImported && <Check className="h-5 w-5 text-accent-success" />}
          </div>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-text-secondary">
            Download and import this tool into your Relevance AI account. This tool scrapes LinkedIn profiles and posts for lead research.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadToolFile}
              className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Tool (.rai)
            </button>
            
            <a
              href="https://relevanceai.com/docs/tools/importing-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-accent-primary text-sm font-medium hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Import Instructions
            </a>
          </div>

          <label className="flex items-start gap-3 p-3 bg-surface-elevated rounded-lg cursor-pointer hover:bg-surface-hover transition-colors">
            <input
              type="checkbox"
              checked={toolImported}
              onChange={(e) => setToolImported(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent-primary focus:ring-accent-primary"
            />
            <div className="text-sm">
              <span className="font-medium text-text-primary">I have imported the LinkedIn Research Tool</span>
              <p className="text-text-secondary mt-0.5">
                After importing, you&apos;ll see &quot;LinkedIn Research Tool&quot; in your Relevance AI tools list
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Step 2: Enter Credentials */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-surface-elevated border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-primary text-white text-xs font-bold">2</span>
            <span className="font-medium text-text-primary">Enter Your Credentials</span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Base URL <span className="text-accent-danger">*</span>
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api-bcbe5a.stack.tryrelevance.com"
              className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Found at: Settings → API → Region Base URL
            </p>
            
            {/* Region Examples */}
            <div className="mt-2 flex flex-wrap gap-2">
              {RELEVANCE_REGIONS.map((r) => (
                <button
                  key={r.region}
                  onClick={() => setBaseUrl(r.baseUrl)}
                  className={cn(
                    'px-2 py-1 text-xs rounded border transition-colors',
                    baseUrl === r.baseUrl
                      ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                      : 'bg-surface-elevated border-border text-text-secondary hover:border-accent-primary/50'
                  )}
                >
                  {r.region}
                </button>
              ))}
            </div>
          </div>

          {/* Project ID */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Project ID <span className="text-accent-danger">*</span>
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="1c7dae110947-495a-b439-7578c53dea94"
              className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all font-mono"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Found in your browser URL: relevanceai.com/project/<strong>PROJECT_ID</strong>/...
            </p>
          </div>

          {/* Studio ID */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Studio ID (Tool ID) <span className="text-accent-danger">*</span>
            </label>
            <input
              type="text"
              value={studioId}
              onChange={(e) => setStudioId(e.target.value)}
              placeholder="f9a70da4-2d80-4e17-ad1b-a37716c423c8"
              className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all font-mono"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Found when you open the LinkedIn Research Tool → URL contains /tool/<strong>STUDIO_ID</strong>
            </p>
          </div>

          {/* Auth Token */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Authorization Token <span className="text-accent-danger">*</span>
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Your Relevance AI API key"
              className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Found at: Settings → API → API Key (copy the full key)
            </p>
          </div>

          {/* Validate Button */}
          <button
            onClick={handleValidate}
            disabled={isValidating || !baseUrl || !projectId || !studioId || !authToken}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-all',
              validationStatus === 'valid'
                ? 'bg-accent-success/10 text-accent-success border border-accent-success/30'
                : 'bg-surface-elevated border border-border text-text-primary hover:bg-surface-hover disabled:opacity-50'
            )}
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : validationStatus === 'valid' ? (
              <>
                <Check className="h-4 w-4" />
                Configuration Valid
              </>
            ) : (
              'Validate Configuration'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-accent-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm text-accent-danger">{error}</div>
        </div>
      )}

      {/* Documentation Link */}
      <a
        href="https://relevanceai.com/docs/quickstart"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent-primary transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        Relevance AI Documentation
      </a>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={isSaving || !isFormValid}
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
    </div>
  );
}
