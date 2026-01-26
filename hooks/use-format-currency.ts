'use client';

import { useCallback } from 'react';
import { useCurrency, formatCurrency as formatCurrencyUtil, Currency } from '@/lib/currency-context';

/**
 * Hook to format currency values using the user's selected currency
 * 
 * This hook provides a simple way to format costs consistently across the app
 * using the currency from CurrencyContext. Formats amounts based on user's selected currency
 * with locale-aware number formatting:
 * - USD: $1,234.56
 * - EUR: €1.234,56 (European format)
 * - GBP: £1,234.56
 * - JPY: ¥1,235 (no decimals)
 */
export function useFormatCurrency() {
  const { currency } = useCurrency();

  const formatCurrency = useCallback((amount: number, overrideCurrency?: Currency) => {
    const curr = overrideCurrency || currency;
    return formatCurrencyUtil(amount, curr);
  }, [currency]);

  return {
    formatCurrency,
    currency,
  };
}
