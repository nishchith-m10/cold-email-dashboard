/**
 * Timezone Selector Content - Timezone list without trigger button
 * Used by CompactControls for icon-only integration
 */

'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

const TIMEZONES: TimezoneOption[] = [
  { value: 'America/Los_Angeles', label: 'Pacific Time', offset: 'PT' },
  { value: 'America/Denver', label: 'Mountain Time', offset: 'MT' },
  { value: 'America/Chicago', label: 'Central Time', offset: 'CT' },
  { value: 'America/New_York', label: 'Eastern Time', offset: 'ET' },
  { value: 'UTC', label: 'UTC', offset: 'UTC' },
  { value: 'Europe/London', label: 'London', offset: 'GMT' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'CET' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'JST' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'AEST' },
];

interface TimezoneSelectorContentProps {
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
}

function detectTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = TIMEZONES.find(tz => tz.value === detected);
    return match ? detected : 'UTC';
  } catch {
    return 'UTC';
  }
}

export function TimezoneSelectorContent({
  selectedTimezone,
  onTimezoneChange,
}: TimezoneSelectorContentProps) {
  const [autoDetected] = useState(() => detectTimezone());

  return (
    <div className="rounded-xl border border-border bg-surface shadow-lg p-2 min-w-[180px]">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          Timezone
        </p>
        {autoDetected !== selectedTimezone && (
          <button
            onClick={() => onTimezoneChange(autoDetected)}
            className="text-[10px] text-accent-primary hover:text-accent-primary/80 font-medium flex items-center gap-1"
          >
            <MapPin className="h-3 w-3" />
            Auto
          </button>
        )}
      </div>
      {TIMEZONES.map(tz => (
        <button
          key={tz.value}
          onClick={() => onTimezoneChange(tz.value)}
          className={cn(
            'w-full rounded-md px-2 py-1.5 text-left text-xs transition flex justify-between items-center',
            tz.value === selectedTimezone
              ? 'bg-accent-primary/10 text-accent-primary'
              : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
          )}
        >
          <span className="flex items-center gap-1.5">
            {tz.label}
            {tz.value === autoDetected && (
              <MapPin className="h-3 w-3 text-accent-success" />
            )}
          </span>
          <span className="text-text-secondary">{tz.offset}</span>
        </button>
      ))}
    </div>
  );
}
