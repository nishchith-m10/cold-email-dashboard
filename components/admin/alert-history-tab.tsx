/**
 * Alert History Tab — Redesigned
 *
 * Three sections:
 *   1. Platform Alerts (from Scale Health thresholds)
 *   2. Sentry Errors (live from Sentry API)
 *   3. Rich empty state explaining every alert category
 *
 * Includes severity/status filtering and expandable Sentry stack info.
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useScaleAlerts, acknowledgeAlert, resolveAlert } from '@/hooks/use-scale-health';
import { fetcher } from '@/lib/fetcher';
import {
  Bell, CheckCircle2, Clock, AlertTriangle, XCircle,
  Bug, ExternalLink, ChevronDown, ChevronUp,
  Server, Mail, Zap, Shield, Heart, RefreshCw,
  Filter, Database, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScaleAlert, AlertStatus } from '@/lib/genesis/phase44/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  shortId: string;
  level: string;
  status: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  type: string;
  value: string;
  filename: string;
  permalink: string;
}

interface SentryResponse {
  configured: boolean;
  issues: SentryIssue[];
  message?: string;
  nextCursor?: string | null;
  error?: string;
}

type StatusFilter = 'all' | AlertStatus;

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { variant: 'success' | 'warning' | 'danger'; icon: typeof CheckCircle2 }> = {
  GREEN: { variant: 'success', icon: CheckCircle2 },
  YELLOW: { variant: 'warning', icon: AlertTriangle },
  RED: { variant: 'danger', icon: XCircle },
};

const STATUS_LABELS: Record<AlertStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'text-red-500' },
  acknowledged: { label: "Ack'd", className: 'text-amber-500' },
  resolved: { label: 'Resolved', className: 'text-green-500' },
  ignored: { label: 'Ignored', className: 'text-muted-foreground' },
};

const SENTRY_LEVEL_CONFIG: Record<string, { variant: 'danger' | 'warning' | 'default'; className: string }> = {
  fatal: { variant: 'danger', className: 'text-red-600' },
  error: { variant: 'danger', className: 'text-red-500' },
  warning: { variant: 'warning', className: 'text-amber-500' },
  info: { variant: 'default', className: 'text-blue-500' },
};

/** What kinds of alerts appear here — used for the empty state guide */
const ALERT_CATEGORIES = [
  {
    icon: Activity,
    title: 'Health Check Breaches',
    description: 'CPU, memory, disk, or response-time thresholds exceeded on infrastructure nodes.',
    color: 'text-red-500',
  },
  {
    icon: Server,
    title: 'Provisioning Failures',
    description: 'Droplet creation, n8n bootstrap, or credential injection failures during workspace setup.',
    color: 'text-amber-500',
  },
  {
    icon: Mail,
    title: 'Campaign Alerts',
    description: 'Bounce spikes, opt-out surges, reply notifications, and campaign completions.',
    color: 'text-blue-500',
  },
  {
    icon: Zap,
    title: 'Budget & Usage Warnings',
    description: 'LLM spend approaching limits, API quota nearing exhaustion, or unexpected cost spikes.',
    color: 'text-purple-500',
  },
  {
    icon: Shield,
    title: 'Security Events',
    description: 'Failed auth attempts, credential rotation reminders, and RLS policy violations.',
    color: 'text-emerald-500',
  },
  {
    icon: Bug,
    title: 'Application Errors (Sentry)',
    description: 'Unhandled exceptions, API route failures, and client-side crashes captured by Sentry.',
    color: 'text-orange-500',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count, color }: { icon: typeof Bell; title: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={cn('h-5 w-5', color)} />
      <h3 className="text-base font-semibold">{title}</h3>
      {count > 0 && (
        <Badge variant="secondary" className="text-[10px]">{count}</Badge>
      )}
    </div>
  );
}

function AlertRow({ alert, onAck, onResolve }: { alert: ScaleAlert; onAck: () => void; onResolve: () => void }) {
  const sevConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.GREEN;
  const SevIcon = sevConfig.icon;
  const statusInfo = STATUS_LABELS[alert.status] || STATUS_LABELS.active;

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <SevIcon className={cn('h-4 w-4 shrink-0', alert.severity === 'RED' ? 'text-red-500' : alert.severity === 'YELLOW' ? 'text-amber-500' : 'text-green-500')} />

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

      <div className="flex items-center gap-2 shrink-0">
        {alert.status === 'active' && (
          <>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAck}>Ack</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-500" onClick={onResolve}>Resolve</Button>
          </>
        )}
        <span className={cn('text-xs font-medium', statusInfo.className)}>{statusInfo.label}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTimeAgo(alert.createdAt)}
        </span>
      </div>
    </div>
  );
}

function SentryIssueRow({ issue }: { issue: SentryIssue }) {
  const [expanded, setExpanded] = useState(false);
  const levelConfig = SENTRY_LEVEL_CONFIG[issue.level] || SENTRY_LEVEL_CONFIG.info;

  return (
    <div className="border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <Bug className="h-4 w-4 text-orange-500 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{issue.title}</span>
            <Badge variant={levelConfig.variant} className="text-[10px] px-1.5 py-0">
              {issue.level}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{issue.culprit}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-muted-foreground">{issue.count}x</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(issue.lastSeen)}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50 space-y-2">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Type:</span>{' '}
              <span className="font-mono">{issue.type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">First seen:</span>{' '}
              {formatTimeAgo(issue.firstSeen)}
            </div>
            {issue.value && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Message:</span>{' '}
                <span className="font-mono text-red-400 break-all">{issue.value}</span>
              </div>
            )}
            {issue.filename && (
              <div className="col-span-2">
                <span className="text-muted-foreground">File:</span>{' '}
                <span className="font-mono">{issue.filename}</span>
              </div>
            )}
          </div>
          <a
            href={issue.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View in Sentry
          </a>
        </div>
      )}
    </div>
  );
}

