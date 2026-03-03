/**
 * Campaign Management Table
 * 
 * Phase 31 Pillar 4: The Optimistic Interface
 * Table for managing campaigns with toggle functionality.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RefreshCw, AlertCircle, Pencil, Pause, Play, Trash2, BarChart3, ChevronDown, ChevronRight, Copy, CopyPlus } from 'lucide-react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useCampaignGroups } from '@/hooks/use-campaign-groups';
import { CampaignToggle } from './campaign-toggle';
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };
  
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

  // Separate groups and ungrouped singles for clean grid rendering
  const groupRows = displayRows.filter((r): r is Extract<typeof r, { type: 'group' }> => r.type === 'group');
  const singleRows = displayRows.filter((r): r is Extract<typeof r, { type: 'single' }> => r.type === 'single');

  const CampaignCard = ({ campaign, delay = 0 }: { campaign: (typeof filteredCampaigns)[0]; delay?: number }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, delay }}
          className="bg-surface-elevated/40 border border-border hover:border-border hover:bg-surface-elevated/80 rounded-xl p-4 cursor-context-menu transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Checkbox
                checked={isSelected(campaign.id)}
                onCheckedChange={() => toggleSelection(campaign.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary leading-snug">
                  <EditableText
                    value={campaign.name}
                    onSave={async (val) => { await updateCampaign(campaign.id, { name: val }); }}
                  />
                </p>
                {campaign.description && (
                  <p className="text-xs text-text-secondary/50 mt-0.5 truncate">{campaign.description}</p>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <CampaignToggle
                campaignId={campaign.id}
                isActive={campaign.n8n_status === 'active'}
                isLinked={Boolean(campaign.n8n_workflow_id)}
                isToggling={isToggling(campaign.id)}
                onToggle={handleToggle}
              />
            </div>
          </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={!canWrite}>
          <Pencil className="mr-2 h-4 w-4" />Rename
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => { navigator.clipboard.writeText(campaign.id); toast({ title: 'Copied', description: 'Campaign ID copied to clipboard' }); }}>
          <Copy className="mr-2 h-4 w-4" />Copy Campaign ID
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
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
          onClick={() => handleToggle(campaign.id, campaign.n8n_status === 'active' ? 'deactivate' : 'activate')}
          disabled={!canWrite || !campaign.n8n_workflow_id || isToggling(campaign.id)}
        >
          {campaign.n8n_status === 'active' ? (<><Pause className="mr-2 h-4 w-4" />Pause Campaign</>) : (<><Play className="mr-2 h-4 w-4" />Resume Campaign</>)}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {canManage && (
          <ContextMenuItem destructive onClick={async () => {
            if (confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
              const result = await deleteCampaign(campaign.id);
              if (result.success) toast({ title: 'Deleted', description: `"${campaign.name}" deleted` });
              else toast({ variant: 'destructive', title: 'Delete failed', description: result.error || 'Failed to delete campaign' });
            }
          }}>
            <Trash2 className="mr-2 h-4 w-4" />Delete Campaign
            <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Campaign Management</CardTitle>
            <button
              onClick={refresh}
              className="p-1 hover:bg-surface-elevated rounded transition-colors"
              title="Refresh campaigns"
            >
              <RefreshCw className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-10">
          {filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-text-secondary/70">No campaigns yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped campaigns */}
              {groupRows.map((row) => {
                const isExpanded = expandedGroups.has(row.groupId);
                const allActive = row.campaigns.every(c => c.n8n_status === 'active');
                const anyLinked = row.campaigns.some(c => c.n8n_workflow_id);
                return (
                  <div key={row.groupId} className="space-y-3">
                    <button
                      className="w-full flex items-center gap-2.5 group"
                      onClick={() => toggleGroupExpand(row.groupId)}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-text-secondary shrink-0" />}
                      <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{row.groupName}</span>
                      <span className="text-xs text-text-secondary/40">{row.campaigns.length} sequences</span>
                      <div className="flex-1 h-px bg-border/40" />
                      {anyLinked && (
                        <span
                          role="button"
                          className="text-xs text-text-secondary/60 hover:text-text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const action = allActive ? 'deactivate' : 'activate';
                            if (confirm(`${allActive ? 'Pause' : 'Resume'} all ${row.campaigns.length} sequences in "${row.groupName}"?`)) {
                              Promise.all(row.campaigns.map(c => toggleCampaign(c.id, action))).then(refresh);
                            }
                          }}
                        >
                          {allActive ? 'Pause all' : 'Resume all'}
                        </span>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {row.campaigns.map((campaign, si) => (
                          <CampaignCard key={campaign.id} campaign={campaign} delay={si * 0.04} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Ungrouped campaigns */}
              {singleRows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {singleRows.map((row, i) => (
                    <CampaignCard key={row.campaign.id} campaign={row.campaign} delay={i * 0.03} />
                  ))}
                </div>
              )}
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
