/**
 * PHASE 64: Genesis Onboarding Page
 * 
 * Full-screen onboarding experience for new workspaces.
 * Replaces the simple join page with comprehensive 11-stage flow.
 */

'use client';

import { Suspense } from 'react';
import { GenesisOnboardingClient } from '@/components/genesis/genesis-onboarding-client';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
        </div>
      }
    >
      <GenesisOnboardingClient />
    </Suspense>
  );
}
