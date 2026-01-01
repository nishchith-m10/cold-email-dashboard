import { supabaseAdmin } from './supabase';
import { getLeadsTableName } from './workspace-db-config';

export interface MetricsSummary {
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens: number;
  clicks: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  cost_usd: number;
}

export interface CostBreakdown {
  total_cost: number;
  by_provider: Array<{
    provider: string;
    cost_usd: number;
    calls: number;
  }>;
  by_model: Array<{
    model: string;
    provider: string;
    cost_usd: number;
  }>;
}

export interface CampaignStat {
  campaign_name: string;
  sends: number;
  replies: number;
  reply_rate_pct: number;
  opt_outs?: number;
  opt_out_rate_pct?: number;
  bounces?: number;
  cost_usd?: number;
}

export interface EmailEvent {
  contact_email: string;
  campaign_name: string;
  event_type: string;
  created_at: string;
}

export interface RAGContext {
  summary: MetricsSummary;
  summary7d: MetricsSummary;
  summaryPrev7d: MetricsSummary;
  summary30d: MetricsSummary;
  costBreakdown: CostBreakdown;
  topCampaigns: CampaignStat[];
  topMovers: Array<{ metric: string; current: number; previous: number; delta: number }>;
  stepBreakdown: Array<{ step: number; sends: number }>;
  uniqueContacts: number;
  recentEvents: EmailEvent[];
  dateRange: { start: string; end: string };
  dateRange7d: { start: string; end: string };
  dateRangePrev7d: { start: string; end: string };
  dateRange30d: { start: string; end: string };
  totalLeads: number;
}

/**
 * Build RAG context for AI assistant
 * Fetches relevant data from the dashboard for the specified date range
 */
