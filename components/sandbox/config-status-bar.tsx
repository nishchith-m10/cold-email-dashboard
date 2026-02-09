/**
 * Config Status Bar - Compact view of campaign configuration
 * Always visible at top of sandbox, expandable to full config
 */

'use client';

import { ChevronDown, ChevronUp, Mail, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigStatusBarProps {
  dailyEmailCount: number;
  dailyEmailLimit: number;
  officeHoursStatus: 'active' | 'outside' | 'weekend';
  replyDelay: number;
  weekendSendsEnabled: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ConfigStatusBar({
  dailyEmailCount,
  dailyEmailLimit,
  officeHoursStatus,
  replyDelay,
  weekendSendsEnabled,
  isExpanded,
  onToggle,
  className,
}: ConfigStatusBarProps) {
  const statusColor = {
    active: 'text-green-600 dark:text-green-400',
    outside: 'text-amber-600 dark:text-amber-400',
    weekend: 'text-blue-600 dark:text-blue-400',
  }[officeHoursStatus];

  const statusLabel = {
    active: 'Office Hours: Active',
    outside: 'Outside Office Hours',
    weekend: weekendSendsEnabled ? 'Weekend (Enabled)' : 'Weekend (Disabled)',
  }[officeHoursStatus];

  const emailPercentage = (dailyEmailCount / dailyEmailLimit) * 100;
  const emailStatusColor =
    emailPercentage >= 90
      ? 'text-red-600 dark:text-red-400'
      : emailPercentage >= 75
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-green-600 dark:text-green-400';

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors',
        'hover:bg-muted/50 cursor-pointer',
        'bg-background border-border',
        className
      )}
    >
      <div className="flex items-center gap-6 flex-wrap">
        {/* Email Count */}
        <div className="flex items-center gap-2">
          <Mail className={cn('h-4 w-4', emailStatusColor)} />
          <span className={cn('text-sm font-medium', emailStatusColor)}>
            {dailyEmailCount}/{dailyEmailLimit}
          </span>
          <span className="text-xs text-muted-foreground">emails today</span>
        </div>

        {/* Office Hours Status */}
        <div className="flex items-center gap-2">
          <Clock className={cn('h-4 w-4 dark:text-white', statusColor)} />
          <span className={cn('text-sm font-medium', statusColor)}>{statusLabel}</span>
        </div>

        {/* Reply Delay */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-foreground">Reply: {replyDelay}min</span>
        </div>
      </div>

      {/* Expand/Collapse Icon */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-xs hidden sm:inline">
          {isExpanded ? 'Hide' : 'Configure'}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </button>
  );
}
