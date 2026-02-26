/**
 * PHASE 44: Scale Health Tab
 * 
 * Shows metrics table (GREEN/YELLOW/RED), active alerts with
 * acknowledge/resolve actions, and trend sparklines.
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useScaleHealth, useScaleAlerts, useScaleHistory, triggerHealthCheck, acknowledgeAlert, resolveAlert } from '@/hooks/use-scale-health';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScaleAlert, HealthCheckResult, AlertSeverity, MetricTrend } from '@/lib/genesis/phase44/types';

// ============================================
// STATUS BADGE MAPPING
// ============================================

const STATUS_CONFIG: Record<AlertSeverity, { variant: 'success' | 'warning' | 'danger'; icon: typeof CheckCircle2; label: string }> = {
  GREEN: { variant: 'success', icon: CheckCircle2, label: 'Healthy' },
  YELLOW: { variant: 'warning', icon: AlertTriangle, label: 'Warning' },
  RED: { variant: 'danger', icon: XCircle, label: 'Critical' },
};

function StatusBadge({ status }: { status: AlertSeverity }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.GREEN;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================
// SPARKLINE COMPONENT
// ============================================

function Sparkline({ dataPoints, color = 'stroke-amber-500' }: { dataPoints: Array<{ date: string; value: number | null }>; color?: string }) {
  const values = dataPoints.map(p => p.value).filter((v): v is number => v !== null);
  if (values.length < 2) return <span className="text-xs text-muted-foreground">—</span>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');

  return (
    <svg width={w} height={h} className="inline-block" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        className={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function TrendIndicator({ trend }: { trend: MetricTrend }) {
  const isLatency = trend.metric.includes('latency');
  // For latency, "up" is bad (red), "down" is good (green). For others, "up" is good (green).
  const isGood = isLatency ? trend.direction === 'down' : trend.direction === 'up';
  const isBad = isLatency ? trend.direction === 'up' : trend.direction === 'down';

  const Icon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const color = isGood ? 'text-green-500' : isBad ? 'text-red-500' : 'text-muted-foreground';
  const sparkColor = isGood ? 'stroke-green-500' : isBad ? 'stroke-red-500' : 'stroke-muted-foreground';

  return (
    <div className="flex items-center gap-3 border border-border rounded-lg p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{formatMetricName(trend.metric)}</p>
        <div className="flex items-center gap-2 mt-1">
          <Icon className={cn('h-3.5 w-3.5', color)} />
          <span className={cn('text-xs font-medium', color)}>
            {trend.changePercent !== null ? `${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>
      <Sparkline dataPoints={trend.dataPoints} color={sparkColor} />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ScaleHealthTab() {
  const { summary, fleetOverview, isLoading, mutate } = useScaleHealth();
  const { alerts, mutate: mutateAlerts } = useScaleAlerts('active');
  const { trends } = useScaleHistory(30);
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const handleRunChecks = async () => {
    setIsRunning(true);
    try {
      const result = await triggerHealthCheck();
      toast({
        title: 'Health checks completed',
        description: `${result.results.length} checks run in ${result.durationMs}ms. ${result.alertsCreated} new alert(s).`,
      });
      mutate();
      mutateAlerts();
    } catch {
      toast({ title: 'Failed to run checks', variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      toast({ title: 'Alert acknowledged' });
      mutateAlerts();
    } catch {
      toast({ title: 'Failed to acknowledge', variant: 'destructive' });
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!resolveNotes.trim()) {
      toast({ title: 'Resolution notes required', variant: 'destructive' });
      return;
    }
    try {
      await resolveAlert(alertId, resolveNotes);
      toast({ title: 'Alert resolved' });
      setExpandedAlertId(null);
      setResolveNotes('');
      mutateAlerts();
    } catch {
      toast({ title: 'Failed to resolve', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold">Scale Health</h2>
            <p className="text-xs text-muted-foreground">
              Last check: {summary?.lastCheckAt ? new Date(summary.lastCheckAt).toLocaleString() : 'Never'}
            </p>
          </div>
          {summary && <StatusBadge status={summary.overallStatus} />}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRunChecks}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Run Checks
        </Button>
      </div>

      {/* Metrics Table */}
      {summary && summary.checks.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metric</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Current</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Threshold</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Runway</th>
              </tr>
            </thead>
            <tbody>
              {summary.checks.map((check: HealthCheckResult) => (
                <tr key={check.metric} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{formatMetricName(check.metric)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {formatValue(check.metric, check.currentValue)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {String(check.thresholdYellow)} – {String(check.thresholdRed)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={check.status} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {check.runwayDays != null ? (
                      <span className={cn(
                        'flex items-center gap-1 text-xs',
                        check.runwayDays <= 7 ? 'text-red-500' : check.runwayDays <= 30 ? 'text-amber-500' : 'text-muted-foreground'
                      )}>
                        <Clock className="h-3 w-3" />
                        {check.runwayDays}d
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trends (30d) */}
      {trends && trends.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends (30d)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trends.map((trend: MetricTrend) => (
              <TrendIndicator key={trend.metric} trend={trend} />
            ))}
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active Alerts ({alerts.length})
          </h3>
          {alerts.map((alert: ScaleAlert) => (
            <div
              key={alert.id}
              className={cn(
                'border rounded-lg p-4',
                alert.severity === 'RED' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={alert.severity as AlertSeverity} />
                    <span className="font-medium text-sm truncate">{alert.metricName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.recommendation}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {alert.currentValue} | Threshold: {alert.thresholdValue}
                    {alert.runwayDays != null && ` | Runway: ${alert.runwayDays} days`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert.id)}>
                    Ack
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                  >
                    {expandedAlertId === alert.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Resolve form */}
              {expandedAlertId === alert.id && (
                <div className="mt-3 pt-3 border-t border-border/50 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Resolution notes..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background"
                  />
                  <Button size="sm" onClick={() => handleResolve(alert.id)}>
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fleet Overview Summary */}
      {fleetOverview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: fleetOverview.totalWorkspaces, color: 'text-foreground' },
            { label: 'Healthy', value: fleetOverview.healthy, color: 'text-green-500' },
            { label: 'Degraded', value: fleetOverview.degraded, color: 'text-amber-500' },
            { label: 'Not Provisioned', value: fleetOverview.notProvisioned, color: 'text-muted-foreground' },
            { label: 'Frozen', value: fleetOverview.frozen, color: 'text-red-500' },
          ].map((item) => (
            <div key={item.label} className="border border-border rounded-lg p-3 text-center">
              <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatMetricName(metric: string): string {
  const names: Record<string, string> = {
    partition_count: 'Total Partitions',
    largest_partition: 'Largest Partition',
    query_p95_latency: 'Query P95 Latency',
    storage_growth: 'Total Storage',
    do_account_capacity: 'DO Capacity',
  };
  return names[metric] || metric;
}

function formatValue(metric: string, value: number | string | null): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  if (metric === 'query_p95_latency') return `${num.toFixed(1)}ms`;
  if (metric === 'storage_growth') return `${num.toFixed(1)} GB`;
  if (metric.includes('partition')) return num.toLocaleString();
  return String(num);
}
