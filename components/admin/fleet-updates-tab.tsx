/**
 * PHASE 72: Fleet Updates Tab
 *
 * Admin dashboard for Zero-Downtime Fleet Update Protocol.
 * Displays:
 *   - Active rollout progress with wave status table
 *   - Health metrics (error rate, execution success, avg update time)
 *   - Fleet version overview (per-component distribution)
 *   - Rollout control actions (Pause / Skip to 100% / Abort & Rollback)
 *   - Emergency rollback UI
 *   - Template management
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.9
 */

'use client';

import React, { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useFleetUpdates,
  useRolloutProgress,
  useFleetVersions,
  useFleetTemplates,
  controlRollout,
  executeRollback,
  initiateFleetRollout,
  publishTemplate,
} from '@/hooks/use-fleet-updates';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Pause,
  Play,
  SkipForward,
  RotateCcw,
  Rocket,
  Server,
  GitBranch,
  Shield,
  ChevronDown,
  ChevronUp,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ActiveRolloutStatus,
  FleetRolloutStatus,
  FleetVersionSummary,
  WaveProgressSummary,
  RolloutHealthMetrics,
  FleetComponent,
  RollbackScope,
  RolloutStrategy,
} from '@/lib/genesis/phase72/types';

// ============================================
// CONSTANTS
// ============================================

const FLEET_COMPONENTS: FleetComponent[] = [
  'dashboard',
  'workflow_email_1',
  'workflow_email_2',
  'workflow_email_3',
  'workflow_email_1_smtp',
  'workflow_email_2_smtp',
  'workflow_email_3_smtp',
  'workflow_email_preparation',
  'workflow_reply_tracker',
  'workflow_research',
  'workflow_opt_out',
  'sidecar',
];

const COMPONENT_LABELS: Record<FleetComponent, string> = {
  dashboard: 'Dashboard',
  workflow_email_1: 'Email 1 Workflow',
  workflow_email_2: 'Email 2 Workflow',
  workflow_email_3: 'Email 3 Workflow',
  workflow_email_1_smtp: 'Email 1 Workflow (SMTP)',
  workflow_email_2_smtp: 'Email 2 Workflow (SMTP)',
  workflow_email_3_smtp: 'Email 3 Workflow (SMTP)',
  workflow_email_preparation: 'Email Preparation Workflow',
  workflow_reply_tracker: 'Reply Tracker Workflow',
  workflow_research: 'Research Workflow',
  workflow_opt_out: 'Opt-Out Workflow',
  sidecar: 'Sidecar',
};

const WAVE_LABELS: Record<string, { label: string; percentage: string }> = {
  canary: { label: 'Canary', percentage: '1%' },
  wave_1: { label: 'Wave 1', percentage: '10%' },
  wave_2: { label: 'Wave 2', percentage: '25%' },
  wave_3: { label: 'Wave 3', percentage: '50%' },
  wave_4: { label: 'Wave 4', percentage: '100%' },
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'text-muted-foreground',
  canary: 'text-amber-500',
  wave_1: 'text-blue-500',
  wave_2: 'text-blue-500',
  wave_3: 'text-blue-500',
  wave_4: 'text-blue-500',
  completed: 'text-green-500',
  paused: 'text-yellow-500',
  aborted: 'text-red-500',
  rolled_back: 'text-red-500',
};

// ============================================
// STATUS BADGE
// ============================================

