'use client';

import { AnalyticsPageClient } from '@/components/pages/analytics-page-client';
import { Suspense } from 'react';
export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      {/* Canonical panel header */}
      <div className="px-4 md:px-6 pt-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Analytics</h1>
            <p className="text-xs text-text-secondary">Deep-dive into your email campaign metrics</p>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading analytics…</div>}>
        <AnalyticsPageClient />
      </Suspense>
    </div>
  );
}
