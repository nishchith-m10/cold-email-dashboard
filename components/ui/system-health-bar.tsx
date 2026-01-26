/**
 * Phase 32 Pillar 1: System Health Bar Component
 * Real-Time Synchronization Fabric - Global Health Indicator
 * 
 * Displays real-time sync status with visual indicators.
 */

'use client';

import { useRealtimeHealth } from '@/lib/realtime-health';
import { cn } from '@/lib/utils';
import { Activity, WifiOff, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '@/lib/types/health-types';

interface SystemHealthBarProps {
  workspaceId: string;
  className?: string;
  compact?: boolean; // When true, shows only dot + label (no icon)
}

const STATUS_CONFIG: Record<SyncStatus, {
  label: string;
  color: string;
  icon: typeof Activity;
  pulse: boolean;
}> = {
  live: {
    label: 'Live',
    color: 'bg-green-500',
    icon: Activity,
    pulse: true,
  },
  syncing: {
    label: 'Syncing',
    color: 'bg-gray-500',
    icon: RefreshCw,
    pulse: false,
  },
  stale: {
    label: 'Connection Stale',
    color: 'bg-gray-500',
    icon: WifiOff,
    pulse: false,
  },
  error: {
    label: 'Error',
    color: 'bg-red-500',
    icon: WifiOff,
    pulse: false,
  },
};

export function SystemHealthBar({ workspaceId, className, compact = false }: SystemHealthBarProps) {
  const { health, refresh, isLoading } = useRealtimeHealth(workspaceId);

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center gap-1.5',
        compact ? 'px-2 py-1' : 'px-3 py-1.5 bg-surface-elevated rounded-md',
        className
      )}>
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" />
        {!compact && <span className="text-xs text-text-secondary">Connecting...</span>}
      </div>
    );
  }

  const config = STATUS_CONFIG[health.status];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        'flex items-center transition-all group/health',
        compact ? 'justify-center h-10 w-full' : 'gap-2 px-3 py-1.5 bg-surface-elevated rounded-md',
        className
      )}
      title={compact ? config.label : undefined}
    >
      <Icon 
        className={cn(
          'flex-shrink-0',
          compact ? 'h-5 w-5' : 'h-4 w-4',
          health.status === 'live' && 'text-green-500',
          health.status === 'syncing' && 'text-text-secondary animate-spin',
          health.status === 'stale' && 'text-text-secondary',
          health.status === 'error' && 'text-red-500'
        )} 
      />

      {!compact && (
        <span className="text-xs font-medium">{config.label}</span>
      )}

      {health.errorMessage && !compact && (
        <span className="text-xs text-red-400 italic truncate max-w-[200px]" title={health.errorMessage}>
          {health.errorMessage}
        </span>
      )}

      {!health.isConnected && !compact && (
        <button
          onClick={refresh}
          className="ml-2 text-xs text-accent-primary hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
