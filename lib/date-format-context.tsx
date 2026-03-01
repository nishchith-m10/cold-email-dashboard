'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

/**
 * DateFormat Context
 *
 * Manages date display format preference (US = MM/DD/YYYY, EU = DD/MM/YYYY).
 * Persists to localStorage and syncs across components.
 */

export type DateFormat = 'US' | 'EU';

export interface DateFormatContextValue {
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
  /** Intl locale string: 'en-US' for US format, 'en-GB' for EU format */
  locale: string;
}

const DateFormatContext = createContext<DateFormatContextValue | undefined>(undefined);

const STORAGE_KEY = 'dashboard_date_format';

interface DateFormatProviderProps {
  children: ReactNode;
}

export function DateFormatProvider({ children }: DateFormatProviderProps) {
  const [dateFormat, setDateFormatState] = useState<DateFormat>('US');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'US' || saved === 'EU') {
        setDateFormatState(saved);
      }
    } catch {
      // localStorage unavailable (SSR guard)
    }
  }, []);

  const setDateFormat = useCallback((format: DateFormat) => {
    setDateFormatState(format);
    try {
      localStorage.setItem(STORAGE_KEY, format);
    } catch {
      // ignore
    }
  }, []);

  const locale = dateFormat === 'EU' ? 'en-GB' : 'en-US';

  return (
    <DateFormatContext.Provider value={{ dateFormat, setDateFormat, locale }}>
      {children}
    </DateFormatContext.Provider>
  );
}

/**
 * Access the date format context. Safe to use outside the provider — returns
 * a stable US-format fallback so it never throws.
 */
export function useDateFormat(): DateFormatContextValue {
  const context = useContext(DateFormatContext);
  if (!context) {
    // Fallback when called outside provider (e.g. pure utility context)
    return {
      dateFormat: 'US',
      setDateFormat: () => {},
      locale: 'en-US',
    };
  }
  return context;
}
