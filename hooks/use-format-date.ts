'use client';

import { useCallback } from 'react';
import { useOptionalTimezone, formatInTimezone } from '@/lib/timezone-context';
import { useDateFormat } from '@/lib/date-format-context';

/**
 * Hook to format dates using the user's selected timezone AND date format.
 *
 * Respects both the workspace timezone and the US/EU date format preference.
 * Falls back to browser timezone and US format when outside providers.
 */
export function useFormatDate() {
  const timezoneContext = useOptionalTimezone();
  const timezone = timezoneContext?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { locale } = useDateFormat();

  const formatDate = useCallback(
    (
      date: Date | string,
      format: 'short' | 'long' | 'datetime' | 'datetime-full' | 'time' | 'time-24' | 'iso' | 'full' = 'short'
    ) => {
      return formatInTimezone(date, timezone, format, locale);
    },
    [timezone, locale]
  );

  return { formatDate, timezone };
}
