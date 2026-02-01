/**
 * PHASE 64: Genesis Onboarding Page
 * 
 * Full-screen onboarding experience for new workspaces.
 * Replaces the simple join page with comprehensive 11-stage flow.
 */

import { Suspense } from 'react';
import NextDynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GenesisOnboardingClient = NextDynamic(
  () => import('@/components/genesis/genesis-onboarding-client'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    ),
  }
);

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
