/**
 * PHASE 64: Genesis Onboarding Wizard - Minimal Design
 * 
 * Simplified 11-stage onboarding matching dashboard aesthetics
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
    title: 'Scraping',
    icon: Shield,
    description: 'Apify configuration',
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

  const handleSkipToStage = (index: number) => {
    setCurrentStageIndex(index);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-13">
      {/* Simple Progress Bar under navbar */}
      <div className="fixed top-12 left-0 right-0 z-40 h-0.5 bg-surface-elevated">
        <motion.div
          className="h-full bg-accent-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Right Sidebar - Clean */}
      <div className="hidden lg:block fixed right-0 top-[49px] bottom-0 w-72 border-l border-border bg-surface overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Progress</span>
              <span className="text-text-primary font-medium">{currentStageIndex + 1} of {totalStages}</span>
            </div>
            <div className="h-1 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stage List - Phase 64.B: Uses visibleStages for conditional rendering */}
          <div className="space-y-1">
            {visibleStages.map((stage, index) => {
              const Icon = stage.icon;
              const isCompleted = completedStages.has(stage.stage);
              const isCurrent = index === currentStageIndex;
              // Allow clicking on: any completed stage (to go back), current stage, or next uncompleted stage
              const isAccessible = isCompleted || isCurrent || index === currentStageIndex + 1;

              return (
                <button
                  key={stage.stage}
                  onClick={() => handleSkipToStage(index)}
                  disabled={!isAccessible}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left',
                    isCurrent && 'bg-accent-primary/10 border border-accent-primary/20',
                    isCompleted && !isCurrent && 'hover:bg-surface-elevated',
                    !isAccessible && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      isCompleted && 'bg-accent-success text-white',
                      isCurrent && 'bg-accent-primary text-white',
                      !isCompleted && !isCurrent && 'bg-surface-elevated text-text-secondary'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium truncate',
                      isCurrent && 'text-accent-primary',
                      !isCurrent && 'text-text-primary'
                    )}>
                      {stage.title}
                    </div>
                    <div className="text-xs text-text-secondary truncate">
                      {stage.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:mr-72 pt-4 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Stage Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent-primary flex items-center justify-center">
                <currentStage.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  {currentStage.title}
                </h1>
                <p className="text-sm text-text-secondary">
                  {currentStage.description}
                </p>
              </div>
            </div>
          </div>

          {/* Stage Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage.stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-border rounded-lg p-6"
            >
              <StageComponent
                workspaceId={workspaceId}
                onComplete={handleStageComplete}
                onBack={handleBack}
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStageIndex === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                currentStageIndex === 0
                  ? 'opacity-40 cursor-not-allowed text-text-secondary'
                  : 'hover:bg-surface-elevated text-text-primary'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-xs text-text-secondary">
              Step {currentStageIndex + 1} of {totalStages}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Progress - Phase 64.B: Uses visibleStages */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-surface border border-border rounded-full px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {visibleStages.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-full transition-all',
                    index === currentStageIndex && 'w-6 h-1.5 bg-accent-primary',
                    index < currentStageIndex && 'w-1.5 h-1.5 bg-accent-success',
                    index > currentStageIndex && 'w-1.5 h-1.5 bg-border'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-text-secondary font-medium ml-1">
              {currentStageIndex + 1}/{totalStages}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