function EmptyStateGuide() {
  return (
    <div className="space-y-6 py-4">
      {/* Hero message */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No alerts yet — here's what to expect</h3>
        <p className="text-sm text-muted-foreground max-w-lg">
          This tab aggregates all platform alerts, infrastructure warnings, and application
          errors into a single timeline. Alerts are generated automatically as events occur.
        </p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALERT_CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          return (
            <div
              key={cat.title}
              className="p-4 rounded-lg border border-border/60 bg-surface-elevated/30 space-y-2"
            >
              <div className="flex items-center gap-2">
                <CatIcon className={cn('h-4 w-4', cat.color)} />
                <span className="text-sm font-medium">{cat.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AlertHistoryTab() {
  const { alerts, isLoading: alertsLoading, mutate: mutateAlerts } = useScaleAlerts();
  const { data: sentryData, isLoading: sentryLoading } = useSWR<SentryResponse>(
    '/api/admin/sentry-issues',
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false },
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sentryExpanded, setSentryExpanded] = useState(true);

  const isLoading = alertsLoading;

  // Filter alerts
  const filteredAlerts = statusFilter === 'all'
    ? alerts
    : alerts.filter((a: ScaleAlert) => a.status === statusFilter);

  const sentryIssues = sentryData?.issues || [];
  const sentryConfigured = sentryData?.configured ?? true;
  const totalAlerts = alerts.length + sentryIssues.length;
  const hasNoData = alerts.length === 0 && sentryIssues.length === 0;

  // Counts by status
  const activeCt = alerts.filter((a: ScaleAlert) => a.status === 'active').length;
  const ackCt = alerts.filter((a: ScaleAlert) => a.status === 'acknowledged').length;
  const resolvedCt = alerts.filter((a: ScaleAlert) => a.status === 'resolved').length;

  const handleAck = async (alertId: string) => {
    await acknowledgeAlert(alertId);
    mutateAlerts();
  };
  const handleResolve = async (alertId: string) => {
    await resolveAlert(alertId, 'Resolved from Alert History');
    mutateAlerts();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Alerts & Errors</h2>
          {totalAlerts > 0 && (
            <Badge variant="secondary" className="text-xs">{totalAlerts} total</Badge>
          )}
        </div>

        {/* Status filter pills */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {(['all', 'active', 'acknowledged', 'resolved', 'ignored'] as const).map((f) => {
              const ct = f === 'all' ? alerts.length : f === 'active' ? activeCt : f === 'acknowledged' ? ackCt : f === 'resolved' ? resolvedCt : alerts.filter((a: ScaleAlert) => a.status === 'ignored').length;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    statusFilter === f
                      ? 'bg-amber-500/15 text-amber-500'
                      : 'text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {f === 'all' ? 'All' : f === 'acknowledged' ? "Ack'd" : f.charAt(0).toUpperCase() + f.slice(1)}
                  {ct > 0 && <span className="ml-1 opacity-60">({ct})</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick stats row */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className={cn('text-2xl font-bold', activeCt > 0 ? 'text-red-500' : 'text-green-500')}>{activeCt}</div>
          </div>
          <div className="p-3 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground">Acknowledged</div>
            <div className="text-2xl font-bold text-amber-500">{ackCt}</div>
          </div>
          <div className="p-3 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground">Resolved</div>
            <div className="text-2xl font-bold text-green-500">{resolvedCt}</div>
          </div>
          <div className="p-3 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Bug className="h-3 w-3" /> Sentry</div>
            <div className="text-2xl font-bold text-orange-500">{sentryIssues.length}</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {hasNoData && !sentryLoading && <EmptyStateGuide />}

      {/* Section 1: Platform Alerts */}
      {filteredAlerts.length > 0 && (
        <div>
          <SectionHeader icon={Activity} title="Platform Alerts" count={filteredAlerts.length} color="text-red-500" />
          <div className="space-y-2">
            {filteredAlerts.map((alert: ScaleAlert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAck={() => handleAck(alert.id)}
                onResolve={() => handleResolve(alert.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Sentry Errors */}
      {sentryConfigured && (
        <div>
          <button
            onClick={() => setSentryExpanded(!sentryExpanded)}
            className="flex items-center gap-2 mb-3 group"
          >
            <Bug className="h-5 w-5 text-orange-500" />
            <h3 className="text-base font-semibold">Application Errors</h3>
            {sentryIssues.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{sentryIssues.length}</Badge>
            )}
            {sentryExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
            {sentryLoading && <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
          </button>

          {sentryExpanded && (
            <>
              {sentryIssues.length === 0 && !sentryLoading && (
                <div className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border',
                  sentryData?.message
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border/60 bg-green-500/5',
                )}>
                  {sentryData?.message
                    ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    : <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  }
                  <div>
                    <p className={cn('text-sm font-medium', sentryData?.message ? 'text-amber-500' : 'text-green-500')}>
                      {sentryData?.message ? 'Sentry capturing — API view pending setup' : 'No unresolved errors'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sentryData?.message || 'All application errors are resolved. Sentry monitors client, server, and edge runtime errors.'}
                    </p>
                  </div>
                </div>
              )}

              {sentryIssues.length > 0 && (
                <div className="space-y-2">
                  {sentryIssues.map((issue) => (
                    <SentryIssueRow key={issue.id} issue={issue} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sentry not configured notice */}
      {!sentryConfigured && (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Sentry not configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">SENTRY_ORG</code>,{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">SENTRY_PROJECT</code>, and{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">SENTRY_AUTH_TOKEN</code>{' '}
              to your environment variables to see live error tracking here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
