import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import { getLeadsTableName } from '@/lib/workspace-db-config';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: number;
  workspace_id: string;
  email_address: string;
  full_name: string | null;
  organization_name: string | null;
  linkedin_url: string | null;
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
  replied: boolean | null;
  opted_out: boolean | null;
  organization_website: string | null;
  position: string | null;
  industry: string | null;
  created_at?: string;
};

type EventRow = {
  id: string;
  event_type: string;
  event_ts: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  campaign_name: string | null;
  email_number: number | null;
  contact_email: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const workspaceId = extractWorkspaceId(req, searchParams) || DEFAULT_WORKSPACE_ID;
  const leadIdParam = params.id;
  if (!leadIdParam) {
    return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
  }
  const leadId = Number(leadIdParam);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
  }

  try {
    const leadsTable = await getLeadsTableName(workspaceId);
    const { data: lead, error: leadError } = await supabaseAdmin
      .from(leadsTable)
      .select(
        `
          id,
          workspace_id,
          email_address,
          full_name,
          organization_name,
          linkedin_url,
          email_1_sent,
          email_2_sent,
          email_3_sent,
          replied,
          opted_out,
          organization_website,
          position,
          industry,
          created_at
        `
      )
      .eq('id', leadId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (leadError || !lead) {
      console.error('Lead fetch error:', leadError);
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const { data: events, error: eventsError } = await supabaseAdmin
      .from('email_events')
      .select(
        `
          id,
          event_type,
          event_ts,
          created_at,
          metadata,
          campaign_name,
          email_number,
          contact_email
        `
      )
      .eq('workspace_id', workspaceId)
      .or(`contact_email.eq.${lead.email_address},contact_email.eq.${lead.email_address.toLowerCase?.() || lead.email_address}`)
      .order('event_ts', { ascending: true })
      .limit(200);

    if (eventsError) {
      console.error('Contact events fetch error:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch contact events' }, { status: 500 });
    }

    const eventList = events || [];
    let lastContacted: string | null = null;
    if (eventList.length) {
      const sends = eventList.filter(e => e.event_type === 'sent' || e.event_type === 'delivered');
      const pick = (sends.length ? sends : eventList)[(sends.length ? sends : eventList).length - 1];
      lastContacted = pick?.event_ts || pick?.created_at || null;
    }

    const deriveStatus = (row: LeadRow): 'not_sent' | 'contacted' | 'replied' | 'opt_out' => {
      if (row.replied) return 'replied';
      if (row.opted_out) return 'opt_out';
      if (row.email_1_sent || row.email_2_sent || row.email_3_sent) return 'contacted';
      return 'not_sent';
    };

    return NextResponse.json({
      id: lead.id,
      name: lead.full_name,
      email: lead.email_address,
      company: lead.organization_name,
      campaign_id: null,
      campaign_name: null,
      status: deriveStatus(lead),
      last_contacted_at: lastContacted,
      created_at: lead.created_at || null,
      linkedin_url: lead.linkedin_url,
      organization_website: lead.organization_website,
      position: lead.position,
      industry: lead.industry,
      email_1_sent: lead.email_1_sent,
      email_2_sent: lead.email_2_sent,
      email_3_sent: lead.email_3_sent,
      replied: lead.replied,
      opted_out: lead.opted_out,
      events: eventList,
    });
  } catch (err) {
    console.error('Contact detail GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

