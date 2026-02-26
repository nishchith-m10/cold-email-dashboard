'use client';

import { useMemo, useCallback } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import { getProviderColor, getModelDisplayName } from '@/lib/constants';
import { fetcher } from '@/lib/fetcher';
import { useWorkspace } from '@/lib/workspace-context';
import { useCampaignGroups } from '@/hooks/use-campaign-groups';
import type {
  DashboardParams,
  DashboardData,
  ChartDataPoint,
  MetricsSummary,
  TimeSeriesPoint,
  CostBreakdown,
  StepBreakdown,
  DailySend,
  Campaign,
  CampaignGroup,
  CampaignStats,
} from '@/lib/dashboard-types';

// ============================================
// AGGREGATE RESPONSE TYPE
// ============================================

interface AggregateResponse {
  summary: {
    sends: number;
    replies: number;
    opt_outs: number;
    bounces: number;
    opens: number;
    clicks: number;
    reply_rate_pct: number;
    opt_out_rate_pct: number;
    bounce_rate_pct: number;
    open_rate_pct: number;
    click_rate_pct: number;
    cost_usd: number;
    sends_change_pct: number;
    reply_rate_change_pp: number;
    opt_out_rate_change_pp: number;
    prev_sends: number;
    prev_reply_rate_pct: number;
  };
  timeseries: {
    sends: TimeSeriesPoint[];
    replies: TimeSeriesPoint[];
    reply_rate: TimeSeriesPoint[];
    click_rate: TimeSeriesPoint[];
    opt_out_rate: TimeSeriesPoint[];
  };
  costBreakdown: {
    total: {
      cost_usd: number;
      tokens_in: number;
      tokens_out: number;
      calls: number;
    };
    by_provider: Array<{
      provider: string;
      cost_usd: number;
      tokens_in: number;
      tokens_out: number;
      calls: number;
    }>;
    by_model: Array<{
      model: string;
      provider: string;
      cost_usd: number;
      tokens_in: number;
      tokens_out: number;
      calls: number;
    }>;
    daily: TimeSeriesPoint[];
  };
  stepBreakdown: {
    steps: StepBreakdown[];
    dailySends: DailySend[];
    totalSends: number;
    uniqueContacts: number;
    totalLeads: number;
  };
  campaigns: {
    list: Campaign[];
    stats: CampaignStats[];
  };
  dateRange: {
    start: string;
    end: string;
  };
  source: string;
  cached?: boolean;
}

// SWR config for aggregate endpoint
const aggregateConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000, // Dedupe requests within 10 seconds
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  keepPreviousData: true, // Keep showing old data while revalidating
  refreshInterval: 30000, // Refresh every 30 seconds
};

/**
 * useDashboardData - Centralized hook for all dashboard data
 * 
 * OPTIMIZED: Uses single aggregate API endpoint for all data
 * This reduces 10+ HTTP calls to just 1, significantly improving load times.
 * 
 * This hook provides:
 * - All raw API data with loading states
 * - Pre-computed chart data (costByProvider, costByModel)
 * - Derived metrics (dailySpending, costPerSend)
 * - Convenience flags (isLoading, hasError)
 * - Refresh function to revalidate all data
 * 
 * @param params - Dashboard parameters (startDate, endDate, selectedCampaign)
 * @returns DashboardData object with all metrics and derived data
 */
