/**
 * PHASE 64: Genesis Onboarding Wizard - Minimal Design
 * 
 * Simplified 11-stage onboarding matching dashboard aesthetics
 */

'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Check, 
  Loader2,
  Clock,
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
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import type { OnboardingStage } from '@/lib/genesis/phase64/credential-vault-types';
import { STAGE_INFO } from '@/lib/genesis/phase64/onboarding-progress-service';

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
  // ONB-006: Track whether this is a resumed session (user had prior progress)
  const [isResumed, setIsResumed] = useState(false);
  const [resumeBannerDismissed, setResumeBannerDismissed] = useState(false);
  // ONB-007: Mobile stepper BottomSheet
  const [mobileStepperOpen, setMobileStepperOpen] = useState(false);

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

  // Ref for auto-scrolling current step into view
  const stepRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const setStepRef = useCallback((stage: string, el: HTMLButtonElement | null) => {
    if (el) stepRefs.current.set(stage, el);
    else stepRefs.current.delete(stage);
  }, []);

  // Compute estimated time remaining (sum of remaining stages' estimatedDuration)
  const estimatedMinutesRemaining = useMemo(() => {
    let totalSeconds = 0;
    for (let i = currentStageIndex; i < visibleStages.length; i++) {
      const info = STAGE_INFO[visibleStages[i].stage];
      if (info) totalSeconds += info.estimatedDuration;
    }
    return Math.max(1, Math.ceil(totalSeconds / 60));
  }, [currentStageIndex, visibleStages]);

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
          // ONB-006: If user had prior progress, mark as resumed
          if (completed.size > 0) {
            setIsResumed(true);
          }
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

  // Auto-scroll current step into view in the sidebar
  useEffect(() => {
    if (currentStage) {
      const el = stepRefs.current.get(currentStage.stage);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStageIndex, currentStage]);

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

  // Save progress and show confirmation toast
  const handleSaveAndContinueLater = async () => {
    try {
      // Progress is already saved incrementally; just confirm to user
      toast({
        title: 'Progress saved!',
        description: 'You can return anytime to continue where you left off.',
      });
    } catch {
      toast({
        title: 'Could not save progress',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Determine if current stage is optional (not required)
  const isCurrentStageOptional = !STAGE_INFO[currentStage.stage]?.required;
  // Determine if we're on the final stage
  const isFinalStage = currentStageIndex === totalStages - 1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-13">
      {/* Right Sidebar — Numbered Stepper (Image 2 Reference) */}
      <div className="hidden lg:block fixed right-0 top-[49px] bottom-0 w-72 border-l border-border bg-surface overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Progress Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium">Step {currentStageIndex + 1} of {totalStages}</span>
              <span className="text-text-primary font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Time Estimate */}
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Clock className="h-3 w-3" />
              <span>About {estimatedMinutesRemaining} min remaining</span>
            </div>
          </div>

          {/* Step List — Numbered circles with dashed connectors */}
          <div className="relative">
            {visibleStages.map((stage, index) => {
              const isCompleted = completedStages.has(stage.stage);
              const isCurrent = index === currentStageIndex;
              const isUpcoming = !isCompleted && !isCurrent;
              const isLast = index === visibleStages.length - 1;

              return (
                <div key={stage.stage} className="relative flex items-start gap-3">
                  {/* Vertical connector line */}
                  {!isLast && (
                    <div
                      className="absolute left-[13px] top-[28px] bottom-0 w-px"
                      style={{
                        height: 'calc(100% - 16px)',
                        backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
                        backgroundSize: '2px 6px',
                        backgroundRepeat: 'repeat-y',
                        backgroundPosition: 'center',
                        opacity: 0.6,
                      }}
                    />
                  )}

                  {/* Step circle */}
                  <button
                    ref={(el) => setStepRef(stage.stage, el)}
                    onClick={() => handleSkipToStage(index)}
                    className={cn(
                      'relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium transition-colors',
                      isCompleted && 'bg-accent-success text-white',
                      isCurrent && 'bg-accent-primary text-white',
                      isUpcoming && 'bg-surface-elevated text-text-secondary border border-border'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>

                  {/* Step label */}
                  <button
                    onClick={() => handleSkipToStage(index)}
                    className={cn(
                      'flex-1 min-w-0 text-left pb-5 pt-0.5',
                      'transition-colors'
                    )}
                  >
                    <div className={cn(
                      'text-sm truncate',
                      isCompleted && 'text-text-primary',
                      isCurrent && 'font-semibold text-text-primary',
                      isUpcoming && 'text-text-secondary'
                    )}>
                      {stage.title}
                    </div>
                    <div className={cn(
                      'text-xs truncate mt-0.5',
                      isUpcoming ? 'text-text-secondary/50' : 'text-text-secondary'
                    )}>
                      {stage.description}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content — extra top padding on mobile for the fixed stepper header */}
      <div className="lg:mr-72 pt-16 lg:pt-4 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Persistent Page Heading */}
          <p className="text-xs text-text-secondary mb-4">Set up your workspace</p>

          {/* ONB-006: Resume Banner */}
          {isResumed && !resumeBannerDismissed && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-accent-primary/5 border border-accent-primary/20 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-text-primary">
                  Welcome back! You left off at <span className="font-semibold">{currentStage.title}</span>.
                </span>
              </div>
              <button
                onClick={() => setResumeBannerDismissed(true)}
                className="flex-shrink-0 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Stage Header — Clean text-only, matches Settings page */}
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-text-primary">
              {currentStage.title}
            </h1>
            <p className="text-xs text-text-secondary">
              {currentStage.description}
            </p>
          </div>

          {/* Stage Content */}
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

          {/* Navigation Footer */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            {/* Left: Back button */}
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

            {/* Right: Skip / Save Later / Continue|Launch */}
            <div className="flex items-center gap-3">
              {isCurrentStageOptional && (
                <button
                  onClick={handleStageComplete}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleSaveAndContinueLater}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:inline-flex"
              >
                Save &amp; continue later
              </button>
              {/* The Continue/Launch button is rendered by each stage component's onComplete call.
                  This area intentionally doesn't duplicate it — stages own their own submit buttons. */}
            </div>
          </div>
        </div>
      </div>

      {/* ONB-007: Mobile Stepper Header Bar */}
      <div className="lg:hidden fixed top-[49px] left-0 right-0 z-40 bg-surface border-b border-border">
        <button
          onClick={() => setMobileStepperOpen(true)}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-text-primary truncate">{currentStage.title}</span>
              <ChevronDown className="h-4 w-4 text-text-secondary flex-shrink-0" />
            </div>
            <span className="text-xs text-text-secondary">Step {currentStageIndex + 1} of {totalStages}</span>
          </div>
          <span className="text-xs font-medium text-text-primary">{Math.round(progress)}%</span>
        </button>
        <div className="h-0.5 bg-surface-elevated">
          <div
            className="h-full bg-accent-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ONB-007: Mobile Stepper BottomSheet */}
      <BottomSheet
        open={mobileStepperOpen}
        onClose={() => setMobileStepperOpen(false)}
        title="Onboarding Steps"
      >
        <div className="px-2 pb-4 max-h-[60vh] overflow-y-auto">
          {visibleStages.map((stage, index) => {
            const isCompleted = completedStages.has(stage.stage);
            const isCurrent = index === currentStageIndex;
            const isUpcoming = !isCompleted && !isCurrent;
            const isLast = index === visibleStages.length - 1;

            return (
              <div key={stage.stage} className="relative flex items-start gap-3">
                {/* Vertical connector */}
                {!isLast && (
                  <div
                    className="absolute left-[13px] top-[28px] bottom-0 w-px"
                    style={{
                      height: 'calc(100% - 16px)',
                      backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
                      backgroundSize: '2px 6px',
                      backgroundRepeat: 'repeat-y',
                      backgroundPosition: 'center',
                      opacity: 0.6,
                    }}
                  />
                )}

                {/* Step circle */}
                <button
                  onClick={() => { handleSkipToStage(index); setMobileStepperOpen(false); }}
                  className={cn(
                    'relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium transition-colors',
                    isCompleted && 'bg-accent-success text-white',
                    isCurrent && 'bg-accent-primary text-white',
                    isUpcoming && 'bg-surface-elevated text-text-secondary border border-border'
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
                </button>

                {/* Step label */}
                <button
                  onClick={() => { handleSkipToStage(index); setMobileStepperOpen(false); }}
                  className="flex-1 min-w-0 text-left pb-5 pt-0.5"
                >
                  <div className={cn(
                    'text-sm truncate',
                    isCompleted && 'text-text-primary',
                    isCurrent && 'font-semibold text-text-primary',
                    isUpcoming && 'text-text-secondary'
                  )}>
                    {stage.title}
                  </div>
                  <div className={cn(
                    'text-xs truncate mt-0.5',
                    isUpcoming ? 'text-text-secondary/50' : 'text-text-secondary'
                  )}>
                    {stage.description}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
