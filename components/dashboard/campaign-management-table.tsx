/**
 * Campaign Management Table
 * 
 * Phase 31 Pillar 4: The Optimistic Interface
 * Table for managing campaigns with toggle functionality.
 */

'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RefreshCw, AlertCircle, Pencil, Pause, Play, Trash2, BarChart3, Copy, CopyPlus } from 'lucide-react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useCampaignGroups } from '@/hooks/use-campaign-groups';
import { CampaignToggle } from './campaign-toggle';
import { CampaignScheduleDialog } from './campaign-schedule-dialog';
import { EditableText } from '@/components/ui/editable-text';
import { useToast } from '@/hooks/use-toast';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { usePermission } from '@/components/ui/permission-gate';
import { useSelection } from '@/hooks/use-selection';
import { BulkActionToolbar, BulkAction } from '@/components/ui/bulk-action-toolbar';
import { Checkbox } from '@/components/ui/checkbox';

interface CampaignManagementTableProps {
  workspaceId?: string;
  className?: string;
}

export function CampaignManagementTable({ 
  workspaceId, 
  className 
}: CampaignManagementTableProps) {
  const { 
    campaigns, 
    isLoading, 
    error, 
    toggleCampaign, 
    updateCampaign,
    deleteCampaign,
    isToggling, 
    refresh 
  } = useCampaigns({ workspaceId });

  // Group lookup for the Group column
  const { groups: campaignGroups } = useCampaignGroups(workspaceId);
  const groupMap = Object.fromEntries(campaignGroups.map(g => [g.id, g.name]));

  const { toast } = useToast();

  // Permission checks
  const canWrite = usePermission('write');
  const canManage = usePermission('manage');

  const filteredCampaigns = campaigns;

  // Group campaigns by campaign_group_id
  // Grouped: one row per group showing group name + sequence count
  // Ungrouped: one row per campaign (no campaign_group_id)
  type GroupRow = {
    type: 'group';
    groupId: string;
    groupName: string;
    campaigns: typeof filteredCampaigns;
    // aggregated fields
    anyActive: boolean;
    id: string; // use groupId as selection id
  };
  type SingleRow = {
    type: 'single';
    campaign: (typeof filteredCampaigns)[0];
    id: string;
  };
  type DisplayRow = GroupRow | SingleRow;

  const displayRows: DisplayRow[] = (() => {
    const grouped = new Map<string, typeof filteredCampaigns>();
    const ungrouped: typeof filteredCampaigns = [];
    for (const c of filteredCampaigns) {
      if (c.campaign_group_id) {
        const arr = grouped.get(c.campaign_group_id) || [];
        arr.push(c);
        grouped.set(c.campaign_group_id, arr);
      } else {
        ungrouped.push(c);
      }
    }
    const rows: DisplayRow[] = [];
    for (const [groupId, members] of grouped) {
      rows.push({
        type: 'group',
        groupId,
        groupName: groupMap[groupId] || groupId,
        campaigns: members,
        anyActive: members.some(m => m.n8n_status === 'active'),
        id: groupId,
      });
    }
    for (const c of ungrouped) {
      rows.push({ type: 'single', campaign: c, id: c.id });
    }
    return rows;
  })();

  // Selection state
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
  } = useSelection(displayRows);

  // Expand selected display-row ids to actual campaign ids (groups → their members)
  const expandToCampaignIds = (ids: string[]): string[] => {
    const result: string[] = [];
    for (const id of ids) {
      const row = displayRows.find(r => r.id === id);
      if (!row) continue;
      if (row.type === 'group') result.push(...row.campaigns.map(c => c.id));
      else result.push(row.campaign.id);
    }
    return result;
  };

  // Handle toggle with toast feedback
  const handleToggle = async (id: string, action: 'activate' | 'deactivate') => {
    const result = await toggleCampaign(id, action);
    
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Toggle failed',
        description: result.error || 'Failed to toggle campaign',
      });
    }
  };

  // Bulk action handlers
  const handleBulkPause = async () => {
    if (!confirm(`Pause ${selectedCount} campaign(s)?`)) return;
    await Promise.all(
      expandToCampaignIds(selectedIds).map(id => toggleCampaign(id, 'deactivate'))
    );
    clearSelection();
    refresh();
  };

  const handleBulkResume = async () => {
    if (!confirm(`Resume ${selectedCount} campaign(s)?`)) return;
    await Promise.all(
      expandToCampaignIds(selectedIds).map(id => toggleCampaign(id, 'activate'))
    );
    clearSelection();
    refresh();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedCount} campaign(s)? This action cannot be undone.`)) return;
    const results = await Promise.all(
      expandToCampaignIds(selectedIds).map(id => deleteCampaign(id))
    );
    
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Partial failure',
        description: `${failures.length} campaign(s) could not be deleted`,
      });
    } else {
      toast({
        title: 'Deleted',
        description: `${selectedCount} campaign(s) deleted successfully`,
      });
    }
    
    clearSelection();
  };

  //Bulk actions configuration
  const bulkActions: BulkAction[] = [
    {
      id: 'pause',
      label: 'Pause',
      icon: Pause,
      onClick: handleBulkPause,
      requiresPermission: 'write',
    },
    {
      id: 'resume',
      label: 'Resume',
      icon: Play,
      onClick: handleBulkResume,
      requiresPermission: 'write',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: handleBulkDelete,
      variant: 'danger' as const,
      requiresPermission: 'manage',
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-text-secondary">
            <AlertCircle className="h-8 w-8 text-accent-danger" />
            <p>Failed to load campaigns</p>
            <button 
              onClick={refresh}
              className="text-accent-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate groups and ungrouped singles for list rendering
  const groupRows = displayRows.filter((r): r is Extract<typeof r, { type: 'group' }> => r.type === 'group');
  const singleRows = displayRows.filter((r): r is Extract<typeof r, { type: 'single' }> => r.type === 'single');

  // Inner row component – rich list design: status stripe + checkbox + name + schedule + toggle
  const CampaignRow = ({
    campaign,
    delay = 0,
    indent = false,
  }: {
    campaign: (typeof filteredCampaigns)[0];
    delay?: number;
    indent?: boolean;
  }) => {
    const isActive = campaign.n8n_status === 'active';
    const isError = campaign.n8n_status === 'error';
    const isPaused = campaign.n8n_status === 'paused';
    const stripeColor = isActive
      ? 'bg-emerald-500/60'
      : isError
      ? 'bg-red-500/55'
      : isPaused
      ? 'bg-amber-500/45'
      : 'bg-transparent';

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.14, delay }}
            className={`relative flex items-center gap-3 pr-5 py-3.5 border-b border-border/25 hover:bg-surface-elevated/20 transition-colors cursor-context-menu ${
              indent ? 'pl-12' : 'pl-5'
            }`}
          >
            {/* Status stripe */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm ${stripeColor}`} />

            {/* Checkbox */}
            <Checkbox
              checked={isSelected(campaign.id)}
              onCheckedChange={() => toggleSelection(campaign.id)}
              className="shrink-0"
            />

            {/* Name + description */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary leading-snug">
                <EditableText
                  value={campaign.name}
                  onSave={async (val) => { await updateCampaign(campaign.id, { name: val }); }}
                />
              </div>
              {campaign.description && (
                <p className="text-xs text-text-secondary/40 truncate mt-0.5">{campaign.description}</p>
              )}
            </div>

            {/* Schedule — own column */}
            <div className="shrink-0 w-8 flex items-center justify-center">
              <CampaignScheduleDialog campaignId={campaign.id} workflowId={campaign.n8n_workflow_id} />
            </div>

            {/* Toggle */}
            <div className="shrink-0">
            <CampaignToggle
              campaignId={campaign.id}
              isActive={isActive}
              isLinked={Boolean(campaign.n8n_workflow_id)}
              isToggling={isToggling(campaign.id)}
              onToggle={handleToggle}
            />
            </div>
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!canWrite}>
            <Pencil className="mr-2 h-4 w-4" />Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { navigator.clipboard.writeText(campaign.id); toast({ title: 'Copied', description: 'Campaign ID copied' }); }}>
            <Copy className="mr-2 h-4 w-4" />Copy Campaign ID
          </ContextMenuItem>
          <ContextMenuItem disabled>
            <CopyPlus className="mr-2 h-4 w-4" />Duplicate
            <ContextMenuShortcut className="text-text-secondary text-[10px]">Coming Soon</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => window.open(`/campaigns/${campaign.id}`, '_blank')}>
            <BarChart3 className="mr-2 h-4 w-4" />View Analytics
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => handleToggle(campaign.id, isActive ? 'deactivate' : 'activate')}
            disabled={!canWrite || !campaign.n8n_workflow_id || isToggling(campaign.id)}
          >
            {isActive ? (<><Pause className="mr-2 h-4 w-4" />Pause</>) : (<><Play className="mr-2 h-4 w-4" />Resume</>)}
          </ContextMenuItem>
          <ContextMenuSeparator />
          {canManage && (
            <ContextMenuItem destructive onClick={async () => {
              if (confirm(`Delete "${campaign.name}"?`)) {
                const r = await deleteCampaign(campaign.id);
                if (r.success) toast({ title: 'Deleted', description: `"${campaign.name}" deleted` });
                else toast({ variant: 'destructive', title: 'Delete failed', description: r.error || 'Failed' });
              }
            }}>
              <Trash2 className="mr-2 h-4 w-4" />Delete Campaign
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Campaign Management</CardTitle>
            <button
              onClick={refresh}
              className="p-1 hover:bg-surface-elevated rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          {filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-text-secondary/70">No campaigns yet</p>
            </div>
          ) : (
            <div>
              {/* Grouped campaigns */}
              {groupRows.map((row) => {
                const allActive = row.campaigns.every(c => c.n8n_status === 'active');
                const anyLinked = row.campaigns.some(c => c.n8n_workflow_id);
                return (
                  <div key={row.groupId}>
                    {/* Group section header — always expanded */}
                    <div className="w-full flex items-center gap-2.5 px-5 py-2.5 border-b border-border/50 bg-surface-subtle/30">
                      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
                        {row.groupName}
                      </span>
                      <span className="text-[10px] text-text-secondary/40 bg-surface-elevated/60 px-1.5 py-0.5 rounded">
                        {row.campaigns.length}
                      </span>
                      <div className="flex-1" />
                      {anyLinked && (
                        <span
                          role="button"
                          className="text-[11px] text-text-secondary/50 hover:text-text-primary transition-colors cursor-pointer pr-1"
                          onClick={() => {
                            const action = allActive ? 'deactivate' : 'activate';
                            if (confirm(`${allActive ? 'Pause' : 'Resume'} all ${row.campaigns.length} sequences in "${row.groupName}"?`)) {
                              Promise.all(row.campaigns.map(c => toggleCampaign(c.id, action))).then(refresh);
                            }
                          }}
                        >
                          {allActive ? 'Pause all' : 'Resume all'}
                        </span>
                      )}
                    </div>
                    {/* Always show all campaigns */}
                    {row.campaigns.map((campaign, si) => (
                      <CampaignRow key={campaign.id} campaign={campaign} delay={si * 0.04} indent />
                    ))}
                  </div>
                );
              })}

              {/* Ungrouped campaigns */}
              {singleRows.map((row, i) => (
                <CampaignRow key={row.campaign.id} campaign={row.campaign} delay={i * 0.03} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BulkActionToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
    </motion.div>
  );
}
