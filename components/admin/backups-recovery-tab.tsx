/**
 * Backups & Recovery Tab — Redesigned
 *
 * Three sections:
 *   1. Database Backups   — Supabase backup status + Point-in-Time Recovery info
 *   2. Infra Snapshots    — DigitalOcean droplet snapshots (per workspace)
 *   3. Data Export         — On-demand JSON export per workspace / per campaign
 *
 * Replaces the old "Disaster Recovery" tab with a clearer, more actionable design.
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
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
  Database, HardDrive, Download, RefreshCw, Trash2,
  CheckCircle2, AlertTriangle, XCircle, Clock, Globe,
  ChevronDown, ChevronUp, RotateCcw, Shield, Server,
  FileJson, Copy, Activity, Archive, Layers,
  DollarSign, Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RegionData {
  region: string;
  status: 'healthy' | 'degraded' | 'outage';
  lastHeartbeatAt: string;
  latencyMs?: number;
  errorMessage?: string;
}

interface ExportMeta {
  count: number;
  truncated: boolean;
}

interface ExportResponse {
  success: boolean;
  workspace_id: string;
  campaign_id: string | null;
  exported_at: string;
  tables: Record<string, ExportMeta>;
  data: Record<string, unknown[]>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKUP_SECTIONS = [
  {
    icon: Database,
    title: 'Database (Supabase)',
    description: 'All tables — leads, campaigns, email events, credentials, workspace config.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    details: 'Supabase handles this automatically. Daily backups on Free/Pro; Point-in-Time Recovery (PITR) on Pro with 7-day retention.',
  },
  {
    icon: Server,
    title: 'Infrastructure (n8n Droplets)',
    description: 'DigitalOcean VM snapshots for sidecar/n8n instances across regions.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    details: 'Snapshots capture the full droplet state — n8n data, credentials, workflow files. Created manually or via automated schedule.',
  },
  {
    icon: Download,
    title: 'Data Export',
    description: 'On-demand JSON export of leads, campaigns, and email history per workspace.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    details: 'Export workspace data for offline backup, migration, or compliance. Can scope to a specific campaign.',
  },
] as const;

const STATUS_CFG = {
  healthy:  { icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-500/10',  badge: 'success'  as const },
  degraded: { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-500/10',  badge: 'warning'  as const },
  outage:   { icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-500/10',    badge: 'danger'   as const },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(dateStr: string): string {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); } catch { return 'Unknown'; }
}

function copyToClipboard(text: string) {
  try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, color, children }: {
  title: string;
  icon: typeof Database;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60 bg-muted/20">
        <Icon className={cn('h-4.5 w-4.5', color)} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color, sub }: {
  label: string;
  value: string | number;
  icon: typeof Database;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-border/60 space-y-1">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn('text-xl font-bold', color)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RegionPill({ region }: { region: RegionData }) {
  const cfg = STATUS_CFG[region.status];
  const Icon = cfg.icon;
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60',
      region.status === 'outage' ? 'bg-red-500/5 border-red-500/30' : '',
    )}>
      <Icon className={cn('h-3.5 w-3.5 shrink-0', cfg.color)} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide">{region.region}</div>
        <div className="text-[10px] text-muted-foreground">
          {region.latencyMs ? `${region.latencyMs}ms` : '—'} · {formatAge(region.lastHeartbeatAt)}
        </div>
      </div>
      <Badge variant={cfg.badge} className="text-[10px] px-1.5 py-0">{region.status}</Badge>
    </div>
  );
}

function EmptyBackupGuide() {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Shield className="h-6 w-6 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold">Backups & Recovery</h3>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Your data is protected at multiple levels. Here's what each backup layer covers
          and how to restore when needed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {BACKUP_SECTIONS.map((s) => {
          const SIcon = s.icon;
          return (
            <div key={s.title} className="p-4 rounded-lg border border-border/60 bg-surface-elevated/30 space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn('p-1.5 rounded-md', s.bg)}>
                  <SIcon className={cn('h-4 w-4', s.color)} />
                </div>
                <span className="text-sm font-medium">{s.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
              <p className="text-[11px] text-muted-foreground/70 italic">{s.details}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BackupsRecoveryTab() {
  const { snapshots, isLoading: snapshotsLoading, refresh: refreshSnapshots } = useDisasterRecoverySnapshots();
  const { regionalHealth, isLoading: healthLoading, refresh: refreshHealth } = useRegionalHealth({ refreshInterval: 30000 });
  const { stats } = useDisasterRecoveryStats();
  const { createSnapshot, isLoading: creating } = useCreateSnapshot();
  const { deleteSnapshot, isLoading: deleting } = useDeleteSnapshot();
  const { triggerFailover, isLoading: failingOver } = useTriggerFailover();
  const { restoreSnapshot, isLoading: restoring } = useRestoreSnapshot();
  const { toast } = useToast();

  // Form state
  const [snapshotWorkspaceId, setSnapshotWorkspaceId] = useState('');
  const [snapshotDropletId, setSnapshotDropletId] = useState('');
  const [failoverWorkspaceId, setFailoverWorkspaceId] = useState('');
  const [failoverRegion, setFailoverRegion] = useState('');

  // Export state
  const [exportWorkspaceId, setExportWorkspaceId] = useState('');
  const [exportCampaignId, setExportCampaignId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);

  // Collapsibles
  const [dbExpanded, setDbExpanded] = useState(true);
  const [infraExpanded, setInfraExpanded] = useState(true);
  const [exportExpanded, setExportExpanded] = useState(true);
  const [failoverExpanded, setFailoverExpanded] = useState(false);

  const isLoading = snapshotsLoading || healthLoading;

  // ─── Derived stats ───────────────────────────────────────────────────

  const coverage = stats?.coverage ?? 0;
  const totalSnapshots = stats?.totalSnapshots ?? snapshots.length;

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleCreateSnapshot = async () => {
    if (!snapshotWorkspaceId || !snapshotDropletId) return;
    const result = await createSnapshot({ workspaceId: snapshotWorkspaceId, dropletId: snapshotDropletId, type: 'full' });
    if (result.success) {
      toast({ title: 'Snapshot created', description: `Workspace ${snapshotWorkspaceId} backed up.` });
      refreshSnapshots();
      setSnapshotWorkspaceId('');
      setSnapshotDropletId('');
    } else {
      toast({ title: 'Snapshot failed', description: result.error || 'Unknown error', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return;
    const result = await deleteSnapshot(id);
    if (result.success) { toast({ title: 'Deleted' }); refreshSnapshots(); }
    else { toast({ title: 'Failed', description: result.error || 'Unknown error', variant: 'destructive' }); }
  };

  const handleRestore = async (id: string) => {
    const region = prompt('Target region for restore (e.g. nyc3, sfo3):');
    if (!region?.trim()) return;
    if (!confirm(`Restore snapshot to ${region}?`)) return;
    const result = await restoreSnapshot({ snapshotId: id, targetRegion: region.trim() });
    if (result.success) { toast({ title: 'Restoring', description: `Restoring to ${region}…` }); refreshSnapshots(); }
    else { toast({ title: 'Failed', description: result.error || 'Unknown error', variant: 'destructive' }); }
  };

  const handleFailover = async () => {
    if (!failoverWorkspaceId || !failoverRegion) return;
    if (!confirm(`⚠️ CRITICAL: Failover ${failoverWorkspaceId} to ${failoverRegion}?\n\nThis will stop services, restore from latest snapshot, and redirect traffic.`)) return;
    const result = await triggerFailover({ workspaceId: failoverWorkspaceId, targetRegion: failoverRegion, reason: 'Manual admin trigger' });
    if (result.success) {
      toast({ title: 'Failover initiated', description: `Moving to ${failoverRegion}…` });
      refreshSnapshots(); refreshHealth();
    } else {
      toast({ title: 'Failed', description: result.error || 'Unknown error', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    if (!exportWorkspaceId) return;
    setExporting(true);
    setExportResult(null);
    try {
      const res = await fetch('/api/admin/backup-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: exportWorkspaceId,
          campaign_id: exportCampaignId || undefined,
          tables: ['contacts', 'campaigns', 'email_events', 'sequences'],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExportResult(data);
        toast({ title: 'Export complete', description: `Exported data for workspace ${exportWorkspaceId}` });
      } else {
        toast({ title: 'Export failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Export failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadJson = () => {
    if (!exportResult) return;
    const blob = new Blob([JSON.stringify(exportResult.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${exportResult.workspace_id}${exportResult.campaign_id ? `_${exportResult.campaign_id}` : ''}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Loading ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Backups & Recovery</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refreshSnapshots(); refreshHealth(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh All
        </Button>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox
          label="Backup Coverage"
          value={`${coverage}%`}
          icon={Shield}
          color={coverage >= 80 ? 'text-green-500' : coverage >= 50 ? 'text-amber-500' : 'text-red-500'}
          sub={`${stats?.workspacesWithRecentBackups ?? 0} of ${stats?.totalWorkspaces ?? 0} workspaces`}
        />
        <StatBox label="Total Snapshots" value={totalSnapshots} icon={Layers} />
        <StatBox
          label="Total Size"
          value={`${(stats?.totalSizeGb ?? 0).toFixed(1)} GB`}
          icon={HardDrive}
        />
        <StatBox
          label="Est. Monthly Cost"
          value={`$${(stats?.estimatedMonthlyCost ?? 0).toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      {/* Empty guide when nothing exists */}
      {snapshots.length === 0 && regionalHealth.length === 0 && <EmptyBackupGuide />}

      {/* ═══ SECTION 1: Database Backups ═══ */}
      <SectionCard title="Database Backups (Supabase)" icon={Database} color="text-emerald-500">
        <button onClick={() => setDbExpanded(!dbExpanded)} className="flex items-center gap-2 w-full text-left mb-3 group">
          <span className="text-sm font-medium">Supabase Backup Status</span>
          {dbExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {dbExpanded && (
          <div className="space-y-4">
            {/* Info card */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-emerald-400">Automatic Daily Backups Active</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Supabase automatically backs up your entire database daily. This includes all
                  tables — leads/contacts, campaigns, email events, workspace configurations, encrypted
                  credentials, and sequences. No manual action needed.
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Retention: </span>
                    <span className="font-medium">7 days (Pro) / 1 day (Free)</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">PITR: </span>
                    <span className="font-medium">Available on Pro plan</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Scope: </span>
                    <span className="font-medium">Full database (all workspaces)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* What's covered */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">What's included</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Leads & Contacts', icon: '👤' },
                  { label: 'Campaigns', icon: '📧' },
                  { label: 'Email Events', icon: '📬' },
                  { label: 'Sequences', icon: '🔄' },
                  { label: 'Workspace Config', icon: '⚙️' },
                  { label: 'Encrypted Credentials', icon: '🔐' },
                  { label: 'Audit Logs', icon: '📋' },
                  { label: 'Notifications', icon: '🔔' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-muted/20">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to restore */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-xs font-semibold mb-1">How to restore</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <span className="font-mono text-amber-500">supabase.com/dashboard</span> → your project → Settings → Database</li>
                <li>Click <strong>Backups</strong> or <strong>Point in Time Recovery</strong></li>
                <li>Select the restore point → Confirm restore</li>
                <li>The database will be restored (takes a few minutes)</li>
              </ol>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ═══ SECTION 2: Infrastructure Snapshots ═══ */}
      <SectionCard title="Infrastructure Snapshots (DigitalOcean)" icon={Server} color="text-blue-500">
        <button onClick={() => setInfraExpanded(!infraExpanded)} className="flex items-center gap-2 w-full text-left mb-3 group">
          <span className="text-sm font-medium">Regional Health & Snapshots</span>
          <Badge variant="secondary" className="text-[10px]">{snapshots.length} snapshots</Badge>
          {infraExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {infraExpanded && (
          <div className="space-y-5">
            {/* Regional health grid */}
            {regionalHealth.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Region Status</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {regionalHealth.map((r) => (
                    <RegionPill key={r.region} region={r} />
                  ))}
                </div>
              </div>
            )}

            {/* Create snapshot form */}
            <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Create Manual Snapshot</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Workspace ID"
                  value={snapshotWorkspaceId}
                  onChange={(e) => setSnapshotWorkspaceId(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Droplet ID"
                  value={snapshotDropletId}
                  onChange={(e) => setSnapshotDropletId(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={handleCreateSnapshot}
                disabled={creating || !snapshotWorkspaceId || !snapshotDropletId}
              >
                {creating ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5 mr-1.5" />}
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
                    {snapshots.map((s) => (
                      <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="p-2 pl-5 font-mono text-xs">{s.workspaceId}</td>
                        <td className="p-2 text-xs uppercase">{s.region}</td>
                        <td className="p-2"><Badge variant={s.type === 'daily' ? 'default' : 'secondary'} className="text-[10px]">{s.type}</Badge></td>
                        <td className="p-2 text-xs text-muted-foreground">{formatAge(s.createdAt)}</td>
                        <td className="p-2 text-xs">{s.sizeGb.toFixed(2)} GB</td>
                        <td className="p-2">
                          <Badge variant={s.status === 'completed' ? 'success' : s.status === 'failed' ? 'danger' : 'default'} className="text-[10px]">
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
              <div className="py-6 text-center">
                <Archive className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No snapshots yet.</p>
                <p className="text-xs text-muted-foreground/70">Create your first snapshot above to back up a workspace.</p>
              </div>
            )}

            {/* Emergency failover — collapsible */}
            <div className="rounded-lg border border-red-500/20 overflow-hidden">
              <button
                onClick={() => setFailoverExpanded(!failoverExpanded)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left bg-red-500/5 hover:bg-red-500/10 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-400">Emergency Regional Failover</span>
                {failoverExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
              </button>
              {failoverExpanded && (
                <div className="p-4 space-y-3 bg-red-500/5">
                  <p className="text-xs text-muted-foreground">
                    Use only during regional disasters. This stops services, restores from the latest snapshot, and redirects traffic.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Workspace ID"
                      value={failoverWorkspaceId}
                      onChange={(e) => setFailoverWorkspaceId(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Target Region (e.g. sfo3)"
                      value={failoverRegion}
                      onChange={(e) => setFailoverRegion(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleFailover}
                    disabled={failingOver || !failoverWorkspaceId || !failoverRegion}
                  >
                    {failingOver && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Trigger Failover
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ═══ SECTION 3: Data Export ═══ */}
      <SectionCard title="Data Export" icon={Download} color="text-purple-500">
        <button onClick={() => setExportExpanded(!exportExpanded)} className="flex items-center gap-2 w-full text-left mb-3 group">
          <span className="text-sm font-medium">Export Workspace Data</span>
          {exportExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {exportExpanded && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Export your data as JSON for offline backup, migration, or compliance.
              Scope to a workspace or narrow down to a specific campaign.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Workspace ID <span className="text-red-500">*</span></label>
                <Input
                  placeholder="e.g. ohio, acme-corp"
                  value={exportWorkspaceId}
                  onChange={(e) => setExportWorkspaceId(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Campaign ID <span className="text-muted-foreground/50">(optional)</span></label>
                <Input
                  placeholder="Leave blank for all campaigns"
                  value={exportCampaignId}
                  onChange={(e) => setExportCampaignId(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Tables exported:</span>
              {['contacts', 'campaigns', 'email_events', 'sequences'].map(t => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>

            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting || !exportWorkspaceId}
            >
              {exporting ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5 mr-1.5" />}
              {exporting ? 'Exporting…' : 'Export as JSON'}
            </Button>

            {/* Export result */}
            {exportResult && (
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Export Ready</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(exportResult.exported_at).toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(exportResult.tables).map(([table, meta]) => (
                    <div key={table} className="p-2 rounded border border-border/40 text-center">
                      <div className="text-xs font-mono">{table}</div>
                      <div className="text-lg font-bold">{meta.count}</div>
                      {meta.truncated && <span className="text-[10px] text-amber-500">truncated</span>}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleDownloadJson} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      copyToClipboard(JSON.stringify(exportResult.data, null, 2));
                      toast({ title: 'Copied to clipboard' });
                    }}
                    className="gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
