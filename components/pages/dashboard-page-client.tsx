'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Settings2 } from 'lucide-react';
import { toISODate, daysAgo } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useWorkspace } from '@/lib/workspace-context';
import { useTimezone } from '@/lib/timezone-context';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { DashboardWidget } from '@/components/dashboard/dashboard-widget';
import { DashboardSettingsPanel } from '@/components/dashboard/dashboard-settings-panel';

// Components
import { MetricCard } from '@/components/dashboard/metric-card';
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart';
import { CampaignTable } from '@/components/dashboard/campaign-table';
import { CampaignCardStack } from '@/components/dashboard/campaign-card-stack';
import { DateRangePickerMobile } from '@/components/dashboard/date-range-picker-mobile';
import { AskAI } from '@/components/dashboard/ask-ai';
import { StepBreakdown } from '@/components/dashboard/step-breakdown';
import { DailySendsChart } from '@/components/dashboard/daily-sends-chart';
import { CampaignManagementTable } from '@/components/dashboard/campaign-management-table';
import { CampaignManagementCardStack } from '@/components/dashboard/campaign-management-card-stack';
import { MobileCollapsibleWidget } from '@/components/dashboard/mobile-collapsible-widget';
import { NewCampaignModal } from '@/components/campaigns/new-campaign-modal';
import { CompactControls } from '@/components/dashboard/compact-controls';
import { PermissionGate } from '@/components/ui/permission-gate';
import { BarChart3, TrendingUp } from 'lucide-react';

