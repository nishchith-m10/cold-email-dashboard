/**
 * ADMIN PANELS EXPANSION: Webhook DLQ Tab
 *
 * Displays Dead Letter Queue status with summary cards,
 * entry table, and manual retry capabilities.
 *
 * Design language: Matches existing admin tabs (Card-based stats,
 * bordered tables, amber-500 accents, Badge variants, responsive grid).
 *
 * Ralph Loop: Research ✅ → Analyze ✅ → Execute ✅
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebhookDLQ, retryDLQEntry } from '@/hooks/use-webhook-dlq';
import type { DLQEntry, DLQStatus } from '@/hooks/use-webhook-dlq';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Mail,
  MailWarning,
  RefreshCw,
  RotateCcw,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ============================================
// STATUS CONFIGURATION
// ============================================

const STATUS_CONFIG: Record<DLQStatus, {
  label: string;
  variant: 'warning' | 'default' | 'success' | 'danger';
  icon: typeof Clock;
  color: string;
}> = {
  pending: { label: 'Pending', variant: 'warning', icon: Clock, color: 'text-yellow-500' },
  retrying: { label: 'Retrying', variant: 'default', icon: RotateCcw, color: 'text-blue-500' },
  resolved: { label: 'Resolved', variant: 'success', icon: CheckCircle2, color: 'text-green-500' },
  abandoned: { label: 'Abandoned', variant: 'danger', icon: XCircle, color: 'text-red-500' },
};

// ============================================
// STAT CARD
// ============================================

function StatCard({ label, value, icon: Icon, color, borderColor }: {
  label: string;
  value: number;
  icon: typeof Inbox;
  color: string;
  borderColor: string;
}) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-1', borderColor)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
    </div>
  );
}

// ============================================
// ENTRY ROW
// ============================================

function EntryRow({ entry, onRetry, retrying }: {
  entry: DLQEntry;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[entry.status];
  const StatusIcon = config.icon;

  const truncateUrl = (url: string, max: number = 40) =>
    url.length > max ? url.substring(0, max) + '…' : url;

  return (
    <>
      <tr
        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="text-xs font-mono text-muted-foreground">{entry.workspace_id.substring(0, 8)}…</span>
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {truncateUrl(entry.webhook_url)}
          </span>
        </td>
        <td className="px-4 py-3">
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-xs text-muted-foreground">
            {entry.attempt_count}/{entry.max_attempts}
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {(entry.status === 'pending' || entry.status === 'retrying') && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={retrying}
              onClick={(e) => {
                e.stopPropagation();
                onRetry(entry.id);
              }}
            >
              {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Retry
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-text-primary">Webhook URL</span>
                  <p className="font-mono text-muted-foreground break-all mt-0.5">{entry.webhook_url}</p>
                </div>
                <div>
                  <span className="font-medium text-text-primary">Method</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{entry.http_method}</p>
                </div>
                <div>
                  <span className="font-medium text-text-primary">Error</span>
                  <p className="text-red-500 mt-0.5">{entry.error_message}</p>
                  {entry.error_code && (
                    <p className="text-muted-foreground mt-0.5">Code: {entry.error_code}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-text-primary">Payload</span>
                  <pre className="mt-1 p-2 bg-surface rounded text-muted-foreground overflow-auto max-h-32 text-[11px]">
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                </div>
                {entry.next_retry_at && (
                  <div>
                    <span className="font-medium text-text-primary">Next Retry</span>
                    <p className="text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(entry.next_retry_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WebhookDLQTab() {
  const { entries, stats, isLoading, error, refresh } = useWebhookDLQ({ limit: 100 });
  const { toast } = useToast();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DLQStatus | 'all'>('all');

  const handleRetry = async (entryId: string) => {
    setRetryingId(entryId);
    try {
      const result = await retryDLQEntry(entryId);
      if (result.success) {
        toast({ title: 'Retry triggered', description: 'Webhook delivery retry initiated.' });
        refresh();
      } else {
        toast({ title: 'Retry failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setRetryingId(null);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-4">
        <MailWarning className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h3 className="text-lg font-semibold mb-2">Failed to load DLQ data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => refresh()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const filteredEntries = statusFilter === 'all'
    ? entries
    : entries.filter(e => e.status === statusFilter);

  const hasActiveIssues = stats.pending + stats.retrying > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold">Webhook Dead Letter Queue</h2>
            <p className="text-xs text-muted-foreground">
              Failed webhook deliveries with retry tracking
            </p>
          </div>
          {hasActiveIssues ? (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.pending + stats.retrying} Active
            </Badge>
          ) : (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Clear
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refresh()}
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="text-yellow-500"
          borderColor="border-yellow-500/20 bg-yellow-500/5"
        />
        <StatCard
          label="Retrying"
          value={stats.retrying}
          icon={RotateCcw}
          color="text-blue-500"
          borderColor="border-blue-500/20 bg-blue-500/5"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          color="text-green-500"
          borderColor="border-green-500/20 bg-green-500/5"
        />
        <StatCard
          label="Abandoned"
          value={stats.abandoned}
          icon={XCircle}
          color="text-red-500"
          borderColor="border-red-500/20 bg-red-500/5"
        />
        <StatCard
          label="Total"
          value={stats.total}
          icon={Inbox}
          color="text-muted-foreground"
          borderColor="border-border"
        />
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Filter:</span>
        {(['all', 'pending', 'retrying', 'resolved', 'abandoned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full transition-colors font-medium',
              statusFilter === f
                ? 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30'
                : 'bg-surface-elevated text-muted-foreground hover:text-text-primary'
            )}
          >
            {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
            {f !== 'all' && stats[f] > 0 && (
              <span className="ml-1 opacity-70">({stats[f]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center space-y-3">
          <Archive className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">
            {statusFilter === 'all'
              ? 'No webhook DLQ entries found. All deliveries are succeeding.'
              : `No ${STATUS_CONFIG[statusFilter as DLQStatus]?.label.toLowerCase()} entries.`}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Workspace</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">URL</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Attempts</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onRetry={handleRetry}
                  retrying={retryingId === entry.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
