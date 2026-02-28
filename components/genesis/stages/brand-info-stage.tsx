/**
 * PHASE 64: Brand Info Stage
 * 
 * Stage 2: Collect company brand information (with auto-scrape option).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

export function BrandInfoStage({ workspaceId, onComplete }: StageComponentProps) {
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoScraping, setIsAutoScraping] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, 'brand_info');

  // Auto-save draft on field change
  const persistDraft = useCallback(
    (overrides?: Partial<Record<string, string>>) => {
      const data = { companyName, website, logoUrl, industry, description, ...overrides };
      saveDraft(data);
    },
    [companyName, website, logoUrl, industry, description, saveDraft],
  );

  // Load existing brand info, fall back to draft
  useEffect(() => {
    let cancelled = false;

    async function loadBrandInfo() {
      try {
        const res = await fetch(`/api/onboarding/brand?workspace_id=${workspaceId}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          let hasServer = false;
          if (data.companyName) { setCompanyName(data.companyName); hasServer = true; }
          if (data.website) { setWebsite(data.website); hasServer = true; }
          if (data.logoUrl) { setLogoUrl(data.logoUrl); hasServer = true; }
          if (data.industry) { setIndustry(data.industry); hasServer = true; }
          if (data.description) { setDescription(data.description); hasServer = true; }

          // If no server data, restore from draft
          if (!hasServer && draft) {
            if (draft.companyName) setCompanyName(draft.companyName as string);
            if (draft.website) setWebsite(draft.website as string);
            if (draft.logoUrl) setLogoUrl(draft.logoUrl as string);
            if (draft.industry) setIndustry(draft.industry as string);
            if (draft.description) setDescription(draft.description as string);
          }
        }
      } catch (err) {
        console.error('Failed to load brand info:', err);
        // On error, still try to restore from draft
        if (!cancelled && draft) {
          if (draft.companyName) setCompanyName(draft.companyName as string);
          if (draft.website) setWebsite(draft.website as string);
          if (draft.logoUrl) setLogoUrl(draft.logoUrl as string);
          if (draft.industry) setIndustry(draft.industry as string);
          if (draft.description) setDescription(draft.description as string);
        }
      }
    }

    // Wait for draft to finish loading before deciding
    if (!isDraftLoading) {
      loadBrandInfo();
    }

    return () => { cancelled = true; };
  }, [workspaceId, draft, isDraftLoading]);

  const handleAutoScrape = async () => {
    if (!website.trim()) {
      setError('Please enter your website URL first');
      return;
    }

    setIsAutoScraping(true);
    setError(null);
    setScrapeSuccess(false);

    try {
      const res = await fetch('/api/onboarding/brand/auto-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: website.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to scrape website');
      }

      const data = await res.json();

      if (!data.success) {
        // Scraping failed - show info message
        setError(data.error || 'Website could not be scraped. Please fill out the form manually.');
        return;
      }

      // Pre-fill fields with scraped data
      if (data.companyName && !companyName) setCompanyName(data.companyName);
      if (data.logoUrl && !logoUrl) setLogoUrl(data.logoUrl);
      if (data.description && !description) setDescription(data.description);
      
      setScrapeSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-scrape failed. Please fill out the form manually.');
    } finally {
      setIsAutoScraping(false);
    }
  };

  const handleContinue = async () => {
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          companyName: companyName.trim(),
          website: website.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          industry: industry.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save brand info');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* All fields in one container */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {/* Company Website */}
        <div className="p-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Company Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); persistDraft({ website: e.target.value }); }}
            placeholder="https://acmecorp.com"
            className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
          />
        </div>

        {/* Company Name + Industry */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Company Name <span className="text-accent-danger">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); persistDraft({ companyName: e.target.value }); }}
              placeholder="Acme Corporation"
              className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Industry
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); persistDraft({ industry: e.target.value }); }}
              placeholder="SaaS, FinTech, Healthcare…"
              className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
          </div>
        </div>

        {/* Logo URL */}
        <div className="p-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Logo URL <span className="text-text-tertiary text-xs font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => { setLogoUrl(e.target.value); persistDraft({ logoUrl: e.target.value }); }}
            placeholder="https://yourcompany.com/logo.png"
            className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Used in email signatures (if applicable)
          </p>
        </div>

        {/* Description */}
        <div className="p-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Company Description
          </label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); persistDraft({ description: e.target.value }); }}
            placeholder="Describe what your company does, who you serve, and what makes you different…"
            rows={4}
            className="w-full px-3 py-2 rounded-md text-sm bg-surface-elevated border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all resize-none"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Used to personalize your outreach emails. The more detail, the better.
          </p>
        </div>
      </div>

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
          disabled={isSaving || !companyName.trim()}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