export async function buildRAGContext(
  workspaceId: string,
  startDate: string,
  endDate: string,
  campaign?: string
): Promise<RAGContext> {
  const supabase = supabaseAdmin;
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date(endDate);
  const start = new Date(startDate);

  const end7d = end;
  const start7d = new Date(end7d.getTime() - 6 * 24 * 3600 * 1000);
  const endPrev7d = new Date(start7d.getTime() - 1 * 24 * 3600 * 1000);
  const startPrev7d = new Date(endPrev7d.getTime() - 6 * 24 * 3600 * 1000);
  const end30d = end;
  const start30d = new Date(end30d.getTime() - 29 * 24 * 3600 * 1000);

  const windows = [
    { key: 'main', start: startDate, end: endDate },
    { key: 'w7', start: fmt(start7d), end: fmt(end7d) },
    { key: 'w7prev', start: fmt(startPrev7d), end: fmt(endPrev7d) },
    { key: 'w30', start: fmt(start30d), end: fmt(end30d) },
  ] as const;

  const eventsResults = await Promise.all(
    windows.map(w => {
      let q = supabase
        .from('email_events')
        .select('event_type, contact_email, campaign_name, email_number, event_ts')
        .eq('workspace_id', workspaceId)
        .gte('event_ts', `${w.start}T00:00:00Z`)
        .lte('event_ts', `${w.end}T23:59:59Z`);
      if (campaign) q = q.eq('campaign_name', campaign);
      return q;
    })
  );

  const eventsByKey: Record<string, any[]> = {};
  windows.forEach((w, idx) => {
    eventsByKey[w.key] = eventsResults[idx].data || [];
  });

  const buildSummary = (events: any[]): MetricsSummary => {
    const sends = events.filter(e => e.event_type === 'sent').length || 0;
    const replies = events.filter(e => e.event_type === 'replied').length || 0;
    const opt_outs = events.filter(e => e.event_type === 'opt_out').length || 0;
    const bounces = events.filter(e => e.event_type === 'bounced').length || 0;
    const opens = events.filter(e => e.event_type === 'opened').length || 0;
    const clicks = events.filter(e => e.event_type === 'clicked').length || 0;
    const summary: MetricsSummary = {
      sends,
      replies,
      opt_outs,
      bounces,
      opens,
      clicks,
      reply_rate_pct: 0,
      opt_out_rate_pct: 0,
      cost_usd: 0,
    };
    if (summary.sends > 0) {
      summary.reply_rate_pct = Number(((summary.replies / summary.sends) * 100).toFixed(2));
      summary.opt_out_rate_pct = Number(((summary.opt_outs / summary.sends) * 100).toFixed(2));
    }
    return summary;
  };

  const summary = buildSummary(eventsByKey.main);
  const summary7d = buildSummary(eventsByKey.w7);
  const summaryPrev7d = buildSummary(eventsByKey.w7prev);
  const summary30d = buildSummary(eventsByKey.w30);

  // Fetch LLM cost data
  let costQuery = supabase
    .from('llm_usage')
    .select('provider, model, cost_usd')
    .eq('workspace_id', workspaceId)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);

  if (campaign) {
    costQuery = costQuery.eq('campaign_name', campaign);
  }

  const { data: costs } = await costQuery;

  const totalCost = costs?.reduce((sum, c) => sum + (c.cost_usd || 0), 0) || 0;
  summary.cost_usd = Number(totalCost.toFixed(2));

  // Group costs by provider
  const providerMap = new Map<string, { cost: number; calls: number }>();
  costs?.forEach(c => {
    const existing = providerMap.get(c.provider) || { cost: 0, calls: 0 };
    providerMap.set(c.provider, {
      cost: existing.cost + (c.cost_usd || 0),
      calls: existing.calls + 1,
    });
  });

  const costBreakdown: CostBreakdown = {
    total_cost: totalCost,
    by_provider: Array.from(providerMap.entries())
      .map(([provider, data]) => ({
        provider,
        cost_usd: Number(data.cost.toFixed(4)),
        calls: data.calls,
      }))
      .sort((a, b) => b.cost_usd - a.cost_usd),
    by_model: [],
  };

  // Group costs by model (top 5)
  const modelMap = new Map<string, { provider: string; cost: number }>();
  costs?.forEach(c => {
    const existing = modelMap.get(c.model) || { provider: c.provider, cost: 0 };
    modelMap.set(c.model, {
      provider: c.provider,
      cost: existing.cost + (c.cost_usd || 0),
    });
  });

  costBreakdown.by_model = Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      provider: data.provider,
      cost_usd: Number(data.cost.toFixed(4)),
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, 5);

  // Fetch top campaigns
  const { data: campaignEvents } = await supabase
    .from('email_events')
    .select('campaign_name, event_type')
    .eq('workspace_id', workspaceId)
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`);

  const campaignStatsMap = new Map<string, { sends: number; replies: number; opt_outs: number; bounces: number }>();
  campaignEvents?.forEach(e => {
    const stats = campaignStatsMap.get(e.campaign_name) || { sends: 0, replies: 0, opt_outs: 0, bounces: 0 };
    if (e.event_type === 'sent') stats.sends++;
    if (e.event_type === 'replied') stats.replies++;
    if (e.event_type === 'opt_out') stats.opt_outs++;
    if (e.event_type === 'bounced') stats.bounces++;
    campaignStatsMap.set(e.campaign_name, stats);
  });

  const campaignCostMap = new Map<string, number>();
  costs?.forEach(c => {
    const name = (c as any).campaign_name || 'Unknown';
    campaignCostMap.set(name, (campaignCostMap.get(name) || 0) + (c.cost_usd || 0));
  });

  const topCampaigns: CampaignStat[] = Array.from(campaignStatsMap.entries())
    .map(([campaign_name, stats]) => {
      const cost = campaignCostMap.get(campaign_name) || 0;
      const reply_rate_pct = stats.sends > 0 ? Number(((stats.replies / stats.sends) * 100).toFixed(2)) : 0;
      const opt_out_rate_pct = stats.sends > 0 ? Number(((stats.opt_outs / stats.sends) * 100).toFixed(2)) : 0;
      return {
        campaign_name,
        sends: stats.sends,
        replies: stats.replies,
        reply_rate_pct,
        opt_outs: stats.opt_outs,
        opt_out_rate_pct,
        bounces: stats.bounces,
        cost_usd: Number(cost.toFixed(2)),
      };
    })
    .sort((a, b) => b.sends - a.sends)
    .slice(0, 5);

  // Fetch recent events (last 10 replies or opt-outs)
  const { data: recentEvents } = await supabase
    .from('email_events')
    .select('contact_email, campaign_name, event_type, created_at')
    .eq('workspace_id', workspaceId)
    .in('event_type', ['replied', 'opt_out'])
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false })
    .limit(10);

  // Step breakdown (main window)
  const stepMap = new Map<number, number>();
  const email1Recipients = new Set<string>();
  (eventsByKey.main || []).forEach(e => {
    const step = (e as any).email_number ?? 1;
    stepMap.set(step, (stepMap.get(step) || 0) + 1);
    if (step === 1 && e.contact_email) {
      email1Recipients.add(e.contact_email.toLowerCase());
    }
  });
  const stepBreakdown = Array.from(stepMap.entries())
    .map(([step, sends]) => ({ step, sends }))
    .sort((a, b) => a.step - b.step);

  // Get total leads count
  const leadsTable = await getLeadsTableName(workspaceId);
  const { count: totalLeads } = await supabase
    .from(leadsTable)
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  // Movers (7d vs prev 7d)
  const movers: Array<{ metric: string; current: number; previous: number; delta: number }> = [];
  const addMover = (name: string, curr: number, prev: number) => {
    movers.push({ metric: name, current: curr, previous: prev, delta: Number((curr - prev).toFixed(2)) });
  };
  addMover('sends_7d_vs_prev', summary7d.sends, summaryPrev7d.sends);
  addMover('replies_7d_vs_prev', summary7d.replies, summaryPrev7d.replies);
  addMover('reply_rate_7d_vs_prev', summary7d.reply_rate_pct, summaryPrev7d.reply_rate_pct);
  addMover('opt_out_rate_7d_vs_prev', summary7d.opt_out_rate_pct, summaryPrev7d.opt_out_rate_pct);

  return {
    summary,
    summary7d,
    summaryPrev7d,
    summary30d,
    costBreakdown,
    topCampaigns,
    topMovers: movers,
    stepBreakdown,
    uniqueContacts: email1Recipients.size,
    recentEvents: recentEvents || [],
    dateRange: { start: startDate, end: endDate },
    dateRange7d: { start: fmt(start7d), end: fmt(end7d) },
    dateRangePrev7d: { start: fmt(startPrev7d), end: fmt(endPrev7d) },
    dateRange30d: { start: fmt(start30d), end: fmt(end30d) },
    totalLeads: totalLeads || 0,
  };
}

/**
 * Format RAG context into a prompt for the AI
 */
export function formatContextForPrompt(context: RAGContext): string {
  const {
    summary,
    summary7d,
    summaryPrev7d,
    summary30d,
    costBreakdown,
    topCampaigns,
    topMovers,
    stepBreakdown,
    uniqueContacts,
    recentEvents,
    dateRange,
    dateRange7d,
    dateRangePrev7d,
    dateRange30d,
    totalLeads,
  } = context;

  return `
