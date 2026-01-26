'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

/**
 * Currency Context
 * 
 * Manages currency preference with server-side persistence
 * Supported currencies: USD ($), EUR (€), GBP (£), JPY (¥)
 */

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

const DEFAULT_CURRENCY: Currency = 'USD';

/**
 * Detect the user's system currency based on locale
 */
function detectCurrency(): Currency {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const currencyCode = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
    })
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value;
    
    // Try to detect from locale
    if (locale.includes('en-GB') || locale.includes('GB')) {
      return 'GBP';
    }
    if (locale.includes('ja') || locale.includes('JP')) {
      return 'JPY';
    }
    if (locale.includes('de') || locale.includes('fr') || locale.includes('es') || locale.includes('it')) {
      return 'EUR';
    }
    
    return DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  // Load currency from server settings or localStorage on mount
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        // Try to load from server
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.currency && ['USD', 'EUR', 'GBP', 'JPY'].includes(data.currency)) {
            setCurrencyState(data.currency as Currency);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load currency from server:', error);
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('dashboard_currency');
      if (saved && ['USD', 'EUR', 'GBP', 'JPY'].includes(saved)) {
        setCurrencyState(saved as Currency);
      } else {
        // Fallback to auto-detected currency
        const detected = detectCurrency();
        setCurrencyState(detected);
        localStorage.setItem('dashboard_currency', detected);
      }
      setIsLoading(false);
    };

    loadCurrency();
  }, []);

  const setCurrency = useCallback(async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('dashboard_currency', newCurrency);

    // Persist to server
    try {
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: newCurrency }),
      });
    } catch (error) {
      console.error('Failed to save currency to server:', error);
    }
  }, []);

  // Listen for storage events (currency changes in other tabs)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dashboard_currency' && e.newValue) {
        if (['USD', 'EUR', 'GBP', 'JPY'].includes(e.newValue)) {
          setCurrencyState(e.newValue as Currency);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Hook to access currency context
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

/**
 * Optional hook that doesn't throw if outside provider
 */
export function useOptionalCurrency(): CurrencyContextValue | undefined {
  return useContext(CurrencyContext);
}

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
  };
  return symbols[currency];
}

/**
 * Format an amount in the specified currency with locale-aware formatting
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  }
): string {
  const {
    minimumFractionDigits,
    maximumFractionDigits,
    showSymbol = true,
  } = options || {};

  // Determine locale based on currency for proper formatting
  const localeMap: Record<Currency, string> = {
    USD: 'en-US',
    EUR: 'de-DE', // German locale for EUR (€1.234,56 format)
    GBP: 'en-GB',
    JPY: 'ja-JP',
  };

  const locale = localeMap[currency];

  // JPY typically doesn't use decimal places
  const defaultMinFractionDigits = currency === 'JPY' ? 0 : 2;
  const defaultMaxFractionDigits = currency === 'JPY' ? 0 : 2;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: minimumFractionDigits ?? defaultMinFractionDigits,
    maximumFractionDigits: maximumFractionDigits ?? defaultMaxFractionDigits,
  });

  if (showSymbol) {
    return formatter.format(amount);
  } else {
    // Format without symbol, then add custom symbol if needed
    const parts = formatter.formatToParts(amount);
    const numericPart = parts
      .filter(part => part.type !== 'currency')
      .map(part => part.value)
      .join('');
    return numericPart;
  }
}

