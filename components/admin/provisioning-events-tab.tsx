'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  XCircle,
  Activity,
  Cpu,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface IgnitionState {
  workspace_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  error_message?: string;
  error_step?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  requested_by: string;
  region: string;
  droplet_size: string;
}

interface IgnitionOperation {
  id: string;
  workspace_id: string;
  operation: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  result?: Record<string, unknown>;
  error_message?: string;
}

interface ProvisioningSummary {
  total: number;
  failed: number;
  stuck: number;
  in_progress: number;
  active: number;
}

interface ProvisioningResponse {
  success: boolean;
  summary: ProvisioningSummary;
  failed: IgnitionState[];
  stuck: IgnitionState[];
  in_progress: IgnitionState[];
  active: IgnitionState[];
}

// ============================================
// HELPERS
// ============================================

function formatTs(ts: string) {
  try {
    const d = new Date(ts);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  } catch { return '—'; }
}

function shortId(id: string) {
  return id.split('-')[0] + '…' + id.slice(-4);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof XCircle }> = {
  failed:              { label: 'Failed',      color: 'text-red-500',    icon: XCircle },
  stuck:               { label: 'Stuck',       color: 'text-yellow-500', icon: AlertTriangle },
  partition_creating:  { label: 'Partitioning',color: 'text-blue-400',   icon: Loader2 },
  droplet_provisioning:{ label: 'Provisioning',color: 'text-blue-400',   icon: Loader2 },
  handshake_pending:   { label: 'Handshake',   color: 'text-blue-400',   icon: Loader2 },
  credentials_injecting:{ label: 'Creds',      color: 'text-blue-400',   icon: Loader2 },
  workflows_deploying: { label: 'Workflows',   color: 'text-blue-400',   icon: Loader2 },
  activating:          { label: 'Activating',  color: 'text-blue-400',   icon: Loader2 },
  active:              { label: 'Active',      color: 'text-green-500',  icon: CheckCircle2 },
  pending:             { label: 'Pending',     color: 'text-muted-foreground', icon: Clock },
};

const OP_STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'danger' | 'secondary'; label: string }> = {
  completed:    { variant: 'success',   label: 'Completed' },
  running:      { variant: 'secondary', label: 'Running' },
  failed:       { variant: 'danger',    label: 'Failed' },
  pending:      { variant: 'secondary', label: 'Pending' },
  rolled_back:  { variant: 'warning',   label: 'Rolled Back' },
};

// ============================================
// OPERATION TIMELINE ROW
// ============================================

