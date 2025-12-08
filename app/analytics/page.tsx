'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toISODate, daysAgo, formatCurrency, formatNumber } from '@/lib/utils';
import { CHART_COLORS, getModelDisplayName } from '@/lib/constants';
import { useDashboard } from '@/lib/dashboard-context';

// Force dynamic rendering for client-side context
export const dynamic = 'force-dynamic';

// Components - Wrapped with error boundaries for resilience
import { DashboardErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SafeMetricCard as MetricCard } from '@/components/dashboard/safe-components';
import {
  SafeLazyTimeSeriesChart as TimeSeriesChart,
  SafeLazyDonutChart as DonutChart,
  SafeLazyDailyCostChart as DailyCostChart,
} from '@/components/dashboard/safe-components';
import { SafeSenderBreakdown as SenderBreakdown } from '@/components/dashboard/safe-components';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { CampaignSelector } from '@/components/dashboard/campaign-selector';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';
import { ProviderSelector, ProviderId } from '@/components/dashboard/provider-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Cpu, 
  Zap, 
  TrendingUp, 
  DollarSign,
  BarChart3
} from 'lucide-react';

export default function AnalyticsPage() {
  // ============================================
  // DASHBOARD CONTEXT (global state)
  // ============================================
  
  const { data, params, setDateRange, setCampaign, setProvider } = useDashboard();
  
  // Destructure params
  const { startDate, endDate, selectedCampaign, selectedProvider } = params;
  
  // Local UI state for provider selector (can also be moved to context if needed)
  const [localProvider, setLocalProvider] = useState<ProviderId | undefined>(
    selectedProvider as ProviderId | undefined
  );
  
  // Sync local provider state with context when it changes
  useEffect(() => {
    setLocalProvider(selectedProvider as ProviderId | undefined);
  }, [selectedProvider]);
  
  // Handle provider change
  const handleProviderChange = useCallback((provider: ProviderId) => {
    const providerValue = provider === 'all' ? null : provider;
    setLocalProvider(provider);
    setProvider(providerValue);
  }, [setProvider]);
  
  // Handle campaign change (wrapper to convert undefined to null)
  const handleCampaignChange = useCallback((campaign: string | undefined) => {
    setCampaign(campaign ?? null);
  }, [setCampaign]);
  
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
    replyRateSeries,
    replyRateLoading,
    optOutRateSeries,
    optOutRateLoading,
    costData,
    costLoading,
    costByProvider,
    costByModel,
    costPerReply,
    costPerSend,
    campaigns,
    campaignsLoading,
  } = data;

  // ============================================
  // RENDER
  // ============================================

  return (
    <DashboardErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center space-y-4 max-w-md px-4">
            <div className="text-6xl">📊</div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics Error</h1>
            <p className="text-muted-foreground">
              {process.env.NODE_ENV === 'development' 
                ? error.message 
                : 'Something went wrong while loading analytics. Please try again.'}
            </p>
            <Button 
              onClick={resetErrorBoundary}
              className="mt-4"
            >
              Reload Analytics
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
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-accent-purple" />
            Analytics
          </h1>
          <div className="text-text-secondary text-sm mt-1">
            Deep dive into your campaign performance and costs
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <CampaignSelector
            campaigns={campaigns}
            selectedCampaign={selectedCampaign ?? undefined}
            onCampaignChange={handleCampaignChange}
            loading={campaignsLoading}
          />
          <ProviderSelector
            selectedProvider={localProvider}
            onProviderChange={handleProviderChange}
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

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Cost"
          value={costData?.total.cost_usd ?? 0}
          format="currency"
          icon="cost"
          loading={costLoading}
          delay={0}
          description={`Based on ${formatNumber(costData?.total.calls ?? 0)} API calls`}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full">
            <div className="flex items-start justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">Cost per Reply</p>
                <div className="text-3xl font-bold text-text-primary tracking-tight">
                  {summaryLoading || costLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(costPerReply)
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  Based on {summary?.replies ?? 0} replies
                </div>
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent-success/10">
                <TrendingUp className="h-6 w-6 text-accent-success" />
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <div className="flex items-start justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">Cost per Send</p>
                <div className="text-3xl font-bold text-text-primary tracking-tight">
                  {summaryLoading || costLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(costPerSend)
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  Based on {formatNumber(summary?.sends ?? 0)} sends
                </div>
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent-primary/10">
                <DollarSign className="h-6 w-6 text-accent-primary" />
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="h-full">
            <div className="flex items-start justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">Total API Calls</p>
                <div className="text-3xl font-bold text-text-primary tracking-tight">
                  {costLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatNumber(costData?.total.calls ?? 0)
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  LLM requests made
                </div>
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent-warning/10">
                <Zap className="h-6 w-6 text-accent-warning" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Cost Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart
          title="Cost by Provider"
          data={costByProvider}
          loading={costLoading}
        />
        <DonutChart
          title="Cost by Model"
          data={costByModel}
          loading={costLoading}
        />
      </div>

      {/* Cost Timeseries */}
      <DailyCostChart
        data={costData?.daily || []}
        loading={costLoading}
        timezone={timezone}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          title="Reply Rate Trend"
          data={replyRateSeries}
          color={CHART_COLORS.replies}
          loading={replyRateLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={240}
        />
        <TimeSeriesChart
          title="Opt-Out Rate Trend"
          data={optOutRateSeries}
          color={CHART_COLORS.optOuts}
          loading={optOutRateLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={240}
        />
      </div>

      {/* Model Usage Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent-purple" />
              Model Usage Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Model</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Provider</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Calls</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Tokens In</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Tokens Out</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {costData?.by_model.map((model, index) => (
                      <motion.tr
                        key={`${model.provider}-${model.model}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-surface-elevated/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">{getModelDisplayName(model.model)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={model.provider === 'openai' ? 'success' : 'warning'}>
                            {model.provider}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-text-secondary">
                          {formatNumber(model.calls)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-text-secondary">
                          {formatNumber(model.tokens_in)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-text-secondary">
                          {formatNumber(model.tokens_out)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-accent-purple">
                          {formatCurrency(model.cost_usd)}
                        </td>
                      </motion.tr>
                    ))}
                    {(!costData?.by_model || costData.by_model.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                          No model usage data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Per-Sender Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <SenderBreakdown
          startDate={startDate}
          endDate={endDate}
          campaign={selectedCampaign ?? undefined}
        />
      </motion.div>
    </div>
    </DashboardErrorBoundary>
  );
}
