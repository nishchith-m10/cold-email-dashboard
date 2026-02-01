'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
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
  Cpu, 
  ToggleLeft,
  ToggleRight,
  BarChart3
} from 'lucide-react';

export default function AnalyticsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const startDate = searchParams.get('start') ?? toISODate(daysAgo(30));
  const endDate = searchParams.get('end') ?? toISODate(new Date());
  const selectedCampaign = searchParams.get('campaign') ?? undefined;
  
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
    selectedCampaign,
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

  const handleCampaignChange = useCallback((campaign: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (campaign) {
      params.set('campaign', campaign);
    } else {
      params.delete('campaign');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <div className="space-y-6 pt-4 md:pt-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="relative overflow-hidden h-full p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-secondary">Efficiency Unit</p>
                <p className="text-xs text-text-secondary">
                  {efficiencyMode === 'cpl' ? 'Cost per lead (Email 1 reach)' : 'Cost per 1k sends'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEfficiencyMode((prev) => (prev === 'cpl' ? 'cpm' : 'cpl'))}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:border-accent-primary/60 hover:text-accent-primary transition-colors"
              >
                {efficiencyMode === 'cpl' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                <span>{efficiencyMode.toUpperCase()}</span>
              </button>
            </div>
            <motion.p
              className="mt-4 text-3xl font-bold text-text-primary tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {formatCurrency(efficiencyValue)}
            </motion.p>
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
          campaign={selectedCampaign}
        />
      </motion.div>
    </div>
  );
}

