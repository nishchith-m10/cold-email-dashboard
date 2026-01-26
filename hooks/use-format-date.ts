'use client';

import { useCallback } from 'react';
import { useOptionalTimezone, formatInTimezone } from '@/lib/timezone-context';

/**
 * Hook to format dates using the user's selected timezone
 * 
 * This hook provides a simple way to format dates consistently across the app
 * using the timezone from TimezoneContext. Falls back to browser timezone if
 * context is not available.
 */
export function useFormatDate() {
  const timezoneContext = useOptionalTimezone();
  const timezone = timezoneContext?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatDate = useCallback((
    date: Date | string,
    format: 'short' | 'long' | 'datetime' | 'datetime-full' | 'time' | 'time-24' | 'iso' | 'full' = 'short'
  ) => {
    return formatInTimezone(date, timezone, format);
  }, [timezone]);

  return {
    formatDate,
    timezone,
  };
}