export function DashboardPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Read dates from URL params with fallbacks
  const startDate = searchParams.get('start') ?? toISODate(daysAgo(30));
  const endDate = searchParams.get('end') ?? toISODate(new Date());
  // Primary group-level filter via ?group= (UUID); legacy ?campaign= silently dropped
  const selectedGroupId = searchParams.get('group') ?? undefined;
  // (Legacy ?campaign= param is intentionally ignored — group-based selection is the
  //  current model. Old bookmarks with ?campaign= will show "All Campaigns".)
  
  // Local UI state (doesn't need URL persistence)
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // Dashboard layout customization
  const { visibleWidgets, reorderWidgets, widgets, toggleWidget, resetLayout } = useDashboardLayout();

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance
      },
    })
  );

  // Workspace context
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  // Timezone from context (synced with workspace settings)
  const { timezone, setTimezone } = useTimezone();

  // FETCH ALL DASHBOARD DATA (CENTRALIZED)
  const dashboardData = useDashboardData({
    startDate,
    endDate,
    selectedGroupId,
  });

  const {
    summary,
    summaryLoading,
    isRefetching,
    sendsSeries,
    sendsLoading,
    replyRateSeries,
    replyRateLoading,
    clickRateSeries,
    clickRateLoading,
    steps,
    dailySends,
    totalSends,
    totalLeads,
    stepLoading,
    optOutRateSeries,
    optOutRateLoading,
    campaigns,
    campaignsLoading,
    campaignStats,
    campaignStatsLoading,
    campaignGroups,
    campaignGroupsLoading,
  } = dashboardData;

  const handleDateChange = useCallback((start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('start', start);
    params.set('end', end);
    router.replace(`?${params.toString()}`, { scroll: false });
    setSelectedDate(undefined);
  }, [searchParams, router]);

  const handleGroupChange = useCallback((groupId: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (groupId) {
      params.set('group', groupId);
    } else {
      params.delete('group');
    }
    // Also clear legacy campaign param when switching groups
    params.delete('campaign');
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? undefined : date);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = visibleWidgets.findIndex(w => w.id === active.id);
      const newIndex = visibleWidgets.findIndex(w => w.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderWidgets(oldIndex, newIndex);
      }
    }
  }, [visibleWidgets, reorderWidgets]);

  const dateRangeDisplay = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return format(start, 'MMMM d, yyyy');
    }
    
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [startDate, endDate]);

  // Render widget by ID
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'metrics':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4" data-tour="metrics">
            <MetricCard
              title="Total Sends"
              value={summary?.sends ?? 0}
              change={summary?.sends_change_pct}
              icon="sends"
              loading={summaryLoading}
              isRefetching={isRefetching}
              delay={0}
            />
            <MetricCard
              title="Click Rate"
              value={summary?.click_rate_pct ?? 0}
              format="percent"
              icon="clicks"
              loading={summaryLoading}
              isRefetching={isRefetching}
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
              isRefetching={isRefetching}
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
              isRefetching={isRefetching}
              delay={3}
            />
            <MetricCard
              title="Total Cost"
              value={summary?.cost_usd ?? 0}
              format="currency"
              icon="cost"
              loading={summaryLoading}
              isRefetching={isRefetching}
              delay={4}
            />
          </div>
        );

      case 'step-breakdown':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
        );

      case 'sends-optout':
        return (
          <MobileCollapsibleWidget
            id="sends-optout"
            title="Sends & Opt-Out Trends"
            icon={<BarChart3 className="h-5 w-5" />}
            defaultCollapsed={true}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-4">
              <TimeSeriesChart
                title="Email Sends Over Time"
                subtitle={dateRangeDisplay}
                data={sendsSeries}
                color={CHART_COLORS.sends}
                loading={sendsLoading}
                type="area"
                className="h-full"
              />
              <TimeSeriesChart
                title="Opt-Out Rate Over Time"
                subtitle={dateRangeDisplay}
                data={optOutRateSeries}
                color={CHART_COLORS.optOuts}
                loading={optOutRateLoading}
                type="line"
                valueFormatter={(v) => `${v}%`}
                height={280}
                className="h-full"
              />
            </div>
          </MobileCollapsibleWidget>
        );

      case 'click-reply':
        return (
          <MobileCollapsibleWidget
            id="click-reply"
            title="Click & Reply Trends"
            icon={<TrendingUp className="h-5 w-5" />}
            defaultCollapsed={true}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-4">
              <TimeSeriesChart
                title="Click Rate Over Time"
                subtitle={dateRangeDisplay}
                data={clickRateSeries}
                color="#10b981"
                loading={clickRateLoading}
                type="line"
                valueFormatter={(v) => `${v}%`}
                height={280}
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
                height={280}
                className="h-full"
              />
            </div>
          </MobileCollapsibleWidget>
        );

      case 'campaign-stats':
        // Only render if there's actual campaign data
        if (!campaignStatsLoading && (!campaignStats || campaignStats.length === 0)) {
          return null;
        }
        return (
          <>
            {/* Desktop: Traditional table */}
            <div className="hidden md:block">
              <CampaignTable
                data={campaignStats}
                loading={campaignStatsLoading}
              />
            </div>
            {/* Mobile: Card stack */}
            <div className="block md:hidden">
              <CampaignCardStack
                data={campaignStats}
                loading={campaignStatsLoading}
              />
            </div>
          </>
        );

      case 'campaign-management':
        return (
          <div data-tour="campaigns">
            {/* Desktop: Traditional table with context menu */}
            <div className="hidden md:block">
              <CampaignManagementTable workspaceId={workspaceId} />
            </div>
            {/* Mobile: Card stack with dropdown menu */}
            <div className="block md:hidden">
              <CampaignManagementCardStack workspaceId={workspaceId} />
            </div>
          </div>
        );

      case 'ask-ai':
        return <AskAI />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pt-4 md:pt-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1 hidden sm:block">
            Track your cold email campaign performance
          </p>
        </div>
        
        {/* Compact Icon Controls - Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <CompactControls
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
            campaignGroups={campaignGroups}
            selectedGroupId={selectedGroupId}
            onGroupChange={handleGroupChange}
            campaignGroupsLoading={campaignGroupsLoading}
            onNewCampaign={() => setShowNewCampaignModal(true)}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            onSettingsOpen={() => setSettingsPanelOpen(true)}
            showSettings={true}
          />
        </div>

        {/* Mobile: Bottom sheet picker */}
        <div className="flex-1 md:hidden">
          <DateRangePickerMobile
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        </div>
      </motion.div>

      {/* Draggable Widgets */}
      {/* TODO(session-4): Task 4.6 — Drag handles should be always-visible with opacity-30 group-hover:opacity-100.
         The drag handle lives in components/dashboard/dashboard-widget.tsx (line ~52: opacity-0 group-hover:opacity-100).
         That file is owned by Session 1 (frozen). Change needed: opacity-0 → opacity-30.
         Flagged as cross-session observation for post-merge application. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {visibleWidgets.map(widget => {
              const content = renderWidget(widget.id);
              // Don't render DashboardWidget wrapper if content is null
              if (!content) return null;
              
              return (
                <DashboardWidget key={widget.id} id={widget.id}>
                  {content}
                </DashboardWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* New Campaign Modal — write-gated: viewers cannot trigger creation */}
      <PermissionGate requires="write">
        <NewCampaignModal
          isOpen={showNewCampaignModal}
          onClose={() => setShowNewCampaignModal(false)}
        />
      </PermissionGate>

      {/* Dashboard Settings Panel */}
      <DashboardSettingsPanel
        open={settingsPanelOpen}
        onOpenChange={setSettingsPanelOpen}
        widgets={widgets}
        onToggleWidget={toggleWidget}
        onResetLayout={resetLayout}
      />
    </div>
  );
}
