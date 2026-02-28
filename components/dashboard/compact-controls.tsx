/**
 * Compact Controls - Icon-only controls with tooltips
 * Used across Dashboard, Analytics, Contacts, Sequences pages
 */

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { CampaignGroup } from '@/lib/dashboard-types';
import { Calendar, Clock, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePickerContent } from './date-range-picker-content';
import { TimezoneSelectorContent } from './timezone-selector-content';
import { cn } from '@/lib/utils';

interface CompactControlsProps {
  // Date range
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  
  // Campaign groups — kept for API compat; no longer rendered here (moved to top navbar)
  campaignGroups?: CampaignGroup[];
  selectedGroupId?: string;
  onGroupChange?: (groupId: string | undefined) => void;
  campaignGroupsLoading?: boolean;
  onNewCampaign?: () => void;
  
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
  timezone,
  onTimezoneChange,
  onSettingsOpen,
  showSettings = true,
}: CompactControlsProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);

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
