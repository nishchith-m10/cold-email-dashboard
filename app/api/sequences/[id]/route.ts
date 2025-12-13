import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import type { SequenceDetail } from '@/lib/dashboard-types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sequences/[id]
 * 
 * Heavy detail endpoint for a single sequence.
 * Returns all draft content (email subjects and HTML bodies).
 * 
 * Route params:
 * - id: number (lead ID)
 * 
 * Query params:
 * - workspace_id: string (required)
 */
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
  
  // Validate workspace access
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const workspaceId = extractWorkspaceId(req, searchParams) || DEFAULT_WORKSPACE_ID;

  // Validate lead ID parameter
  const leadIdParam = params.id;
  if (!leadIdParam) {
    return NextResponse.json(
      { error: 'Lead ID is required' },
      { status: 400 }
    );
  }

  const leadId = Number(leadIdParam);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json(
      { error: 'Invalid lead ID format' },
      { status: 400 }
    );
  }

  try {
    // Query with HEAVY columns (all draft content)
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads_ohio')
      .select(
        `
          id,
          workspace_id,
          full_name,
          email_address,
          organization_name,
          email_1_subject,
          email_1_body,
          email_2_body,
          email_3_subject,
          email_3_body,
          email_1_sent,
          email_2_sent,
          email_3_sent
        `
      )
      .eq('id', leadId)
      .eq('workspace_id', workspaceId) // Ensure workspace isolation
      .maybeSingle();

    if (leadError) {
      console.error('[API] /api/sequences/[id] - Supabase error:', leadError);
      return NextResponse.json(
        { error: 'Failed to fetch sequence', details: leadError.message },
        { status: 500 }
      );
    }

    // Handle not found
    if (!lead) {
      return NextResponse.json(
        { error: 'Sequence not found or access denied' },
        { status: 404 }
      );
    }

    // Transform to SequenceDetail format
    const detail: SequenceDetail = {
      id: lead.id,
      full_name: lead.full_name,
      email_address: lead.email_address,
      organization_name: lead.organization_name,
      email_1_subject: lead.email_1_subject,
      email_1_body: lead.email_1_body,
      email_2_body: lead.email_2_body,
      email_3_subject: lead.email_3_subject,
      email_3_body: lead.email_3_body,
      email_1_sent: lead.email_1_sent,
      email_2_sent: lead.email_2_sent,
      email_3_sent: lead.email_3_sent,
    };

    return NextResponse.json(detail, {
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    });
  } catch (err) {
    console.error('[API] /api/sequences/[id] - Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
