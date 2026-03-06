'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDisasterRecoverySnapshots,
  useRegionalHealth,
  useDisasterRecoveryStats,
  useCreateSnapshot,
  useDeleteSnapshot,
  useTriggerFailover,
  useRestoreSnapshot,
} from '@/hooks/use-disaster-recovery';
import { useToast } from '@/hooks/use-toast';
import {
  HardDrive, Download, RefreshCw, Trash2,
  CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, RotateCcw,
  FileJson, Copy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportMeta { count: number; truncated: boolean }
interface ExportResponse {
  success: boolean;
  workspace_id: string;
  campaign_id: string | null;
  exported_at: string;
  tables: Record<string, ExportMeta>;
  data: Record<string, unknown[]>;
}

interface WorkspaceBackupRow {
  workspaceId: string;
  snapshotCount: number;
  totalSizeGb: number;
  lastBackupAt: string | null;
  ageMs: number;
  status: 'fresh' | 'stale' | 'critical' | 'none';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REGION_STATUS_CFG = {
  healthy:  { icon: CheckCircle2,  color: 'text-green-500', badge: 'success'   as const },
  degraded: { icon: AlertTriangle, color: 'text-amber-500', badge: 'warning'   as const },
  outage:   { icon: XCircle,       color: 'text-red-500',   badge: 'danger'    as const },
} as const;

const BACKUP_STATUS_CFG = {
  fresh:    { label: 'Fresh',     badge: 'success'   as const },
  stale:    { label: 'Stale',     badge: 'warning'   as const },
  critical: { label: 'Critical',  badge: 'danger'    as const },
  none:     { label: 'No backup', badge: 'secondary' as const },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ageOf(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
  catch { return 'Unknown'; }
}

function deriveStatus(lastAt: string | null): WorkspaceBackupRow['status'] {
  if (!lastAt) return 'none';
  const ms = Date.now() - new Date(lastAt).getTime();
  if (ms < 86_400_000) return 'fresh';
  if (ms < 259_200_000) return 'stale';
  return 'critical';
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title, badge, children, collapsible = false, defaultExpanded = true,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div
        className={cn(
          'flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/20',
          collapsible && 'cursor-pointer select-none hover:bg-muted/30 transition-colors',
        )}
        onClick={collapsible ? () => setOpen(v => !v) : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge}
        </div>
        {collapsible && (open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      {(!collapsible || open) && <div className="p-5">{children}</div>}
    </div>
  );
}

function StatBox({ label, value, sub, highlight }: {
  label: string; value: string | number; sub?: string; highlight?: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-border/60 space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-bold', highlight)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function BackupsRecoveryTab() {
  const { snapshots, isLoading: snapshotsLoading, refresh: refreshSnapshots } =
    useDisasterRecoverySnapshots();
  const { regionalHealth, isLoading: healthLoading, refresh: refreshHealth } =
    useRegionalHealth({ refreshInterval: 30000 });
  const { stats } = useDisasterRecoveryStats();
  const { createSnapshot, isLoading: creating } = useCreateSnapshot();
  const { deleteSnapshot, isLoading: deleting } = useDeleteSnapshot();
  const { triggerFailover, isLoading: failingOver } = useTriggerFailover();
  const { restoreSnapshot, isLoading: restoring } = useRestoreSnapshot();
  const { toast } = useToast();

  // ── infra snapshot form
  const [snapWsId, setSnapWsId] = useState('');
  const [snapDropletId, setSnapDropletId] = useState('');

  // ── failover form
  const [foWsId, setFoWsId] = useState('');
  const [foRegion, setFoRegion] = useState('');

  // ── retention form
  const [retWsId, setRetWsId] = useState('');
  const [retKeep, setRetKeep] = useState('7');
  const [enforcing, setEnforcing] = useState(false);

  // ── data export form
  const [expWsId, setExpWsId] = useState('');
  const [expCampaignId, setExpCampaignId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);

  const isLoading = snapshotsLoading || healthLoading;

  // ── derived: per-workspace backup summary
  const workspaceRows = useMemo<WorkspaceBackupRow[]>(() => {
    const map = new Map<string, { count: number; sizeGb: number; lastAt: string | null }>();
    for (const s of snapshots) {
      const existing = map.get(s.workspaceId) ?? { count: 0, sizeGb: 0, lastAt: null };
      const isNewer = !existing.lastAt || new Date(s.createdAt) > new Date(existing.lastAt);
      map.set(s.workspaceId, {
        count: existing.count + 1,
        sizeGb: existing.sizeGb + s.sizeGb,
        lastAt: isNewer ? s.createdAt : existing.lastAt,
      });
    }
    return Array.from(map.entries())
      .map(([id, d]) => ({
        workspaceId: id,
        snapshotCount: d.count,
        totalSizeGb: d.sizeGb,
        lastBackupAt: d.lastAt,
        ageMs: d.lastAt ? Date.now() - new Date(d.lastAt).getTime() : Infinity,
        status: deriveStatus(d.lastAt),
      }))
      .sort((a, b) => b.totalSizeGb - a.totalSizeGb);
  }, [snapshots]);

  const staleCount = workspaceRows.filter(
    r => r.status === 'stale' || r.status === 'critical' || r.status === 'none',
  ).length;

  // ── handlers
  async function handleCreateSnapshot() {
    if (!snapWsId || !snapDropletId) return;
    const r = await createSnapshot({ workspaceId: snapWsId, dropletId: snapDropletId, type: 'full' });
    if (r.success) {
      toast({ title: 'Snapshot created' });
      refreshSnapshots();
      setSnapWsId(''); setSnapDropletId('');
    } else {
      toast({ title: 'Failed', description: r.error || 'Unknown error', variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return;
    const r = await deleteSnapshot(id);
    if (r.success) { toast({ title: 'Deleted' }); refreshSnapshots(); }
    else { toast({ title: 'Failed', description: r.error, variant: 'destructive' }); }
  }

  async function handleRestore(id: string) {
    const region = prompt('Target region (e.g. nyc3, sfo3):');
    if (!region?.trim()) return;
    if (!confirm(`Restore snapshot to ${region}?`)) return;
    const r = await restoreSnapshot({ snapshotId: id, targetRegion: region.trim() });
    if (r.success) {
      toast({ title: 'Restoring', description: `Restoring to ${region}…` });
      refreshSnapshots();
    } else {
      toast({ title: 'Failed', description: r.error, variant: 'destructive' });
    }
  }

  async function handleFailover() {
    if (!foWsId || !foRegion) return;
    if (!confirm(`CRITICAL: Failover ${foWsId} to ${foRegion}?\n\nThis stops services, restores from latest snapshot, and redirects traffic.`)) return;
    const r = await triggerFailover({ workspaceId: foWsId, targetRegion: foRegion, reason: 'Manual admin trigger' });
    if (r.success) {
      toast({ title: 'Failover initiated' });
      refreshSnapshots(); refreshHealth();
    } else {
      toast({ title: 'Failed', description: r.error, variant: 'destructive' });
    }
  }

  async function handleEnforceRetention() {
    const keep = parseInt(retKeep, 10);
    if (!retWsId || isNaN(keep) || keep < 1) return;
    const wsSnaps = snapshots
      .filter(s => s.workspaceId === retWsId && s.status === 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const toDelete = wsSnaps.slice(keep);
    if (toDelete.length === 0) {
      toast({ title: 'Nothing to delete', description: `Workspace already within limit of ${keep}.` });
      return;
    }
    if (!confirm(`Delete ${toDelete.length} oldest snapshots for workspace "${retWsId}"?`)) return;
    setEnforcing(true);
    let deleted = 0;
    for (const s of toDelete) {
      const r = await deleteSnapshot(s.id);
      if (r.success) deleted++;
    }
    setEnforcing(false);
    toast({ title: 'Retention enforced', description: `Deleted ${deleted} of ${toDelete.length} snapshots.` });
    refreshSnapshots();
  }

  async function handleExport() {
    if (!expWsId) return;
    setExporting(true);
    setExportResult(null);
    try {
      const res = await fetch('/api/admin/backup-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: expWsId,
          campaign_id: expCampaignId || undefined,
          tables: ['contacts', 'campaigns', 'email_events', 'sequences'],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExportResult(data);
        toast({ title: 'Export complete' });
      } else {
        toast({ title: 'Export failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Export failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }

  function handleDownload() {
    if (!exportResult) return;
    const blob = new Blob([JSON.stringify(exportResult.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${exportResult.workspace_id}${exportResult.campaign_id ? `_${exportResult.campaign_id}` : ''}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  const coverage = stats?.coverage ?? 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox
          label="Backup Coverage"
          value={`${coverage}%`}
          sub={`${stats?.workspacesWithRecentBackups ?? 0} of ${stats?.totalWorkspaces ?? 0} workspaces`}
          highlight={coverage >= 80 ? 'text-green-500' : coverage >= 50 ? 'text-amber-500' : 'text-red-500'}
        />
        <StatBox label="Total Snapshots" value={stats?.totalSnapshots ?? snapshots.length} />
        <StatBox label="Total Size" value={`${(stats?.totalSizeGb ?? 0).toFixed(1)} GB`} />
        <StatBox label="Est. Monthly Cost" value={`$${(stats?.estimatedMonthlyCost ?? 0).toFixed(2)}`} />
      </div>

      {/* 1 ── Database Backups ─────────────────────────────────────────── */}
      <Section title="Database Backups" collapsible defaultExpanded>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Provider</div>
              <div>Supabase (PostgreSQL)</div>
              <div className="text-muted-foreground">Automatic daily backups, no manual action needed.</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Retention</div>
              <div>7 days on Pro plan</div>
              <div className="text-muted-foreground">1 day on Free plan. PITR available on Pro.</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Scope</div>
              <div>Full database</div>
              <div className="text-muted-foreground">All workspaces, tables, and schemas.</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tables covered</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              {[
                'contacts','campaigns','email_events','sequences',
                'workspace_config','credentials','audit_logs','notifications',
              ].map(t => (
                <div key={t} className="px-3 py-1.5 rounded border border-border/40 text-xs font-mono bg-muted/20">{t}</div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">How to restore</div>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open <span className="font-mono">supabase.com/dashboard</span> and select your project</li>
              <li>Go to Settings &rarr; Database &rarr; Backups</li>
              <li>Select a restore point or use Point-in-Time Recovery</li>
              <li>Confirm — the restore takes a few minutes with read-only mode during restoration</li>
            </ol>
          </div>
        </div>
      </Section>

      {/* 2 ── Backup Age Monitor ───────────────────────────────────────── */}
      <Section
        title="Backup Age Monitor"
        badge={staleCount > 0
          ? <Badge variant="warning" className="text-[10px]">{staleCount} need attention</Badge>
          : snapshots.length > 0
            ? <Badge variant="success" className="text-[10px]">All current</Badge>
            : undefined}
        collapsible
        defaultExpanded
      >
        {workspaceRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No snapshot data yet. Create a snapshot below to start monitoring backup age per workspace.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs">
                  <th className="text-left p-2 pl-5 font-medium">Workspace</th>
                  <th className="text-left p-2 font-medium">Last backup</th>
                  <th className="text-left p-2 font-medium">Snapshots</th>
                  <th className="text-left p-2 font-medium">Size</th>
                  <th className="text-left p-2 pr-5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {workspaceRows.map(row => {
                  const cfg = BACKUP_STATUS_CFG[row.status];
                  return (
                    <tr key={row.workspaceId} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2 pl-5 font-mono text-xs">{row.workspaceId}</td>
                      <td className="p-2 text-xs text-muted-foreground">{ageOf(row.lastBackupAt)}</td>
                      <td className="p-2 text-xs">{row.snapshotCount}</td>
                      <td className="p-2 text-xs">{row.totalSizeGb.toFixed(2)} GB</td>
                      <td className="p-2 pr-5">
                        <Badge variant={cfg.badge} className="text-[10px]">{cfg.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 3 ── Storage Breakdown ────────────────────────────────────────── */}
      {workspaceRows.length > 0 && (
        <Section title="Storage Breakdown" collapsible defaultExpanded={false}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Snapshot storage consumed per workspace, sorted by size descending.</p>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-xs">
                    <th className="text-left p-2 pl-5 font-medium">Workspace</th>
                    <th className="text-left p-2 font-medium">Snapshots</th>
                    <th className="text-left p-2 font-medium">Total size</th>
                    <th className="text-left p-2 pr-5 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaceRows.map(row => {
                    const total = workspaceRows.reduce((s, r) => s + r.totalSizeGb, 0);
                    const pct = total > 0 ? ((row.totalSizeGb / total) * 100).toFixed(1) : '0';
                    return (
                      <tr key={row.workspaceId} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="p-2 pl-5 font-mono text-xs">{row.workspaceId}</td>
                        <td className="p-2 text-xs">{row.snapshotCount}</td>
                        <td className="p-2 text-xs font-medium">{row.totalSizeGb.toFixed(2)} GB</td>
                        <td className="p-2 pr-5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[80px]">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-border text-xs font-semibold">
                    <td className="p-2 pl-5">Total</td>
                    <td className="p-2">{workspaceRows.reduce((s, r) => s + r.snapshotCount, 0)}</td>
                    <td className="p-2">{workspaceRows.reduce((s, r) => s + r.totalSizeGb, 0).toFixed(2)} GB</td>
                    <td className="p-2 pr-5 text-muted-foreground">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      {/* 4 ── Infrastructure Snapshots ─────────────────────────────────── */}
      <Section
        title="Infrastructure Snapshots"
        badge={<Badge variant="secondary" className="text-[10px]">{snapshots.length}</Badge>}
        collapsible
        defaultExpanded
      >
        <div className="space-y-5">
          {/* Regional health */}
          {regionalHealth.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Region Status</div>
              <div className="flex flex-wrap gap-2">
                {regionalHealth.map(r => {
                  const cfg = REGION_STATUS_CFG[r.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={r.region} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 text-xs">
                      <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                      <span className="font-mono uppercase">{r.region}</span>
                      {r.latencyMs && <span className="text-muted-foreground">{r.latencyMs}ms</span>}
                      <Badge variant={cfg.badge} className="text-[10px] px-1.5 py-0">{r.status}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create snapshot */}
          <div className="p-4 rounded-lg border border-border/60 space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Create Manual Snapshot</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Workspace ID" value={snapWsId} onChange={e => setSnapWsId(e.target.value)} className="text-sm" />
              <Input placeholder="Droplet ID" value={snapDropletId} onChange={e => setSnapDropletId(e.target.value)} className="text-sm" />
            </div>
            <Button size="sm" onClick={handleCreateSnapshot} disabled={creating || !snapWsId || !snapDropletId}>
              {creating
                ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <HardDrive className="h-3.5 w-3.5 mr-1.5" />
              }
              Create Snapshot
            </Button>
          </div>

          {/* Snapshot table */}
          {snapshots.length > 0 ? (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-xs">
                    <th className="text-left p-2 pl-5 font-medium">Workspace</th>
                    <th className="text-left p-2 font-medium">Region</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Age</th>
                    <th className="text-left p-2 font-medium">Size</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-right p-2 pr-5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2 pl-5 font-mono text-xs">{s.workspaceId}</td>
                      <td className="p-2 text-xs uppercase">{s.region}</td>
                      <td className="p-2">
                        <Badge variant={s.type === 'daily' ? 'default' : 'secondary'} className="text-[10px]">{s.type}</Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{ageOf(s.createdAt)}</td>
                      <td className="p-2 text-xs">{s.sizeGb.toFixed(2)} GB</td>
                      <td className="p-2">
                        <Badge
                          variant={s.status === 'completed' ? 'success' : s.status === 'failed' ? 'danger' : 'default'}
                          className="text-[10px]"
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="p-2 pr-5 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {s.status === 'completed' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={restoring} onClick={() => handleRestore(s.id)}>
                              <RotateCcw className="h-3 w-3" /> Restore
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7" disabled={deleting} onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No snapshots yet. Create one above to start backing up infrastructure.
            </div>
          )}
        </div>
      </Section>

      {/* 5 ── Retention Policy ─────────────────────────────────────────── */}
      <Section title="Retention Policy" collapsible defaultExpanded={false}>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Set a maximum number of snapshots to keep per workspace. Running enforcement
            deletes the oldest completed snapshots beyond the limit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Workspace ID</label>
              <Input placeholder="e.g. ohio" value={retWsId} onChange={e => setRetWsId(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Keep latest N snapshots</label>
              <Input
                type="number" min={1} max={30} placeholder="7"
                value={retKeep} onChange={e => setRetKeep(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button size="sm" onClick={handleEnforceRetention} disabled={enforcing || !retWsId || !retKeep}>
              {enforcing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Enforce Retention
            </Button>
          </div>
          {retWsId && (
            <div className="text-xs text-muted-foreground">
              {(() => {
                const count = snapshots.filter(s => s.workspaceId === retWsId && s.status === 'completed').length;
                const keep = parseInt(retKeep, 10) || 7;
                const toDelete = Math.max(0, count - keep);
                return count > 0
                  ? `Workspace "${retWsId}" has ${count} completed snapshot${count !== 1 ? 's' : ''}. Enforcement will delete ${toDelete} oldest.`
                  : `No snapshots found for workspace "${retWsId}".`;
              })()}
            </div>
          )}
        </div>
      </Section>

      {/* 6 ── Data Export ──────────────────────────────────────────────── */}
      <Section title="Data Export" collapsible defaultExpanded={false}>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Export workspace data as JSON — contacts, campaigns, email events, and sequences.
            Optionally scope to a single campaign.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Workspace ID <span className="text-red-500">*</span>
              </label>
              <Input placeholder="e.g. ohio" value={expWsId} onChange={e => setExpWsId(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Campaign ID <span className="text-muted-foreground/50">(optional)</span></label>
              <Input placeholder="Leave blank for all campaigns" value={expCampaignId} onChange={e => setExpCampaignId(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground">
            <span>Exports:</span>
            {['contacts', 'campaigns', 'email_events', 'sequences'].map(t => (
              <Badge key={t} variant="secondary" className="text-[10px] font-mono">{t}</Badge>
            ))}
          </div>
          <Button size="sm" onClick={handleExport} disabled={exporting || !expWsId}>
            {exporting
              ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <FileJson className="h-3.5 w-3.5 mr-1.5" />
            }
            {exporting ? 'Exporting...' : 'Export as JSON'}
          </Button>

          {exportResult && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Export ready</span>
                <span className="text-xs text-muted-foreground">{new Date(exportResult.exported_at).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(exportResult.tables).map(([t, m]) => (
                  <div key={t} className="p-2 rounded border border-border/40 text-center">
                    <div className="text-xs font-mono text-muted-foreground">{t}</div>
                    <div className="text-lg font-bold">{m.count}</div>
                    {m.truncated && <div className="text-[10px] text-amber-500">truncated</div>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download JSON
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => {
                  try { navigator.clipboard.writeText(JSON.stringify(exportResult.data, null, 2)); } catch { /* */ }
                }}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* 7 ── Emergency Failover ───────────────────────────────────────── */}
      <Section title="Emergency Failover" collapsible defaultExpanded={false}>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Use only during regional outages. Stops services in the current region, restores
            from the latest snapshot, and redirects traffic to the target region.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Workspace ID" value={foWsId} onChange={e => setFoWsId(e.target.value)} className="text-sm" />
            <Input placeholder="Target Region (e.g. sfo3)" value={foRegion} onChange={e => setFoRegion(e.target.value)} className="text-sm" />
          </div>
          <Button variant="danger" size="sm" onClick={handleFailover} disabled={failingOver || !foWsId || !foRegion}>
            {failingOver && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Trigger Regional Failover
          </Button>
        </div>
      </Section>

    </div>
  );
}
