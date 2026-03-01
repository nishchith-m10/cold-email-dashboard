/**
 * GENESIS PHASE 46 - MIGRATION CONTROL TAB
 *
 * Admin dashboard tab for managing workspace migrations.
 * Provides status overview and manual controls for migration operations.
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AppLoadingSpinner } from '@/components/ui/loading-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Clock, Database, Loader2, Play, RotateCcw } from 'lucide-react';
import { useMigrationStatus, useInitializeMigration, useEnableDualWrite, useStartBackfill, useCheckParity, useExecuteCutover, useRollbackMigration } from '@/hooks/use-migration-status';
import { useToast } from '@/hooks/use-toast';
import type { MigrationStateRow } from '@/lib/genesis/phase46/types';

// ============================================
// HELPER: Status Badge
// ============================================

function getStatusBadge(status: string | undefined | null) {
  const statusMap: Record<string, { variant: 'default' | 'secondary' | 'danger' | 'success'; icon: React.ReactNode }> = {
    'idle': { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
    'dual-write': { variant: 'default', icon: <Database className="h-3 w-3 mr-1" /> },
    'backfilling': { variant: 'default', icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
    'verifying': { variant: 'default', icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
    'ready': { variant: 'success', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    'cutover': { variant: 'default', icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
    'completed': { variant: 'success', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    'failed': { variant: 'danger', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    'rolled-back': { variant: 'danger', icon: <RotateCcw className="h-3 w-3 mr-1" /> },
  };

  const safeStatus = status || 'idle';
  const config = statusMap[safeStatus] || statusMap['idle'];

  return (
    <Badge variant={config.variant} className="flex items-center w-fit">
      {config.icon}
      {safeStatus.toUpperCase()}
    </Badge>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MigrationControlTab() {
  const { toast } = useToast();
  const [dryRun, setDryRun] = useState(true); // Default to dry-run for safety
  const [workspaceId, setWorkspaceId] = useState('');
  const [sourceTable, setSourceTable] = useState('');
  const [targetTable, setTargetTable] = useState('leads');
  
  // Fetch migration status (polls every 60s) - only if workspace ID provided
  const { migrationState, isLoading: statusLoading, error: statusError, refresh } = useMigrationStatus(
    workspaceId || undefined,
    { dryRun, refreshInterval: workspaceId ? 60000 : 0 }
  );

  // Action hooks
  const { initialize, isLoading: initLoading } = useInitializeMigration();
  const { enable: enableDualWrite, isLoading: dualWriteLoading } = useEnableDualWrite();
  const { start: startBackfill, isLoading: backfillLoading } = useStartBackfill();
  const { check: checkParity, isLoading: parityLoading } = useCheckParity();
  const { execute: executeCutover, isLoading: cutoverLoading } = useExecuteCutover();
  const { rollback: rollbackMigration, isLoading: rollbackLoading } = useRollbackMigration();

  const state = migrationState as MigrationStateRow | undefined;

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleInitialize = async () => {
    if (!workspaceId || !sourceTable || !targetTable) {
      toast({
        title: 'Validation Error',
        description: 'Please provide workspace ID, source table, and target table',
      });
      return;
    }

    try {
      await initialize({
        workspaceId,
        sourceTable,
        targetTable,
        batchSize: 500,
        metadata: { initiated_by: 'admin_ui', timestamp: new Date().toISOString() },
        dryRun,
      });

      toast({
        title: dryRun ? 'Migration Initialized (DRY RUN)' : 'Migration Initialized',
        description: 'Migration state created successfully.',
      });

      refresh();
    } catch (error) {
      toast({
        title: 'Initialization Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleEnableDualWrite = async () => {
    if (!workspaceId) return;

    try {
      await enableDualWrite(workspaceId, dryRun);

      toast({
        title: dryRun ? 'Dual-Write Enabled (DRY RUN)' : 'Dual-Write Enabled',
        description: 'New writes will be replicated to target table.',
      });

      refresh();
    } catch (error) {
      toast({
        title: 'Dual-Write Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleStartBackfill = async () => {
    if (!workspaceId) return;

    try {
      await startBackfill({
        workspaceId,
        dryRun,
      });

      toast({
        title: dryRun ? 'Backfill Started (DRY RUN)' : 'Backfill Started',
        description: 'Historical data copy in progress.',
      });

      refresh();
    } catch (error) {
      toast({
        title: 'Backfill Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleCheckParity = async () => {
    if (!workspaceId) return;

    try {
      const result = await checkParity(workspaceId, dryRun);

      toast({
        title: dryRun ? 'Parity Check Complete (DRY RUN)' : 'Parity Check Complete',
        description: result.message || 'Verification completed.',
      });

      refresh();
    } catch (error) {
      toast({
        title: 'Parity Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleExecuteCutover = async () => {
    if (!workspaceId) return;

    if (!dryRun && !confirm('PRODUCTION CUTOVER: This will switch the application to use the new table. Are you sure?')) {
      return;
    }

    try {
      await executeCutover(workspaceId, dryRun);

      toast({
        title: dryRun ? 'Cutover Executed (DRY RUN)' : 'Cutover Executed',
        description: dryRun ? 'Simulated successful cutover.' : 'Application now using target table.',
      });

      refresh();
    } catch (error) {
      toast({
        title: 'Cutover Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleRollback = async () => {
    if (!workspaceId) return;

    if (!dryRun && !confirm('ROLLBACK: This will revert to the source table. Are you sure?')) {
      return;
    }

    try {
      await rollbackMigration({
        workspaceId,
        reason: 'Manual rollback from admin UI',
        dryRun,
      });

      toast({
        title: dryRun ? 'Rollback Complete (DRY RUN)' : 'Rollback Complete',
        description: 'Migration reverted to source table.',
      });

      refresh();
    } catch (error) {
      toast({
        title: 'Rollback Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AppLoadingSpinner />
      </div>
    );
  }

  if (statusError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Migration Status
          </CardTitle>
          <CardDescription>{statusError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Dry-Run Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Migration Control Center</h2>
          <p className="text-sm text-muted-foreground">
            Migrate workspaces from legacy tables to partitioned Genesis schema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={dryRun ? 'secondary' : 'danger'}>
            {dryRun ? 'DRY RUN MODE' : 'PRODUCTION MODE'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDryRun(!dryRun)}
          >
            {dryRun ? 'Switch to Production' : 'Switch to Dry Run'}
          </Button>
        </div>
      </div>

      {/* Workspace Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Configuration</CardTitle>
          <CardDescription>
            Select workspace and tables for migration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace ID</Label>
              <Input
                id="workspaceId"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="e.g., ohio, acme-corp"
                disabled={!!state}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceTable">Source Table</Label>
              <Input
                id="sourceTable"
                value={sourceTable}
                onChange={(e) => setSourceTable(e.target.value)}
                placeholder="e.g., leads_ohio"
                disabled={!!state}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetTable">Target Table</Label>
              <Input
                id="targetTable"
                value={targetTable}
                onChange={(e) => setTargetTable(e.target.value)}
                placeholder="e.g., leads"
                disabled={!!state}
              />
            </div>
          </div>
          {!state && (
            <p className="text-xs text-muted-foreground">
              💡 Tip: Use <code className="bg-muted px-1 rounded">leads_ohio</code> → <code className="bg-muted px-1 rounded">leads</code> for Ohio workspace migration
            </p>
          )}
        </CardContent>
      </Card>

      {/* Migration Status Card */}
      {state ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Migration Status</CardTitle>
              {getStatusBadge(state.status)}
            </div>
            <CardDescription>
              {state.source_table} → {state.target_table}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Dual-Write</p>
                <p className="text-lg font-semibold">
                  {state.dual_write_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Backfill Progress</p>
                <p className="text-lg font-semibold">{state.backfill_progress?.toFixed(1) ?? '0.0'}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parity Score</p>
                <p className="text-lg font-semibold">{state.parity_score?.toFixed(1) ?? '0.0'}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-lg font-semibold">{state.error_count ?? 0}</p>
              </div>
            </div>

            {/* Error Message */}
            {state.error_message && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">Error:</p>
                <p className="text-sm text-destructive">{state.error_message}</p>
              </div>
            )}

            {/* Migration Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                onClick={handleEnableDualWrite}
                disabled={dualWriteLoading || state.dual_write_enabled}
                size="sm"
              >
                {dualWriteLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Enable Dual-Write
              </Button>

              <Button
                onClick={handleStartBackfill}
                disabled={backfillLoading || !state.dual_write_enabled}
                size="sm"
              >
                {backfillLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Start Backfill
              </Button>

              <Button
                onClick={handleCheckParity}
                disabled={parityLoading}
                size="sm"
                variant="outline"
              >
                {parityLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Check Parity
              </Button>

              <Button
                onClick={handleExecuteCutover}
                disabled={cutoverLoading || state.parity_score < 99.9}
                size="sm"
                variant="default"
              >
                {cutoverLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Execute Cutover
              </Button>

              <Button
                onClick={handleRollback}
                disabled={rollbackLoading}
                size="sm"
                variant="danger"
              >
                {rollbackLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Rollback
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Migration</CardTitle>
            <CardDescription>
              Configure workspace details above, then initialize migration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleInitialize} 
              disabled={initLoading || !workspaceId || !sourceTable || !targetTable}
            >
              {initLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Initialize Migration
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
