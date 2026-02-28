'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar, Cpu } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { toISODate, daysAgo, formatNumber } from '@/lib/utils';
import { getModelDisplayName } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useWorkspace } from '@/lib/workspace-context';
import { useTimezone } from '@/lib/timezone-context';
import { useFormatCurrency } from '@/hooks/use-format-currency';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart';
import { DonutChart } from '@/components/dashboard/donut-chart';
import { DateRangePickerContent } from '@/components/dashboard/date-range-picker-content';
import { ProviderSelector, ProviderId } from '@/components/dashboard/provider-selector';
import { DailyCostChart } from '@/components/dashboard/daily-cost-chart';
import { SenderBreakdown } from '@/components/dashboard/sender-breakdown';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export function AnalyticsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const startDate = searchParams.get('start') ?? toISODate(daysAgo(30));
  const endDate = searchParams.get('end') ?? toISODate(new Date());
  // Primary group-level filter via ?group= (UUID); legacy ?campaign= intentionally dropped
  const selectedGroupId = searchParams.get('group') ?? undefined;
  
  const { workspace } = useWorkspace();
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Timezone from context (synced with workspace settings)
  const { timezone } = useTimezone();
  
  // Currency formatting from context
  const { formatCurrency } = useFormatCurrency();

  const dashboardData = useDashboardData({
    startDate,
    endDate,
    selectedGroupId,
    selectedProvider,
  });

  const {
    summaryLoading,
    isRefetching,
    costData,
    costLoading,
    costByProvider,
    costByModel,
    costPerSend,
    monthlyProjection,
    dailySpending,
    isSingleDay,
    campaigns,
    campaignsLoading,
    campaignGroups,
    campaignGroupsLoading,
    uniqueContacts,
  } = dashboardData;


  const [efficiencyMode, setEfficiencyMode] = useState<'cpl' | 'cpm'>('cpl');

  const efficiencyLabel = efficiencyMode === 'cpl' ? 'Cost Per Lead' : 'CPM (per 1k Sends)';
  const efficiencyValue = useMemo(() => {
    const totalCost = costData?.total.cost_usd ?? 0;
    const contacts = uniqueContacts ?? 0;
    if (efficiencyMode === 'cpl') {
      if (!contacts) return 0;
      return totalCost / contacts;
    }
    // cpm from cost per send
    if (!costPerSend) return 0;
    return costPerSend * 1000;
  }, [costData, costPerSend, uniqueContacts, efficiencyMode]);

  const handleDateChange = useCallback((start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('start', start);
    params.set('end', end);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleGroupChange = useCallback((groupId: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (groupId) {
      params.set('group', groupId);
    } else {
      params.delete('group');
    }
    params.delete('campaign');
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <div className="space-y-6 pt-4 md:pt-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Analytics</h1>
            <p className="text-xs text-text-secondary">Deep-dive into your email campaign metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Calendar Date Range - Icon Only */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title={`${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`}
              onClick={() => setDatePickerOpen(!datePickerOpen)}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            
            {datePickerOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDatePickerOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 z-50">
                  <DateRangePickerContent
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={(start, end) => {
                      handleDateChange(start, end);
                      setDatePickerOpen(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Provider Selector */}
          <ProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={(p) => setSelectedProvider(p === 'all' ? undefined : p)}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Total Cost"
          value={costData?.total.cost_usd ?? 0}
          format="currency"
          icon="cost"
          loading={costLoading}
          isRefetching={isRefetching}
          delay={0}
          description={`Based on ${formatNumber(costData?.total.calls ?? 0)} API calls`}
        />
        <MetricCard
          title={isSingleDay ? 'Daily Spending' : 'Avg Daily Spending'}
          value={dailySpending}
          format="currency"
          icon="spend"
          loading={summaryLoading || costLoading}
          isRefetching={isRefetching}
          delay={1}
          description={isSingleDay ? 'Cost for selected day' : 'Average per day in range'}
        />
        <MetricCard
          title="Monthly Projection"
          value={monthlyProjection ?? 0}
          format="currency"
          icon="projection"
          loading={summaryLoading || costLoading}
          isRefetching={isRefetching}
          delay={2}
          description={monthlyProjection === null ? 'Shown for current month ranges' : 'Projected spend for current month'}
        />
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, delay: 0.3 * 0.03 }}
        >
          <Card className="relative overflow-hidden hover:bg-surface-elevated/30 transition-all duration-300 h-full">
            <div className="space-y-1 sm:space-y-2">
              {/* Title row — toggle icon + title, matching MetricCard */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEfficiencyMode((prev) => (prev === 'cpl' ? 'cpm' : 'cpl'))}
                  className="flex-shrink-0 text-accent-purple hover:text-accent-primary transition-colors"
                  title={`Switch to ${efficiencyMode === 'cpl' ? 'CPM' : 'CPL'}`}
                >
                  {efficiencyMode === 'cpl' ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
                </button>
                <p className="text-xs sm:text-sm font-medium text-text-secondary truncate">
                  {efficiencyMode === 'cpl' ? 'Cost Per Lead' : 'CPM (per 1k)'}
                </p>
              </div>

              <motion.p
                className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.3 * 0.03 + 0.1 }}
              >
                {formatCurrency(efficiencyValue)}
              </motion.p>

              <p className="text-xs text-text-secondary">
                {efficiencyMode === 'cpl' ? 'Cost per lead (Email 1 reach)' : 'Cost per 1k sends'}
              </p>
            </div>
          </Card>
        </motion.div>
        <MetricCard
          title="Total API Calls"
          value={costData?.total.calls ?? 0}
          format="number"
          icon="clicks"
          loading={costLoading}
          isRefetching={isRefetching}
          delay={4}
          description="LLM requests made"
        />
      </div>

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

      <DailyCostChart
        data={costData?.daily || []}
        loading={costLoading}
        timezone={timezone}
        startDate={startDate}
        endDate={endDate}
      />

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <SenderBreakdown
          startDate={startDate}
          endDate={endDate}
          campaignGroupId={selectedGroupId}
        />
      </motion.div>
    </div>
  );
}