Dashboard Data (${dateRange.start} to ${dateRange.end}):

## Summary Metrics
- Total Sends: ${summary.sends.toLocaleString()}
- Replies: ${summary.replies} (${summary.reply_rate_pct}% rate)
- Opt-outs: ${summary.opt_outs} (${summary.opt_out_rate_pct}% rate)
- Opens: ${summary.opens}
- Clicks: ${summary.clicks}
- Bounces: ${summary.bounces}
- Total LLM Cost: $${summary.cost_usd.toFixed(2)}
- Unique Contacts Reached (Email 1): ${uniqueContacts.toLocaleString()}
- Total Leads in Database: ${totalLeads.toLocaleString()}

## Multi-Window Snapshots
- 7d Sends/Replies: ${summary7d.sends.toLocaleString()} / ${summary7d.replies.toLocaleString()} (Reply rate ${summary7d.reply_rate_pct}%)
- Prev 7d Sends/Replies: ${summaryPrev7d.sends.toLocaleString()} / ${summaryPrev7d.replies.toLocaleString()} (Reply rate ${summaryPrev7d.reply_rate_pct}%)
- 30d Sends/Replies: ${summary30d.sends.toLocaleString()} / ${summary30d.replies.toLocaleString()} (Reply rate ${summary30d.reply_rate_pct}%)

## Movers (7d vs Prev 7d)
${topMovers.map(m => `- ${m.metric}: ${m.current} (prev ${m.previous}, Δ ${m.delta})`).join('\n')}

## Step Breakdown
${stepBreakdown.map(s => `- Step ${s.step}: ${s.sends.toLocaleString()} sends`).join('\n')}

## Cost Breakdown
${costBreakdown.by_provider.map(p => 
  `- ${p.provider}: $${p.cost_usd.toFixed(4)} (${p.calls} calls)`
).join('\n')}

## Top Campaigns
${topCampaigns.map(c => 
  `- ${c.campaign_name}: ${c.sends} sends, ${c.replies} replies (${c.reply_rate_pct}% rate, opt-outs ${c.opt_outs ?? 0}, cost $${(c.cost_usd ?? 0).toFixed(2)})`
).join('\n')}

## Recent Activity
${recentEvents.slice(0, 5).map(e => 
  `- ${e.event_type === 'replied' ? '✅' : '🚫'} ${e.contact_email} (${e.campaign_name})`
).join('\n')}

## Date Windows Used
- Main: ${dateRange.start} to ${dateRange.end}
- 7d: ${dateRange7d.start} to ${dateRange7d.end}
- Prev 7d: ${dateRangePrev7d.start} to ${dateRangePrev7d.end}
- 30d: ${dateRange30d.start} to ${dateRange30d.end}
`.trim();
}

