'use client';

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

// Parse a YYYY-MM-DD calendar date string as a local date (avoids UTC midnight
// being interpreted as the previous day in negative-offset timezones).
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatShortCalendarDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${SHORT_MONTHS[month]} ${day}`;
}



interface TimeSeriesChartProps {
  title: string;
  data: { day: string; value: number }[];
  color?: string;
  type?: 'line' | 'area';
  loading?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  subtitle?: string;
}

function CustomTooltip({ 
  active, 
  payload, 
  label,
  valueFormatter 
}: TooltipContentProps<ValueType, NameType> & { valueFormatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value as number;
  const formattedValue = valueFormatter ? valueFormatter(value) : value.toLocaleString();
  let displayLabel = String(label);
  if (typeof label === 'number') {
    const d = new Date(label);
    displayLabel = `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
  } else if (typeof label === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(label)) {
    displayLabel = formatShortCalendarDate(label);
  }

  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-text-secondary mb-1">{displayLabel}</p>
      <p className="text-sm font-semibold text-text-primary">{formattedValue}</p>
    </div>
  );
}

export function TimeSeriesChart({
  title,
  data,
  color = CHART_COLORS.sends,
  type = 'area',
  loading = false,
  className,
  valueFormatter,
  height = 280,
  subtitle,
}: TimeSeriesChartProps) {
  // Use numeric timestamps as X axis values — pixel spacing is then purely
  // arithmetic (linear scale), so ticks can be placed at exactly equal intervals
  // regardless of data point count. Start and end dates are always included.
  const formattedData = data.map(d => {
    const parts = d.day.split('-').map(Number);
    const ts = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    return { ...d, ts };
  });

  const xAxisTicks = (() => {
    const n = formattedData.length;
    if (n === 0) return [];
    if (n === 1) return [formattedData[0].ts];
    const startTs = formattedData[0].ts;
    const endTs = formattedData[n - 1].ts;
    const target = Math.min(n, 15);
    const ticks: number[] = [];
    for (let i = 0; i < target; i++) {
      ticks.push(Math.round(startTs + (i / (target - 1)) * (endTs - startTs)));
    }
    return ticks;
  })();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: 0.03 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="pb-4 pt-4">
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent
                key={(data[0]?.day ?? '') + data.length}
                data={formattedData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--border)" 
                  vertical={false}
                />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickMargin={8}
                  ticks={xAxisTicks}
                  tickFormatter={(ts: number) => {
                    const d = new Date(ts);
                    return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickMargin={8}
                  tickFormatter={(v) => valueFormatter ? valueFormatter(v) : v.toLocaleString()}
                />
                <Tooltip 
                  content={(props: TooltipContentProps<ValueType, NameType>) => <CustomTooltip {...props} valueFormatter={valueFormatter} />}
                  cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }}
                />
                {type === 'area' ? (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${color.replace('#', '')})`}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                ) : (
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: 'var(--surface)' }}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                )}
              </ChartComponent>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

