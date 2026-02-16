/**
 * Compact Controls - Icon-only controls with tooltips
 * Used across Dashboard, Analytics, Contacts, Sequences pages
 */

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { Campaign } from '@/lib/dashboard-types';
import { 
  Calendar, 
  Clock, 
  Settings2, 
  Folder,
  Plus,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Popover from '@radix-ui/react-popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRangePickerContent } from './date-range-picker-content';
import { TimezoneSelectorContent } from './timezone-selector-content';
import { cn } from '@/lib/utils';

interface CompactControlsProps {
  // Date range
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  
  // Campaigns
  campaigns: Campaign[];
  selectedCampaign?: string;
  onCampaignChange: (campaignId: string | undefined) => void;
  campaignsLoading?: boolean;
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
  campaigns,
  selectedCampaign,
  onCampaignChange,
  campaignsLoading,
  onNewCampaign,
  timezone,
  onTimezoneChange,
  onSettingsOpen,
  showSettings = true,
}: CompactControlsProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const selectedCampaignName = campaigns.find(c => c.id === selectedCampaign)?.name || 'All Campaigns';
  
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

      {/* Campaign Selector + New Campaign - Combined Icon Only */}
      <DropdownMenu key="campaign-menu">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8",
              selectedCampaign && "border-accent-primary bg-accent-primary/5"
            )}
            disabled={campaignsLoading}
            title={`Campaign: ${selectedCampaignName}`}
          >
            <Folder className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
              {/* New Campaign Option */}
              <DropdownMenuItem
                className="gap-2 text-accent-primary font-medium"
                onSelect={onNewCampaign}
              >
                <Plus className="h-4 w-4" />
                Create New Campaign
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* All Campaigns */}
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => onCampaignChange(undefined)}
              >
                {!selectedCampaign && <Check className="h-4 w-4" />}
                <span className={!selectedCampaign ? 'ml-0' : 'ml-6'}>All Campaigns</span>
              </DropdownMenuItem>
              
              {/* Individual Campaigns */}
              {campaigns.length > 0 && <DropdownMenuSeparator key="campaign-separator" />}
              {campaigns.map((campaign) => (
                <DropdownMenuItem
                  key={campaign.id}
                  className="gap-2"
                  onSelect={() => onCampaignChange(campaign.id)}
                >
                  {selectedCampaign === campaign.id && <Check className="h-4 w-4" />}
                  <span className={selectedCampaign === campaign.id ? 'ml-0' : 'ml-6'}>
                    {campaign.name}
                  </span>
                </DropdownMenuItem>
              ))}
              
              {campaigns.length === 0 && !campaignsLoading && (
                <div className="px-2 py-1.5 text-sm text-text-secondary">
                  No campaigns yet
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
