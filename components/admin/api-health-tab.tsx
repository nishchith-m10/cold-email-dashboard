/**
 * PHASE 71: API Health Tab
 * 
 * Admin dashboard tab showing API health monitoring with:
 * - Overall health status badge
 * - Refresh all button (triggers manual check)
 * - Services table with individual check actions
 * - Loading states and error handling
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAPIHealth, useAPIHealthHistory, triggerHealthCheck } from '@/hooks/use-api-health';
import { useToast } from '@/hooks/use-toast';
import { APIHealthServicesTable } from '@/components/admin/api-health-services-table';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HealthStatus } from '@/lib/genesis/phase71/types';

// ============================================
// OVERALL STATUS CONFIGURATION
// ============================================

const OVERALL_STATUS_CONFIG: Record<
  HealthStatus,
  {
    variant: 'success' | 'warning' | 'danger';
    icon: typeof CheckCircle2;
    label: string;
    color: string;
    description: string;
  }
> = {
  ok: {
    variant: 'success',
    icon: CheckCircle2,
    label: 'All Systems Operational',
    color: 'text-green-500',
    description: 'All services are healthy and performing within normal parameters.',
  },
  degraded: {
    variant: 'warning',
    icon: AlertTriangle,
    label: 'Performance Degraded',
    color: 'text-yellow-500',
    description: 'Some services are experiencing reduced performance or approaching limits.',
  },
  error: {
    variant: 'danger',
    icon: XCircle,
    label: 'Service Disruption',
    color: 'text-red-500',
    description: 'Critical services are unavailable or experiencing errors.',
  },
};

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function APIHealthTab() {
  const { report, fromCache, cacheAge, isLoading, mutate } = useAPIHealth();
  const { snapshots: historySnapshots } = useAPIHealthHistory(7);
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      const result = await triggerHealthCheck();
      toast({
        title: 'Health checks completed',
        description: `${result.checksRun} checks run in ${result.durationMs}ms. Status: ${result.report.overallStatus}`,
      });
      mutate();
    } catch (error) {
      toast({
        title: 'Failed to run checks',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSingleCheckComplete = () => {
    // Refresh the main report after a single check completes
    mutate();
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!report) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-4">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h3 className="text-lg font-semibold mb-2">No health data available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Run your first health check to start monitoring API services.
          </p>
          <Button onClick={handleRefreshAll} disabled={isRefreshing} className="gap-2">
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Checks...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Run Health Checks
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = OVERALL_STATUS_CONFIG[report.overallStatus];
  const StatusIcon = statusConfig.icon;

  // Format timestamp
  const lastCheckTime = new Date(report.timestamp).toLocaleString();
  const cacheAgeText = cacheAge !== undefined ? `${Math.floor(cacheAge / 1000)}s ago` : null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-lg bg-opacity-10', statusConfig.color)}>
            <StatusIcon className={cn('h-6 w-6', statusConfig.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold">{statusConfig.label}</h2>
              <Badge variant={statusConfig.variant} className="gap-1">
                <Activity className="h-3 w-3" />
                {report.overallStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Last check: {lastCheckTime}</span>
          </div>
          {fromCache && cacheAgeText && (
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>Cached ({cacheAgeText})</span>
            </div>
          )}
          {report.slowestService && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Slowest: {report.slowestService}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Cards - Mobile-friendly grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Total Services</div>
          <div className="text-2xl font-bold">{report.services.length}</div>
        </div>
        <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-4 space-y-1">
          <div className="text-xs text-green-600 dark:text-green-400">Healthy</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {report.services.filter(s => s.status === 'ok').length}
          </div>
        </div>
        <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg p-4 space-y-1">
          <div className="text-xs text-yellow-600 dark:text-yellow-400">Degraded</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {report.degradedCount}
          </div>
        </div>
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-4 space-y-1">
          <div className="text-xs text-red-600 dark:text-red-400">Errors</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {report.errorCount}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold">API Services</h3>
            <p className="text-xs text-muted-foreground">
              {report.services.length} services monitored
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="gap-2 w-full sm:w-auto"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Checks...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh All
            </>
          )}
        </Button>
      </div>

      {/* Services Table */}
      <APIHealthServicesTable
        services={report.services}
        onCheckComplete={handleSingleCheckComplete}
      />

      {/* Performance Summary */}
      {report.totalLatencyMs > 0 && (
        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Total Response Time</div>
              <div className="text-lg font-bold">
                {report.totalLatencyMs < 1000
                  ? `${report.totalLatencyMs}ms`
                  : `${(report.totalLatencyMs / 1000).toFixed(2)}s`}
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-xs font-medium text-muted-foreground">Average Latency</div>
              <div className="text-lg font-bold">
                {Math.round(report.totalLatencyMs / report.services.length)}ms
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day History */}
      {historySnapshots && historySnapshots.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">7-Day History</span>
              <Badge variant="secondary" className="text-xs">{historySnapshots.length} snapshots</Badge>
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showHistory && (
            <div className="border-t border-border">
              {/* Mobile: Card Layout */}
              <div className="md:hidden divide-y divide-border">
                {historySnapshots.map((snap) => {
                  const statusCfg = OVERALL_STATUS_CONFIG[snap.overall_status as HealthStatus] || OVERALL_STATUS_CONFIG.ok;
                  return (
                    <div key={snap.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(snap.timestamp).toLocaleString()}
                        </span>
                        <Badge variant={statusCfg.variant} className="gap-1 text-xs">
                          {snap.overall_status?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Errors</span>
                          <p className="font-medium text-red-500">{snap.error_count}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Degraded</span>
                          <p className="font-medium text-yellow-500">{snap.degraded_count}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Latency</span>
                          <p className="font-medium">{snap.total_latency_ms}ms</p>
                        </div>
                      </div>
                      {snap.slowest_service && (
                        <p className="text-xs text-muted-foreground">Slowest: {snap.slowest_service}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table Layout */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Timestamp</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Errors</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Degraded</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Total Latency</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Slowest</th>
                  </tr>
                </thead>
                <tbody>
                  {historySnapshots.map((snap) => {
                    const statusCfg = OVERALL_STATUS_CONFIG[snap.overall_status as HealthStatus] || OVERALL_STATUS_CONFIG.ok;
                    return (
                      <tr key={snap.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {new Date(snap.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={statusCfg.variant} className="gap-1 text-xs">
                            {snap.overall_status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className={cn('px-4 py-2 font-mono text-xs', snap.error_count > 0 && 'text-red-500 font-semibold')}>
                          {snap.error_count}
                        </td>
                        <td className={cn('px-4 py-2 font-mono text-xs', snap.degraded_count > 0 && 'text-yellow-500 font-semibold')}>
                          {snap.degraded_count}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{snap.total_latency_ms}ms</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{snap.slowest_service || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
