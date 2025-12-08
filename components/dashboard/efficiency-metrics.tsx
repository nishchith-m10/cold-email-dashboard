'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { DollarSign, Users, Target } from 'lucide-react';

interface EfficiencyMetricsProps {
  costPerReply: number;
  monthlyProjection: number | null;
  totalContacts: number;
  loading?: boolean;
  className?: string;
}

function EfficiencyMetricsComponent({
  costPerReply,
  monthlyProjection,
  totalContacts,
  loading = false,
  className,
}: EfficiencyMetricsProps) {
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

  const metrics = [
    {
      icon: DollarSign,
      label: 'Cost per Reply',
      value: formatCurrency(costPerReply),
      sublabel: 'Reply ROI',
      valueColor: 'text-accent-success',
    },
    {
      icon: Target,
      label: 'Monthly Projection',
      value: monthlyProjection !== null ? formatCurrency(monthlyProjection) : 'N/A',
      sublabel: monthlyProjection !== null ? 'Based on current pace' : 'Select current month',
      valueColor: 'text-accent-primary',
    },
    {
      icon: Users,
      label: 'Contacts Reached',
      value: totalContacts.toLocaleString(),
      sublabel: 'Total in sequence',
      valueColor: 'text-text-primary',
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
                className="flex-1 rounded-xl border border-border bg-surface-elevated/50 p-4 flex flex-row items-center"
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
                <div className="ml-4 flex flex-col items-start">
                  <p className="text-xs font-medium text-text-secondary">
                    {metric.label}
                  </p>
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
