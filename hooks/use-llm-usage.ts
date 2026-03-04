/**
 * ADMIN PANELS EXPANSION: LLM Usage Hook
 *
 * SWR-based hook for fetching LLM usage data from the admin API.
 * Uses Clerk auth via admin route pattern.
 *
 * Ralph Loop: Research ✅ (llm_usage table, /api/admin/llm-usage route) →
 * Analyze ✅ (GET returns records with provider/model/cost) →
 * Execute ✅
 */

'use client';

import useSWR from 'swr';

// ============================================
// TYPES
// ============================================

export interface LLMUsageRecord {
  id: string;
  workspace_id?: string;
  campaign_name?: string | null;
  contact_email?: string | null;
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  purpose?: string | null;
  created_at: string;
}

export interface LLMUsageStats {
  totalRecords: number;
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  byProvider: Record<string, { cost: number; count: number; tokens: number }>;
  byModel: Record<string, { cost: number; count: number; tokens: number }>;
}

interface LLMUsageResponse {
  success: boolean;
  count: number;
  records: LLMUsageRecord[];
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string): Promise<LLMUsageResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ============================================
// HOOK
// ============================================

export function useLLMUsage(options?: { limit?: number }) {
  const limit = options?.limit ?? 200;
  const url = `/api/admin/llm-usage?limit=${limit}`;

  const { data, error, isLoading, mutate } = useSWR<LLMUsageResponse>(url, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
  });

  // Compute aggregate stats from records
  const records = data?.records ?? [];
  const stats: LLMUsageStats = {
    totalRecords: records.length,
    totalCost: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    // SEC-012: Use Object.create(null) to prevent prototype pollution via dynamic keys
    byProvider: Object.create(null) as Record<string, { cost: number; count: number; tokens: number }>,
    byModel: Object.create(null) as Record<string, { cost: number; count: number; tokens: number }>,
  };

  for (const r of records) {
    stats.totalCost += r.cost_usd || 0;
    stats.totalTokensIn += r.tokens_in || 0;
    stats.totalTokensOut += r.tokens_out || 0;

    // By provider
    if (!stats.byProvider[r.provider]) {
      stats.byProvider[r.provider] = { cost: 0, count: 0, tokens: 0 };
    }
    stats.byProvider[r.provider].cost += r.cost_usd || 0;
    stats.byProvider[r.provider].count += 1;
    stats.byProvider[r.provider].tokens += (r.tokens_in || 0) + (r.tokens_out || 0);

    // By model
    if (!stats.byModel[r.model]) {
      stats.byModel[r.model] = { cost: 0, count: 0, tokens: 0 };
    }
    stats.byModel[r.model].cost += r.cost_usd || 0;
    stats.byModel[r.model].count += 1;
    stats.byModel[r.model].tokens += (r.tokens_in || 0) + (r.tokens_out || 0);
  }

  return {
    records,
    stats,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}
