/**
 * PHASE 71: API Health Services Table
 * 
 * Displays all monitored services with status, latency, quota info,
 * and individual run check actions.
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { runSingleCheck } from '@/hooks/use-api-health';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceHealth, HealthStatus } from '@/lib/genesis/phase71/types';

// ============================================
// STATUS BADGE CONFIGURATION
// ============================================

const STATUS_CONFIG: Record<
  HealthStatus,
  { 
    variant: 'success' | 'warning' | 'danger' | 'secondary';
    icon: typeof CheckCircle2;
    label: string;
    color: string;
  }
> = {
  ok: {
    variant: 'success',
    icon: CheckCircle2,
    label: 'Healthy',
    color: 'text-green-500',
  },
  degraded: {
    variant: 'warning',
    icon: AlertTriangle,
    label: 'Degraded',
    color: 'text-yellow-500',
  },
  error: {
    variant: 'danger',
    icon: XCircle,
    label: 'Error',
    color: 'text-red-500',
  },
};

function StatusBadge({ status }: { status: HealthStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================
// CATEGORY BADGE
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
  ai: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  integration: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  infrastructure: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  email: 'bg-green-500/10 text-green-500 border-green-500/20',
};

function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-500/10 text-gray-500';
  return (
    <Badge variant="secondary" className={cn('text-xs capitalize', colorClass)}>
      {category}
    </Badge>
  );
}

// ============================================
// FORMAT HELPERS
// ============================================

function formatLatency(ms?: number): string {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatQuota(used?: number, limit?: number): string {
  if (used === undefined || limit === undefined) return '—';
  const percentage = Math.round((used / limit) * 100);
  return `${percentage}% (${used.toLocaleString()}/${limit.toLocaleString()})`;
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return '—';
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

interface APIHealthServicesTableProps {
  services: ServiceHealth[];
  onCheckComplete?: () => void;
}

export function APIHealthServicesTable({ services, onCheckComplete }: APIHealthServicesTableProps) {
  const { toast } = useToast();
  const [runningChecks, setRunningChecks] = useState<Set<string>>(new Set());

  const handleRunCheck = async (serviceId: string) => {
    setRunningChecks(prev => new Set(prev).add(serviceId));
    try {
      const result = await runSingleCheck(serviceId);
      toast({
        title: 'Check completed',
        description: `${result.service.name}: ${result.service.status} (${result.durationMs}ms)`,
      });
      onCheckComplete?.();
    } catch {
      toast({
        title: 'Check failed',
        description: `Failed to check ${serviceId}`,
        variant: 'destructive',
      });
    } finally {
      setRunningChecks(prev => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  if (services.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No services configured</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Mobile: Card Layout */}
      <div className="md:hidden divide-y divide-border">
        {services.map((service) => {
          const isRunning = runningChecks.has(service.id);
          return (
            <div key={service.id} className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{service.name}</h4>
                    <CategoryBadge category={service.category} />
                  </div>
                  <StatusBadge status={service.status} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunCheck(service.id)}
                  disabled={isRunning}
                  className="shrink-0"
                >
                  {isRunning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Latency</div>
                  <div className="font-medium">{formatLatency(service.result.latencyMs)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Quota</div>
                  <div className="font-medium">
                    {formatQuota(service.result.quotaUsed, service.result.quotaLimit)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last Check
                  </div>
                  <div className="font-medium">{formatTimestamp(service.result.checkedAt)}</div>
                </div>
              </div>

              {/* Error/Message */}
              {(service.result.error || service.result.message) && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
                  {service.result.error || service.result.message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: Table Layout */}
      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-elevated">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Service</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Latency</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quota</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Check</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            const isRunning = runningChecks.has(service.id);
            return (
              <tr
                key={service.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{service.name}</div>
                  {(service.result.error || service.result.message) && (
                    <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                      {service.result.error || service.result.message}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={service.category} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={service.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {formatLatency(service.result.latencyMs)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {formatQuota(service.result.quotaUsed, service.result.quotaLimit)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(service.result.checkedAt)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunCheck(service.id)}
                    disabled={isRunning}
                    className="gap-1.5"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Running
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Run Check
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
