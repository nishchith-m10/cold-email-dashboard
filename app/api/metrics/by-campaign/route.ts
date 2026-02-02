import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';
import { cacheManager, apiCacheKey, CACHE_TTL } from '@/lib/cache';
import { EXCLUDED_CAMPAIGNS, shouldExcludeCampaign } from '@/lib/db-queries';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

// Types
interface CampaignStats {
  campaign: string;
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  cost_usd: number;
  cost_per_reply: number;
}

interface ByCampaignResponse {
  campaigns: CampaignStats[];
  start_date: string;
  end_date: string;
  source: string;
}

// Core data fetching (used by cache)
async function fetchByCampaignData(
  startDate: string,
  endDate: string,
  workspaceId: string
): Promise<ByCampaignResponse> {
  const normalizeStep = (raw: unknown): number | undefined => {
    if (raw === null || raw === undefined) return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return undefined;
    return Math.floor(n);
  };

  const normalizeEmail = (email: string | null | undefined): string | undefined => {
    if (!email) return undefined;
    return email.trim().toLowerCase();
  };

  if (!supabaseAdmin) {
    return {
      campaigns: [],
      start_date: startDate,
      end_date: endDate,
      source: 'no_database',
    };
  }

  // Build queries - query email_events directly (source of truth) and daily_stats (for sends)
  let eventsQuery = supabaseAdmin
    .from('email_events')
    .select('campaign_name, event_type, contact_email, email_number, step, metadata')
    .eq('workspace_id', workspaceId)
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`);

  let costQuery = supabaseAdmin
    .from('llm_usage')
    .select('campaign_name, cost_usd')
    .eq('workspace_id', workspaceId)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);

  let contactsQuery = supabaseAdmin
    .from('daily_stats')
    .select('campaign_name, sends')
    .eq('workspace_id', workspaceId)
    .gte('day', startDate)
    .lte('day', endDate);

  // Exclude test campaigns globally
  for (const excludedCampaign of EXCLUDED_CAMPAIGNS) {
    eventsQuery = eventsQuery.neq('campaign_name', excludedCampaign);
    costQuery = costQuery.neq('campaign_name', excludedCampaign);
    contactsQuery = contactsQuery.neq('campaign_name', excludedCampaign);
  }

  // Execute BOTH queries in parallel (2 queries → 1 round trip latency)
  const [eventsResult, costResult, contactsResult] = await Promise.all([
    eventsQuery,
    costQuery,
    contactsQuery,
  ]);

  if (eventsResult.error) {
    console.error('By-campaign query error:', eventsResult.error);
    throw eventsResult.error;
  }

  // Aggregate by campaign from email_events (with additional safety filter)
  const campaignMap = new Map<string, {
    sends: number;
    replies: number;
    opt_outs: number;
    bounces: number;
  }>();
  const email1RecipientsByCampaign = new Map<string, Set<string>>();

  for (const row of eventsResult.data || []) {
    const campaignName = row.campaign_name || 'Unknown';
    // Double-check exclusion (safety net)
    if (shouldExcludeCampaign(campaignName)) continue;
    
    const existing = campaignMap.get(campaignName) || {
      sends: 0,
      replies: 0,
      opt_outs: 0,
      bounces: 0,
    };

    // Count event types
    switch (row.event_type) {
      case 'sent':
      case 'delivered':
        existing.sends++;
        break;
      case 'replied':
        existing.replies++;
        break;
      case 'opt_out':
        existing.opt_outs++;
        break;
      case 'bounced':
        existing.bounces++;
        break;
    }

    campaignMap.set(campaignName, existing);

    const metadata = row.metadata as Record<string, unknown> | null | undefined;
    const rawStep =
      normalizeStep((row as any).email_number) ??
      normalizeStep(row.step) ??
      normalizeStep(metadata?.email_number) ??
      normalizeStep(metadata?.step);
    if (rawStep === 1) {
      const emailLower = normalizeEmail(row.contact_email);
      if (!emailLower) continue;
      if (!email1RecipientsByCampaign.has(campaignName)) {
        email1RecipientsByCampaign.set(campaignName, new Set());
      }
      email1RecipientsByCampaign.get(campaignName)!.add(emailLower);
    }
  }

  // Aggregate costs by campaign (with additional safety filter)
  const costMap = new Map<string, number>();
  if (!costResult.error) {
    for (const row of costResult.data || []) {
      const campaignName = row.campaign_name || 'Unknown';
      // Double-check exclusion (safety net)
      if (shouldExcludeCampaign(campaignName)) continue;
      
      const existing = costMap.get(campaignName) || 0;
      costMap.set(campaignName, existing + (Number(row.cost_usd) || 0));
    }
  }

  // Aggregate contacts reached (email 1 sends) by campaign
  const contactsMap = new Map<string, number>();
  if (!contactsResult.error) {
    for (const row of contactsResult.data || []) {
      const campaignName = row.campaign_name || 'Unknown';
      if (shouldExcludeCampaign(campaignName)) continue;

      const existing = contactsMap.get(campaignName) || 0;
      contactsMap.set(campaignName, existing + (Number(row.sends) || 0));
    }
  }

  // Build response
  const campaigns = Array.from(campaignMap.entries()).map(([name, stats]) => {
    const replyRatePct = stats.sends > 0
      ? Number(((stats.replies / stats.sends) * 100).toFixed(2))
      : 0;
    const optOutRatePct = stats.sends > 0
      ? Number(((stats.opt_outs / stats.sends) * 100).toFixed(2))
      : 0;
    const bounceRatePct = stats.sends > 0
      ? Number(((stats.bounces / stats.sends) * 100).toFixed(2))
      : 0;
    const costUsd = Number((costMap.get(name) || 0).toFixed(2));
    const costPerReply = stats.replies > 0
      ? Number((costUsd / stats.replies).toFixed(2))
      : 0;
    const contactsFromEvents = email1RecipientsByCampaign.get(name)?.size;
    const contactsFromDaily = contactsMap.has(name)
      ? Math.round(contactsMap.get(name) || 0)
      : undefined;
    const contactsReached = Math.max(
      contactsFromEvents ?? 0,
      contactsFromDaily ?? 0
    );

    return {
      campaign: name,
      sends: stats.sends,
      replies: stats.replies,
      opt_outs: stats.opt_outs,
      bounces: stats.bounces,
      reply_rate_pct: replyRatePct,
      opt_out_rate_pct: optOutRatePct,
      bounce_rate_pct: bounceRatePct,
      cost_usd: costUsd,
      cost_per_reply: costPerReply,
      contacts_reached: contactsReached,
    };
  });

  // Sort by sends descending
  campaigns.sort((a, b) => b.sends - a.sends);

  return {
    campaigns,
    start_date: startDate,
    end_date: endDate,
    source: 'supabase',
  };
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`by-campaign:${clientId}`, RATE_LIMIT_READ);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Workspace access validation (SECURITY: Prevents unauthorized data access)
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) {
    return accessError;
  }

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  // Require Supabase
  if (!supabaseAdmin) {
    console.error('Supabase not configured');
    return NextResponse.json({
      campaigns: [],
      start_date: startDate,
      end_date: endDate,
      source: 'no_database',
    }, { headers: API_HEADERS });
  }

  try {
    // Generate cache key
    const cacheKey = apiCacheKey('by-campaign', {
      start: startDate,
      end: endDate,
      workspace: workspaceId,
    });

    // Use cache with 30 second TTL
    const data = await cacheManager.getOrSet(
      cacheKey,
      () => fetchByCampaignData(startDate, endDate, workspaceId),
      CACHE_TTL.SHORT
    );

    return NextResponse.json(data, { headers: API_HEADERS });
  } catch (error) {
    console.error('By-campaign API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
