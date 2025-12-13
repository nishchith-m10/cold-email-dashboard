'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SequenceListItem } from '@/lib/dashboard-types';
import { CheckCircle2, Clock, Building2, Mail } from 'lucide-react';
import { memo } from 'react';

interface SequenceListProps {
  items: SequenceListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading?: boolean;
}

// Memoized row component for performance with large lists
const SequenceRow = memo(({ 
  item, 
  index,
  isSelected, 
  onSelect 
}: { 
  item: SequenceListItem; 
  index: number;
  isSelected: boolean; 
  onSelect: (id: number) => void;
}) => {
  const sentCount = [item.email_1_sent, item.email_2_sent, item.email_3_sent].filter(Boolean).length;

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        'hover:bg-surface-elevated hover:border-accent-primary/30',
        isSelected
          ? 'bg-accent-primary/5 border-accent-primary ring-1 ring-accent-primary/20'
          : 'bg-surface-base border-border-primary'
      )}
    >
      <div className="flex gap-3">
        {/* Row Number */}
        <div className="flex-shrink-0 w-8 flex items-start justify-center pt-0.5">
          <span className="text-xs font-mono text-text-tertiary">{index + 1}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="font-medium text-text-primary mb-1 truncate">
            {item.full_name || 'Unnamed Lead'}
          </div>

          {/* Email */}
          <div className="text-xs text-text-tertiary mb-2 truncate">
            {item.email_address}
          </div>

          {/* Company */}
          {item.organization_name && (
            <div className="text-xs text-text-secondary mb-2 flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.organization_name}</span>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex flex-wrap gap-1 mb-1">
            {/* Email 1 */}
            {item.email_1_sent ? (
              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                E1
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                <Clock className="w-2.5 h-2.5 mr-0.5" />
                E1
              </Badge>
            )}

            {/* Email 2 */}
            {item.email_2_sent ? (
              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                E2
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                <Clock className="w-2.5 h-2.5 mr-0.5" />
                E2
              </Badge>
            )}

            {/* Email 3 */}
            {item.email_3_sent ? (
              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                E3
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                <Clock className="w-2.5 h-2.5 mr-0.5" />
                E3
              </Badge>
            )}
          </div>

          {/* Summary text */}
          <div className="text-[10px] text-text-tertiary">
            {sentCount} of 3 sent
          </div>
        </div>
      </div>
    </button>
  );
});

SequenceRow.displayName = 'SequenceRow';

/**
 * SequenceList - Sidebar list of sequences with selection
 * 
 * Features:
 * - Scrollable list of leads
 * - Sent status indicators
 * - Highlight selected item
 * - Loading skeleton
 */
export function SequenceList({
  items,
  selectedId,
  onSelect,
  loading = false,
}: SequenceListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-surface-base border border-border-primary">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-text-tertiary" />
        </div>
        <p className="text-text-secondary font-medium mb-1">No sequences found</p>
        <p className="text-text-tertiary text-sm">
          Leads with draft content will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <SequenceRow
          key={item.id}
          item={item}
          index={index}
          isSelected={item.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
