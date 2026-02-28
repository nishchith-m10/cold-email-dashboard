'use client';

/**
 * Campaign Quick Create — Top Navbar Campaign Action Button
 *
 * Replicates the Layers (campaign group selector) button from CompactControls,
 * but as a globally-wired button in the top navbar. Works from any page.
 *
 * - Same Layers icon as CompactControls
 * - Same popup: "Create New Campaign" + campaign groups list
 * - Selecting a group navigates to the dashboard with ?group= param
 * - "Create New Campaign" opens NewCampaignModal
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { PermissionGate } from '@/components/ui/permission-gate';
import { NewCampaignModal } from '@/components/campaigns/new-campaign-modal';
import { useWorkspace } from '@/lib/workspace-context';
import { useCampaignGroups } from '@/hooks/use-campaign-groups';
import { cn } from '@/lib/utils';

export function CampaignQuickCreate() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? null;
  const { groups, isLoading } = useCampaignGroups(workspaceId);

  const handleGroupSelect = (groupId: string | undefined) => {
    const params = new URLSearchParams();
    if (groupId) params.set('group', groupId);
    if (workspace?.slug) params.set('workspace', workspace.slug);
    router.push(`/?${params.toString()}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Campaign Groups"
            disabled={isLoading}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">

          {/* Create New Campaign — write-gated */}
          <PermissionGate requires="write" disableInstead disabledMessage="Upgrade your role to create campaigns">
            <DropdownMenuItem
              className="gap-2 text-accent-primary font-medium"
              onSelect={() => setShowNewCampaignModal(true)}
            >
              <Plus className="h-4 w-4" />
              Create New Campaign
            </DropdownMenuItem>
          </PermissionGate>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-text-secondary font-normal px-2 py-1">
            Campaign Groups
          </DropdownMenuLabel>

          {/* All Campaigns */}
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => handleGroupSelect(undefined)}
          >
            <span className="ml-6">All Campaigns</span>
          </DropdownMenuItem>

          {/* Individual groups */}
          {groups.length > 0 && <DropdownMenuSeparator />}
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              className="gap-2"
              onSelect={() => handleGroupSelect(group.id)}
            >
              <div className={cn('flex flex-col ml-6')}>
                <span className="text-sm">{group.name}</span>
                {group.campaigns && group.campaigns.length > 0 && (
                  <span className="text-xs text-text-secondary">
                    {group.campaigns.length} sequence{group.campaigns.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))}

          {groups.length === 0 && !isLoading && (
            <div className="px-2 py-1.5 text-sm text-text-secondary">
              No campaign groups yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <NewCampaignModal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
      />
    </>
  );
}
