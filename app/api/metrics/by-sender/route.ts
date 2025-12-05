import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getWorkspaceId } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface SenderStats {
  sender_email: string;
  sends: number;
  replies: number;
  opt_outs: number;
  opens: number;
  clicks: number;
  reply_rate: number;
  opt_out_rate: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const campaign = searchParams.get('campaign');
  const workspaceId = getWorkspaceId(searchParams.get('workspace_id'));

  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  if (!supabaseAdmin) {
    return NextResponse.json({
      senders: [],
      start_date: startDate,
      end_date: endDate,
      source: 'no_supabase',
    }, { headers: API_HEADERS });
  }

  try {
    // Query email events grouped by sender
    let query = supabaseAdmin
      .from('email_events')
      .select('metadata, event_type')
      .eq('workspace_id', workspaceId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Sender stats query error:', error);
      return NextResponse.json({
        senders: [],
        start_date: startDate,
        end_date: endDate,
        source: 'error',
      }, { headers: API_HEADERS });
    }

    // Aggregate by sender email from metadata
    const senderMap = new Map<string, {
      sends: number;
      replies: number;
      opt_outs: number;
      opens: number;
      clicks: number;
    }>();

    for (const row of data || []) {
      // Try to get sender from metadata
      const metadata = row.metadata as Record<string, unknown> || {};
      const senderEmail = (metadata.sender_email || metadata.from_email || 'unknown') as string;
      
      const existing = senderMap.get(senderEmail) || {
        sends: 0,
        replies: 0,
        opt_outs: 0,
        opens: 0,
        clicks: 0,
      };

      switch (row.event_type) {
        case 'sent':
          existing.sends++;
          break;
        case 'replied':
          existing.replies++;
          break;
        case 'opt_out':
          existing.opt_outs++;
          break;
        case 'opened':
          existing.opens++;
          break;
        case 'clicked':
          existing.clicks++;
          break;
      }

      senderMap.set(senderEmail, existing);
    }

    // Transform to array with calculated rates
    const senders: SenderStats[] = Array.from(senderMap.entries())
      .map(([sender_email, stats]) => ({
        sender_email,
        sends: stats.sends,
        replies: stats.replies,
        opt_outs: stats.opt_outs,
        opens: stats.opens,
        clicks: stats.clicks,
        reply_rate: stats.sends > 0 ? Number(((stats.replies / stats.sends) * 100).toFixed(2)) : 0,
        opt_out_rate: stats.sends > 0 ? Number(((stats.opt_outs / stats.sends) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.sends - a.sends); // Sort by sends descending

    return NextResponse.json({
      senders,
      total_senders: senders.length,
      start_date: startDate,
      end_date: endDate,
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('Sender stats API error:', error);
    return NextResponse.json({
      senders: [],
      start_date: startDate,
      end_date: endDate,
      source: 'error',
    }, { headers: API_HEADERS });
  }
}

