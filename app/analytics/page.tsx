'use client';

import { AnalyticsPageClient } from '@/components/pages/analytics-page-client';
import { Suspense } from 'react';
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading analytics…</div>}>
      <AnalyticsPageClient />
    </Suspense>
  );
}
