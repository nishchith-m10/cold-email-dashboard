'use client';

import { memo, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { Wallet, Users, Target, Info, ToggleLeft, ToggleRight } from 'lucide-react';

interface EfficiencyMetricsProps {
  dailySpending: number;
  isSingleDay: boolean;
  monthlyProjection: number | null;
  totalCost?: number;
  totalSends?: number;
  totalContacts: number;
  loading?: boolean;
  className?: string;
}

function EfficiencyMetricsComponent({
  dailySpending,
  isSingleDay,
  monthlyProjection,
  totalCost = 0,
  totalSends = 0,
  totalContacts,
  loading = false,
  className,
}: EfficiencyMetricsProps) {
  const [efficiencyMode, setEfficiencyMode] = useState<'cpl' | 'cpm'>('cpl');

  const { efficiencyLabel, efficiencyValue, efficiencySublabel } = useMemo(() => {
    const cost = totalCost ?? 0;
    const contacts = totalContacts ?? 0;
    const cpl = contacts > 0 ? cost / contacts : 0;
    const cpm = totalSends > 0 ? (cost / totalSends) * 1000 : 0;
    const label = efficiencyMode === 'cpl' ? 'Cost Per Lead' : 'CPM (per 1k Sends)';
    const value = efficiencyMode === 'cpl' ? cpl : cpm;
    const sub = efficiencyMode === 'cpl'
      ? 'Total cost ÷ Contacts Reached'
      : 'Cost per 1,000 sends';
    return { efficiencyLabel: label, efficiencyValue: value, efficiencySublabel: sub };
  }, [efficiencyMode, totalCost, totalContacts, totalSends]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex flex-col gap-4 h-full">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="flex-1 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const dailyLabel = isSingleDay ? 'Daily Cost' : 'Avg. Daily Cost';

  const metrics = [
    {
      icon: Wallet,
      label: dailyLabel,
      value: formatCurrency(dailySpending),
      sublabel: isSingleDay ? 'Cost for selected day' : 'Average per day in range',
      valueColor: 'text-accent-primary',
      tooltip: null,
    },
    {
      icon: Target,
      label: 'Monthly Projection',
      value: monthlyProjection !== null ? formatCurrency(monthlyProjection) : 'N/A',
      sublabel: monthlyProjection !== null ? 'Based on current pace' : 'Select current month',
      valueColor: 'text-accent-primary',
      tooltip: monthlyProjection !== null 
        ? 'Calculated as: (Cost Month-to-Date ÷ Days Passed) × Days in Month. Only shown when viewing the current month.'
        : 'Monthly projection is only available when viewing the current month date range.',
    },
    {
      icon: Wallet,
      label: efficiencyLabel,
      value: formatCurrency(efficiencyValue),
      sublabel: efficiencySublabel,
      valueColor: 'text-accent-success',
      tooltip: null,
      toggle: true,
    },
    {
      icon: Users,
      label: 'Contacts Reached',
      value: totalContacts.toLocaleString(),
      sublabel: 'Total in sequence',
      valueColor: 'text-text-primary',
      tooltip: null,
    },
  ];

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className={cn('overflow-hidden h-full flex flex-col', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Efficiency Metrics</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Vertical stack layout - Command Panel style */}
          <div className="flex flex-col gap-4 h-full">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex-1 rounded-xl border border-border bg-surface-elevated/50 p-4 flex flex-row items-center group"
              >
                {/* Icon on Left */}
                <div className={cn(
                  'h-12 w-12 rounded-lg flex items-center justify-center shrink-0',
                  metric.valueColor === 'text-accent-success' && 'bg-accent-success/10',
                  metric.valueColor === 'text-accent-primary' && 'bg-accent-primary/10',
                  metric.valueColor === 'text-text-primary' && 'bg-surface-elevated'
                )}>
                  <metric.icon className={cn('h-6 w-6', metric.valueColor)} />
                </div>
                
                {/* Text on Right */}
                <div className="ml-4 flex flex-col items-start flex-1">
                  <div className="flex items-center gap-2">
                    <motion.p
                      layout
                      className="text-xs font-medium text-text-secondary"
                    >
                      {metric.label}
                    </motion.p>
                    {metric.toggle && (
                      <button
                        type="button"
                        onClick={() => setEfficiencyMode(prev => prev === 'cpl' ? 'cpm' : 'cpl')}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border hover:border-accent-primary/60 hover:text-accent-primary transition-colors"
                      >
                        {efficiencyMode === 'cpl' ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
                        <span className="uppercase">{efficiencyMode}</span>
                      </button>
                    )}
                    {metric.tooltip && (
                      <div className="relative">
                        <Info className="h-3.5 w-3.5 text-text-secondary hover:text-accent-primary transition-colors cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-surface border border-border rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <p className="text-xs text-text-primary leading-relaxed">
                            {metric.tooltip}
                          </p>
                          {/* Arrow */}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border" />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className={cn('text-xl font-bold', metric.valueColor)}>
                    {metric.value}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {metric.sublabel}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Memoize to prevent re-renders when parent updates but data hasn't changed
export const EfficiencyMetrics = memo(EfficiencyMetricsComponent);

EfficiencyMetrics.displayName = 'EfficiencyMetrics';
