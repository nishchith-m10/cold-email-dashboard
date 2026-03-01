'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Framer-style spinner — rotating arc with glow, no container box.
 * Used for both page-level and full-screen loading states.
 */
function FramerSpinner({ size = 32 }: { size?: number }) {
  const arcPath = "M 16.25 9 C 16.25 10.07 16.018 11.086 15.602 12 C 15.163 12.965 14.518 13.817 13.724 14.5";
  return (
    <div className="flex items-center gap-3">
      {/* Spinner icon */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {/* Static base ring */}
        <svg viewBox="0 0 18 18" width={size} height={size} className="absolute inset-0">
          <path
            d="M 9 16.25 C 4.996 16.25 1.75 13.004 1.75 9 C 1.75 4.996 4.996 1.75 9 1.75 C 13.004 1.75 16.25 4.996 16.25 9 C 16.25 13.004 13.004 16.25 9 16.25 Z"
            fill="transparent"
            strokeWidth="2"
            stroke="rgba(241, 242, 244, 0.16)"
            strokeLinecap="round"
          />
        </svg>
        {/* Rotating arc */}
        <motion.svg
          viewBox="0 0 18 18"
          width={size}
          height={size}
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "center" }}
        >
          <path d={arcPath} fill="transparent" strokeWidth="2" stroke="rgb(241, 242, 244)" strokeLinecap="round" />
        </motion.svg>
        {/* Blurred glow arc */}
        <motion.svg
          viewBox="0 0 18 18"
          width={size}
          height={size}
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "center", filter: "blur(4px)" }}
        >
          <path d={arcPath} fill="transparent" strokeWidth="2" stroke="rgb(241, 242, 244)" strokeLinecap="round" />
        </motion.svg>
      </div>
      {/* Text */}
      <span className="text-sm font-medium text-text-secondary">Loading...</span>
    </div>
  );
}

/**
 * Page-level loading spinner
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <FramerSpinner size={32} />
      </motion.div>
    </div>
  );
}

/**
 * Card skeleton for metric cards
 */
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'bg-surface rounded-xl border border-border p-6 animate-pulse',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="h-4 w-24 bg-surface-elevated rounded" />
        <div className="h-8 w-8 bg-surface-elevated rounded-lg" />
      </div>
      <div className="h-8 w-20 bg-surface-elevated rounded mb-2" />
      <div className="h-3 w-16 bg-surface-elevated rounded" />
    </div>
  );
}

/**
 * Chart skeleton
 */
export function ChartSkeleton({ className, height = 300 }: { className?: string; height?: number }) {
  return (
    <div className={cn(
      'bg-surface rounded-xl border border-border p-6 animate-pulse',
      className
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-32 bg-surface-elevated rounded" />
        <div className="h-4 w-20 bg-surface-elevated rounded" />
      </div>
      <div 
        className="bg-surface-elevated rounded-lg"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}

/**
 * Table skeleton
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn(
      'bg-surface rounded-xl border border-border p-6 animate-pulse',
      className
    )}>
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-4 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-surface-elevated rounded"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div 
              key={colIdx} 
              className="h-4 bg-surface-elevated rounded"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton - full page loading state
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-surface-elevated rounded animate-pulse" />
          <div className="h-10 w-32 bg-surface-elevated rounded animate-pulse" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={280} />
        <ChartSkeleton height={280} />
      </div>
    </div>
  );
}

/**
 * Inline loading indicator
 */
export function InlineLoader({ 
  size = 'sm',
  className 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Loader2 className={cn(
      'animate-spin text-accent-primary',
      sizes[size],
      className
    )} />
  );
}

/**
 * App-level loading spinner — Framer-style arc with glow, no container box.
 * Used by app/loading.tsx for Next.js route segment loading.
 */
export function AppLoadingSpinner({ size = 32 }: { size?: number }) {
  return <FramerSpinner size={size} />;
}

/**
 * Data loading overlay (for refreshing existing data)
 */
export function DataRefreshOverlay({ isRefreshing }: { isRefreshing: boolean }) {
  if (!isRefreshing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl z-10"
    >
      <InlineLoader size="md" />
    </motion.div>
  );
}

