import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import type { SequenceListResponse, SequenceListItem } from '@/lib/dashboard-types';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;

function getLimit(searchParams: URLSearchParams): { limit: number; useAll: boolean } {
  const limitParam = searchParams.get('limit');
  
  // Handle 'all' option - no limit
  if (limitParam === 'all') {
    return { limit: Number.MAX_SAFE_INTEGER, useAll: true };
  }
  
  const parsed = parseInt(limitParam || '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return { limit: parsed, useAll: false };
  }
  return { limit: DEFAULT_LIMIT, useAll: false };
}

/**
 * GET /api/sequences
 * 
 * Lightweight list endpoint for sequence sidebar.
 * Returns only essential fields (no heavy HTML body columns).
 * 
 * Query params:
 * - workspace_id: string (required)
 * - cursor: number (page-based pagination, default 1)
 * - limit: number (default 10, max 50)
 * - search: string (optional filter by name/email)
 */
export async function GET(req: NextRequest) {
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
  const { limit, useAll } = getLimit(searchParams);
  const cursorParam = searchParams.get('cursor') || '1';
  const page = Math.max(1, parseInt(cursorParam, 10) || 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = searchParams.get('search')?.trim();

  try {
    // Build base query - SELECT ONLY lightweight columns (no body content)
    // Order by ID to match chronological order from database
    let baseQuery = supabaseAdmin
      .from('leads_ohio')
      .select('id, full_name, email_address, organization_name, email_1_sent, email_2_sent, email_3_sent, created_at', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('id', { ascending: true });
    
    // Optional search filter
    if (search) {
      baseQuery = baseQuery.or(`full_name.ilike.%${search}%,email_address.ilike.%${search}%,organization_name.ilike.%${search}%`);
    }

    let data: any[] = [];
    let count: number | null = null;

    // For 'all' option, we need to fetch data in chunks due to PostgREST's 1000-row limit
    if (useAll) {
      // First, get the total count
      const { count: totalCount, error: countError } = await supabaseAdmin
        .from('leads_ohio')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      
      if (countError) {
        console.error('[API] /api/sequences - Count error:', countError);
        return NextResponse.json(
          { error: 'Failed to fetch count', details: countError.message },
          { status: 500 }
        );
      }

      count = totalCount;

      // Fetch data in chunks of 1000 rows (PostgREST max-rows limit)
      const CHUNK_SIZE = 1000;
      let offset = 0;
      const totalRows = totalCount || 0;

      while (offset < totalRows) {
        const chunkTo = Math.min(offset + CHUNK_SIZE - 1, totalRows - 1);
        
        let chunkQuery = supabaseAdmin
          .from('leads_ohio')
          .select('id, full_name, email_address, organization_name, email_1_sent, email_2_sent, email_3_sent, created_at')
          .eq('workspace_id', workspaceId)
          .order('id', { ascending: true })
          .range(offset, chunkTo);

        if (search) {
          chunkQuery = chunkQuery.or(`full_name.ilike.%${search}%,email_address.ilike.%${search}%,organization_name.ilike.%${search}%`);
        }

        const { data: chunkData, error: chunkError } = await chunkQuery;

        if (chunkError) {
          console.error(`[API] /api/sequences - Chunk error at offset ${offset}:`, chunkError);
          return NextResponse.json(
            { error: 'Failed to fetch sequences chunk', details: chunkError.message },
            { status: 500 }
          );
        }

        data = data.concat(chunkData || []);
        
        // Break if we got fewer items than expected (end of data)
        if (!chunkData || chunkData.length < CHUNK_SIZE) {
          break;
        }

        offset += CHUNK_SIZE;
      }
    } else {
      // Standard pagination for specific limit values
      const query = baseQuery.range(from, to);
      const result = await query;

      if (result.error) {
        console.error('[API] /api/sequences - Supabase error:', result.error);
        return NextResponse.json(
          { error: 'Failed to fetch sequences', details: result.error.message },
          { status: 500 }
        );
      }

      data = result.data || [];
      count = result.count;
    }

    // Transform to SequenceListItem format
    const items: SequenceListItem[] = (data || []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      email_address: row.email_address,
      organization_name: row.organization_name,
      email_1_sent: row.email_1_sent,
      email_2_sent: row.email_2_sent,
      email_3_sent: row.email_3_sent,
      created_at: row.created_at,
    }));

    // Calculate next cursor (page-based)
    const total = count || 0;
    const hasMore = (page * limit) < total;
    const next_cursor = hasMore ? page + 1 : null;

    const response: SequenceListResponse = {
      items,
      next_cursor,
      total,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (err) {
    console.error('[API] /api/sequences - Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
