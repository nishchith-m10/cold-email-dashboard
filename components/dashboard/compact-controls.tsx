/**
 * Compact Controls - Icon-only controls with tooltips
 * Used across Dashboard, Analytics, Contacts, Sequences pages
 */

'use client';

import { useState } from 'react';
import type { CampaignGroup } from '@/lib/dashboard-types';
import { Clock, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from './date-range-picker';
import { TimezoneSelectorContent } from './timezone-selector-content';

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
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      {/* Calendar Date Range - Full picker with date text */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateChange={onDateChange}
      />

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
