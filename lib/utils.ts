import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number with commas
export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format currency (4 decimal places for micro-costs < $1)
// DEPRECATED: Use useFormatCurrency() hook for currency-aware formatting
// Kept for backward compatibility with USD default
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (amount === 0) {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    const symbol = symbols[currency] || '$';
    return `${symbol}0.00`;
  }
  
  // For micro-costs under $1, show 4 decimal places
  if (Math.abs(amount) < 1 && currency !== 'JPY') {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    const symbol = symbols[currency] || '$';
    return `${symbol}${amount.toFixed(4)}`;
  }
  
  // For regular amounts, use proper locale formatting
  const locales: Record<string, string> = { USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP' };
  const decimals = currency === 'JPY' ? 0 : 2;
  
  return new Intl.NumberFormat(locales[currency] || 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// Format currency for display (clean 2 decimals) - use for main values
// DEPRECATED: Use useFormatCurrency() hook for currency-aware formatting
export function formatCurrencyShort(amount: number, currency: string = 'USD'): string {
  if (amount === 0) {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    const symbol = symbols[currency] || '$';
    return currency === 'JPY' ? `${symbol}0` : `${symbol}0.00`;
  }
  
  const locales: Record<string, string> = { USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP' };
  const decimals = currency === 'JPY' ? 0 : 2;
  
  return new Intl.NumberFormat(locales[currency] || 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// Format currency precise (4 decimals) - use for tooltips/hover
// DEPRECATED: Use useFormatCurrency() hook for currency-aware formatting
export function formatCurrencyPrecise(amount: number, currency: string = 'USD'): string {
  if (amount === 0) {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    const symbol = symbols[currency] || '$';
    return currency === 'JPY' ? `${symbol}0` : `${symbol}0.0000`;
  }
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
  const symbol = symbols[currency] || '$';
  const decimals = currency === 'JPY' ? 0 : 4;
  return `${symbol}${amount.toFixed(decimals)}`;
}

// Format percentage
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// Calculate percentage change
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Format date for display
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format date for API calls (YYYY-MM-DD) - uses LOCAL date to avoid timezone shifts
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get date N days ago
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Generate trend indicator
export function getTrendIndicator(change: number): { icon: '↑' | '↓' | '→'; color: string } {
  if (change > 0) return { icon: '↑', color: 'text-accent-success' };
  if (change < 0) return { icon: '↓', color: 'text-accent-danger' };
  return { icon: '→', color: 'text-text-secondary' };
}

// API response headers to prevent browser caching
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

