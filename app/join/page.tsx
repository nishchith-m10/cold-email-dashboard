'use client';

import { JoinTeamPageClient } from '@/components/pages/join-page-client';
import { Suspense } from 'react';

export default function JoinTeamPage() {
  return (
    <div className="h-screen overflow-hidden">
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-text-secondary">Loading join flow…</div>}>
        <JoinTeamPageClient />
      </Suspense>
    </div>
  );
}
