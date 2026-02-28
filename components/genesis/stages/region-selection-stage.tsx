/**
 * PHASE 64: Region Selection Stage
 * 
 * Stage 1: Infrastructure configuration - region and droplet size selection.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Zap, Check, Loader2, MapPin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';
import type { DropletRegion, DropletSize } from '@/lib/genesis/phase64/credential-vault-types';

interface RegionOption {
  code: DropletRegion;
  name: string;
  location: string;
  latency: string;
  gdpr: boolean;
}

interface SizeOption {
  tier: DropletSize;
  name: string;
  price: number;
  specs: string;
  useCase: string;
  recommended?: boolean;
}

const REGIONS: RegionOption[] = [
  {
    code: 'us-east',
    name: 'United States - East',
    location: 'Virginia',
    latency: 'Fastest for US East Coast',
    gdpr: false,
  },
  {
    code: 'us-west',
    name: 'United States - West',
    location: 'San Francisco',
    latency: 'Fastest for US West Coast',
    gdpr: false,
  },
  {
    code: 'eu-west',
    name: 'Europe - West',
    location: 'Frankfurt, Germany',
    latency: 'GDPR compliant',
    gdpr: true,
  },
  {
    code: 'eu-north',
    name: 'Europe - North',
    location: 'London, UK',
    latency: 'GDPR compliant',
    gdpr: true,
  },
  {
    code: 'apac',
    name: 'Asia Pacific',
    location: 'Singapore',
    latency: 'Fastest for APAC',
    gdpr: false,
  },
];

const SIZES: SizeOption[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 6,
    specs: '1 vCPU, 1 GB RAM, 25 GB SSD',
    useCase: '1-5 sequences, ~500 leads/day',
    recommended: true,
  },
  {
    tier: 'professional',
    name: 'Professional',
    price: 12,
    specs: '1 vCPU, 2 GB RAM, 50 GB SSD',
    useCase: '5-15 sequences, ~2,000 leads/day',
  },
  {
    tier: 'scale',
    name: 'Scale',
    price: 24,
    specs: '2 vCPU, 4 GB RAM, 80 GB SSD',
    useCase: '15+ sequences, ~10,000 leads/day',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 48,
    specs: '4 vCPU, 8 GB RAM, 160 GB SSD',
    useCase: 'Agencies, unlimited leads',
  },
];

export function RegionSelectionStage({ workspaceId, onComplete }: StageComponentProps) {
  const [selectedRegion, setSelectedRegion] = useState<DropletRegion>('us-east');
  const [selectedSize, setSelectedSize] = useState<DropletSize>('starter');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { draft, isLoading: isDraftLoading, save: saveDraft } = useOnboardingDraft(workspaceId, 'region_selection');

  // Load existing configuration, fall back to draft
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const res = await fetch(`/api/onboarding/infrastructure?workspace_id=${workspaceId}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.region) {
            setSelectedRegion(data.region);
            if (data.size) setSelectedSize(data.size);
          } else if (draft) {
            if (draft.region) setSelectedRegion(draft.region as DropletRegion);
            if (draft.size) setSelectedSize(draft.size as DropletSize);
          }
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        if (!cancelled && draft) {
          if (draft.region) setSelectedRegion(draft.region as DropletRegion);
          if (draft.size) setSelectedSize(draft.size as DropletSize);
        }
      }
    }

    if (!isDraftLoading) {
      loadConfig();
    }

    return () => { cancelled = true; };
  }, [workspaceId, draft, isDraftLoading]);

  const handleContinue = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/infrastructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          region: selectedRegion,
          size: selectedSize,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Region Selection */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-3">
          Where should your automation engine run?
        </label>
        
        <div className="grid gap-3">
          {REGIONS.map((region) => (
            <button
              key={region.code}
              onClick={() => { setSelectedRegion(region.code); saveDraft({ region: region.code, size: selectedSize }); }}
              className={cn(
                'relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left',
                selectedRegion === region.code
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-border bg-surface-elevated hover:border-border-hover'
              )}
            >
              <div className={cn(
                'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                selectedRegion === region.code
                  ? 'border-accent-primary bg-accent-primary'
                  : 'border-border'
              )}>
                {selectedRegion === region.code && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-text-primary">
                    {region.name}
                  </span>
                  {region.gdpr && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent-success/10 text-accent-success border border-accent-success/20">
                      GDPR
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {region.location}
                  </span>
                  <span>{region.latency}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-3">
          How powerful should your engine be?
        </label>
        
        <div className="grid gap-3">
          {SIZES.map((size) => (
            <button
              key={size.tier}
              onClick={() => { setSelectedSize(size.tier); saveDraft({ region: selectedRegion, size: size.tier }); }}
              className={cn(
                'relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left',
                selectedSize === size.tier
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-border bg-surface-elevated hover:border-border-hover'
              )}
            >
              <div className={cn(
                'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                selectedSize === size.tier
                  ? 'border-accent-primary bg-accent-primary'
                  : 'border-border'
              )}>
                {selectedSize === size.tier && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">
                      {size.name}
                    </span>
                    {size.recommended && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                        Recommended
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-accent-primary">
                    ${size.price}
                    <span className="text-xs text-text-secondary font-normal">/mo</span>
                  </span>
                </div>
                
                <div className="text-sm text-text-secondary mb-2">
                  {size.specs}
                </div>
                
                <div className="text-xs text-text-secondary">
                  {size.useCase}
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-text-secondary text-center">
          You can upgrade anytime without data migration
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
          {error}
        </div>
      )}

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
