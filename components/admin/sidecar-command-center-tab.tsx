/**
 * ADMIN PANELS EXPANSION: Sidecar Command Center Tab
 *
 * The operational nerve center for all sidecar agents across the fleet.
 * 
 * Features:
 *   - Fleet Health Grid — real-time status of every sidecar (healthy/degraded/zombie/offline)
 *   - Per-Sidecar Drill-Down — CPU/memory gauges, n8n status, workflows, container info
 *   - Command Console — Send commands (RESTART_N8N, COLLECT_METRICS, GET_LOGS, etc.)
 *   - Heartbeat Timeline — Visual trail of agent state changes
 *
 * Design language: Matches existing admin tabs — bordered cards, amber-500 accents,
 * Badge variants (success/warning/danger), responsive grid, Skeleton loading.
 *
 * Ralph Loop: Research ✅ (SidecarClient, fleet_status, heartbeat-types) →
 * Analyze ✅ (100% backend ready) → Log ✅ → Plan ✅ → Execute ✅
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useSidecarFleet,
  sendSidecarCommand,
} from '@/hooks/use-sidecar-fleet';
import type { SidecarAgent, FleetSummary, SidecarCommand } from '@/hooks/use-sidecar-fleet';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  Clock,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Play,
  RotateCcw,
  FileText,
  Key,
  Upload,
  Heart,
  BarChart3,
  Globe,
  Zap,
  ArrowLeft,
  MemoryStick,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ============================================
// CREDENTIAL ROTATION SCHEMA
// ============================================

interface WorkspaceCredential {
  id: string;
  credential_type: string;
  credential_name: string;
  n8n_credential_id: string | null;
  status: string;
  last_synced_at: string | null;
}

// Workspace per-credential health result
interface CredentialHealthResult {
  credential_id?: string;
  credential_type: string;
  service_name: string;
  status: 'ok' | 'degraded' | 'error' | 'unchecked';
  error_message?: string;
  latency_ms?: number;
}
interface WorkspaceHealthReport {
  workspace_id: string;
  overall_status: 'ok' | 'degraded' | 'error';
  credentials: CredentialHealthResult[];
  checked_at: string;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number';
}

const CREDENTIAL_FIELDS: Record<string, FieldDef[]> = {
  openai_api: [
    { key: 'apiKey', label: 'API Key', type: 'password' },
  ],
  anthropic_api: [
    { key: 'apiKey', label: 'API Key', type: 'password' },
  ],
  http_header_auth: [
    { key: 'name',  label: 'Header Name',        type: 'text' },
    { key: 'value', label: 'Header Value / Token', type: 'password' },
  ],
  http_query_auth: [
    { key: 'name',  label: 'Query Param Name',  type: 'text' },
    { key: 'value', label: 'Query Param Value', type: 'password' },
  ],
  smtp: [
    { key: 'host',     label: 'SMTP Host',               type: 'text' },
    { key: 'port',     label: 'Port',                    type: 'number' },
    { key: 'user',     label: 'Username / Email',        type: 'text' },
    { key: 'password', label: 'Password / App Password', type: 'password' },
  ],
  postgres: [
    { key: 'host',     label: 'Host',     type: 'text' },
    { key: 'database', label: 'Database', type: 'text' },
    { key: 'user',     label: 'User',     type: 'text' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'port',     label: 'Port',     type: 'number' },
  ],
};

// Types that require OAuth re-auth — cannot be manually rotated via form
const NON_ROTATABLE = new Set(['google_oauth2', 'google_sheets', 'supabase']);

// ============================================
// ROTATE CREDENTIAL MODAL
// ============================================

function RotateCredentialModal({
  open,
  onOpenChange,
  agent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent: SidecarAgent;
}) {
  const { toast } = useToast();
  const [credentials, setCredentials]   = useState<WorkspaceCredential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [selectedCred, setSelectedCred] = useState<WorkspaceCredential | null>(null);
  const [fieldValues, setFieldValues]   = useState<Record<string, string>>({});
  const [rotating, setRotating]         = useState(false);

  // Fetch credential list when modal opens
  useEffect(() => {
    if (!open) {
      setSelectedCred(null);
      setFieldValues({});
      setCredentials([]);
      return;
    }
    setLoadingCreds(true);
    fetch(`/api/admin/workspace-credentials?workspace_id=${agent.workspace_id}`)
      .then(r => r.json())
      .then(d => setCredentials(d.credentials || []))
      .catch(() => setCredentials([]))
      .finally(() => setLoadingCreds(false));
  }, [open, agent.workspace_id]);

  const fields         = selectedCred ? (CREDENTIAL_FIELDS[selectedCred.credential_type] ?? null) : null;
  const isNonRotatable = selectedCred ? NON_ROTATABLE.has(selectedCred.credential_type) : false;
  const canSubmit      = !!(fields && fields.every(f => fieldValues[f.key]?.trim()));

  const handleSelect = (cred: WorkspaceCredential) => {
    setSelectedCred(cred);
    // Pre-populate number fields with sensible defaults
    const schema = CREDENTIAL_FIELDS[cred.credential_type];
    if (schema) {
      const defaults: Record<string, string> = {};
      schema.forEach(f => { if (f.type === 'number') defaults[f.key] = f.key === 'port' ? '587' : ''; });
      setFieldValues(defaults);
    }
  };

  const handleRotate = async () => {
    if (!selectedCred || !canSubmit) return;
    setRotating(true);
    try {
      const res = await fetch('/api/admin/rotate-credential', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id:     agent.workspace_id,
          db_credential_id: selectedCred.id,
          new_data:         fieldValues,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Credential rotated',
          description: data.sidecar_updated
            ? `"${selectedCred.credential_name}" updated in DB and live in n8n.`
            : data.note || `"${selectedCred.credential_name}" updated in DB.`,
        });
        onOpenChange(false);
      } else {
        toast({
          title:       'Rotation failed',
          description: data.error || 'Unknown error',
          variant:     'destructive',
        });
      }
    } catch {
      toast({ title: 'Rotation failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setRotating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-500" />
            Rotate Credential
          </DialogTitle>
          <DialogDescription>
            {selectedCred
              ? `Update "${selectedCred.credential_name}" for ${agent.workspace_name}`
              : `Select a credential to rotate for ${agent.workspace_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 min-h-[200px]">
          {!selectedCred ? (
            /* ── Step 1: Credential picker ── */
            loadingCreds ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : credentials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No credentials found for this workspace.
              </p>
            ) : (
              <div className="space-y-2">
                {credentials.map(cred => (
                  <button
                    key={cred.id}
                    onClick={() => handleSelect(cred)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border border-border text-left transition-all',
                      'hover:bg-amber-500/5 hover:border-amber-500/30 focus:ring-2 focus:ring-amber-500/50 focus:outline-none',
                      NON_ROTATABLE.has(cred.credential_type) && 'opacity-60'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cred.credential_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{cred.credential_type}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {cred.n8n_credential_id ? (
                        <span className="text-[10px] text-green-500">live in n8n</span>
                      ) : (
                        <span className="text-[10px] text-yellow-500">not synced</span>
                      )}
                      <Badge
                        variant={cred.status === 'synced' ? 'success' : 'warning'}
                        className="text-[10px]"
                      >
                        {cred.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : isNonRotatable ? (
            /* ── OAuth / non-rotatable type ── */
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Manual rotation not supported</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>{selectedCred.credential_type}</strong> uses OAuth 2.0 and cannot be
                rotated by entering field values. Re-authenticate via the user&apos;s account settings
                or re-provision the workspace.
              </p>
            </div>
          ) : (
            /* ── Step 2: Field form ── */
            <div className="space-y-3">
              {(fields ?? []).map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </label>
                  <Input
                    type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                    placeholder={field.type === 'password' ? '••••••••' : field.label}
                    value={fieldValues[field.key] ?? ''}
                    onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
              {!selectedCred.n8n_credential_id && (
                <p className="text-[11px] text-yellow-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  No n8n credential ID on this row — DB will be updated but the sidecar
                  won&apos;t be patched until re-provisioning.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {selectedCred && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedCred(null); setFieldValues({}); }}
              disabled={rotating}
            >
              ← Back
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={rotating}>
            Cancel
          </Button>
          {selectedCred && !isNonRotatable && (
            <Button
              size="sm"
              disabled={!canSubmit || rotating}
              onClick={handleRotate}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {rotating ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Rotating…</>
              ) : (
                'Rotate Credential'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// CONSTANTS
// ============================================

const STATE_CONFIG: Record<string, {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'secondary';
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
}> = {
  ACTIVE_HEALTHY: {
    label: 'Healthy',
    variant: 'success',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
  active: {
    label: 'Healthy',
    variant: 'success',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
  ACTIVE_DEGRADED: {
    label: 'Degraded',
    variant: 'warning',
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
  },
  ZOMBIE: {
    label: 'Zombie',
    variant: 'danger',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/20',
  },
  INITIALIZING: {
    label: 'Initializing',
    variant: 'secondary',
    icon: Loader2,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30 border-border',
  },
};

const COMMANDS: Array<{
  id: SidecarCommand;
  label: string;
  description: string;
  icon: typeof Play;
  variant: 'default' | 'outline' | 'destructive';
}> = [
  { id: 'HEALTH_CHECK', label: 'Health Check', description: 'Verify sidecar + n8n status', icon: Heart, variant: 'outline' },
  { id: 'COLLECT_METRICS', label: 'Collect Metrics', description: 'Pull CPU, memory, disk usage', icon: BarChart3, variant: 'outline' },
  { id: 'GET_LOGS', label: 'Get Logs', description: 'Retrieve recent sidecar logs', icon: FileText, variant: 'outline' },
  { id: 'RESTART_N8N', label: 'Restart n8n', description: 'Restart the n8n container', icon: RotateCcw, variant: 'outline' },
  { id: 'ROTATE_CREDENTIAL', label: 'Rotate Credentials', description: 'Re-inject operator credentials', icon: Key, variant: 'outline' },
  { id: 'DEPLOY_WORKFLOW', label: 'Deploy Workflows', description: 'Re-deploy all workflow templates', icon: Upload, variant: 'outline' },
  { id: 'UPDATE_SIDECAR', label: 'Update Sidecar', description: 'Pull latest sidecar image', icon: Zap, variant: 'outline' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStateConfig(state: string) {
  return STATE_CONFIG[state] || {
    label: state || 'Unknown',
    variant: 'secondary' as const,
    icon: WifiOff,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30 border-border',
  };
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

// ============================================
// GAUGE BAR (used for CPU, Memory, Disk)
// ============================================

function GaugeBar({ label, value, max, unit, icon: Icon }: {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: typeof Cpu;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
  const textColor = pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className={cn('font-semibold tabular-nums', textColor)}>
          {unit === '%' ? `${Math.round(pct)}%` : `${value} / ${max} ${unit}`}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// FLEET SUMMARY HEADER
// ============================================

function FleetSummaryHeader({ summary, onRefresh, isRefreshing }: {
  summary: FleetSummary;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold">Sidecar Command Center</h2>
            <p className="text-xs text-muted-foreground">
              Real-time fleet health monitoring &amp; remote command execution
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2 w-full sm:w-auto"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh Fleet
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Agents', value: summary.total, color: 'text-foreground', border: 'border-border' },
          { label: 'Healthy', value: summary.healthy, color: 'text-green-500', border: 'border-green-500/20 bg-green-500/5' },
          { label: 'Degraded', value: summary.degraded, color: 'text-yellow-500', border: 'border-yellow-500/20 bg-yellow-500/5' },
          { label: 'Zombie', value: summary.zombie, color: 'text-red-500', border: 'border-red-500/20 bg-red-500/5' },
          { label: 'Avg CPU', value: `${summary.avgCpu}%`, color: summary.avgCpu > 80 ? 'text-red-500' : 'text-muted-foreground', border: 'border-border' },
          { label: 'Avg Memory', value: formatMemory(summary.avgMemory), color: 'text-muted-foreground', border: 'border-border' },
        ].map((item) => (
          <div key={item.label} className={cn('border rounded-lg p-3 text-center', item.border)}>
            <p className={cn('text-xl font-bold tabular-nums', item.color)}>{item.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// AGENT CARD (Fleet Grid)
// ============================================

function AgentCard({ agent, onClick }: { agent: SidecarAgent; onClick: () => void }) {
  const config = getStateConfig(agent.state);
  const StatusIcon = config.icon;
  const heartbeatAge = agent.last_heartbeat_at
    ? formatDistanceToNow(new Date(agent.last_heartbeat_at), { addSuffix: true })
    : 'Never';

  const memPct = agent.memory_total_mb > 0
    ? Math.round((agent.memory_usage_mb / agent.memory_total_mb) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'border rounded-lg p-4 transition-all text-left w-full hover:shadow-md',
        'hover:ring-1 hover:ring-amber-500/30 focus:ring-2 focus:ring-amber-500/50 focus:outline-none',
        config.bgColor
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{agent.workspace_name}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{agent.ip_address}</p>
        </div>
        <Badge variant={config.variant} className="gap-1 text-[10px] shrink-0 ml-2">
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-[11px]">
        <div>
          <span className="text-muted-foreground">CPU</span>
          <p className={cn(
            'font-semibold tabular-nums',
            agent.cpu_usage_percent > 90 ? 'text-red-500' : agent.cpu_usage_percent > 70 ? 'text-yellow-500' : 'text-foreground'
          )}>
            {Math.round(agent.cpu_usage_percent)}%
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Memory</span>
          <p className={cn(
            'font-semibold tabular-nums',
            memPct > 90 ? 'text-red-500' : memPct > 70 ? 'text-yellow-500' : 'text-foreground'
          )}>
            {memPct}%
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">n8n</span>
          <p className={cn(
            'font-semibold',
            agent.n8n_status === 'running' ? 'text-green-500' : 'text-red-500'
          )}>
            {agent.n8n_status === 'running' ? 'Up' : agent.n8n_status}
          </p>
        </div>
      </div>

      {/* Heartbeat */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Wifi className="h-3 w-3" />
        <span>{heartbeatAge}</span>
        {agent.consecutive_missed > 0 && (
          <span className="text-red-500 ml-1">({agent.consecutive_missed} missed)</span>
        )}
      </div>
    </button>
  );
}

// ============================================
// AGENT DRILL-DOWN VIEW
// ============================================

function AgentDrillDown({ agent, onBack, onCommand }: {
  agent: SidecarAgent;
  onBack: () => void;
  onCommand: (cmd: SidecarCommand) => void;
}) {
  const config = getStateConfig(agent.state);
  const StatusIcon = config.icon;

  // ── Workspace credential health ──────────────────────────────────────────
  const [healthReport, setHealthReport]       = useState<WorkspaceHealthReport | null>(null);
  const [loadingHealth, setLoadingHealth]     = useState(false);
  const [runningCheck, setRunningCheck]       = useState(false);

  useEffect(() => {
    setLoadingHealth(true);
    fetch(`/api/admin/workspace-health?workspace_id=${agent.workspace_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.report) setHealthReport(d.report); })
      .catch(() => null)
      .finally(() => setLoadingHealth(false));
  }, [agent.workspace_id]);

  const runHealthCheck = async () => {
    setRunningCheck(true);
    try {
      const res = await fetch('/api/admin/workspace-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: agent.workspace_id }),
      });
      const data = await res.json();
      if (data?.report) setHealthReport(data.report);
    } catch { /* silent */ } finally {
      setRunningCheck(false);
    }
  };

  const healthStatusColor = (s: CredentialHealthResult['status']) =>
    s === 'ok'        ? 'text-green-500'
    : s === 'degraded' ? 'text-yellow-500'
    : s === 'error'    ? 'text-red-500'
    : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Back Button + Header */}
      <div className="flex items-start gap-3">
        <Button size="sm" variant="ghost" className="shrink-0 mt-0.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-semibold truncate">{agent.workspace_name}</h3>
            <Badge variant={config.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {agent.ip_address} • {agent.region.toUpperCase()} • Droplet {agent.droplet_id}
          </p>
        </div>
      </div>

      {/* Meta Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border rounded-lg p-3 space-y-0.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Uptime</div>
          <div className="text-sm font-semibold tabular-nums">{formatUptime(agent.uptime_seconds)}</div>
        </div>
        <div className="border border-border rounded-lg p-3 space-y-0.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Region</div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-amber-500" />
            {agent.region.toUpperCase()}
          </div>
        </div>
        <div className="border border-border rounded-lg p-3 space-y-0.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">n8n Version</div>
          <div className="text-sm font-semibold">{agent.n8n_version}</div>
        </div>
        <div className="border border-border rounded-lg p-3 space-y-0.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Sidecar</div>
          <div className="text-sm font-semibold">{agent.sidecar_version || '—'}</div>
        </div>
      </div>

      {/* Resource Gauges */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Resource Usage
        </h4>
        <GaugeBar
          label="CPU"
          value={agent.cpu_usage_percent}
          max={100}
          unit="%"
          icon={Cpu}
        />
        <GaugeBar
          label="Memory"
          value={agent.memory_usage_mb}
          max={agent.memory_total_mb}
          unit="MB"
          icon={MemoryStick}
        />
        <GaugeBar
          label="Disk"
          value={agent.disk_usage_percent}
          max={100}
          unit="%"
          icon={HardDrive}
        />
      </div>

      {/* n8n Status */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Zap className="h-4 w-4" />
          n8n Status
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Status</span>
            <p className={cn(
              'text-sm font-semibold',
              agent.n8n_status === 'running' ? 'text-green-500' : 'text-red-500'
            )}>
              {agent.n8n_status === 'running' ? '● Running' : `● ${agent.n8n_status}`}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Active Workflows</span>
            <p className="text-sm font-semibold">{agent.active_workflows}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Pending Execs</span>
            <p className={cn(
              'text-sm font-semibold',
              agent.pending_executions > 5 ? 'text-yellow-500' : 'text-foreground'
            )}>
              {agent.pending_executions}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Heartbeat</span>
            <p className="text-sm font-semibold flex items-center gap-1">
              <Heart className={cn('h-3.5 w-3.5', agent.consecutive_missed === 0 ? 'text-green-500' : 'text-red-500')} />
              {agent.last_heartbeat_at
                ? formatDistanceToNow(new Date(agent.last_heartbeat_at), { addSuffix: true })
                : 'Never'}
            </p>
          </div>
        </div>

        {agent.sslip_domain && (
          <div className="pt-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase">n8n URL</span>
            <p className="text-xs font-mono text-amber-500">
              https://{agent.sslip_domain}
            </p>
          </div>
        )}
      </div>

      {/* Workspace Credential Health */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credential Health
          </h4>
          <Button
            size="sm"
            variant="outline"
            disabled={runningCheck || loadingHealth}
            onClick={runHealthCheck}
            className="gap-1.5 text-xs h-7"
          >
            {runningCheck ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {runningCheck ? 'Running…' : 'Run Check'}
          </Button>
        </div>

        {loadingHealth ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />
            ))}
          </div>
        ) : !healthReport ? (
          <p className="text-xs text-muted-foreground italic">No health data yet — click Run Check.</p>
        ) : (
          <>
            <div className={cn(
              'text-xs font-medium px-2 py-1 rounded-md inline-flex items-center gap-1.5',
              healthReport.overall_status === 'ok'      && 'bg-green-500/10 text-green-600',
              healthReport.overall_status === 'degraded' && 'bg-yellow-500/10 text-yellow-600',
              healthReport.overall_status === 'error'   && 'bg-red-500/10 text-red-600',
            )}>
              {healthReport.overall_status === 'ok' && <CheckCircle2 className="h-3 w-3" />}
              {healthReport.overall_status === 'degraded' && <AlertTriangle className="h-3 w-3" />}
              {healthReport.overall_status === 'error' && <XCircle className="h-3 w-3" />}
              Overall: {healthReport.overall_status.toUpperCase()}
            </div>

            <div className="space-y-1.5 mt-2">
              {healthReport.credentials.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs border border-border/50 rounded px-2.5 py-2">
                  <div className="min-w-0">
                    <span className="font-medium">{c.service_name}</span>
                    <span className="text-muted-foreground ml-1.5">({c.credential_type})</span>
                    {c.error_message && (
                      <p className="text-red-500 truncate mt-0.5">{c.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {c.latency_ms != null && (
                      <span className="text-muted-foreground tabular-nums">{c.latency_ms}ms</span>
                    )}
                    <span className={cn('font-semibold', healthStatusColor(c.status))}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground text-right">
              Last checked {formatDistanceToNow(new Date(healthReport.checked_at), { addSuffix: true })}
            </p>
          </>
        )}
      </div>

      {/* Command Console */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Command Console
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMMANDS.map((cmd) => {
            const CmdIcon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => onCommand(cmd.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border border-border text-left transition-all',
                  'hover:bg-amber-500/5 hover:border-amber-500/30 focus:ring-2 focus:ring-amber-500/50 focus:outline-none',
                  cmd.id === 'RESTART_N8N' && 'hover:bg-red-500/5 hover:border-red-500/30'
                )}
              >
                <CmdIcon className={cn(
                  'h-4 w-4 shrink-0',
                  cmd.id === 'RESTART_N8N' ? 'text-red-500' : 'text-amber-500'
                )} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{cmd.label}</p>
                  <p className="text-[10px] text-muted-foreground">{cmd.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
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
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState() {
  return (
    <div className="border border-border rounded-lg p-12 text-center space-y-4">
      <Server className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
      <div>
        <h3 className="text-lg font-semibold mb-2">No Sidecar Agents</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          No droplets have been provisioned yet. Once a workspace completes
          onboarding and ignition, its sidecar agent will appear here.
        </p>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SidecarCommandCenterTab() {
  const { agents, summary, isLoading, error, refresh } = useSidecarFleet();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<SidecarAgent | null>(null);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);

  const handleCommand = async (command: SidecarCommand) => {
    if (!selectedAgent) return;

    // Open the rotation modal instead of firing a bare command
    if (command === 'ROTATE_CREDENTIAL') {
      setRotateOpen(true);
      return;
    }

    const cmdLabel = COMMANDS.find(c => c.id === command)?.label || command;

    // Confirm dangerous commands
    if (command === 'RESTART_N8N') {
      if (!confirm(`⚠️ Restart n8n on ${selectedAgent.workspace_name}?\n\nThis will briefly interrupt any running workflow executions.`)) {
        return;
      }
    }

    setSendingCommand(true);
    try {
      const result = await sendSidecarCommand(selectedAgent.workspace_id, command);
      if (result.success) {
        toast({
          title: `${cmdLabel} sent`,
          description: `Command executed successfully on ${selectedAgent.workspace_name}.`,
        });
        // Refresh fleet data after command
        setTimeout(() => refresh(), 2000);
      } else {
        toast({
          title: `${cmdLabel} failed`,
          description: result.error || 'Sidecar did not respond.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Command failed',
        description: 'Unexpected error sending command.',
        variant: 'destructive',
      });
    } finally {
      setSendingCommand(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-4">
        <WifiOff className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h3 className="text-lg font-semibold mb-2">Failed to load fleet data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => refresh()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Drill-down view
  if (selectedAgent) {
    return (
      <div className="space-y-6">
        <FleetSummaryHeader summary={summary} onRefresh={() => refresh()} isRefreshing={false} />
        <AgentDrillDown
          agent={selectedAgent}
          onBack={() => setSelectedAgent(null)}
          onCommand={handleCommand}
        />
        {sendingCommand && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-lg p-6 flex items-center gap-3 shadow-lg">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <span className="text-sm font-medium">Sending command…</span>
            </div>
          </div>
        )}
        {selectedAgent && (
          <RotateCredentialModal
            open={rotateOpen}
            onOpenChange={setRotateOpen}
            agent={selectedAgent}
          />
        )}
      </div>
    );
  }

  // Fleet grid view
  return (
    <div className="space-y-6">
      <FleetSummaryHeader summary={summary} onRefresh={() => refresh()} isRefreshing={false} />

      {agents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Server className="h-4 w-4" />
            Fleet Grid ({agents.length} agents)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.workspace_id}
                agent={agent}
                onClick={() => setSelectedAgent(agent)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