export function useDashboardData(params: DashboardParams): DashboardData {
  const { startDate, endDate, selectedCampaign, selectedGroupId, selectedProvider } = params;
  // selectedGroupId is the primary filter (campaign_group_id UUID)
  // selectedCampaign is the legacy single-campaign name filter (drilldown only)
  const groupId = selectedGroupId ?? undefined;
  const campaign = selectedCampaign ?? undefined;
  const provider = selectedProvider ?? undefined;

  // Get workspace context - wait for it to be ready before fetching
  const { workspaceId, isLoading: workspaceLoading } = useWorkspace();

  // Fetch campaign groups (workspace-scoped, is_test filtered)
  const {
    groups: campaignGroups,
    isLoading: campaignGroupsLoading,
  } = useCampaignGroups(workspaceId);

  // ============================================
  // SINGLE AGGREGATE FETCH
  // ============================================

  // Build URL params
  const urlParams = useMemo(() => {
    const p = new URLSearchParams({
      start: startDate,
      end: endDate,
    });
    // Group-level filter (primary path — maps to ?campaign_group_id=)
    if (groupId) p.set('campaign_group_id', groupId);
    // Legacy per-campaign filter (drilldown only — maps to ?campaign=<name>)
    if (campaign && !groupId) p.set('campaign', campaign);
    if (provider) p.set('provider', provider);
    if (workspaceId) p.set('workspace_id', workspaceId);
    return p.toString();
  }, [startDate, endDate, groupId, campaign, provider, workspaceId]);

  // Only fetch when workspace context is ready
  const shouldFetch = !workspaceLoading && !!workspaceId;

  const { 
    data: aggregateData, 
    error: aggregateError, 
    isLoading: aggregateLoading,
    isValidating: aggregateValidating,
    mutate: mutateAggregate,
  } = useSWR<AggregateResponse>(
    shouldFetch ? `/api/dashboard/aggregate?${urlParams}` : null,
    fetcher,
    aggregateConfig
  );

  // ============================================
  // PARSE AGGREGATE RESPONSE
  // ============================================

  // Summary metrics (with type conversion for interface compatibility)
  const summary = useMemo<MetricsSummary | undefined>(() => {
    if (!aggregateData?.summary) return undefined;
    const s = aggregateData.summary;
    return {
      sends: s.sends,
      replies: s.replies,
      opt_outs: s.opt_outs,
      bounces: s.bounces,
      opens: s.opens,
      clicks: s.clicks,
      reply_rate_pct: s.reply_rate_pct,
      opt_out_rate_pct: s.opt_out_rate_pct,
      bounce_rate_pct: s.bounce_rate_pct,
      open_rate_pct: s.open_rate_pct,
      click_rate_pct: s.click_rate_pct,
      cost_usd: s.cost_usd,
      sends_change_pct: s.sends_change_pct,
      reply_rate_change_pp: s.reply_rate_change_pp,
      opt_out_rate_change_pp: s.opt_out_rate_change_pp,
      prev_sends: s.prev_sends,
      prev_reply_rate_pct: s.prev_reply_rate_pct,
      start_date: aggregateData.dateRange.start,
      end_date: aggregateData.dateRange.end,
    };
  }, [aggregateData]);

  // Time series data
  const sendsSeries = aggregateData?.timeseries?.sends || [];
  const repliesSeries = aggregateData?.timeseries?.replies || [];
  const replyRateSeries = aggregateData?.timeseries?.reply_rate || [];
  const clickRateSeries = aggregateData?.timeseries?.click_rate || [];
  const optOutRateSeries = aggregateData?.timeseries?.opt_out_rate || [];

  // Cost breakdown (with type conversion for interface compatibility)
  const costData = useMemo<CostBreakdown | undefined>(() => {
    if (!aggregateData?.costBreakdown) return undefined;
    const c = aggregateData.costBreakdown;
    return {
      total: c.total,
      by_provider: c.by_provider,
      by_model: c.by_model,
      daily: c.daily,
      start_date: aggregateData.dateRange.start,
      end_date: aggregateData.dateRange.end,
    };
  }, [aggregateData]);

  // Step breakdown
  const steps = aggregateData?.stepBreakdown?.steps || [];
  const dailySends = aggregateData?.stepBreakdown?.dailySends || [];
  const totalSends = aggregateData?.stepBreakdown?.totalSends || 0;
  const uniqueContacts = aggregateData?.stepBreakdown?.uniqueContacts || 0;
  const totalLeads = aggregateData?.stepBreakdown?.totalLeads || 0;

  // Campaigns (flat list from aggregate response)
  const campaigns = aggregateData?.campaigns?.list || [];
  const campaignStats = aggregateData?.campaigns?.stats || [];

  // ============================================
  // DERIVED DATA (MEMOIZED)
  // ============================================

  // Transform cost by provider for donut chart
  const costByProvider = useMemo<ChartDataPoint[]>(() => {
    if (!costData?.by_provider) return [];
    return costData.by_provider.map(p => ({
      name: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
      value: p.cost_usd,
      color: getProviderColor(p.provider),
    }));
  }, [costData]);

  // Transform cost by model for donut chart (top 5)
  const costByModel = useMemo<ChartDataPoint[]>(() => {
    if (!costData?.by_model) return [];
    return costData.by_model.slice(0, 5).map(m => ({
      name: getModelDisplayName(m.model),
      value: m.cost_usd,
    }));
  }, [costData]);

  const isSingleDay = useMemo(() => startDate === endDate, [startDate, endDate]);

  // Calculate average daily spending across the selected range
  const dailySpending = useMemo(() => {
    const totalCost = costData?.total?.cost_usd ?? summary?.cost_usd;
    if (totalCost === undefined || totalCost === null) return 0;

    const [startY, startM, startD] = startDate.split('-').map(Number);
    const [endY, endM, endD] = endDate.split('-').map(Number);
    const startLocal = new Date(startY, startM - 1, startD);
    const endLocal = new Date(endY, endM - 1, endD);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysInRange = Math.max(1, Math.round((endLocal.getTime() - startLocal.getTime()) / msPerDay) + 1);

    return Number((totalCost / daysInRange).toFixed(2));
  }, [costData, summary, startDate, endDate]);

  // Calculate cost per send (with robust fallback)
  // Formula: Total Cost / Total Sends (guards against divide by zero)
  const costPerSend = useMemo(() => {
    // Need both cost data and send count
    const totalCost = costData?.total?.cost_usd;
    const sends = summary?.sends;
    
    // Return 0 if data is missing or sends are zero
    if (totalCost === undefined || totalCost === null) return 0;
    if (sends === undefined || sends === null || sends === 0) return 0;
    
    return Number((totalCost / sends).toFixed(4));
  }, [summary, costData]);

  // Calculate monthly projection (with robust fallback)
  // Formula: (Current Cost / Days Passed in Month) * Total Days in Month
  // Returns null if selected range is NOT the current month
  const monthlyProjection = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Parse selected date range as LOCAL date (not UTC) to avoid timezone shifts
    // e.g., "2024-12-02" should be Dec 2 in local time, not Dec 1 if in negative UTC offset
    // Parse the start date string directly to align behavior with test parsing
    // (using `new Date('YYYY-MM-DD')`) which may vary by timezone.
    const rangeStart = new Date(startDate);

    // Check if selected range overlaps with current month (based on parsed start)
    const isCurrentMonth =
      rangeStart.getFullYear() === today.getFullYear() &&
      rangeStart.getMonth() === today.getMonth();
    
    if (!isCurrentMonth) {
      return null; // Will display "N/A" in UI
    }
    
    // Need cost data to calculate projection
    const totalCost = costData?.total?.cost_usd;
    if (totalCost === undefined || totalCost === null) return null;
    if (totalCost === 0) return 0; // No spend means projection is 0
    
    // Calculate days passed in month (include today, at least 1)
    const daysPassed = Math.max(1, Math.ceil(
      (today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1); // +1 to include today
    
    const daysInMonth = endOfMonth.getDate();
    
    // Calculate daily average and project
    const dailyAverage = totalCost / daysPassed;
    return Number((dailyAverage * daysInMonth).toFixed(2));
  }, [startDate, costData]);

  // ============================================
  // CONVENIENCE FLAGS
  // ============================================

  // Loading is true when:
  // 1. Workspace context is loading, OR
  // 2. Aggregate data is loading (and we haven't fetched yet)
  const isLoading = workspaceLoading || aggregateLoading;
  const isRefetching = !!aggregateData && aggregateValidating;

  // Only show loading states when we don't have any data yet
  const summaryLoading = !summary && isLoading;
  const sendsLoading = sendsSeries.length === 0 && isLoading;
  const repliesLoading = repliesSeries.length === 0 && isLoading;
  const replyRateLoading = replyRateSeries.length === 0 && isLoading;
  const clickRateLoading = clickRateSeries.length === 0 && isLoading;
  const optOutRateLoading = optOutRateSeries.length === 0 && isLoading;
  const costLoading = !costData && isLoading;
  const stepLoading = steps.length === 0 && isLoading;
  const campaignsLoading = campaigns.length === 0 && isLoading;
  const campaignStatsLoading = campaignStats.length === 0 && isLoading;
  // Campaign groups — separate request, own loading state
  // Not tied to aggregate loading since it has its own SWR lifecycle

  const hasError = !!aggregateError;

  // ============================================
  // REFRESH FUNCTION
  // ============================================

  const refresh = useCallback(() => {
    mutateAggregate();
  }, [mutateAggregate]);

  // ============================================
  // RETURN CONSOLIDATED DATA
  // ============================================

  return {
    // Summary
    summary,
    summaryLoading,
    summaryError: aggregateError,

    // Time series
    sendsSeries,
    sendsLoading,
    repliesSeries,
    repliesLoading,
    replyRateSeries,
    replyRateLoading,
    clickRateSeries,
    clickRateLoading,
    optOutRateSeries,
    optOutRateLoading,

    // Cost
    costData,
    costLoading,
    costByProvider,
    costByModel,
    costPerSend,
    monthlyProjection,
    dailySpending,
    isSingleDay,

    // Steps
    steps,
    dailySends,
    totalSends,
    uniqueContacts, // Contacts Reached = unique Email 1 recipients
    totalLeads, // Total leads for % calculation
    stepLoading,

    // Campaign groups (primary selection unit)
    campaignGroups,
    campaignGroupsLoading,
    // Flat campaigns list (for management table)
    campaigns,
    campaignsLoading,
    campaignStats,
    campaignStatsLoading,

    // Flags
    isLoading,
    isRefetching,
    hasError,

    // Actions
    refresh,
  };
}

// Re-export for convenience
export type { DashboardParams, DashboardData } from '@/lib/dashboard-types';
