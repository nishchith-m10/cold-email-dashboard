'use client';

import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { formatCurrency as formatCurrencyUtil, Currency } from '@/lib/currency-context';
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

interface DonutChartProps {
  title: string;
  data: { name: string; value: number; color?: string }[];
  loading?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
}

const DEFAULT_COLORS = [
  CHART_COLORS.openai,
  CHART_COLORS.anthropic,
  CHART_COLORS.sends,
  CHART_COLORS.cost,
  CHART_COLORS.replies,
];

function CustomTooltip({ 
  active, 
  payload,
  valueFormatter,
  currency
}: TooltipContentProps<ValueType, NameType> & { valueFormatter?: (v: number) => string; currency: Currency }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const value = item.value as number;
  const formattedValue = valueFormatter 
    ? valueFormatter(value) 
    : formatCurrencyUtil(value, currency);

  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: String((item.payload as Record<string, unknown>)?.fill ?? '') }}
        />
        <span className="text-sm text-text-primary font-medium">{item.name}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary mt-1">{formattedValue}</p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-text-secondary">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  title,
  data,
  loading = false,
  className,
  valueFormatter,
}: DonutChartProps) {
  const { formatCurrency, currency } = useFormatCurrency();
  const formatter = valueFormatter || ((v: number) => formatCurrency(v));
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: 0.05 }}
    >
      <Card className={cn('overflow-hidden h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-center max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center">
                  <PieChartIcon className="h-6 w-6 text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary mb-1">No {title.toLowerCase()} yet</p>
                  <p className="text-xs text-text-secondary">
                    {title.includes('Provider') 
                      ? 'LLM API usage will appear here once your campaigns start running'
                      : 'Model usage breakdown will be displayed as your campaigns generate data'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
            <div className="relative h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={(props: TooltipContentProps<ValueType, NameType>) => <CustomTooltip {...props} valueFormatter={formatter} currency={currency} />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center label — perfectly centered since no Legend inside chart */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center" title={formatCurrencyUtil(total, currency, { maximumFractionDigits: 4 })}>
                  <p className="text-2xl font-bold text-text-primary cursor-default">
                    {formatCurrency(total)}
                  </p>
                  <p className="text-xs text-text-secondary">Total</p>
                </div>
              </div>
            </div>
            {/* Legend rendered outside chart so pie cy=50% stays true center */}
            <CustomLegend payload={chartData.map(d => ({ value: d.name, color: d.fill }))} />
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

