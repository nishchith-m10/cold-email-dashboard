'use client';

/**
 * Campaign Quick Create — Top Navbar Campaign Action Button
 * 
 * Renders a compact dropdown in the top navbar with:
 * - "Create New Campaign" → opens NewCampaignModal
 * - "View Campaign Groups" → navigates to dashboard with campaign group filter
 * 
 * Owned by: Session P2.1
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, Rocket, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NewCampaignModal } from '@/components/campaigns/new-campaign-modal';
import { useWorkspace } from '@/lib/workspace-context';

export function CampaignQuickCreate() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const router = useRouter();
  const { workspace } = useWorkspace();

  const handleViewCampaignGroups = () => {
    const query = workspace?.slug ? `?workspace=${workspace.slug}` : '';
    router.push(`/${query}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary border border-border/50 rounded-lg px-3 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs font-medium hidden xl:block">New Campaign</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-surface-elevated border-border rounded-xl shadow-2xl w-48"
        >
          <DropdownMenuItem
            onClick={() => setShowNewCampaignModal(true)}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Rocket className="h-4 w-4" />
            Create New Campaign
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onClick={handleViewCampaignGroups}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <LayoutGrid className="h-4 w-4" />
            View Campaign Groups
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewCampaignModal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
      />
    </>
  );
}
