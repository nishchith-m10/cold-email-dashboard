/**
 * PHASE 44: Alert History Tab
 * 
 * Shows recent alert delivery history with channel status.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useScaleAlerts } from '@/hooks/use-scale-health';
import { Bell, CheckCircle2, Clock, AlertTriangle, XCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScaleAlert, AlertSeverity, AlertStatus } from '@/lib/genesis/phase44/types';

const SEVERITY_CONFIG: Record<string, { variant: 'success' | 'warning' | 'danger'; icon: typeof CheckCircle2 }> = {
  GREEN: { variant: 'success', icon: CheckCircle2 },
  YELLOW: { variant: 'warning', icon: AlertTriangle },
  RED: { variant: 'danger', icon: XCircle },
};

const STATUS_LABELS: Record<AlertStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'text-red-500' },
  acknowledged: { label: 'Acknowledged', className: 'text-amber-500' },
  resolved: { label: 'Resolved', className: 'text-green-500' },
  ignored: { label: 'Ignored', className: 'text-muted-foreground' },
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AlertHistoryTab() {
  // Fetch all alerts (no status filter) to show full history
  const { alerts, isLoading } = useScaleAlerts();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No alerts recorded yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Alerts will appear here after health checks detect threshold breaches.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Alert History</h2>
        <span className="text-xs text-muted-foreground">({alerts.length} total)</span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert: ScaleAlert) => {
          const sevConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.GREEN;
          const SevIcon = sevConfig.icon;
          const statusInfo = STATUS_LABELS[alert.status] || STATUS_LABELS.active;

          return (
            <div
              key={alert.id}
              className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className={cn(
                'p-1.5 rounded-md',
                alert.severity === 'RED' ? 'bg-red-500/10' : 'bg-amber-500/10'
              )}>
                <SevIcon className={cn(
                  'h-4 w-4',
                  alert.severity === 'RED' ? 'text-red-500' : 'text-amber-500'
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{alert.metricName}</span>
                  <Badge variant={sevConfig.variant} className="text-[10px] px-1.5 py-0">
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {alert.currentValue} (threshold: {alert.thresholdValue})
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={cn('text-xs font-medium', statusInfo.className)}>
                  {statusInfo.label}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(alert.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
