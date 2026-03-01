/**
 * ADMIN PANELS EXPANSION: LLM Usage Dashboard Tab
 *
 * Displays LLM API usage metrics across the platform with:
 *   - Total cost / tokens summary cards
 *   - Per-provider breakdown (OpenAI, Anthropic, etc.)
 *   - Per-model usage table
 *   - Recent usage log
 *
 * Design language: Consistent with existing admin tabs — bordered cards,
 * amber-500 accents, responsive grids, Badge variants, table styling.
 *
 * Ralph Loop: Research ✅ (/api/admin/llm-usage CRUD exists) →
 * Analyze ✅ (returns records with provider/model/cost/tokens) → Execute ✅
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLLMUsage } from '@/hooks/use-llm-usage';
import type { LLMUsageRecord, LLMUsageStats } from '@/hooks/use-llm-usage';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  DollarSign,
  Hash,
  RefreshCw,
  Loader2,
  TrendingUp,
  Sparkles,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ============================================
// PROVIDER COLOR MAP
// ============================================

const PROVIDER_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  openai: { color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  anthropic: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  google: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  relevance_ai: { color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
  cohere: { color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20' },
};

function getProviderConfig(provider: string) {
  const key = provider.toLowerCase().replace(/[\s-]/g, '_');
  return PROVIDER_CONFIG[key] || {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
  };
}

// ============================================
// FORMAT HELPERS
// ============================================

function formatCost(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  if (usd > 0) return `$${usd.toFixed(4)}`;
  return '$0.00';
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

// ============================================
// PROVIDER CARD
// ============================================

function ProviderCard({ provider, data }: {
  provider: string;
  data: { cost: number; count: number; tokens: number };
}) {
  const config = getProviderConfig(provider);

  return (
    <div className={cn('border rounded-lg p-4 space-y-3 transition-all', config.borderColor, config.bgColor)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-semibold capitalize', config.color)}>
          {provider}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {data.count} calls
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost</span>
          <p className={cn('text-lg font-bold tabular-nums', config.color)}>{formatCost(data.cost)}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tokens</span>
          <p className="text-lg font-bold tabular-nums">{formatTokens(data.tokens)}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MODEL TABLE
// ============================================

function ModelTable({ byModel }: { byModel: LLMUsageStats['byModel'] }) {
  const models = Object.entries(byModel)
    .sort(([, a], [, b]) => b.cost - a.cost);

  if (models.length === 0) return null;

  const maxCost = Math.max(...models.map(([, m]) => m.cost), 0.001);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-elevated">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Calls</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Tokens</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cost</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Share</th>
          </tr>
        </thead>
        <tbody>
          {models.map(([model, data]) => {
            const pct = maxCost > 0 ? (data.cost / maxCost) * 100 : 0;
            return (
              <tr key={model} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium font-mono">{model}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground tabular-nums">{data.count.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground tabular-nums">{formatTokens(data.tokens)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold tabular-nums">{formatCost(data.cost)}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-10">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// RECENT USAGE LOG
// ============================================

function RecentUsageLog({ records }: { records: LLMUsageRecord[] }) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? records : records.slice(0, 10);

  if (records.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Recent Activity ({records.length})
      </h3>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-elevated">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Provider / Model</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Purpose</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Tokens</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cost</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">When</th>
            </tr>
          </thead>
          <tbody>
            {display.map((record) => {
              const provConfig = getProviderConfig(record.provider);
              return (
                <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <span className={cn('text-xs font-semibold capitalize', provConfig.color)}>
                        {record.provider}
                      </span>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{record.model}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">{record.purpose || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatTokens(record.tokens_in)} in / {formatTokens(record.tokens_out)} out
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold tabular-nums">{formatCost(record.cost_usd)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {records.length > 10 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full gap-1 text-xs text-muted-foreground"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show All ({records.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LLMUsageTab() {
  const { records, stats, isLoading, error, refresh } = useLLMUsage({ limit: 200 });
  const { toast } = useToast();

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-4">
        <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h3 className="text-lg font-semibold mb-2">Failed to load LLM usage data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => refresh()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const hasData = records.length > 0;
  const providers = Object.entries(stats.byProvider).sort(([, a], [, b]) => b.cost - a.cost);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold">LLM Usage Dashboard</h2>
            <p className="text-xs text-muted-foreground">
              Token usage &amp; cost tracking across all AI providers
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refresh()}
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Cost</span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500 tabular-nums">{formatCost(stats.totalCost)}</div>
        </div>
        <div className="border border-border rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">API Calls</span>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{stats.totalRecords.toLocaleString()}</div>
        </div>
        <div className="border border-border rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tokens In</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{formatTokens(stats.totalTokensIn)}</div>
        </div>
        <div className="border border-border rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tokens Out</span>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{formatTokens(stats.totalTokensOut)}</div>
        </div>
      </div>

      {!hasData ? (
        <div className="border border-border rounded-lg p-12 text-center space-y-3">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">
            No LLM usage recorded yet. Usage will appear here once workflows
            start making API calls to OpenAI, Anthropic, and other providers.
          </p>
        </div>
      ) : (
        <>
          {/* Provider Breakdown */}
          {providers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                By Provider
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {providers.map(([provider, data]) => (
                  <ProviderCard key={provider} provider={provider} data={data} />
                ))}
              </div>
            </div>
          )}

          {/* Model Breakdown Table */}
          {Object.keys(stats.byModel).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Hash className="h-4 w-4" />
                By Model
              </h3>
              <ModelTable byModel={stats.byModel} />
            </div>
          )}

          {/* Recent Activity Log */}
          <RecentUsageLog records={records} />
        </>
      )}
    </div>
  );
}
