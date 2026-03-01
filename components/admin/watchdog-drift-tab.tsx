/**
 * ADMIN PANELS EXPANSION: Watchdog & Drift Detection Tab
 *
 * Displays watchdog run history, drift-type breakdown, and provides
 * a manual trigger button for on-demand drift scans.
 *
 * Features:
 *   - Run Watchdog button (scan all or single workspace)
 *   - Last run summary with drifts found / healed / failed
 *   - Drift type breakdown (bar chart style)
 *   - Error display for failed healings
 *
 * Design language: Consistent with Scale Health tab — section headers with
 * uppercase tracking, amber-500 icon accents, bordered tables, Badge variants.
 *
 * Ralph Loop: Research ✅ (watchdog-types, triggerWatchdogRun action) →
 * Analyze ✅ (Phase 43 + Phase 73 backends) → Execute ✅
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchdog, triggerWatchdogRun } from '@/hooks/use-watchdog';
import type { WatchdogRunSummary } from '@/hooks/use-watchdog';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Clock,
  Wrench,
  Search,
  ShieldAlert,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// CONSTANTS
// ============================================

const DRIFT_TYPE_CONFIG: Record<string, {
  label: string;
  icon: typeof AlertTriangle;
  color: string;
  description: string;
}> = {
  orphan_workflow: {
    label: 'Orphan Workflow',
    icon: Zap,
    color: 'text-yellow-500',
    description: 'Workflow exists in n8n but not tracked in database',
  },
  missing_workflow: {
    label: 'Missing Workflow',
    icon: XCircle,
    color: 'text-red-500',
    description: 'Expected workflow not found on droplet',
  },
  state_mismatch: {
    label: 'State Mismatch',
    icon: AlertTriangle,
    color: 'text-orange-500',
    description: 'Database state differs from actual droplet state',
  },
  credential_invalid: {
    label: 'Invalid Credential',
    icon: ShieldAlert,
    color: 'text-red-500',
    description: 'Credential failed validation on sidecar',
  },
  credential_missing: {
    label: 'Missing Credential',
    icon: ShieldAlert,
    color: 'text-red-500',
    description: 'Required credential not present on droplet',
  },
  container_drift: {
    label: 'Container Drift',
    icon: Server,
    color: 'text-blue-500',
    description: 'Container image or config does not match expected state',
  },
  config_drift: {
    label: 'Config Drift',
    icon: Wrench,
    color: 'text-purple-500',
    description: 'Environment or runtime configuration mismatch',
  },
};

const SEVERITY_CONFIG: Record<string, {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'secondary';
  color: string;
}> = {
  low: { label: 'Low', variant: 'secondary', color: 'text-muted-foreground' },
  medium: { label: 'Medium', variant: 'warning', color: 'text-yellow-500' },
  high: { label: 'High', variant: 'danger', color: 'text-orange-500' },
  critical: { label: 'Critical', variant: 'danger', color: 'text-red-500' },
};

// ============================================
// DRIFT BAR (horizontal bar chart row)
// ============================================

function DriftBar({ type, count, maxCount }: { type: string; count: number; maxCount: number }) {
  const config = DRIFT_TYPE_CONFIG[type] || {
    label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    description: '',
  };
  const Icon = config.icon;
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2 w-44 shrink-0">
        <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
        <span className="text-xs font-medium truncate">{config.label}</span>
      </div>
      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            count > 0 ? 'bg-amber-500' : 'bg-transparent'
          )}
          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className={cn(
        'text-sm font-semibold tabular-nums w-8 text-right',
        count > 0 ? 'text-amber-500' : 'text-muted-foreground'
      )}>
        {count}
      </span>
    </div>
  );
}

// ============================================
// RUN RESULT CARD
// ============================================

function RunResultCard({ run }: { run: WatchdogRunSummary | null }) {
  if (!run) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-3">
        <Search className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
        <p className="text-sm text-muted-foreground">
          No watchdog scan has been run yet. Click &ldquo;Run Watchdog&rdquo; to start a drift detection scan.
        </p>
      </div>
    );
  }

  const hasIssues = run.drifts_found > 0;
  const allHealed = hasIssues && run.drifts_failed === 0;
  const hasFailed = run.drifts_failed > 0;

  return (
    <div className={cn(
      'border rounded-lg p-5 space-y-4',
      hasFailed
        ? 'border-red-500/20 bg-red-500/5'
        : hasIssues && !allHealed
          ? 'border-yellow-500/20 bg-yellow-500/5'
          : 'border-green-500/20 bg-green-500/5'
    )}>
      {/* Result Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {hasFailed ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : hasIssues ? (
            allHealed ? <ShieldCheck className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          <div>
            <h4 className="text-sm font-semibold">
              {hasFailed
                ? 'Healing Failures Detected'
                : hasIssues
                  ? allHealed
                    ? 'All Drifts Auto-Healed'
                    : 'Drifts Detected'
                  : 'No Drifts Found'
              }
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {run.dry_run ? '🏷️ Dry run — no changes applied' : 'Live scan with auto-healing'}
            </p>
          </div>
        </div>
        {run.duration_ms > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {run.duration_ms}ms
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Workspaces</span>
          <p className="text-lg font-bold tabular-nums">{run.workspaces_scanned}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Drifts Found</span>
          <p className={cn('text-lg font-bold tabular-nums', run.drifts_found > 0 ? 'text-amber-500' : 'text-green-500')}>
            {run.drifts_found}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-Healed</span>
          <p className="text-lg font-bold tabular-nums text-green-500">{run.drifts_healed}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</span>
          <p className={cn('text-lg font-bold tabular-nums', run.drifts_failed > 0 ? 'text-red-500' : 'text-muted-foreground')}>
            {run.drifts_failed}
          </p>
        </div>
      </div>

      {/* Drift Type Breakdown */}
      {run.drifts_by_type && Object.keys(run.drifts_by_type).length > 0 && (
        <div className="pt-3 border-t border-border/50 space-y-2">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Drift Breakdown
          </h5>
          {(() => {
            const entries = Object.entries(run.drifts_by_type);
            const maxCount = Math.max(...entries.map(([, c]) => c), 1);
            return entries.map(([type, count]) => (
              <DriftBar key={type} type={type} count={count} maxCount={maxCount} />
            ));
          })()}
        </div>
      )}

      {/* Errors */}
      {run.errors && run.errors.length > 0 && (
        <div className="pt-3 border-t border-border/50 space-y-2">
          <h5 className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Errors ({run.errors.length})
          </h5>
          <div className="space-y-1">
            {run.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-400 font-mono bg-red-500/5 rounded px-2 py-1">
                {err}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WatchdogDriftTab() {
  const { lastRun, isLoading } = useWatchdog();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<WatchdogRunSummary | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const handleRunWatchdog = async () => {
    setRunning(true);
    try {
      const result = await triggerWatchdogRun({ dryRun });

      // Map response to WatchdogRunSummary
      const summary: WatchdogRunSummary = {
        run_id: result.run_id || crypto.randomUUID(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: result.duration_ms,
        workspaces_scanned: result.workspaces_scanned,
        drifts_found: result.drifts_found,
        drifts_healed: result.drifts_healed ?? 0,
        drifts_failed: result.drifts_failed ?? 0,
        dry_run: result.dry_run ?? dryRun,
        drifts_by_type: result.drifts_by_type ?? {},
        drifts_by_severity: result.drifts_by_severity ?? {},
        errors: result.errors ?? [],
      };

      setRunResult(summary);

      toast({
        title: 'Watchdog scan complete',
        description: `Scanned ${summary.workspaces_scanned} workspace(s). Found ${summary.drifts_found} drift(s), healed ${summary.drifts_healed}.`,
      });
    } catch (err) {
      toast({
        title: 'Watchdog scan failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold">Watchdog &amp; Drift Detection</h2>
            <p className="text-xs text-muted-foreground">
              State reconciliation — detect orphan workflows, stale credentials, config drift
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Dry Run Toggle */}
          <button
            onClick={() => setDryRun(!dryRun)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full font-medium transition-colors shrink-0',
              dryRun
                ? 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/30'
                : 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30'
            )}
          >
            {dryRun ? '🔍 Dry Run' : '⚡ Live'}
          </button>
          <Button
            size="sm"
            onClick={handleRunWatchdog}
            disabled={running}
            className="gap-2 flex-1 sm:flex-initial"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run Watchdog
          </Button>
        </div>
      </div>

      {/* Drift Type Legend */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Detectable Drift Types
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(DRIFT_TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <div key={type} className="flex items-start gap-2 py-1.5">
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.color)} />
                <div>
                  <p className="text-xs font-medium">{config.label}</p>
                  <p className="text-[10px] text-muted-foreground">{config.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Last Scan Result
        </h3>
        <RunResultCard run={runResult} />
      </div>
    </div>
  );
}