function OperationRow({ op }: { op: IgnitionOperation }) {
  const cfg = OP_STATUS_CONFIG[op.status] ?? { variant: 'secondary' as const, label: op.status };
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="w-[14px] mt-1 flex-shrink-0">
        <div className={cn(
          'h-2 w-2 rounded-full',
          op.status === 'completed' ? 'bg-green-500' :
          op.status === 'failed'    ? 'bg-red-500' :
          op.status === 'running'   ? 'bg-blue-400 animate-pulse' :
          'bg-muted-foreground/40'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-medium text-foreground">{op.operation}</span>
          <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
          {op.duration_ms && (
            <span className="text-[10px] text-muted-foreground">{op.duration_ms}ms</span>
          )}
        </div>
        {op.error_message && (
          <p className="text-[11px] text-red-400 mt-0.5 font-mono break-all">{op.error_message}</p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">{formatTs(op.started_at)}</span>
    </div>
  );
}

// ============================================
// WORKSPACE EVENT CARD
// ============================================

function WorkspaceEventCard({ state, category }: { state: IgnitionState; category: 'failed' | 'stuck' | 'in_progress' }) {
  const [expanded, setExpanded] = useState(false);
  const [ops, setOps] = useState<IgnitionOperation[] | null>(null);
  const [loadingOps, setLoadingOps] = useState(false);
  const statusCfg = STATUS_CONFIG[state.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  const loadOps = async () => {
    if (ops) { setExpanded(!expanded); return; }
    setLoadingOps(true);
    try {
      const res = await fetch(`/api/admin/provisioning-events?workspace_id=${state.workspace_id}`);
      const data = await res.json();
      setOps(data.operations ?? []);
      setExpanded(true);
    } catch { setOps([]); }
    finally { setLoadingOps(false); }
  };

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden',
      category === 'failed' ? 'border-red-500/30 bg-red-500/5' :
      category === 'stuck'  ? 'border-yellow-500/30 bg-yellow-500/5' :
      'border-border'
    )}>
      {/* Card Header */}
      <div className="flex items-start gap-3 p-4">
        <StatusIcon className={cn('h-4 w-4 mt-0.5 shrink-0', statusCfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-mono font-medium">{shortId(state.workspace_id)}</span>
            <Badge
              variant={category === 'failed' ? 'danger' : category === 'stuck' ? 'warning' : 'secondary'}
              className="text-[10px]"
            >
              {statusCfg.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Step {state.current_step}/{state.total_steps}
            </span>
          </div>
          {state.error_message && (
            <p className="text-xs text-red-400 font-mono break-all mb-1">{state.error_message}</p>
          )}
          {state.error_step && (
            <p className="text-[11px] text-muted-foreground">Failed at: <span className="font-mono text-red-400">{state.error_step}</span></p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" /> {state.region.toUpperCase()}
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" /> {state.droplet_size}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Started {formatTs(state.started_at)}
            </span>
            <span>Updated {formatTs(state.updated_at)}</span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={loadOps}
          disabled={loadingOps}
          className="shrink-0"
        >
          {loadingOps
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : expanded
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />
          }
        </Button>
      </div>

      {/* Operation Timeline */}
      {expanded && ops !== null && (
        <div className="border-t border-border/50 px-4 pb-3 pt-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            Operation Log ({ops.length})
          </p>
          {ops.length === 0
            ? <p className="text-xs text-muted-foreground">No operations recorded.</p>
            : ops.map((op) => <OperationRow key={op.id} op={op} />)
          }
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ProvisioningEventsTab() {
  const { data, isLoading, mutate } = useSWR<ProvisioningResponse>(
    '/api/admin/provisioning-events',
    fetcher,
    { refreshInterval: 15000 }
  );
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'failed' | 'stuck' | 'in_progress'>('all');

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await mutate(); } finally { setIsRefreshing(false); }
  }, [mutate]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">Failed to load provisioning data</p>
        <Button size="sm" variant="outline" onClick={handleRefresh}>Retry</Button>
      </div>
    );
  }

  const { summary, failed, stuck, in_progress, active } = data;
  const allProblematic = [...failed, ...stuck];

  const visibleFailed     = activeFilter === 'all' || activeFilter === 'failed'      ? failed      : [];
  const visibleStuck      = activeFilter === 'all' || activeFilter === 'stuck'       ? stuck       : [];
  const visibleInProgress = activeFilter === 'all' || activeFilter === 'in_progress' ? in_progress : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold">Workspace Provisioning</h3>
            <p className="text-xs text-muted-foreground">
              Ignition state for all workspaces · auto-refreshes every 15s
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          {isRefreshing
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Refreshing</>
            : <><RefreshCw className="h-3.5 w-3.5" />Refresh</>
          }
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{summary.total}</div>
        </div>
        <div
          className={cn(
            'border rounded-lg p-4 space-y-1 cursor-pointer transition-colors',
            summary.failed > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-border',
            activeFilter === 'failed' && 'ring-2 ring-red-500/50'
          )}
          onClick={() => setActiveFilter(activeFilter === 'failed' ? 'all' : 'failed')}
        >
          <div className="text-xs text-red-500">Failed</div>
          <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
        </div>
        <div
          className={cn(
            'border rounded-lg p-4 space-y-1 cursor-pointer transition-colors',
            summary.stuck > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border',
            activeFilter === 'stuck' && 'ring-2 ring-yellow-500/50'
          )}
          onClick={() => setActiveFilter(activeFilter === 'stuck' ? 'all' : 'stuck')}
        >
          <div className="text-xs text-yellow-500">Stuck (&gt;{30}m)</div>
          <div className="text-2xl font-bold text-yellow-500">{summary.stuck}</div>
        </div>
        <div
          className={cn(
            'border rounded-lg p-4 space-y-1 cursor-pointer transition-colors border-border',
            activeFilter === 'in_progress' && 'ring-2 ring-blue-500/50'
          )}
          onClick={() => setActiveFilter(activeFilter === 'in_progress' ? 'all' : 'in_progress')}
        >
          <div className="text-xs text-blue-400">In Progress</div>
          <div className="text-2xl font-bold text-blue-400">{summary.in_progress}</div>
        </div>
        <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-4 space-y-1">
          <div className="text-xs text-green-500">Active</div>
          <div className="text-2xl font-bold text-green-500">{summary.active}</div>
        </div>
      </div>

      {/* No Issues State */}
      {allProblematic.length === 0 && in_progress.length === 0 && (
        <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-8 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
          <p className="text-sm font-medium text-green-600 dark:text-green-400">All {summary.active} provisioned workspaces are active</p>
          <p className="text-xs text-muted-foreground">No failures or stuck provisioning jobs</p>
        </div>
      )}

      {/* Failed */}
      {visibleFailed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <h4 className="text-sm font-semibold text-red-500">Failed ({visibleFailed.length})</h4>
          </div>
          {visibleFailed.map((s) => (
            <WorkspaceEventCard key={s.workspace_id} state={s} category="failed" />
          ))}
        </div>
      )}

      {/* Stuck */}
      {visibleStuck.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <h4 className="text-sm font-semibold text-yellow-500">Stuck — no progress in {30}+ minutes ({visibleStuck.length})</h4>
          </div>
          {visibleStuck.map((s) => (
            <WorkspaceEventCard key={s.workspace_id} state={s} category="stuck" />
          ))}
        </div>
      )}

      {/* In Progress */}
      {visibleInProgress.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            <h4 className="text-sm font-semibold text-blue-400">In Progress ({visibleInProgress.length})</h4>
          </div>
          {visibleInProgress.map((s) => (
            <WorkspaceEventCard key={s.workspace_id} state={s} category="in_progress" />
          ))}
        </div>
      )}
    </div>
  );
}
