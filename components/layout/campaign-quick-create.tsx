'use client';

/**
 * Campaign Quick Create — Top Navbar Campaign Action Button
 *
 * Ghost icon button (matches other navbar icons).
 * Opens a centered Dialog overlay — not a nav-anchored dropdown — so it never
 * clips against the navbar edge.
 *
 * - Reads ?group= URL param to show a checkmark on the active campaign group.
 * - "Create New Campaign" opens NewCampaignModal.
 * - Selecting a group navigates to /?group=<id>.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Check, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PermissionGate } from '@/components/ui/permission-gate';
import { NewCampaignModal } from '@/components/campaigns/new-campaign-modal';
import { useWorkspace } from '@/lib/workspace-context';
import { useCampaignGroups } from '@/hooks/use-campaign-groups';
import { cn } from '@/lib/utils';

export function CampaignQuickCreate() {
  const [open, setOpen] = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? null;
  const { groups, isLoading } = useCampaignGroups(workspaceId);

  const selectedGroupId = searchParams.get('group') ?? undefined;

  const handleGroupSelect = (groupId: string | undefined) => {
    setOpen(false);
    const params = new URLSearchParams();
    if (groupId) params.set('group', groupId);
    if (workspace?.slug) params.set('workspace', workspace.slug);
    router.push(`/?${params.toString()}`);
  };

  return (
    <>
      {/* Ghost trigger — matches Search / Share / Bell style */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Campaign Groups"
        disabled={isLoading}
      >
        <Layers className="h-5 w-5 text-text-secondary hover:text-text-primary transition-colors" />
      </Button>

      {/* Centered full-page overlay dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Campaign Groups</DialogTitle>
          </DialogHeader>

          <div className="space-y-0.5 pt-1">
            {/* Create New Campaign */}
            <PermissionGate
              requires="write"
              disableInstead
              disabledMessage="Upgrade your role to create campaigns"
            >
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-accent-primary hover:bg-accent-primary/5 transition-colors"
                onClick={() => {
                  setOpen(false);
                  setShowNewCampaignModal(true);
                }}
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                Create New Campaign
              </button>
            </PermissionGate>

            <div className="border-t border-border my-2" />

            {/* All Campaigns */}
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors"
              onClick={() => handleGroupSelect(undefined)}
            >
              {!selectedGroupId ? (
                <Check className="h-4 w-4 text-accent-primary flex-shrink-0" />
              ) : (
                <div className="h-4 w-4 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm',
                  !selectedGroupId
                    ? 'text-accent-primary font-medium'
                    : 'text-text-primary'
                )}
              >
                All Campaigns
              </span>
            </button>

            {/* Individual groups */}
            {groups.length > 0 && <div className="border-t border-border my-2" />}
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors"
                onClick={() => handleGroupSelect(group.id)}
              >
                {selectedGroupId === group.id ? (
                  <Check className="h-4 w-4 text-accent-primary flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 flex-shrink-0" />
                )}
                <div className="flex flex-col text-left">
                  <span
                    className={cn(
                      'text-sm',
                      selectedGroupId === group.id
                        ? 'text-accent-primary font-medium'
                        : 'text-text-primary'
                    )}
                  >
                    {group.name}
                  </span>
                  {group.campaigns && group.campaigns.length > 0 && (
                    <span className="text-xs text-text-secondary">
                      {group.campaigns.length} sequence
                      {group.campaigns.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            ))}

            {groups.length === 0 && !isLoading && (
              <p className="px-3 py-4 text-sm text-text-secondary text-center">
                No campaign groups yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewCampaignModal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
      />
    </>
  );
}
