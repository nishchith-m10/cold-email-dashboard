'use client';

/**
 * Campaign Quick Create — Top Navbar Campaign Action Button
 *
 * Ghost icon button (matches other navbar icons).
 * Opens a DropdownMenu anchored below the icon — no overlay, no blur,
 * click anywhere outside to dismiss.
 *
 * - Reads ?group= URL param to show a checkmark on the active campaign group.
 * - "Create New Campaign" opens NewCampaignModal (centered, blurred backdrop).
 * - Selecting a group navigates to /?group=<id>.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Check, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PermissionGate } from '@/components/ui/permission-gate';
import { NewCampaignModal } from '@/components/campaigns/new-campaign-modal';
import { useWorkspace } from '@/lib/workspace-context';
import { useCampaignGroups } from '@/hooks/use-campaign-groups';
import { cn } from '@/lib/utils';

export function CampaignQuickCreate() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? null;
  const { groups, isLoading } = useCampaignGroups(workspaceId);

  const selectedGroupId = searchParams.get('group') ?? undefined;

  const handleGroupSelect = (groupId: string | undefined) => {
    const params = new URLSearchParams();
    if (groupId) params.set('group', groupId);
    if (workspace?.slug) params.set('workspace', workspace.slug);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <>
      {/* Dropdown anchored to the icon — no overlay, click-outside closes */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="Campaign Groups"
          >
            <Layers className="h-5 w-5 text-text-secondary hover:text-text-primary" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {/* Create New Campaign */}
          <PermissionGate
            requires="write"
            disableInstead
            disabledMessage="Upgrade your role to create campaigns"
          >
            <DropdownMenuItem
              className="text-accent-primary focus:text-accent-primary gap-2"
              onSelect={() => setShowNewCampaignModal(true)}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              Create New Campaign
            </DropdownMenuItem>
          </PermissionGate>

          <DropdownMenuSeparator />

          {/* All Campaigns */}
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => handleGroupSelect(undefined)}
          >
            {!selectedGroupId ? (
              <Check className="h-4 w-4 text-accent-primary flex-shrink-0" />
            ) : (
              <div className="h-4 w-4 flex-shrink-0" />
            )}
            <span
              className={cn(
                !selectedGroupId ? 'text-accent-primary font-medium' : ''
              )}
            >
              All Campaigns
            </span>
          </DropdownMenuItem>

          {/* Individual groups */}
          {groups.length > 0 && <DropdownMenuSeparator />}
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              className="gap-2"
              onSelect={() => handleGroupSelect(group.id)}
            >
              {selectedGroupId === group.id ? (
                <Check className="h-4 w-4 text-accent-primary flex-shrink-0" />
              ) : (
                <div className="h-4 w-4 flex-shrink-0" />
              )}
              <div className="flex flex-col text-left min-w-0">
                <span
                  className={cn(
                    'text-sm truncate',
                    selectedGroupId === group.id
                      ? 'text-accent-primary font-medium'
                      : ''
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
            </DropdownMenuItem>
          ))}

          {groups.length === 0 && !isLoading && (
            <div className="px-2 py-3 text-xs text-text-secondary text-center">
              No campaign groups yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Centered modal with blurred backdrop — opened from "Create New Campaign" */}
      <NewCampaignModal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
      />
    </>
  );
}
