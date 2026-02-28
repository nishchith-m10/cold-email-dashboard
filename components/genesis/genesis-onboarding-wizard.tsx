/**
 * PHASE 64: Genesis Onboarding Wizard - Minimal Design
 * 
 * Simplified 11-stage onboarding matching dashboard aesthetics
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Check, 
  Loader2,
  Globe,
  Building2,
  Mail,
  MailCheck,
  Settings,
  Key,
  Search,
  Sparkles,
  Calendar,
  Shield,
  Rocket,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingStage } from '@/lib/genesis/phase64/credential-vault-types';

// Stage components
import { RegionSelectionStage } from './stages/region-selection-stage';
import { BrandInfoStage } from './stages/brand-info-stage';
import { EmailProviderSelectionStage } from './stages/email-provider-selection-stage';
import { GmailOAuthStage } from './stages/gmail-oauth-stage';
import { SMTPConfigurationStage } from './stages/smtp-configuration-stage';
import { OpenAIKeyStage } from './stages/openai-key-stage';
import { AnthropicKeyStage } from './stages/anthropic-key-stage';
import { GoogleCSEKeyStage } from './stages/google-cse-key-stage';
import { RelevanceKeyStage } from './stages/relevance-key-stage';
import { ApifySelectionStage } from './stages/apify-selection-stage';
import { CalendlyUrlStage } from './stages/calendly-url-stage';
import { DNSSetupStage } from './stages/dns-setup-stage';
import { IgnitionStage } from './stages/ignition-stage';
import type { EmailProviderChoice } from '@/lib/genesis/phase64/credential-vault-types';

interface StageMetadata {
  stage: OnboardingStage;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  component: React.ComponentType<StageComponentProps>;
  // Phase 64.B: Conditional stages based on email provider
  conditionalOn?: {
    provider: EmailProviderChoice;
  };
}

const STAGE_METADATA: StageMetadata[] = [
  {
    stage: 'region_selection',
    title: 'Infrastructure',
    icon: Globe,
    description: 'Select region & droplet size',
    component: RegionSelectionStage,
  },
  {
    stage: 'brand_info',
    title: 'Brand',
    icon: Building2,
    description: 'Company information',
    component: BrandInfoStage,
  },
  // Phase 64.B: Email Provider Selection (new)
  {
    stage: 'email_provider_selection',
    title: 'Email Provider',
    icon: Settings,
    description: 'Choose Gmail or SMTP',
    component: EmailProviderSelectionStage,
  },
  // Phase 64.B: Gmail OAuth - only shown if provider = 'gmail'
  {
    stage: 'gmail_oauth',
    title: 'Gmail Connection',
    icon: MailCheck,
    description: 'Authorize Gmail access',
    component: GmailOAuthStage,
    conditionalOn: { provider: 'gmail' },
  },
  // Phase 64.B: SMTP Configuration - only shown if provider = 'smtp'
  {
    stage: 'smtp_configuration',
    title: 'SMTP Setup',
    icon: Key,
    description: 'Configure SMTP server',
    component: SMTPConfigurationStage,
    conditionalOn: { provider: 'smtp' },
  },
  {
    stage: 'openai_key',
    title: 'OpenAI',
    icon: Sparkles,
    description: 'OpenAI API key',
    component: OpenAIKeyStage,
  },
  {
    stage: 'anthropic_key',
    title: 'Claude',
    icon: Sparkles,
    description: 'Anthropic API key',
    component: AnthropicKeyStage,
  },
  {
    stage: 'google_cse_key',
    title: 'Search',
    icon: Search,
    description: 'Google Custom Search',
    component: GoogleCSEKeyStage,
  },
  {
    stage: 'relevance_key',
    title: 'Relevance AI',
    icon: Sparkles,
    description: 'Relevance AI configuration',
    component: RelevanceKeyStage,
  },
  {
    stage: 'apify_selection',
    title: 'Google Reviews',
    icon: Shield,
    description: 'Google Maps reviews scraper',
    component: ApifySelectionStage,
  },
  {
    stage: 'calendly_url',
    title: 'Calendly',
    icon: Calendar,
    description: 'Scheduling URL',
    component: CalendlyUrlStage,
  },
  {
    stage: 'dns_setup',
    title: 'DNS Setup',
    icon: Shield,
    description: 'Domain configuration',
    component: DNSSetupStage,
  },
  {
    stage: 'ignition',
    title: 'Launch',
    icon: Rocket,
    description: 'Initialize system',
    component: IgnitionStage,
  },
];

export interface StageComponentProps {
  workspaceId: string;
  onComplete: () => void;
  onBack?: () => void;  // Optional - not all stages need back functionality
}

interface GenesisOnboardingWizardProps {
  workspaceId: string;
  onComplete: () => void;
}

export function GenesisOnboardingWizard({
  workspaceId,
  onComplete,
}: GenesisOnboardingWizardProps) {
  const router = useRouter();
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<OnboardingStage>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  // Phase 64.B: Track selected email provider for conditional stages
  const [selectedProvider, setSelectedProvider] = useState<EmailProviderChoice | null>(null);
  // Floating bubble mode
  const [mode, setMode] = useState<'bubble' | 'expanded'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('genesis-wizard-mode') as 'bubble' | 'expanded') || 'expanded';
    }
    return 'expanded';
  });

  // Persist mode to localStorage
  const handleSetMode = useCallback((newMode: 'bubble' | 'expanded') => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('genesis-wizard-mode', newMode);
    }
  }, []);

  // Phase 64.B: Filter stages based on selected provider (memoized to prevent unnecessary recalculations)
  const visibleStages = useMemo(() => {
    return STAGE_METADATA.filter(stage => {
      // If stage has no conditional, always show
      if (!stage.conditionalOn) return true;
      
      // If no provider selected yet, hide conditional stages
      if (!selectedProvider) return false;
      
      // Show only if provider matches
      return stage.conditionalOn.provider === selectedProvider;
    });
  }, [selectedProvider]);

  const totalStages = visibleStages.length;
  const currentStage = visibleStages[currentStageIndex] || STAGE_METADATA[0];
  const StageComponent = currentStage.component;
  const progress = ((currentStageIndex + 1) / totalStages) * 100;

  // Load progress and provider selection
  useEffect(() => {
    const loadProgress = async () => {
      try {
        // Load email provider selection
        const configRes = await fetch(`/api/workspace/email-config?workspace_id=${workspaceId}`);
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.provider) {
            setSelectedProvider(configData.provider as EmailProviderChoice);
          }
        }

        // Load onboarding progress
        const res = await fetch(`/api/onboarding/progress?workspace_id=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          const completed = new Set<OnboardingStage>(data.completed_stages || []);
          setCompletedStages(completed);
        }
      } catch (err) {
        console.error('Failed to load progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [workspaceId]);

  // Phase 64.B: Find first incomplete stage after loading
  useEffect(() => {
    if (!isLoading && visibleStages.length > 0) {
      const firstIncomplete = visibleStages.findIndex(
        s => !completedStages.has(s.stage)
      );
      if (firstIncomplete >= 0) {
        setCurrentStageIndex(firstIncomplete);
      }
    }
  }, [isLoading]); // Only run when loading completes (not when provider changes mid-flow)

  // Keep currentStageIndex in bounds when visibleStages changes
  useEffect(() => {
    if (currentStageIndex >= visibleStages.length && visibleStages.length > 0) {
      setCurrentStageIndex(visibleStages.length - 1);
    }
  }, [visibleStages.length, currentStageIndex]);

  const handleStageComplete = async () => {
    const newCompleted = new Set(completedStages);
    newCompleted.add(currentStage.stage);
    setCompletedStages(newCompleted);

    // Persist completed stage to API
    try {
      await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          completed_stage: currentStage.stage,
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }

    // Phase 64.B: After email_provider_selection, reload provider to update visible stages
    if (currentStage.stage === 'email_provider_selection') {
      try {
        const res = await fetch(`/api/workspace/email-config?workspace_id=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.provider) {
            // Update provider first
            setSelectedProvider(data.provider as EmailProviderChoice);
            // Wait for React to re-render with new visibleStages, then advance
            setTimeout(() => {
              // After provider change, we're still on the same index but visibleStages has changed
              // Just move to next index
              setCurrentStageIndex(prev => prev + 1);
            }, 50); // Increased timeout to ensure state update completes
            return;
          }
        }
      } catch (err) {
        console.error('Failed to reload provider:', err);
      }
    }

    // Move to next stage (normal flow)
    if (currentStageIndex < visibleStages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent-primary shadow-2xl flex items-center justify-center animate-pulse">
        <Loader2 className="h-6 w-6 text-white animate-spin" />
      </div>
    );
  }

  // Bubble mode — collapsed floating button
  if (mode === 'bubble') {
    return (
      <motion.button
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent-primary shadow-2xl flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleSetMode('expanded')}
      >
        <Rocket className="h-6 w-6 text-white" />
        {/* Progress ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-white/20"
          />
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${(progress / 100) * 150.8} 150.8`}
            className="text-white"
          />
        </svg>
      </motion.button>
    );
  }

  // Expanded mode — floating panel
  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          "fixed z-50 border border-border bg-surface shadow-2xl overflow-hidden flex flex-col",
          // Mobile: full-width with margin
          "bottom-4 left-4 right-4 max-h-[80vh] rounded-2xl",
          // Desktop: fixed-width panel in bottom-right
          "md:left-auto md:bottom-24 md:right-6 md:w-[420px] md:max-h-[70vh] md:rounded-2xl"
        )}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center shrink-0">
              <currentStage.icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary truncate">
                {currentStage.title}
              </h2>
              <p className="text-xs text-text-secondary truncate">
                Step {currentStageIndex + 1} of {totalStages}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSetMode('bubble')}
            className="p-1.5 hover:bg-surface-elevated rounded-lg transition-colors shrink-0"
            aria-label="Minimize onboarding wizard"
          >
            <Minimize2 className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        {/* Horizontal Progress Bar */}
        <div className="px-4 pt-3 shrink-0">
          <div className="flex items-center gap-1">
            {visibleStages.map((stage, index) => (
              <div
                key={stage.stage}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  index < currentStageIndex && "bg-accent-success",
                  index === currentStageIndex && "bg-accent-primary",
                  index > currentStageIndex && "bg-border"
                )}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Stage Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage.stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <StageComponent
                workspaceId={workspaceId}
                onComplete={handleStageComplete}
                onBack={handleBack}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between p-3 border-t border-border shrink-0">
          <button
            onClick={handleBack}
            disabled={currentStageIndex === 0}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              currentStageIndex === 0
                ? 'opacity-40 cursor-not-allowed text-text-secondary'
                : 'hover:bg-surface-elevated text-text-primary'
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="text-xs text-text-secondary">
            {Math.round(progress)}% complete
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
