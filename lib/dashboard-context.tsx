'use client';

import React, { createContext, useContext, useMemo, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { toISODate, daysAgo } from '@/lib/utils';
import type { DashboardParams, DashboardData } from '@/lib/dashboard-types';

// ============================================
// DASHBOARD CONTEXT TYPES
// ============================================

export interface DashboardContextValue {
  // The entire dashboard data object (same as useDashboardData return)
  data: DashboardData;
  
  // Filter parameters (URL-synced state)
  params: DashboardParams;
  
  // Actions to update filters (triggers revalidation)
  setDateRange: (start: string, end: string) => void;
  setCampaign: (campaign: string | null) => void;
  setProvider: (provider: string | null) => void;
  
  // Refresh function (manual revalidation)
  refresh: () => void;
  
  // Convenience flags
  isLoading: boolean;
  hasError: boolean;
}

// ============================================
// CONTEXT
// ============================================

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface DashboardProviderProps {
  children: React.ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  // READ URL PARAMS (source of truth)
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // React 18 Transition for non-blocking state updates
  const [isPending, startTransition] = useTransition();
  
  // Extract params from URL with fallbacks (matching page.tsx logic)
  const startDate = searchParams.get('start') ?? toISODate(daysAgo(30));
  const endDate = searchParams.get('end') ?? toISODate(new Date());
  const selectedCampaign = searchParams.get('campaign') ?? undefined;
  const selectedProvider = searchParams.get('provider') ?? undefined;
  
  // Build params object
  const params = useMemo<DashboardParams>(() => ({
    startDate,
    endDate,
    selectedCampaign,
    selectedProvider,
  }), [startDate, endDate, selectedCampaign, selectedProvider]);
  
  // CALL THE HOOK (once per layout - this is the key optimization!)
  const data = useDashboardData(params);
  
  // ============================================
  // ACTIONS (update URL params)
  // ============================================
  
  const setDateRange = useCallback((start: string, end: string) => {
    startTransition(() => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('start', start);
      newParams.set('end', end);
      router.replace(`?${newParams.toString()}`, { scroll: false });
    });
  }, [searchParams, router]);
  
  const setCampaign = useCallback((campaign: string | null) => {
    startTransition(() => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (campaign) {
        newParams.set('campaign', campaign);
      } else {
        newParams.delete('campaign');
      }
      router.replace(`?${newParams.toString()}`, { scroll: false });
    });
  }, [searchParams, router]);
  
  const setProvider = useCallback((provider: string | null) => {
    startTransition(() => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (provider) {
        newParams.set('provider', provider);
      } else {
        newParams.delete('provider');
      }
      router.replace(`?${newParams.toString()}`, { scroll: false });
    });
  }, [searchParams, router]);
  
  // ============================================
  // MEMOIZED CONTEXT VALUE
  // ============================================
  
  const value = useMemo<DashboardContextValue>(() => ({
    data,
    params,
    setDateRange,
    setCampaign,
    setProvider,
    refresh: data.refresh,
    isLoading: data.isLoading || isPending, // Show loading during transition
    hasError: data.hasError,
  }), [data, params, setDateRange, setCampaign, setProvider, isPending]);
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  
  return context;
}

// ============================================
// OPTIONAL HOOK (doesn't throw if outside provider)
// ============================================

export function useOptionalDashboard(): DashboardContextValue | undefined {
  return useContext(DashboardContext);
}
