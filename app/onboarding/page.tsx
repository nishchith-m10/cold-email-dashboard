/**
 * PHASE 64: Genesis Onboarding Page
 * 
 * Full-screen onboarding experience for new workspaces.
 * Replaces the simple join page with comprehensive 11-stage flow.
 */

'use client';

import { GenesisOnboardingClient } from '@/components/genesis/genesis-onboarding-client';

export default function OnboardingPage() {
  // GenesisOnboardingClient already handles its own loading state internally —
  // wrapping it in Suspense here caused a second full-screen spinner to flash
  // on hard reload before the client component's own isLoading check kicked in.
  return <GenesisOnboardingClient />;
}
