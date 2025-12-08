'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CHART_COLORS } from '@/lib/constants';
import { useDashboard } from '@/lib/dashboard-context';

// Force dynamic rendering for client-side context
export const dynamic = 'force-dynamic';

// Components - Wrapped with error boundaries for resilience
import { DashboardErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { SafeMetricCard as MetricCard } from '@/components/dashboard/safe-components';
import {
  SafeLazyTimeSeriesChart as TimeSeriesChart,
  SafeLazyDailySendsChart as DailySendsChart,
} from '@/components/dashboard/safe-components';
import { SafeCampaignTable as CampaignTable } from '@/components/dashboard/safe-components';
import { SafeStepBreakdown as StepBreakdown } from '@/components/dashboard/safe-components';
import { SafeEfficiencyMetrics as EfficiencyMetrics } from '@/components/dashboard/safe-components';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { CampaignSelector } from '@/components/dashboard/campaign-selector';
import { AskAI } from '@/components/dashboard/ask-ai';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';

export default function DashboardPage() {
  // ============================================
  // DASHBOARD CONTEXT (global state)
  // ============================================
  
  const { data, params, setDateRange, setCampaign } = useDashboard();
  
  // Destructure params
  const { startDate, endDate, selectedCampaign } = params;
  
  // Local UI state (doesn't need URL persistence)
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  // Timezone state - default to Los Angeles, persist in localStorage
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  
  // Load timezone from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_timezone');
    if (saved) setTimezone(saved);
  }, []);
  
  // Save timezone to localStorage when changed
  const handleTimezoneChange = useCallback((tz: string) => {
    setTimezone(tz);
    localStorage.setItem('dashboard_timezone', tz);
  }, []);

  // ============================================
  // DESTRUCTURE DASHBOARD DATA
  // ============================================
  
  const {
    summary,
    summaryLoading,
    sendsSeries,
    sendsLoading,
    replyRateSeries,
    replyRateLoading,
    clickRateSeries,
    clickRateLoading,
    costPerReply,
    monthlyProjection,
    steps,
    dailySends,
    totalSends,
    uniqueContacts,
    totalLeads,
    stepLoading,
    campaigns,
    campaignsLoading,
    campaignStats,
    campaignStatsLoading,
  } = data;

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? undefined : date);
  }, []);
  
  // Handle campaign change (wrapper to convert undefined to null)
  const handleCampaignChange = useCallback((campaign: string | undefined) => {
    setCampaign(campaign ?? null);
  }, [setCampaign]);

  // ============================================
  // DERIVED UI VALUES
  // ============================================

  // Format date range for display
  const dateRangeDisplay = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return format(start, 'MMMM d, yyyy');
    }
    
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [startDate, endDate]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <DashboardErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center space-y-4 max-w-md px-4">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Error</h1>
            <p className="text-muted-foreground">
              {process.env.NODE_ENV === 'development' 
                ? error.message 
                : 'Something went wrong while loading the dashboard. Please try again.'}
            </p>
            <Button 
              onClick={resetErrorBoundary}
              className="mt-4"
            >
              Reload Dashboard
            </Button>
          </div>
        </div>
      )}
    >
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            Track your cold email campaign performance
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <CampaignSelector
            campaigns={campaigns}
            selectedCampaign={selectedCampaign ?? undefined}
            onCampaignChange={handleCampaignChange}
            loading={campaignsLoading}
          />
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={setDateRange}
          />
          <TimezoneSelector
            selectedTimezone={timezone}
            onTimezoneChange={handleTimezoneChange}
          />
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Sends"
          value={summary?.sends ?? 0}
          change={summary?.sends_change_pct}
          icon="sends"
          loading={summaryLoading}
          delay={0}
        />
        <MetricCard
          title="Click Rate"
          value={summary?.click_rate_pct ?? 0}
          format="percent"
          icon="clicks"
          loading={summaryLoading}
          delay={1}
          tooltip="Percentage of emails where a link was clicked (95% accurate)"
        />
        <MetricCard
          title="Reply Rate"
          value={summary?.reply_rate_pct ?? 0}
          change={summary?.reply_rate_change_pp}
          changeLabel="pp"
          format="percent"
          icon="replies"
          loading={summaryLoading}
          delay={2}
        />
        <MetricCard
          title="Opt-Out Rate"
          value={summary?.opt_out_rate_pct ?? 0}
          change={summary?.opt_out_rate_change_pp}
          changeLabel="pp"
          format="percent"
          icon="opt-outs"
          loading={summaryLoading}
          delay={3}
        />
        <MetricCard
          title="Total Cost"
          value={summary?.cost_usd ?? 0}
          format="currency"
          icon="cost"
          loading={summaryLoading}
          delay={4}
        />
      </div>

      {/* Row 1: Sequence Breakdown & Daily Sends (Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <StepBreakdown
          steps={steps}
          dailySends={dailySends}
          totalSends={totalSends}
          totalLeads={totalLeads}
          startDate={startDate}
          endDate={endDate}
          loading={stepLoading}
          className="h-full"
        />
        <DailySendsChart
          data={dailySends}
          startDate={startDate}
          endDate={endDate}
          loading={stepLoading}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
          className="h-full"
        />
      </div>

      {/* Row 2: Sends Trend & Efficiency (Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <TimeSeriesChart
          title="Email Sends Over Time"
          subtitle={dateRangeDisplay}
          data={sendsSeries}
          color={CHART_COLORS.sends}
          loading={sendsLoading}
          type="area"
          className="h-full"
        />
        <EfficiencyMetrics
          costPerReply={costPerReply}
          monthlyProjection={monthlyProjection}
          totalContacts={uniqueContacts} // Unique Email 1 recipients only
          loading={summaryLoading}
          className="h-full"
        />
      </div>

      {/* Row 3: Engagement Trends (Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <TimeSeriesChart
          title="Click Rate Over Time"
          subtitle={dateRangeDisplay}
          data={clickRateSeries}
          color="#10b981"
          loading={clickRateLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={300}
          className="h-full"
        />
        <TimeSeriesChart
          title="Reply Rate Over Time"
          subtitle={dateRangeDisplay}
          data={replyRateSeries}
          color={CHART_COLORS.replies}
          loading={replyRateLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={300}
          className="h-full"
        />
      </div>

      {/* Campaign Table */}
      <CampaignTable
        data={campaignStats}
        loading={campaignStatsLoading}
      />

      {/* Ask AI */}
      <AskAI />
    </div>
    </DashboardErrorBoundary>
  );
}
