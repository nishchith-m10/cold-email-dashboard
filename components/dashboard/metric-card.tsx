'use client';

import { motion } from 'framer-motion';
import { cn, formatNumber, formatPercent } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { formatCurrency as formatCurrencyFromContext } from '@/lib/currency-context';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Send,
  MessageSquareReply,
  UserMinus,
  DollarSign,
  PiggyBank,
  CalendarClock,
  AlertTriangle,
  MousePointerClick
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  format?: 'number' | 'currency' | 'percent';
  icon?: 'sends' | 'replies' | 'opt-outs' | 'cost' | 'bounces' | 'clicks' | 'spend' | 'projection';
  loading?: boolean;
  isRefetching?: boolean;
  className?: string;
  delay?: number;
  tooltip?: string;
  description?: string; // Sub-description text below the value
}

const iconMap = {
  'sends': Send,
  'replies': MessageSquareReply,
  'opt-outs': UserMinus,
  'cost': DollarSign,
  'bounces': AlertTriangle,
  'clicks': MousePointerClick,
  'spend': PiggyBank,
  'projection': CalendarClock,
};

const iconColorMap: Record<string, string> = {
  'sends': 'text-accent-primary',
  'replies': 'text-accent-success',
  'opt-outs': 'text-accent-danger',
  'cost': 'text-accent-purple',
  'bounces': 'text-accent-warning',
  'clicks': 'text-orange-500',
  'spend': 'text-green-500',
  'projection': 'text-accent-primary',
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  format = 'number',
  icon = 'sends',
  loading = false,
  isRefetching = false,
  className,
  delay = 0,
  description,
}: MetricCardProps) {
  const Icon = iconMap[icon];
  const iconColors = iconColorMap[icon];
  const { formatCurrency: formatCurrencyWithContext, currency } = useFormatCurrency();

  // Format value based on type
  const formattedValue = (() => {
    switch (format) {
      case 'currency':
        return formatCurrencyWithContext(value);
      case 'percent':
        return formatPercent(value);
      default:
        return formatNumber(value);
    }
  })();

  // For currency, provide precise tooltip value (4 decimal places)
  const tooltipValue = format === 'currency' 
    ? formatCurrencyFromContext(value, currency, { 
        minimumFractionDigits: currency === 'JPY' ? 0 : 4, 
        maximumFractionDigits: currency === 'JPY' ? 0 : 4 
      })
    : undefined;

  const isPositiveGood = icon === 'replies' || icon === 'sends' || icon === 'clicks';
  const trendIsPositive = change !== undefined && change > 0;
  const trendIsNegative = change !== undefined && change < 0;
  
  // For opt-outs and bounces, down is good
  const isGoodTrend = isPositiveGood ? trendIsPositive : trendIsNegative;
  const isBadTrend = isPositiveGood ? trendIsNegative : trendIsPositive;

  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </Card>
    );
  }

  // Only show "vs prev" when change has a meaningful non-zero value
  const hasChange = change !== undefined && change !== 0;

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
    >
      <Card className={cn(
        'relative overflow-hidden hover:bg-surface-elevated/30 transition-all duration-300 h-full',
        className
      )}>
        <div className="space-y-1 sm:space-y-2">
          {/* Title row — icon and title on the same horizontal axis */}
          <div className="flex items-center gap-1.5">
            <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', iconColors)} />
            <p className="text-xs sm:text-sm font-medium text-text-secondary truncate">{title}</p>
          </div>

          <motion.p 
            className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight cursor-default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: delay * 0.1 + 0.2 }}
            title={tooltipValue}
          >
            {formattedValue}
          </motion.p>

          {hasChange && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              {trendIsPositive && (
                <TrendingUp className={cn(
                  'h-3.5 w-3.5',
                  isGoodTrend ? 'text-accent-success' : 'text-accent-danger'
                )} />
              )}
              {trendIsNegative && (
                <TrendingDown className={cn(
                  'h-3.5 w-3.5',
                  isBadTrend ? 'text-accent-danger' : 'text-accent-success'
                )} />
              )}
              
              <span className={cn(
                'text-xs font-medium',
                isGoodTrend && 'text-accent-success',
                isBadTrend && 'text-accent-danger'
              )}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}{changeLabel || '%'}
              </span>
              
              <span className="text-xs text-text-secondary hidden sm:inline">vs prev</span>
            </div>
          )}

          {/* When change is 0 or undefined, show nothing (no "vs prev") */}
          {change !== undefined && change === 0 && (
            <div className="flex items-center gap-1">
              <Minus className="h-3.5 w-3.5 text-text-secondary" />
              <span className="text-xs font-medium text-text-secondary">0.0%</span>
            </div>
          )}

          {/* Description text (when no change indicator) */}
          {description && change === undefined && (
            <p className="text-xs text-text-secondary">{description}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}