/**
 * Shared Dashboard Types
 * 
 * This file centralizes all TypeScript interfaces used across the dashboard.
 * These types represent the shape of data from API responses and internal state.
 */

// ============================================
// METRICS SUMMARY
// ============================================

export interface MetricsSummary {
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens?: number;
  clicks?: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  open_rate_pct?: number;
  click_rate_pct?: number;
  cost_usd: number;
  sends_change_pct: number;
  reply_rate_change_pp: number;
  opt_out_rate_change_pp: number;
  click_rate_change_pp?: number;
  cost_change_pct?: number;
  prev_sends: number;
  prev_reply_rate_pct: number;
  start_date: string;
  end_date: string;
}

// ============================================
// TIME SERIES
// ============================================

export interface TimeSeriesPoint {
  day: string;
  value: number;
}

export interface TimeSeriesData {
  metric: string;
  points: TimeSeriesPoint[];
  start_date: string;
  end_date: string;
}

export type TimeSeriesMetric = 
  | 'sends' 
  | 'replies' 
  | 'opt_outs' 
  | 'reply_rate' 
  | 'opt_out_rate'
  | 'open_rate'
  | 'click_rate';

// ============================================
// CAMPAIGNS
// ============================================

/** Status of the n8n workflow linked to a campaign */
export type N8nStatus = 'active' | 'inactive' | 'unknown' | 'error';

/** Campaign status in the dashboard */
export type CampaignStatus = 'active' | 'paused' | 'completed';

export interface Campaign {
  id: string; // Required - campaigns from DB always have an id
  workspace_id?: string;
  name: string;
  description?: string;
  status?: CampaignStatus;
  // Campaign group membership (multi-tenant isolation)
  campaign_group_id?: string;
  is_test?: boolean;
  // n8n integration fields (Pillar 1)
  n8n_workflow_id?: string;
  n8n_status?: N8nStatus;
  last_sync_at?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * A campaign group — the primary unit of selection in the dashboard UI.
 * Groups contain one or more campaigns (e.g. Email 1, Email 2, Email 3).
 * is_test=true groups are filtered out of all UI selectors automatically.
 */
export interface CampaignGroup {
  id: string;
  name: string;
  workspace_id: string; // Non-optional: enforced for tenant isolation
  is_test: boolean;
  created_at: string;
  updated_at?: string;
  campaigns?: Campaign[]; // Populated when fetched with join
}

export interface CampaignList {
  campaigns: Campaign[];
}

export interface CampaignStats {
  campaign: string;       // Campaign name (display)
  campaign_id?: string;  // Campaign UUID (for stable identity)
  campaign_group_id?: string; // Group membership (for filtering)
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  cost_usd: number;
  cost_per_reply: number;
  contacts_reached?: number;
}

export interface CampaignData {
  campaigns: CampaignStats[];
  start_date: string;
  end_date: string;
}

// ============================================
// COST BREAKDOWN
// ============================================

export interface ProviderCost {
  provider: string;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  calls: number;
}

export interface ModelCost {
  model: string;
  provider: string;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  calls: number;
}

export interface CostBreakdown {
  total: {
    cost_usd: number;
    tokens_in: number;
    tokens_out: number;
    calls: number;
  };
  by_provider: ProviderCost[];
  by_model: ModelCost[];
  daily: TimeSeriesPoint[];
  start_date: string;
  end_date: string;
}

// ============================================
// STEP BREAKDOWN
// ============================================

export interface StepBreakdown {
  step: number;
  name: string;
  sends: number;
  lastSentAt?: string;
}

export interface DailySend {
  date: string;
  count: number;
}

export interface StepBreakdownData {
  steps: StepBreakdown[];
  dailySends: DailySend[];
  totalSends: number;
  uniqueContacts: number; // Unique people who received Email 1 (Contacts Reached)
  totalLeads: number; // Total leads in database for % calculation
  dateRange: {
    start: string;
    end: string;
  };
  source: string;
}

// ============================================
// GOOGLE SHEETS
// ============================================

export interface GoogleSheetsStats {
  success: boolean;
  stats: {
    totalContacts: number;
    email1Sends: number;
    email2Sends: number;
    email3Sends: number;
    totalSends: number;
    uniqueContactsSent: number;
    replies: number;
    optOuts: number;
    replyRate: number;
    optOutRate: number;
    campaignName: string;
  };
  headers: string[];
}

// ============================================
// CHART DATA (Transformed for UI)
// ============================================

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

// ============================================
// DASHBOARD DATA (Consolidated)
// ============================================

export interface DashboardParams {
  startDate: string;
  endDate: string;
  /** @deprecated Use selectedGroupId instead. Kept for legacy single-campaign drilldown. */
  selectedCampaign?: string | null;
  /** Primary group-level filter — passes ?campaign_group_id= to the aggregate API */
  selectedGroupId?: string | null;
  selectedProvider?: string | null; // Provider filter for cost analytics
  workspaceId?: string; // Workspace filter (multi-tenant)
}

export interface DashboardData {
  // Summary metrics
  summary: MetricsSummary | undefined;
  summaryLoading: boolean;
  summaryError: unknown;

  // Time series
  sendsSeries: TimeSeriesPoint[];
  sendsLoading: boolean;
  repliesSeries: TimeSeriesPoint[];
  repliesLoading: boolean;
  replyRateSeries: TimeSeriesPoint[];
  replyRateLoading: boolean;
  clickRateSeries: TimeSeriesPoint[];
  clickRateLoading: boolean;
  optOutRateSeries: TimeSeriesPoint[];
  optOutRateLoading: boolean;

  // Cost data
  costData: CostBreakdown | undefined;
  costLoading: boolean;
  costByProvider: ChartDataPoint[];
  costByModel: ChartDataPoint[];
  costPerSend: number;
  monthlyProjection: number | null; // null if not current month
  dailySpending: number;
  isSingleDay: boolean;

  // Step breakdown
  steps: StepBreakdown[];
  dailySends: DailySend[];
  totalSends: number;
  uniqueContacts: number; // Unique people who received Email 1 (Contacts Reached)
  totalLeads: number; // Total leads in database for % calculation
  stepLoading: boolean;

  // Campaign groups (primary selection unit)
  campaignGroups: CampaignGroup[];
  campaignGroupsLoading: boolean;
  // Flat campaigns list (for management table)
  campaigns: Campaign[];
  campaignsLoading: boolean;
  campaignStats: CampaignStats[];
  campaignStatsLoading: boolean;

  // Convenience flags
  isLoading: boolean;
  isRefetching?: boolean;
  hasError: boolean;

  // Refresh functions
  refresh: () => void;
}

// ============================================
// SEQUENCES / DRAFTS TYPES
// ============================================

/** Lightweight item for Sequences list sidebar */
export interface SequenceListItem {
  id: number;
  full_name: string | null;
  email_address: string;
  organization_name: string | null;
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
  created_at: string | null;
}

/** Paginated response for /api/sequences */
export interface SequenceListResponse {
  items: SequenceListItem[];
  next_cursor: number | null;
  total: number;
}

/** Heavy payload for /api/sequences/[id] details */
export interface SequenceDetail {
  id: number;
  full_name: string | null;
  email_address: string | null;
  organization_name: string | null;
  
  // Draft Content
  email_1_subject: string | null;
  email_1_body: string | null;
  email_2_body: string | null;
  email_3_subject: string | null;
  email_3_body: string | null;
  
  // Status
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
}

/** Quality flags for UI badges */
export interface SequenceQualityFlags {
  email_1_missing_name: boolean;
  email_2_missing_name: boolean;
  email_3_missing_name: boolean;
}

