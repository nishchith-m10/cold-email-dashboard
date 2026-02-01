'use client';

import { DashboardPageClient } from '@/components/pages/dashboard-page-client';
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading dashboard…</div>}>
      <DashboardPageClient />
    </Suspense>
  );
}