function RolloutStatusBadge({ status }: { status: FleetRolloutStatus }) {
  const variant =
    status === 'completed'
      ? 'success'
      : status === 'aborted' || status === 'rolled_back'
        ? 'danger'
        : status === 'paused'
          ? 'warning'
          : 'default';

  return (
    <Badge variant={variant} className="gap-1 uppercase text-[10px]">
      {status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
      {(status === 'aborted' || status === 'rolled_back') && <XCircle className="h-3 w-3" />}
      {status === 'paused' && <Pause className="h-3 w-3" />}
      {status.replace('_', ' ')}
    </Badge>
  );
}

function WaveStatusBadge({ status }: { status: WaveProgressSummary['status'] }) {
  if (status === 'completed') return <Badge variant="success" className="text-[10px]">DONE</Badge>;
  if (status === 'active') return <Badge variant="default" className="text-[10px]">LIVE</Badge>;
  if (status === 'failed') return <Badge variant="danger" className="text-[10px]">FAILED</Badge>;
  return <span className="text-xs text-muted-foreground">Pending</span>;
}

// ============================================
// ACTIVE ROLLOUT CARD
// ============================================

function ActiveRolloutCard({
  rollout,
  onPause,
  onResume,
  onAbort,
}: {
  rollout: ActiveRolloutStatus;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onAbort: (id: string) => void;
}) {
  const { rollout: r, progress, health } = rollout;
  const isPaused = r.status === 'paused';
  const isTerminal = ['completed', 'aborted', 'rolled_back'].includes(r.status);

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-sm">
              {COMPONENT_LABELS[r.component as FleetComponent] ?? r.component}{' '}
              <span className="text-muted-foreground font-normal">
                {r.from_version} → {r.to_version}
              </span>
            </h3>
            <RolloutStatusBadge status={r.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strategy: {r.strategy} · Started: {new Date(r.started_at).toLocaleString()}
          </p>
        </div>

        {/* Actions (spec 68.9: Pause / Skip to 100% / Abort & Rollback) */}
        {!isTerminal && (
          <div className="flex items-center gap-2 shrink-0">
            {isPaused ? (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onResume(r.id)}>
                <Play className="h-3 w-3" /> Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onPause(r.id)}>
                <Pause className="h-3 w-3" /> Pause
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-red-500 hover:text-red-600"
              onClick={() => onAbort(r.id)}
            >
              <XCircle className="h-3 w-3" /> Abort &amp; Rollback
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>
            {progress.overall_progress_percent.toFixed(1)}% ({r.updated_tenants}/{r.total_tenants})
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              health.is_healthy ? 'bg-blue-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(progress.overall_progress_percent, 100)}%` }}
          />
        </div>
      </div>

      {/* Wave status table (spec 68.9) */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-elevated">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Wave</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Tenants</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Errors</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs hidden sm:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {progress.waves.map((wave: WaveProgressSummary) => {
              const waveInfo = WAVE_LABELS[wave.wave_name] ?? { label: wave.wave_name, percentage: '—' };
              return (
                <tr key={wave.wave_name} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-xs">
                    {waveInfo.label} <span className="text-muted-foreground">({waveInfo.percentage})</span>
                  </td>
                  <td className="px-3 py-2 text-xs">{wave.total_jobs.toLocaleString()}</td>
                  <td className="px-3 py-2"><WaveStatusBadge status={wave.status} /></td>
                  <td className="px-3 py-2 text-xs">
                    {wave.status === 'pending' ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={wave.error_rate > 0.5 ? 'text-red-500' : ''}>
                        {wave.failed_jobs} ({wave.error_rate.toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs hidden sm:table-cell text-muted-foreground">
                    {wave.started_at
                      ? `${new Date(wave.started_at).toLocaleTimeString()}${wave.completed_at ? ` – ${new Date(wave.completed_at).toLocaleTimeString()}` : ' – NOW'}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Health metrics (spec 68.9) */}
      <HealthMetricsRow health={health} />
    </div>
  );
}

// ============================================
// HEALTH METRICS ROW
// ============================================

function HealthMetricsRow({ health }: { health: RolloutHealthMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      <MetricCard
        label="Error Rate"
        value={`${(health.error_rate * 100).toFixed(2)}%`}
        status={health.error_rate < 0.005 ? 'ok' : health.error_rate < 0.01 ? 'warn' : 'danger'}
        detail={health.error_rate < 0.005 ? 'Below 0.5% threshold' : 'Above threshold'}
      />
      <MetricCard
        label="Success Rate"
        value={`${(health.execution_success_rate * 100).toFixed(2)}%`}
        status={health.execution_success_rate > 0.99 ? 'ok' : 'warn'}
      />
      <MetricCard
        label="Avg Update Time"
        value={`${health.avg_update_time_seconds.toFixed(1)}s`}
        status="ok"
        detail="per tenant"
      />
      <MetricCard
        label="Failed"
        value={String(health.failed_updates)}
        status={health.failed_updates === 0 ? 'ok' : 'warn'}
      />
      <MetricCard
        label="Retried"
        value={String(health.retried_updates)}
        status="ok"
      />
      <MetricCard
        label="Stuck"
        value={String(health.stuck_updates)}
        status={health.stuck_updates === 0 ? 'ok' : 'danger'}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  status,
  detail,
}: {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'danger';
  detail?: string;
}) {
  return (
    <div className="border border-border rounded-lg p-2 text-center">
      <p
        className={cn(
          'text-lg font-bold',
          status === 'ok' ? 'text-green-500' : status === 'warn' ? 'text-amber-500' : 'text-red-500'
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {detail && <p className="text-[9px] text-muted-foreground/70">{detail}</p>}
    </div>
  );
}

// ============================================
// FLEET VERSION OVERVIEW
// ============================================

function FleetVersionOverview({ components }: { components: FleetVersionSummary[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Server className="h-4 w-4" /> Fleet Version Overview
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {components.map((comp) => (
          <div key={comp.component} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">{COMPONENT_LABELS[comp.component] ?? comp.component}</span>
              <button
                onClick={() => setExpanded(expanded === comp.component ? null : comp.component)}
                className="text-muted-foreground hover:text-foreground"
              >
                {expanded === comp.component ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* Overview counts */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                Total: <span className="text-foreground font-medium">{comp.total_tenants}</span>
              </span>
              {comp.currently_updating > 0 && (
                <span className="text-blue-500">
                  Updating: {comp.currently_updating}
                </span>
              )}
              {comp.failed > 0 && (
                <span className="text-red-500">
                  Failed: {comp.failed}
                </span>
              )}
            </div>

            {/* Expanded version distribution */}
            {expanded === comp.component && Object.keys(comp.by_version).length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                {Object.entries(comp.by_version)
                  .sort(([, a], [, b]) => b - a)
                  .map(([version, count]) => (
                    <div key={version} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{version}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(count / comp.total_tenants) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// UPLOAD TEMPLATE MODAL
// ============================================

function UploadTemplateModal({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState<FleetComponent>('workflow_email_1');
  const [version, setVersion] = useState('');
  const [workflowJSON, setWorkflowJSON] = useState('');
  const [changelog, setChangelog] = useState('');
  const [isCanary, setIsCanary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setWorkflowJSON(JSON.stringify(json, null, 2));
        toast({ title: 'File loaded successfully' });
      } catch (err) {
        toast({ title: 'Invalid JSON file', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!version.trim() || !workflowJSON.trim()) {
      toast({ title: 'Version and workflow JSON are required', variant: 'destructive' });
      return;
    }

    try {
      const parsedJSON = JSON.parse(workflowJSON);
      setIsUploading(true);

      await publishTemplate({
        workflow_name: workflowName,
        version: version.trim(),
        workflow_json: parsedJSON,
        changelog: changelog.trim() || 'No changelog provided',
        is_canary: isCanary,
      });

      toast({ title: 'Template uploaded successfully' });
      setIsOpen(false);
      setVersion('');
      setWorkflowJSON('');
      setChangelog('');
      setIsCanary(false);
      onSuccess();
    } catch (err) {
      toast({ 
        title: 'Upload failed', 
        description: err instanceof Error ? err.message : 'Invalid JSON or upload error',
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setIsOpen(true)}>
        <GitBranch className="h-4 w-4" />
        Upload New Template
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="mb-2">
          <DialogTitle>Upload Workflow Template</DialogTitle>
          <DialogDescription>
            Upload a new version of a workflow template to be deployed across the fleet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workflow Selector */}
          <div className="space-y-2.5">
            <Label htmlFor="workflow-name" className="text-sm font-medium">Workflow Component</Label>
            <Select value={workflowName} onValueChange={(val) => setWorkflowName(val as FleetComponent)}>
              <SelectTrigger id="workflow-name" className="h-11">
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent>
                {FLEET_COMPONENTS.filter(c => c.startsWith('workflow_')).map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    {COMPONENT_LABELS[comp]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Version Input */}
          <div className="space-y-2.5">
            <Label htmlFor="version" className="text-sm font-medium">Version (semver format)</Label>
            <Input
              id="version"
              placeholder="e.g., 1.2.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="h-11"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Upload JSON File</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 h-11 px-4 min-w-[140px] hover:bg-muted transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </Button>
              <span className="text-sm text-muted-foreground flex-1 truncate">
                {fileName || 'No file chosen'}
              </span>
            </div>
          </div>

          {/* JSON Text Area */}
          <div className="space-y-2.5">
            <Label htmlFor="workflow-json" className="text-sm font-medium">Workflow JSON</Label>
            <Textarea
              id="workflow-json"
              placeholder='{"nodes": [], "connections": {}, ...}'
              value={workflowJSON}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWorkflowJSON(e.target.value)}
              className="font-mono text-xs min-h-[240px] resize-none"
            />
          </div>

          {/* Changelog */}
          <div className="space-y-2.5">
            <Label htmlFor="changelog" className="text-sm font-medium">Changelog (optional)</Label>
            <Textarea
              id="changelog"
              placeholder="What changed in this version?"
              value={changelog}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setChangelog(e.target.value)}
              className="min-h-[100px] resize-none"
              rows={3}
            />
          </div>

          {/* Canary Checkbox */}
          <div className="flex items-center space-x-3 pt-2">
            <Checkbox
              checked={isCanary}
              onCheckedChange={(checked) => setIsCanary(checked as boolean)}
            />
            <Label htmlFor="is-canary" className="text-sm font-medium cursor-pointer">
              Mark as Canary (for testing before full rollout)
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-3 mt-6 pt-6 border-t border-border">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading} className="min-w-[100px]">
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading} className="min-w-[140px]">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ============================================
// EMERGENCY ROLLBACK PANEL
// ============================================

function EmergencyRollbackPanel({ onExecute }: { onExecute: () => void }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [component, setComponent] = useState<FleetComponent>('dashboard');
  const [rollbackVersion, setRollbackVersion] = useState('');
  const [scope, setScope] = useState<RollbackScope>('affected_only');
  const [specificWorkspace, setSpecificWorkspace] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!rollbackVersion.trim() || !reason.trim()) {
      toast({ title: 'Version and reason are required', variant: 'destructive' });
      return;
    }
    if (scope === 'specific_tenant' && !specificWorkspace.trim()) {
      toast({ title: 'Workspace ID is required for specific tenant scope', variant: 'destructive' });
      return;
    }
    if (!confirmed) {
      toast({ title: 'Please confirm the rollback', variant: 'destructive' });
      return;
    }

    setIsExecuting(true);
    try {
      const result = await executeRollback({
        component,
        rollback_to_version: rollbackVersion,
        scope,
        specific_workspace_id: scope === 'specific_tenant' ? specificWorkspace : undefined,
        reason,
      });

      if (result.success) {
        toast({
          title: 'Emergency rollback initiated',
          description: result.estimated_time
            ? `Estimated time: ${result.estimated_time}`
            : 'Rollback is in progress.',
        });
        setIsOpen(false);
        resetForm();
        onExecute();
      } else {
        toast({ title: `Rollback failed: ${result.error}`, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to execute rollback', variant: 'destructive' });
    } finally {
      setIsExecuting(false);
    }
  };

  const resetForm = () => {
    setComponent('dashboard');
    setRollbackVersion('');
    setScope('affected_only');
    setSpecificWorkspace('');
    setReason('');
    setConfirmed(false);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 uppercase tracking-wider"
      >
        <Shield className="h-4 w-4" />
        Emergency Rollback
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Immediately revert a component to a previous version across the fleet.
            This will abort any active rollouts for the selected component.
          </p>

          {/* Component selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Component</label>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value as FleetComponent)}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background"
              >
                {FLEET_COMPONENTS.map((c) => (
                  <option key={c} value={c}>{COMPONENT_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Rollback To Version</label>
              <input
                type="text"
                placeholder="e.g. 1.1.0"
                value={rollbackVersion}
                onChange={(e) => setRollbackVersion(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background font-mono"
              />
            </div>
          </div>

          {/* Scope selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Scope</label>
            <div className="flex flex-col sm:flex-row gap-3">
              {([
                { value: 'all_tenants' as const, label: 'All Tenants' },
                { value: 'affected_only' as const, label: 'Affected Only' },
                { value: 'specific_tenant' as const, label: 'Specific Tenant' },
              ]).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="rollback-scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value)}
                    className="cursor-pointer"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Specific workspace (conditional) */}
          {scope === 'specific_tenant' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Workspace ID</label>
              <input
                type="text"
                placeholder="workspace-uuid"
                value={specificWorkspace}
                onChange={(e) => setSpecificWorkspace(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background font-mono"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reason</label>
            <input
              type="text"
              placeholder="Describe why this rollback is needed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background"
            />
          </div>

          {/* Confirm checkbox + execute */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-red-500/20">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-red-500 font-medium">I confirm this emergency rollback</span>
            </label>
            <Button
              size="sm"
              variant="danger"
              className="gap-1"
              disabled={!confirmed || isExecuting}
              onClick={handleExecute}
            >
              {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Execute Rollback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// RECENT ROLLOUT HISTORY
// ============================================

function RolloutHistory({ rollouts }: { rollouts: ActiveRolloutStatus['rollout'][] }) {
  if (!rollouts || rollouts.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <GitBranch className="h-4 w-4" /> Recent Rollouts
      </h3>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-elevated">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Component</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs hidden sm:table-cell">Version</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs hidden md:table-cell">Tenants</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs hidden md:table-cell">Started</th>
            </tr>
          </thead>
          <tbody>
            {rollouts.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 text-xs font-medium">
                  {COMPONENT_LABELS[r.component as FleetComponent] ?? r.component}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-muted-foreground hidden sm:table-cell">
                  {r.from_version} → {r.to_version}
                </td>
                <td className="px-3 py-2"><RolloutStatusBadge status={r.status} /></td>
                <td className="px-3 py-2 text-xs hidden md:table-cell">
                  {r.updated_tenants}/{r.total_tenants}
                  {r.failed_tenants > 0 && (
                    <span className="text-red-500 ml-1">({r.failed_tenants} failed)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">
                  {new Date(r.started_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FleetUpdatesTab() {
  const { activeRollouts, fleetOverview, recentHistory, isLoading, mutate } = useFleetUpdates();
  const { overview } = useFleetVersions();
  const { toast } = useToast();

  const handlePause = async (rolloutId: string) => {
    try {
      const result = await controlRollout({ rollout_id: rolloutId, action: 'pause', reason: 'Manual pause from admin' });
      if (result.success) {
        toast({ title: 'Rollout paused' });
        mutate();
      } else {
        toast({ title: `Failed: ${result.error}`, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to pause rollout', variant: 'destructive' });
    }
  };

  const handleResume = async (rolloutId: string) => {
    try {
      const result = await controlRollout({ rollout_id: rolloutId, action: 'resume', reason: 'Manual resume from admin' });
      if (result.success) {
        toast({ title: 'Rollout resumed' });
        mutate();
      } else {
        toast({ title: `Failed: ${result.error}`, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to resume rollout', variant: 'destructive' });
    }
  };

  const handleAbort = async (rolloutId: string) => {
    try {
      const result = await controlRollout({ rollout_id: rolloutId, action: 'abort', reason: 'Manual abort from admin' });
      if (result.success) {
        toast({ title: 'Rollout aborted' });
        mutate();
      } else {
        toast({ title: `Failed: ${result.error}`, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to abort rollout', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Rocket className="h-5 w-5 text-blue-500" />
        <div>
          <h2 className="text-lg font-semibold">Fleet Updates</h2>
          <p className="text-xs text-muted-foreground">
            Zero-Downtime Fleet Update Protocol — Canary → Staged → 100%
          </p>
        </div>
        {fleetOverview && (
          <Badge variant={fleetOverview.active_rollouts > 0 ? 'default' : 'success'} className="ml-2">
            {fleetOverview.active_rollouts > 0
              ? `${fleetOverview.active_rollouts} active`
              : 'No active rollouts'}
          </Badge>
        )}
      </div>

      {/* Active Rollouts */}
      {activeRollouts.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4" /> Active Rollouts ({activeRollouts.length})
          </h3>
          {activeRollouts.map((ar: ActiveRolloutStatus) => (
            <ActiveRolloutCard
              key={ar.rollout.id}
              rollout={ar}
              onPause={handlePause}
              onResume={handleResume}
              onAbort={handleAbort}
            />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active rollouts. Fleet is stable.</p>
        </div>
      )}

      {/* Fleet Version Overview */}
      {overview && overview.components && overview.components.length > 0 && (
        <FleetVersionOverview components={overview.components} />
      )}

      {/* Upload Template Button */}
      <div className="flex items-center gap-3 border border-border rounded-lg p-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Template Management</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload new workflow versions to deploy across the fleet
          </p>
        </div>
        <UploadTemplateModal onSuccess={() => mutate()} />
      </div>

      {/* Emergency Rollback */}
      <EmergencyRollbackPanel onExecute={() => mutate()} />

      {/* Recent Rollout History */}
      <RolloutHistory rollouts={recentHistory} />
    </div>
  );
}
