'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, BarChart3, Table2, Layers } from 'lucide-react';
import { Button } from './button';

/**
 * Common props for all error fallback components
 */
export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  componentName?: string;
}

/**
 * Compact error fallback for KPI/Metric cards
 * Matches the small footprint of MetricCard (~80-100px height)
 */
export function KPIErrorFallback({ error, resetErrorBoundary, componentName }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';
  
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-accent-danger/5 border border-accent-danger/20 rounded-xl min-h-[100px]">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-accent-danger shrink-0" />
        <span className="text-xs font-medium text-text-primary">
          {componentName || 'Metric'} Error
        </span>
      </div>
      {isDev && (
        <p className="text-xs text-text-secondary text-center mb-2 line-clamp-2">
          {error.message}
        </p>
      )}
      <button
        onClick={resetErrorBoundary}
        className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors flex items-center gap-1"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

/**
 * Chart-sized error fallback for data visualizations
 * Matches typical chart dimensions (~300-400px height)
 */
export function ChartErrorFallback({ error, resetErrorBoundary, componentName }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-accent-danger/5 border border-accent-danger/20 rounded-xl min-h-[300px]">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent-danger/10 mb-4">
        <BarChart3 className="h-8 w-8 text-accent-danger" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">
        {componentName || 'Chart'} Unavailable
      </h3>
      {isDev ? (
        <p className="text-sm text-text-secondary text-center mb-4 max-w-md">
          {error.message}
        </p>
      ) : (
        <p className="text-sm text-text-secondary text-center mb-4 max-w-md">
          Unable to load chart data. Please try again.
        </p>
      )}
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Full-width error fallback for tables
 * Matches table layout (variable height, full width)
 */
export function TableErrorFallback({ error, resetErrorBoundary, componentName }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-accent-danger/5 border border-accent-danger/20 rounded-xl min-h-[200px] w-full">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-danger/10 mb-4">
        <Table2 className="h-7 w-7 text-accent-danger" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">
        {componentName || 'Table'} Error
      </h3>
      {isDev ? (
        <p className="text-sm text-text-secondary text-center mb-4 max-w-lg">
          {error.message}
        </p>
      ) : (
        <p className="text-sm text-text-secondary text-center mb-4 max-w-lg">
          Unable to load table data. This might be a temporary issue.
        </p>
      )}
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Flexible error fallback for complex widgets
 * Adapts to container size (used for EfficiencyMetrics, StepBreakdown, etc.)
 */
export function WidgetErrorFallback({ error, resetErrorBoundary, componentName }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';
  
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-accent-danger/5 border border-accent-danger/20 rounded-xl min-h-[250px]">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-danger/10 mb-4">
        <Layers className="h-7 w-7 text-accent-danger" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">
        {componentName || 'Component'} Error
      </h3>
      {isDev ? (
        <p className="text-sm text-text-secondary text-center mb-4 max-w-md">
          {error.message}
        </p>
      ) : (
        <p className="text-sm text-text-secondary text-center mb-4 max-w-md">
          This component encountered an error. Please try reloading.
        </p>
      )}
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Utility: Get appropriate fallback component based on type
 */
export function getErrorFallback(type: 'kpi' | 'chart' | 'table' | 'widget') {
  switch (type) {
    case 'kpi':
      return KPIErrorFallback;
    case 'chart':
      return ChartErrorFallback;
    case 'table':
      return TableErrorFallback;
    case 'widget':
      return WidgetErrorFallback;
    default:
      return WidgetErrorFallback;
  }
}
