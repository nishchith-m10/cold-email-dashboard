'use client';

/**
 * Alert Component
 * Simple alert/notification component
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export function Alert({ children, variant = 'default', className }: AlertProps) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4',
        variant === 'default' && 'bg-surface border-border text-text-primary',
        variant === 'destructive' && 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
        className
      )}
    >
      <div className="flex items-start gap-2">
        {children}
      </div>
    </div>
  );
}

interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return (
    <div className={cn('text-sm flex-1', className)}>
      {children}
    </div>
  );
}
