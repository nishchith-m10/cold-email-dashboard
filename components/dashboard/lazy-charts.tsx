'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

/**
 * Shared loading skeleton for chart components
 * Matches the structure of actual chart cards to prevent layout shift
 */
const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
  <Card className="overflow-hidden">
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-40" />
    </CardHeader>
    <CardContent className="pb-4">
      <Skeleton className="w-full" style={{ height }} />
    </CardContent>
  </Card>
);

/**
 * Lazy-loaded TimeSeriesChart (Line/Area charts)
 * Used for: Email Sends, Reply Rate, Opt-Out Rate trends
 * Bundle impact: ~150KB (includes Recharts LineChart/AreaChart)
 */
export const TimeSeriesChart = dynamic(
  () => import('./time-series-chart').then(mod => ({ default: mod.TimeSeriesChart })),
  { 
    loading: () => <ChartSkeleton />, 
    ssr: false // Charts don't need SSR (data is client-fetched via SWR)
  }
);

/**
 * Lazy-loaded DonutChart (Pie charts)
 * Used for: Cost by Provider, Cost by Model breakdowns
 * Bundle impact: ~150KB (includes Recharts PieChart)
 */
export const DonutChart = dynamic(
  () => import('./donut-chart').then(mod => ({ default: mod.DonutChart })),
  { 
    loading: () => <ChartSkeleton height={264} />, 
    ssr: false 
  }
);

/**
 * Lazy-loaded DailySendsChart (Bar chart)
 * Used for: Daily email send volume visualization
 * Bundle impact: ~50KB additional (shares Recharts core with others)
 */
export const DailySendsChart = dynamic(
  () => import('./daily-sends-chart').then(mod => ({ default: mod.DailySendsChart })),
  { 
    loading: () => <ChartSkeleton height={200} />, 
    ssr: false 
  }
);

/**
 * Lazy-loaded DailyCostChart (Area chart with dots)
 * Used for: Daily LLM cost trend visualization
 * Bundle impact: Shares bundle with TimeSeriesChart (AreaChart)
 */
export const DailyCostChart = dynamic(
  () => import('./daily-cost-chart').then(mod => ({ default: mod.DailyCostChart })),
  { 
    loading: () => <ChartSkeleton height={200} />, 
    ssr: false 
  }
);
