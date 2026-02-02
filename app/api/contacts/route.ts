import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import { getLeadsTableName } from '@/lib/workspace-db-config';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: number;
  workspace_id: string | null;
  full_name: string | null;
  organization_name: string | null;
  linkedin_url: string | null;
  email_address: string | null;
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
  replied: boolean | null;
  opted_out: boolean | null;
  organization_website: string | null;
  position: string | null;
  industry: string | null;
  created_at: string | null;
};

type LeadResponseItem = {
  id: number;
  name: string | null;
  email: string | null;
  company: string | null;
  status: 'not_sent' | 'contacted' | 'replied' | 'opt_out' | 'cycle_one';
  last_contacted_at: string | null;
  created_at: string | null;
  linkedin_url: string | null;
  organization_website: string | null;
  position: string | null;
  industry: string | null;
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
  replied: boolean | null;
  opted_out: boolean | null;
};

type LeadListResponse = {
  contacts: LeadResponseItem[];
  next_cursor: string | null;
  total?: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function getLimit(searchParams: URLSearchParams) {
  const parsed = parseInt(searchParams.get('limit') || '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(parsed, MAX_LIMIT);
  }
  return DEFAULT_LIMIT;
}

export async function GET(req: NextRequest) {
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
  const limit = getLimit(searchParams);
  const cursorParam = searchParams.get('cursor') || searchParams.get('page') || '1';
  const page = Math.max(1, parseInt(cursorParam, 10) || 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = searchParams.get('search')?.trim();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // NOTE: Date range filtering is NOT applied to the contacts list.
    // All contacts are always shown. The date range is used only in the 
    // detail panel to filter which events are displayed.
    // This aligns with Dashboard/Analytics behavior.
    
    // Build leads query - use type assertion for dynamic table name
    const leadsTable = await getLeadsTableName(workspaceId);
    let query = supabaseAdmin
      .from(leadsTable as 'leads_ohio')
      .select(
        `
          id,
          workspace_id,
          full_name,
          organization_name,
          linkedin_url,
          email_address,
          email_1_sent,
          email_2_sent,
          email_3_sent,
          replied,
          opted_out,
          organization_website,
          position,
          industry,
          created_at
        `,
        { count: 'exact' }
      )
      .eq('workspace_id', workspaceId);
    
    query = query.order('id', { ascending: true }).range(from, to);

    if (search) {
      const term = `%${search}%`;
      query = query.or(
        [
          `email_address.ilike.${term}`,
          `full_name.ilike.${term}`,
          `company.ilike.${term}`,
        ].join(',')
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Contacts list error:', error);
      return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
    }

    const deriveStatus = (row: LeadRow): LeadResponseItem['status'] => {
      if (row.replied) return 'replied';
      if (row.opted_out) return 'opt_out';
      if (row.email_1_sent && row.email_2_sent && row.email_3_sent) return 'cycle_one';
      if ((row.email_1_sent && row.email_2_sent) || row.email_1_sent || row.email_2_sent || row.email_3_sent)
        return 'contacted';
      return 'not_sent';
    };

    // Batch fetch last_contacted_at for all contacts in ONE query (fixes N+1)
    const emails = (data || [])
      .map((row: LeadRow) => row.email_address?.toLowerCase() || row.email_address)
      .filter((email): email is string => email !== null);
    const emailToLastTs = new Map<string, string>();

    if (supabaseAdmin && emails.length > 0) {
      // Use a single query with IN clause and order to get latest events
      const { data: events, error: evErr } = await supabaseAdmin
        .from('email_events')
        .select('contact_email, event_ts')
        .eq('workspace_id', workspaceId)
        .in('contact_email', emails)
        .in('event_type', ['sent', 'delivered'])
        .order('event_ts', { ascending: false });

      if (!evErr && events) {
        // Build a map of email -> latest timestamp (first occurrence per email due to DESC order)
        for (const ev of events) {
          const key = ev.contact_email?.toLowerCase?.() || ev.contact_email;
          if (key && !emailToLastTs.has(key)) {
            emailToLastTs.set(key, ev.event_ts);
          }
        }
      }
    }

    const contacts: LeadResponseItem[] = (data || []).map((row: LeadRow) => {
      const emailKey = row.email_address?.toLowerCase() || row.email_address || '';
      return {
        id: row.id,
        name: row.full_name,
        email: row.email_address,
        company: row.organization_name,
        status: deriveStatus(row),
        last_contacted_at: emailKey ? (emailToLastTs.get(emailKey) || null) : null,
        created_at: row.created_at || null,
        linkedin_url: row.linkedin_url,
        organization_website: row.organization_website,
        position: row.position,
        industry: row.industry,
        email_1_sent: row.email_1_sent,
        email_2_sent: row.email_2_sent,
        email_3_sent: row.email_3_sent,
        replied: row.replied,
        opted_out: row.opted_out,
      };
    });

    const hasMore = contacts.length === limit && (count ? to + 1 < count : true);

    return NextResponse.json({
      contacts,
      next_cursor: hasMore ? String(page + 1) : null,
      total: count ?? undefined,
    } as LeadListResponse, {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('Contacts GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const name = body.name?.trim() || null;
    const company = body.company?.trim() || null;
    const linkedin_url = body.linkedin_url?.trim() || null;
    const organization_website = body.organization_website?.trim() || null;
    const position = body.position?.trim() || null;
    const industry = body.industry?.trim() || null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Insert into leads table; on conflict email + workspace, update enrichment fields
    const insertPayload = {
      workspace_id: workspaceId,
      email_address: email,
      full_name: name,
      organization_name: company,
      linkedin_url,
      organization_website,
      position,
      industry,
      email_1_sent: body.email_1_sent ?? false,
      email_2_sent: body.email_2_sent ?? false,
      email_3_sent: body.email_3_sent ?? false,
      replied: body.replied ?? false,
      opted_out: body.opted_out ?? false,
    };

    const leadsTablePost = await getLeadsTableName(workspaceId) as 'leads_ohio';
    let lead: LeadRow | null = null;
    const insertResult = await supabaseAdmin
      .from(leadsTablePost)
      .insert(insertPayload)
      .select(
        `
          id,
          workspace_id,
          full_name,
          organization_name,
          linkedin_url,
          email_address,
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
      .single();

    if (insertResult.error) {
      // If conflict on unique email (or other), try fetch existing
      if (insertResult.error.code === '23505') {
        const { data: existing, error: existingErr } = await supabaseAdmin
          .from(leadsTablePost)
          .select(
            `
              id,
              workspace_id,
              full_name,
              organization_name,
              linkedin_url,
              email_address,
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
          .eq('workspace_id', workspaceId)
          .eq('email_address', email)
          .maybeSingle();

        if (existingErr || !existing) {
          console.error('Fetch existing lead after conflict error:', existingErr);
          return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
        }
        lead = existing;
      } else {
        console.error('Insert lead error:', insertResult.error);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
      }
    } else if (!insertResult.data) {
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    } else {
      lead = insertResult.data;
    }

    // Fire webhook to n8n (best-effort, non-blocking failure)
    let webhook_status: 'sent' | 'skipped' | 'failed' = 'skipped';
    const webhookUrl =
      process.env.N8N_NEW_LEAD_WEBHOOK_URL ||
      process.env.N8N_NEW_LEAD_WEBHOOK ||
      null;

    if (webhookUrl && lead) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact_id: lead.id,
              workspace_id: workspaceId,
              name,
              email,
              company: lead.organization_name,
              linkedin_url,
            organization_website,
            position,
            industry,
            source: 'manual_crm_add',
            created_at: lead.created_at,
          }),
        });
        webhook_status = 'sent';
      } catch (webhookError) {
        webhook_status = 'failed';
        console.error('n8n webhook error (new lead):', webhookError);
      }
    }

    const deriveStatus = (row: LeadRow): LeadResponseItem['status'] => {
      if (row.replied) return 'replied';
      if (row.opted_out) return 'opt_out';
      if (row.email_1_sent || row.email_2_sent || row.email_3_sent) return 'contacted';
      return 'not_sent';
    };

    return NextResponse.json(
      {
        contact: lead
          ? {
              id: lead.id,
              name: lead.full_name,
              email: lead.email_address,
              company: lead.organization_name,
              status: deriveStatus(lead),
              last_contacted_at: null,
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
            }
          : null,
        webhook_status,
      },
      { status: lead ? 200 : 500 }
    );
  } catch (err) {
    console.error('Contacts POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

