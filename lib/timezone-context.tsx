'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWorkspace } from '@/lib/workspace-context';

/**
 * Timezone Context
 * 
 * Provides timezone state throughout the app, synced with workspace settings
 */

interface TimezoneContextValue {
  timezone: string;
  setTimezone: (timezone: string) => void;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

/**
 * Detect the user's system timezone
 */
function detectTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return detected || 'UTC';
  } catch {
    return 'UTC';
  }
}

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const { workspace } = useWorkspace();
  const [timezone, setTimezoneState] = useState<string>('UTC');
  const [isLoading, setIsLoading] = useState(true);

  // Load timezone from workspace settings or localStorage
  useEffect(() => {
    setIsLoading(true);
    
    // Priority order:
    // 1. Workspace settings (if available)
    // 2. localStorage (user preference)
    // 3. Auto-detected system timezone
    // 4. UTC fallback
    
    if (workspace?.settings?.timezone && typeof workspace.settings.timezone === 'string') {
      setTimezoneState(workspace.settings.timezone);
    } else {
      const savedTz = localStorage.getItem('dashboard_timezone');
      if (savedTz) {
        setTimezoneState(savedTz);
      } else {
        const detected = detectTimezone();
        setTimezoneState(detected);
        localStorage.setItem('dashboard_timezone', detected);
      }
    }
    
    setIsLoading(false);
  }, [workspace?.settings?.timezone]);

  // Update timezone and sync with workspace settings
  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem('dashboard_timezone', tz);
    
    // Sync with workspace settings API
    if (workspace?.id) {
      fetch('/api/workspaces/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspace_id: workspace.id, 
          timezone: tz 
        }),
      }).catch(err => {
        console.error('Failed to sync timezone with workspace settings:', err);
      });
    }
  }, [workspace?.id]);

  // Listen for storage events (timezone changes in other tabs)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dashboard_timezone' && e.newValue) {
        setTimezoneState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, isLoading }}>
      {children}
    </TimezoneContext.Provider>
  );
}

/**
 * Hook to access timezone context
 */
export function useTimezone(): TimezoneContextValue {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}

/**
 * Optional hook that doesn't throw if outside provider
 */
export function useOptionalTimezone(): TimezoneContextValue | undefined {
  return useContext(TimezoneContext);
}

/**
 * Format a date in the user's selected timezone
 */
export function formatInTimezone(
  date: Date | string, 
  timezone: string, 
  formatStr: string = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  switch (formatStr) {
    case 'short':
      return d.toLocaleDateString('en-US', { 
        ...options, 
        month: 'short', 
        day: 'numeric' 
      });
    case 'long':
      return d.toLocaleDateString('en-US', { 
        ...options, 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'datetime':
      return d.toLocaleString('en-US', { 
        ...options, 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    case 'datetime-full':
      return d.toLocaleString('en-US', { 
        ...options, 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        second: '2-digit'
      });
    case 'time':
      return d.toLocaleTimeString('en-US', { 
        ...options, 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    case 'time-24':
      return d.toLocaleTimeString('en-US', { 
        ...options, 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    case 'iso':
      // Return YYYY-MM-DD in the specified timezone
      const formatter = new Intl.DateTimeFormat('en-CA', { 
        ...options, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      return formatter.format(d);
    case 'full':
      return d.toLocaleDateString('en-US', {
        ...options,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    default:
      return d.toLocaleDateString('en-US', { 
        ...options, 
        month: 'short', 
        day: 'numeric' 
      });
  }
}

/**
 * Get current date in a specific timezone as YYYY-MM-DD
 */
export function getTodayInTimezone(timezone: string): string {
  return formatInTimezone(new Date(), timezone, 'iso');
}

/**
 * Get the start of day in a specific timezone
 */
export function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  const dateStr = formatInTimezone(date, timezone, 'iso');
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Get the end of day in a specific timezone
 */
export function getEndOfDayInTimezone(date: Date, timezone: string): Date {
  const dateStr = formatInTimezone(date, timezone, 'iso');
  return new Date(dateStr + 'T23:59:59.999');
}
