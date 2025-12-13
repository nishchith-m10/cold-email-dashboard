'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { SequenceDeckCard } from './sequence-deck-card';
import type { SequenceDetail } from '@/lib/dashboard-types';
import { Mail, Building2, User } from 'lucide-react';

interface SequenceDetailProps {
  detail: SequenceDetail | null;
  loading?: boolean;
}

/**
 * SequenceDetail - Main detail view showing all 3 email drafts
 * 
 * Features:
 * - Lead header with name/email/company
 * - 3 SequenceDeckCard components (Email 1, 2, 3)
 * - Loading skeleton
 * - Empty state
 */
export function SequenceDetail({ detail, loading = false }: SequenceDetailProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-surface-base border border-border-primary rounded-lg p-6">
          <Skeleton className="h-6 w-1/3 mb-3" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>

        {/* Card Skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-base border border-border-primary rounded-lg p-6 space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center mb-6">
          <Mail className="w-10 h-10 text-text-tertiary" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No sequence selected
        </h3>
        <p className="text-text-secondary text-sm max-w-md">
          Select a lead from the sidebar to view their email sequence drafts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lead Header */}
      <div className="bg-surface-base border border-border-primary rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-accent-primary" />
              {detail.full_name || 'Unnamed Lead'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
              <Mail className="w-4 h-4" />
              {detail.email_address}
            </div>
            {detail.organization_name && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Building2 className="w-4 h-4" />
                {detail.organization_name}
              </div>
            )}
          </div>
        </div>

        {/* Sequence Progress */}
        <div className="flex items-center gap-2 pt-4 border-t border-border-primary">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">
            Sequence Progress:
          </span>
          <div className="flex gap-1">
            {[detail.email_1_sent, detail.email_2_sent, detail.email_3_sent].map((sent, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  sent ? 'bg-accent-success' : 'bg-text-tertiary/30'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-text-secondary">
            {[detail.email_1_sent, detail.email_2_sent, detail.email_3_sent].filter(Boolean).length} of 3 sent
          </span>
        </div>
      </div>

      {/* Email 1 */}
      <SequenceDeckCard
        stepNumber={1}
        subject={detail.email_1_subject}
        body={detail.email_1_body}
        sent={detail.email_1_sent}
      />

      {/* Email 2 */}
      <SequenceDeckCard
        stepNumber={2}
        subject={null} // Email 2 usually threads, so no subject
        body={detail.email_2_body}
        sent={detail.email_2_sent}
      />

      {/* Email 3 */}
      <SequenceDeckCard
        stepNumber={3}
        subject={detail.email_3_subject}
        body={detail.email_3_body}
        sent={detail.email_3_sent}
      />
    </div>
  );
}
