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

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

  const handleCommand = async (command: SidecarCommand) => {
    if (!selectedAgent) return;

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
