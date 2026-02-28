/**
 * PHASE 64: Brand Info Stage
 * 
 * Stage 2: Collect company brand information (with auto-scrape option).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Globe, Loader2, ChevronRight, Sparkles } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Website + Auto-Scrape */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Company Website
        </label>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="url"
              value={website}
              onChange={(e) => { setWebsite(e.target.value); persistDraft({ website: e.target.value }); }}
              placeholder="https://acmecorp.com"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
            />
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
          </div>
          
          <button
            onClick={handleAutoScrape}
            disabled={!website.trim() || isAutoScraping}
            className="px-4 py-3 bg-accent-purple/10 border-2 border-accent-purple/20 text-accent-purple rounded-lg font-medium hover:bg-accent-purple/20 transition-colors disabled:opacity-50 whitespace-nowrap"
            title="Auto-fill from website"
          >
            {isAutoScraping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </button>
        </div>
        
        <p className="mt-2 text-xs text-text-secondary">
          We&apos;ll auto-fill company details from your website
        </p>
        
        {/* Success message */}
        {scrapeSuccess && (
          <div className="mt-3 p-3 bg-accent-success/10 border border-accent-success/20 rounded-lg text-accent-success text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Successfully extracted brand information! Review and edit below.
          </div>
        )}
      </div>

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Company Name <span className="text-accent-danger">*</span>
        </label>
        
        <input
          type="text"
          value={companyName}
          onChange={(e) => { setCompanyName(e.target.value); persistDraft({ companyName: e.target.value }); }}
          placeholder="Acme Corporation"
          className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
        />
      </div>

      {/* Logo URL (Phase 65.1) */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Logo URL <span className="text-text-tertiary text-xs">(optional)</span>
        </label>
        
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => { setLogoUrl(e.target.value); persistDraft({ logoUrl: e.target.value }); }}
          placeholder="https://yourcompany.com/logo.png"
          className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
        />
        <p className="mt-2 text-xs text-text-secondary">
          Used in email signatures (if applicable)
        </p>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Industry
        </label>
        
        <input
          type="text"
          value={industry}
          onChange={(e) => { setIndustry(e.target.value); persistDraft({ industry: e.target.value }); }}
          placeholder="SaaS, FinTech, Healthcare, etc."
          className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Company Description
        </label>
        
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); persistDraft({ description: e.target.value }); }}
          placeholder="Describe what your company does..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg text-sm bg-surface-elevated border-2 border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
          {error}
        </div>
      )}

      {/* Continue */}
      <button
        onClick={handleContinue}
        disabled={isSaving || !companyName.trim()}
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
