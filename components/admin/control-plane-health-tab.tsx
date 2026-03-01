/**
 * ADMIN PANELS EXPANSION: Control Plane Health Tab
 *
 * Renders the ControlPlaneHealth data from the existing
 * useControlPlaneHealth hook (which already polls /api/admin/control-plane-health
 * every 30 seconds). This tab was MISSING despite the hook being fully built.
 *
 * Design: Consistent with API Health tab — status header + worker grid + service grid.
 *
 * Ralph Loop: Research ✅ (hook exists, unused) → Execute ✅
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useControlPlaneHealth } from '@/hooks/use-control-plane-health';
import type { WorkerHealth, ServiceHealth } from '@/lib/genesis/phase73-control-plane/types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Cpu,
  Clock,
  Loader2,
  Cloud,
  CloudOff,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG = {
  healthy: {
    label: 'Healthy',
    variant: 'success' as const,
    icon: CheckCircle2,
    color: 'text-green-500',
    description: 'Control Plane is operational. All workers and services running.',
  },
  degraded: {
    label: 'Degraded',
    variant: 'warning' as const,
    icon: AlertTriangle,
    color: 'text-yellow-500',
    description: 'Some workers or services are experiencing issues.',
  },
  unhealthy: {
    label: 'Unhealthy',
    variant: 'danger' as const,
    icon: XCircle,
    color: 'text-red-500',
    description: 'Control Plane has critical failures requiring attention.',
  },
  not_deployed: {
    label: 'Not Deployed',
    variant: 'secondary' as const,
    icon: CloudOff,
    color: 'text-muted-foreground',
    description: 'Control Plane is not deployed. Running in Vercel-only mode (Stage 1).',
  },
  unreachable: {
    label: 'Unreachable',
    variant: 'danger' as const,
    icon: XCircle,
    color: 'text-red-500',
    description: 'Unable to reach the Control Plane health endpoint.',
  },
};

// ============================================
// WORKER CARD
// ============================================

function WorkerCard({ name, worker }: { name: string; worker: WorkerHealth }) {
  const isHealthy = worker.running && worker.active_jobs >= 0;
  const failRate = worker.completed_jobs > 0
    ? ((worker.failed_jobs / (worker.completed_jobs + worker.failed_jobs)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={cn(
      'border rounded-lg p-4 transition-all',
      worker.running
        ? 'border-green-500/20 bg-green-500/5'
        : 'border-red-500/20 bg-red-500/5'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className={cn('h-4 w-4', worker.running ? 'text-green-500' : 'text-red-500')} />
          <span className="text-sm font-medium">{formatWorkerName(name)}</span>
        </div>
        <Badge variant={worker.running ? 'success' : 'danger'} className="text-[10px]">
          {worker.running ? 'Running' : 'Stopped'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Concurrency</span>
          <p className="font-medium">{worker.concurrency}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Active</span>
          <p className="font-medium">{worker.active_jobs}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Completed</span>
          <p className="font-medium text-green-500">{worker.completed_jobs.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Failed</span>
          <p className={cn('font-medium', worker.failed_jobs > 0 ? 'text-red-500' : 'text-muted-foreground')}>
            {worker.failed_jobs.toLocaleString()} ({failRate}%)
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SERVICE CARD
// ============================================

function ServiceCard({ name, service }: { name: string; service: ServiceHealth }) {
  return (
    <div className={cn(
      'border rounded-lg p-4 transition-all',
      service.running
        ? 'border-green-500/20 bg-green-500/5'
        : 'border-border bg-surface'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className={cn('h-4 w-4', service.running ? 'text-green-500' : 'text-muted-foreground')} />
          <span className="text-sm font-medium">{formatWorkerName(name)}</span>
        </div>
        <Badge variant={service.running ? 'success' : 'secondary'} className="text-[10px]">
          {service.running ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <div className="space-y-1 text-xs">
        {service.last_run_at && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last run: {new Date(service.last_run_at).toLocaleString()}
          </div>
        )}
        {service.error_count > 0 && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="h-3 w-3" />
            {service.error_count} error(s)
          </div>
        )}
        {service.last_error && (
          <p className="text-red-400 truncate" title={service.last_error}>{service.last_error}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatWorkerName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
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
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ControlPlaneHealthTab() {
  const { health, loading, error, refresh } = useControlPlaneHealth();

  if (loading) return <LoadingSkeleton />;

  // Determine status (handles both deployed and not_deployed states)
  const rawStatus = (health as any)?.status ?? 'unreachable';
  const statusKey = rawStatus === 'not_deployed' ? 'not_deployed' : rawStatus;
  const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unreachable;
  const StatusIcon = config.icon;

  const workers = health?.workers ? Object.entries(health.workers) : [];
  const services = health?.services ? Object.entries(health.services) : [];
  const isDeployed = rawStatus !== 'not_deployed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-lg', isDeployed ? 'bg-green-500/10' : 'bg-muted')}>
            {isDeployed
              ? <Cloud className={cn('h-6 w-6', config.color)} />
              : <CloudOff className="h-6 w-6 text-muted-foreground" />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold">Control Plane</h2>
              <Badge variant={config.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Metadata */}
        {isDeployed && health && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Uptime: {formatUptime(health.uptime_seconds)}</span>
            </div>
            {health.started_at && (
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span>Started: {new Date(health.started_at).toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Version: {health.version}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {isDeployed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-border rounded-lg p-4 space-y-1">
            <div className="text-xs text-muted-foreground">Workers</div>
            <div className="text-2xl font-bold">{workers.length}</div>
          </div>
          <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-4 space-y-1">
            <div className="text-xs text-green-600 dark:text-green-400">Running</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {workers.filter(([, w]) => w.running).length}
            </div>
          </div>
          <div className="border border-border rounded-lg p-4 space-y-1">
            <div className="text-xs text-muted-foreground">Services</div>
            <div className="text-2xl font-bold">{services.length}</div>
          </div>
          <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-4 space-y-1">
            <div className="text-xs text-green-600 dark:text-green-400">Active</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {services.filter(([, s]) => s.running).length}
            </div>
          </div>
        </div>
      )}

      {/* Not deployed state */}
      {!isDeployed && (
        <div className="border border-border rounded-lg p-8 text-center space-y-4">
          <CloudOff className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Stage 1: Vercel-Only Mode</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The Control Plane is deferred until 10+ clients. All fleet operations
              are handled directly through API routes and cron jobs.
              Deploy to Railway when ready.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Server className="h-4 w-4" />
            <span>control-plane/railway.toml ready for deployment</span>
          </div>
        </div>
      )}

      {/* Workers Grid */}
      {workers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Workers ({workers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workers.map(([name, worker]) => (
              <WorkerCard key={name} name={name} worker={worker} />
            ))}
          </div>
        </div>
      )}

      {/* Services Grid */}
      {services.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Services ({services.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map(([name, service]) => (
              <ServiceCard key={name} name={name} service={service} />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Connection Error</span>
          </div>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
