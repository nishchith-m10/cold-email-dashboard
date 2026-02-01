/**
 * PHASE 64: Genesis Onboarding Client Component
 * 
 * Client-side wrapper for the Genesis Onboarding Wizard.
 * Handles workspace detection and completion flow.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/lib/workspace-context';
import { GenesisOnboardingWizard } from '@/components/genesis/genesis-onboarding-wizard';
import { Loader2 } from 'lucide-react';

export function GenesisOnboardingClient() {
  const router = useRouter();
  const { workspace, isLoading } = useWorkspace();

  const handleComplete = () => {
    // Redirect to dashboard after completion
    router.push(`/?workspace=${workspace?.slug || ''}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (!workspace?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">No workspace selected</p>
          <button
            onClick={() => router.push('/join')}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg"
          >
            Go to Join Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <GenesisOnboardingWizard
      workspaceId={workspace.id}
      onComplete={handleComplete}
    />
  );
}
