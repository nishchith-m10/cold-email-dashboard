/**
 * PHASE 70: Disaster Recovery Tab
 * 
 * Admin dashboard showing disaster recovery status with:
 * - Regional health monitoring
 * - Snapshot inventory
 * - Backup coverage metrics
 * - Manual failover controls
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Globe,
  HardDrive,
  RefreshCw,
  Trash2,
  AlertCircle,
  Clock,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface RegionHealthCardProps {
  region: {
    region: string;
    status: 'healthy' | 'degraded' | 'outage';
    lastHeartbeat: Date;
    latencyMs?: number;
    errorMessage?: string;
  };
}

// ============================================
// REGION HEALTH CARD
// ============================================

function RegionHealthCard({ region }: RegionHealthCardProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: 'success' as const,
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      badge: 'warning' as const,
    },
    outage: {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'danger' as const,
    },
  };

  const config = statusConfig[region.status];
  const Icon = config.icon;

  return (
    <Card className={cn('transition-all', config.bg, config.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{region.region.toUpperCase()}</CardTitle>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Badge variant={config.badge} className="text-xs">
          {region.status}
        </Badge>
        {region.latencyMs && (
          <p className="text-xs text-muted-foreground">{region.latencyMs}ms</p>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(region.lastHeartbeat), { addSuffix: true })}
        </p>
        {region.errorMessage && (
          <p className="text-xs text-red-600 mt-2">{region.errorMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DisasterRecoveryTab() {
  const { snapshots, isLoading: snapshotsLoading, refresh: refreshSnapshots } = useDisasterRecoverySnapshots();
  const { regionalHealth, isLoading: healthLoading, refresh: refreshHealth } = useRegionalHealth({ refreshInterval: 30000 });
  const { stats, isLoading: statsLoading } = useDisasterRecoveryStats();
  const { createSnapshot, isLoading: creating } = useCreateSnapshot();
  const { deleteSnapshot, isLoading: deleting } = useDeleteSnapshot();
  const { triggerFailover, isLoading: failingOver } = useTriggerFailover();
  const { restoreSnapshot, isLoading: restoring } = useRestoreSnapshot();
  const { toast } = useToast();

  // Form state
  const [workspaceId, setWorkspaceId] = useState('');
  const [dropletId, setDropletId] = useState('');
  const [targetRegion, setTargetRegion] = useState('');

  const isLoading = snapshotsLoading || healthLoading;

  // Use API stats if available, otherwise fallback to manual calculation
  const coverage = stats?.coverage ?? (() => {
    const totalWorkspaces = new Set(snapshots.map(s => s.workspaceId)).size;
    const recentSnapshots = snapshots.filter(s => {
      const age = Date.now() - new Date(s.createdAt).getTime();
      return age < 24 * 60 * 60 * 1000;
    });
    const workspacesWithRecentBackups = new Set(recentSnapshots.map(s => s.workspaceId)).size;
    return totalWorkspaces > 0 ? Math.round((workspacesWithRecentBackups / totalWorkspaces) * 100) : 0;
  })();
  const totalWorkspacesDisplay = stats?.totalWorkspaces ?? new Set(snapshots.map(s => s.workspaceId)).size;
  const workspacesWithRecentBackups = stats?.workspacesWithRecentBackups ?? 0;

  // Handle manual snapshot creation
  const handleCreateSnapshot = async () => {
    if (!workspaceId || !dropletId) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both Workspace ID and Droplet ID',
        variant: 'destructive',
      });
      return;
    }

    const result = await createSnapshot({
      workspaceId,
      dropletId,
      type: 'full',
    });

    if (result.success) {
      toast({
        title: 'Snapshot Created',
        description: `Snapshot for workspace ${workspaceId} created successfully`,
      });
      refreshSnapshots();
      setWorkspaceId('');
      setDropletId('');
    } else {
      toast({
        title: 'Snapshot Failed',
        description: result.error || 'Failed to create snapshot',
        variant: 'destructive',
      });
    }
  };

  // Handle snapshot deletion
  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot? This action cannot be undone.')) {
      return;
    }

    const result = await deleteSnapshot(snapshotId);

    if (result.success) {
      toast({
        title: 'Snapshot Deleted',
        description: 'Snapshot removed successfully',
      });
      refreshSnapshots();
    } else {
      toast({
        title: 'Delete Failed',
        description: result.error || 'Failed to delete snapshot',
        variant: 'destructive',
      });
    }
  };

  // Handle snapshot restore
  const handleRestoreSnapshot = async (snapshotId: string) => {
    const region = prompt('Enter target region for restore (e.g., nyc3, sfo3):');
    if (!region || !region.trim()) return;

    if (!confirm(`⚠️ Restore snapshot ${snapshotId} to region ${region}?\n\nThis will spin up infrastructure from the snapshot in the target region.`)) {
      return;
    }

    const result = await restoreSnapshot({
      snapshotId,
      targetRegion: region.trim(),
    });

    if (result.success) {
      toast({
        title: 'Restore Initiated',
        description: `Restoring snapshot to ${region}. This may take several minutes.`,
      });
      refreshSnapshots();
    } else {
      toast({
        title: 'Restore Failed',
        description: result.error || 'Failed to restore snapshot',
        variant: 'destructive',
      });
    }
  };

  // Handle regional failover
  const handleFailover = async () => {
    if (!workspaceId || !targetRegion) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both Workspace ID and Target Region',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`⚠️ CRITICAL: Trigger regional failover for ${workspaceId} to ${targetRegion}?\n\nThis will:\n1. Stop services in current region\n2. Restore from latest snapshot\n3. Redirect traffic to target region\n\nThis action should only be used during disasters.`)) {
      return;
    }

    const result = await triggerFailover({
      workspaceId,
      targetRegion,
      reason: 'Manual admin trigger',
    });

    if (result.success) {
      toast({
        title: 'Failover Initiated',
        description: `Regional failover to ${targetRegion} in progress`,
      });
      refreshSnapshots();
      refreshHealth();
    } else {
      toast({
        title: 'Failover Failed',
        description: result.error || 'Failed to trigger failover',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Backup Coverage Metric */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backup Coverage</CardTitle>
              <CardDescription>
                Percentage of workspaces with snapshots less than 24 hours old
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                refreshSnapshots();
                refreshHealth();
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{coverage}%</div>
            <div className="text-sm text-muted-foreground">
              {workspacesWithRecentBackups} of {totalWorkspacesDisplay} workspaces
            </div>
            {coverage < 80 && (
              <Badge variant="warning" className="ml-auto">
                <AlertCircle className="h-3 w-3 mr-1" />
                Below Target (80%)
              </Badge>
            )}
            {coverage >= 80 && coverage < 95 && (
              <Badge variant="success" className="ml-auto">
                Target Met
              </Badge>
            )}
            {coverage >= 95 && (
              <Badge variant="success" className="ml-auto">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Excellent Coverage
              </Badge>
            )}
          </div>

          {/* Additional Stats from API */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Total Snapshots
                </div>
                <div className="text-lg font-bold">{stats.totalSnapshots}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Total Size
                </div>
                <div className="text-lg font-bold">{stats.totalSizeGb.toFixed(2)} GB</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Monthly Cost
                </div>
                <div className="text-lg font-bold">${stats.estimatedMonthlyCost.toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Workspaces</div>
                <div className="text-lg font-bold">{stats.totalWorkspaces}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Health Status
          </CardTitle>
          <CardDescription>
            Real-time health monitoring across all DigitalOcean regions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {regionalHealth.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground py-8 text-center">
                No regional health data available
              </p>
            )}
            {regionalHealth.map((region) => (
              <RegionHealthCard
                key={region.region}
                region={{
                  region: region.region,
                  status: region.status,
                  lastHeartbeat: new Date(region.lastHeartbeatAt),
                  latencyMs: region.latencyMs,
                  errorMessage: region.errorMessage,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Snapshot Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Create Manual Snapshot
          </CardTitle>
          <CardDescription>
            Trigger immediate backup for a specific workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace ID</Label>
              <Input
                id="workspaceId"
                placeholder="e.g., ohio, acme-corp"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropletId">Droplet ID</Label>
              <Input
                id="dropletId"
                placeholder="e.g., 12345678"
                value={dropletId}
                onChange={(e) => setDropletId(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleCreateSnapshot}
            disabled={creating || !workspaceId || !dropletId}
          >
            {creating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Create Snapshot
          </Button>
        </CardContent>
      </Card>

      {/* Snapshot Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Snapshot Inventory
          </CardTitle>
          <CardDescription>
            All disaster recovery snapshots across regions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No snapshots available. Create your first snapshot above.
            </p>
          )}
          {snapshots.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Workspace</th>
                    <th className="text-left p-2">Region</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Age</th>
                    <th className="text-left p-2">Size</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snapshot) => (
                    <tr key={snapshot.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-xs">{snapshot.workspaceId}</td>
                      <td className="p-2">{snapshot.region}</td>
                      <td className="p-2">
                        <Badge variant={snapshot.type === 'daily' ? 'default' : 'secondary'}>
                          {snapshot.type}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })}
                      </td>
                      <td className="p-2">
                        {snapshot.sizeGb.toFixed(2)} GB
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={
                            snapshot.status === 'completed'
                              ? 'success'
                              : snapshot.status === 'failed'
                              ? 'danger'
                              : 'default'
                          }
                        >
                          {snapshot.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {snapshot.status === 'completed' && (
                            <Button
                              onClick={() => handleRestoreSnapshot(snapshot.id)}
                              variant="outline"
                              size="sm"
                              disabled={restoring}
                              className="gap-1"
                            >
                              {restoring ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                              <span className="hidden sm:inline">Restore</span>
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteSnapshot(snapshot.id)}
                            variant="ghost"
                            size="sm"
                            disabled={deleting}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Failover */}
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Emergency Regional Failover
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            ⚠️ Use only during regional disasters. This action will stop services in the current region and restore from the latest snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="failoverWorkspaceId">Workspace ID</Label>
              <Input
                id="failoverWorkspaceId"
                placeholder="e.g., ohio"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetRegion">Target Region</Label>
              <Input
                id="targetRegion"
                placeholder="e.g., sfo3"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleFailover}
            variant="danger"
            disabled={failingOver || !workspaceId || !targetRegion}
          >
            {failingOver && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Trigger Regional Failover
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
