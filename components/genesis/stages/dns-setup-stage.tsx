/**
 * PHASE 65.2: Enhanced DNS Setup Stage
 * 
 * Stage 10: Configure SPF, DKIM, DMARC with dual-mode:
 * - Manual Setup (free): Copy-paste DNS records
 * - Entri Automation (optional): One-click DNS configuration
 */

'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Loader2, AlertTriangle, ExternalLink, Copy, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

type SetupMode = 'choose' | 'manual' | 'entri';

interface DNSRecords {
  spf: { name: string; type: string; value: string; ttl: number };
  dkim: { name: string; type: string; value: string; ttl: number };
  dmarc: { name: string; type: string; value: string; ttl: number };
}

export function DNSSetupStage({ workspaceId, onComplete }: StageComponentProps) {
  const [setupMode, setSetupMode] = useState<SetupMode>('choose');
  const [domain, setDomain] = useState('');
  const [provider, setProvider] = useState<'gmail' | 'smtp'>('gmail');
  const [dnsRecords, setDnsRecords] = useState<DNSRecords | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, 'dns_setup');

  // Load email provider and domain, fall back to draft for domain
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        // Get email provider
        const providerRes = await fetch(`/api/workspace/email-config?workspace_id=${workspaceId}`);
        if (providerRes.ok && !cancelled) {
          const providerData = await providerRes.json();
          setProvider(providerData.provider || 'gmail');
        }

        // Get brand info for domain
        const brandRes = await fetch(`/api/onboarding/brand?workspace_id=${workspaceId}`);
        if (brandRes.ok && !cancelled) {
          const brandData = await brandRes.json();
          if (brandData.website) {
            const extractedDomain = brandData.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
            setDomain(extractedDomain);
          } else if (draft?.domain) {
            setDomain(draft.domain as string);
          }
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        if (!cancelled && draft?.domain) {
          setDomain(draft.domain as string);
        }
      }
    }

    if (!isDraftLoading) {
      loadConfig();
    }

    return () => { cancelled = true; };
  }, [workspaceId, draft, isDraftLoading]);

  const handleGenerateRecords = async () => {
    if (!domain.trim()) {
      setError('Please enter your domain');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/dns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          provider,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate DNS records');
      }

      const data = await res.json();
      setDnsRecords(data.records);
      setSetupMode('manual');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate records');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyRecords = async () => {
    if (!dnsRecords) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/dns/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          expectedRecords: {
            spf: dnsRecords.spf.value,
            dkim: { selector: 'genesis', value: dnsRecords.dkim.value },
            dmarc: dnsRecords.dmarc.value,
          },
        }),
      });

      const result = await res.json();
      setVerificationResult(result);

      if (result.allValid) {
        // Auto-continue after 2 seconds
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyRecord = (recordValue: string, recordKey: string) => {
    navigator.clipboard.writeText(recordValue);
    setCopiedRecord(recordKey);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const handleSkip = () => {
    onComplete();
  };

  // Mode Selection View
  if (setupMode === 'choose') {
    return (
      <div className="space-y-5">
        <div className="border border-border rounded-lg divide-y divide-border">
          {/* Explanation */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent-info flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary">
                <span className="font-semibold text-accent-info">Email Authentication:</span> Configure SPF, DKIM, and DMARC records to improve email deliverability and prevent spam filtering.
              </div>
            </div>
          </div>

          {/* Domain Input */}
          <div className="p-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Your Domain <span className="text-accent-danger">*</span>
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => { setDomain(e.target.value); saveDraft({ domain: e.target.value }); }}
              placeholder="example.com"
              className="w-full h-10 px-3 bg-surface-elevated border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              The domain you send emails from (usually your website domain)
            </p>
          </div>

          {/* Setup Mode Selection */}
          <div className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-text-primary">
              Choose Setup Method:
            </h4>

            {/* Manual Mode */}\n            <button
              onClick={() => {
                setSetupMode('manual');
                handleGenerateRecords();
              }}
              disabled={!domain.trim() || isGenerating}
              className="w-full p-4 bg-surface-elevated border border-border hover:border-accent-primary rounded-lg text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <Copy className="h-5 w-5 text-accent-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-text-primary mb-1">
                    Manual Setup (Free)
                  </div>
                  <div className="text-xs text-text-secondary">
                    We'll generate DNS records for you to copy-paste into your DNS provider (GoDaddy, Cloudflare, etc.)
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSetupMode('entri')}
              disabled={!domain.trim()}
              className="w-full p-4 bg-gradient-to-r from-accent-purple/10 to-accent-primary/10 border border-accent-purple/20 hover:border-accent-purple rounded-lg text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-accent-purple flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text-primary">
                      Automatic with Entri
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full">
                      Premium
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary">
                    One-click DNS configuration - we'll set everything up automatically
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
            {error}
          </div>
        )}

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="w-full h-11 border border-border text-text-secondary rounded-lg font-medium hover:text-text-primary hover:border-border-hover transition-all"
        >
          Skip for Now (Configure Later)
        </button>
      </div>
    );
  }

  // Manual Mode View
  if (setupMode === 'manual') {
    return (
      <div className="space-y-5">
        <div className="border border-border rounded-lg divide-y divide-border">
          {/* Instructions */}
          <div className="p-4">
            <h4 className="text-sm font-semibold text-text-primary mb-2">
              Manual DNS Setup Instructions:
            </h4>
            <ol className="text-xs text-text-secondary space-y-1.5 ml-4 list-decimal">
              <li>Copy the DNS records below</li>
              <li>Log into your DNS provider (GoDaddy, Cloudflare, Namecheap, etc.)</li>
              <li>Add each record to your DNS settings</li>
              <li>Click &quot;Verify Records&quot; below to confirm</li>
            </ol>
          </div>

          {/* DNS Records */}
          {dnsRecords && (['spf', 'dkim', 'dmarc'].map((recordType) => {
            const record = dnsRecords[recordType as keyof DNSRecords];
            const isVerified = verificationResult?.[recordType]?.matches;

            return (
              <div
                key={recordType}
                className={cn(
                  'p-4 transition-all',
                  isVerified && 'bg-accent-success/5'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-text-primary uppercase">
                      {recordType}
                    </h5>
                    {isVerified && (
                      <Check className="h-4 w-4 text-accent-success" />
                    )}
                  </div>
                  <button
                    onClick={() => handleCopyRecord(record.value, recordType)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border hover:border-border-focus rounded-md text-xs font-medium text-text-primary transition-colors"
                  >
                    {copiedRecord === recordType ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-accent-success" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-text-secondary">Name:</span>{' '}
                    <span className="text-text-primary">{record.name}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Type:</span>{' '}
                    <span className="text-text-primary">{record.type}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Value:</span>{' '}
                    <div className="mt-1 p-2 bg-surface rounded border border-border text-text-primary break-all">
                      {record.value}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-secondary">TTL:</span>{' '}
                    <span className="text-text-primary">{record.ttl}</span>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <div className={cn(
            'p-4 rounded-lg border',
            verificationResult.allValid
              ? 'bg-accent-success/10 border-accent-success/20'
              : 'bg-accent-warning/10 border-accent-warning/20'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {verificationResult.allValid ? (
                <>
                  <Check className="h-5 w-5 text-accent-success" />
                  <span className="font-semibold text-accent-success">All records verified!</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-accent-warning" />
                  <span className="font-semibold text-accent-warning">Some records not found</span>
                </>
              )}
            </div>
            {!verificationResult.allValid && (
              <p className="text-xs text-text-secondary">
                DNS changes can take up to 48 hours to propagate. Try verifying again later.
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setSetupMode('choose')}
            className="h-11 px-4 border border-border text-text-secondary rounded-lg font-medium hover:text-text-primary hover:border-border-hover transition-all"
          >
            Back
          </button>
          
          <button
            onClick={handleVerifyRecords}
            disabled={isVerifying || !dnsRecords}
            className="flex-1 flex items-center justify-center gap-2 h-11 bg-surface-elevated border border-border text-text-primary rounded-lg font-medium hover:border-accent-primary transition-colors disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Verify Records
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="h-11 px-4 border border-border text-text-secondary rounded-lg font-medium hover:text-text-primary hover:border-border-hover transition-all"
          >
            Skip
          </button>
        </div>

        {verificationResult?.allValid && (
          <div className="flex justify-end">
            <button
              onClick={onComplete}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Entri Mode View (Coming Soon)
  if (setupMode === 'entri') {
    return (
      <div className="space-y-6">
        <div className="bg-accent-info/10 border border-accent-info/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent-info flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <span className="font-semibold text-accent-info">Entri Integration:</span> Automated DNS setup coming soon! For now, please use manual setup.
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setSetupMode('manual');
            handleGenerateRecords();
          }}
          className="w-full h-11 bg-surface-elevated border border-border text-text-primary rounded-lg font-medium hover:border-accent-primary transition-colors"
        >
          Use Manual Setup Instead
        </button>

        <button
          onClick={() => setSetupMode('choose')}
          className="w-full h-11 border border-border text-text-secondary rounded-lg font-medium hover:text-text-primary hover:border-border-hover transition-all"
        >
          Back
        </button>
      </div>
    );
  }

  return null;
}
