/**
 * Compact Controls - Icon-only controls with tooltips
 * Used across Dashboard, Analytics, Contacts, Sequences pages
 */

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { CampaignGroup } from '@/lib/dashboard-types';
import { 
  Calendar, 
  Clock, 
  Settings2, 
  Folder,
  Plus,
  Check,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Popover from '@radix-ui/react-popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { DateRangePickerContent } from './date-range-picker-content';
import { TimezoneSelectorContent } from './timezone-selector-content';
import { PermissionGate } from '@/components/ui/permission-gate';
import { cn } from '@/lib/utils';

interface CompactControlsProps {
  // Date range
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  
  // Campaign groups (primary selection unit — is_test groups pre-filtered)
  campaignGroups: CampaignGroup[];
  selectedGroupId?: string;
  onGroupChange: (groupId: string | undefined) => void;
  campaignGroupsLoading?: boolean;
  onNewCampaign: () => void;
  
  // Timezone
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  
  // Settings
  onSettingsOpen?: () => void;
  showSettings?: boolean;
}

export function CompactControls({
  startDate,
  endDate,
  onDateChange,
  campaignGroups,
  selectedGroupId,
  onGroupChange,
  campaignGroupsLoading,
  onNewCampaign,
  timezone,
  onTimezoneChange,
  onSettingsOpen,
  showSettings = true,
}: CompactControlsProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const selectedGroupName =
    campaignGroups.find(g => g.id === selectedGroupId)?.name || 'All Campaigns';
  
  const dateRangeLabel = `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`;

  return (
    <div className="flex items-center gap-1.5">
      {/* Calendar Date Range - Icon Only */}
      <div key="date-range" className="relative">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title={dateRangeLabel}
          onClick={() => setDatePickerOpen(!datePickerOpen)}
        >
          <Calendar className="h-4 w-4" />
        </Button>
        
        {datePickerOpen && (
          <>
            <div 
              key="date-picker-backdrop"
              className="fixed inset-0 z-40" 
              onClick={() => setDatePickerOpen(false)}
            />
            <div key="date-picker-content" className="absolute top-full right-0 mt-2 z-50">
              <DateRangePickerContent
                startDate={startDate}
                endDate={endDate}
                onDateChange={(start, end) => {
                  onDateChange(start, end);
                  setDatePickerOpen(false);
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Timezone - Icon Only */}
      <div key="timezone" className="relative">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title={`Timezone: ${timezone}`}
          onClick={() => setTimezoneOpen(!timezoneOpen)}
        >
          <Clock className="h-4 w-4" />
        </Button>
        
        {timezoneOpen && (
          <>
            <div 
              key="timezone-backdrop"
              className="fixed inset-0 z-40" 
              onClick={() => setTimezoneOpen(false)}
            />
            <div key="timezone-content" className="absolute top-full right-0 mt-2 z-50">
              <TimezoneSelectorContent
                selectedTimezone={timezone}
                onTimezoneChange={(tz) => {
                  onTimezoneChange(tz);
                  setTimezoneOpen(false);
                }}
              />
            </div>
          </>
        )}
      </div>

      <div key="divider-1" className="h-5 w-px bg-border mx-1" />

      {/* Campaign Group Selector + New Campaign - Combined Icon Only */}
      <DropdownMenu key="group-menu">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8",
              selectedGroupId && "border-accent-primary bg-accent-primary/5"
            )}
            disabled={campaignGroupsLoading}
            title={`Group: ${selectedGroupName}`}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">

          {/* New Campaign — write-gated: member+ only */}
          <PermissionGate requires="write" disableInstead disabledMessage="Upgrade your role to create campaigns">
            <DropdownMenuItem
              key="new-campaign"
              className="gap-2 text-accent-primary font-medium"
              onSelect={onNewCampaign}
            >
              <Plus className="h-4 w-4" />
              Create New Campaign
            </DropdownMenuItem>
          </PermissionGate>

          <DropdownMenuSeparator key="top-separator" />

          <DropdownMenuLabel className="text-xs text-text-secondary font-normal px-2 py-1">
            Campaign Groups
          </DropdownMenuLabel>

          {/* All Campaigns (clear selection) */}
          <DropdownMenuItem
            key="all-groups"
            className="gap-2"
            onSelect={() => onGroupChange(undefined)}
          >
            {!selectedGroupId && <Check className="h-4 w-4" />}
            <span className={!selectedGroupId ? 'ml-0' : 'ml-6'}>All Campaigns</span>
          </DropdownMenuItem>

          {/* Individual Groups (is_test=true already filtered upstream) */}
          {campaignGroups.length > 0 && <DropdownMenuSeparator key="group-separator" />}
          {campaignGroups.map((group, index) => (
            <DropdownMenuItem
              key={group.id ?? `group-${index}`}
              className="gap-2"
              onSelect={() => onGroupChange(group.id)}
            >
              {selectedGroupId === group.id && <Check className="h-4 w-4" />}
              <div className={cn('flex flex-col', selectedGroupId === group.id ? 'ml-0' : 'ml-6')}>
                <span className="text-sm">{group.name}</span>
                {group.campaigns && group.campaigns.length > 0 && (
                  <span className="text-xs text-text-secondary">
                    {group.campaigns.length} sequence{group.campaigns.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))}

          {campaignGroups.length === 0 && !campaignGroupsLoading && (
            <div className="px-2 py-1.5 text-sm text-text-secondary">
              No campaign groups yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings - Icon Only (optional) */}
      {showSettings && onSettingsOpen && (
        <>
          <div key="settings-divider" className="h-5 w-px bg-border mx-1" />
          <Button
            key="settings-button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onSettingsOpen}
            title="Customize Dashboard"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
