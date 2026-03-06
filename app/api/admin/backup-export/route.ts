/**
 * Backup Data Export API
 *
 * POST /api/admin/backup-export
 *   Exports workspace data (leads, campaigns, email history) as JSON.
 *   Optionally scoped by campaign_id.
 *
 * Body: { workspace_id, campaign_id? (optional), tables: string[] }
 * tables can include: 'contacts', 'campaigns', 'email_events', 'sequences'
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isSuperAdmin } from '@/lib/workspace-access';
import { getTypedSupabaseAdmin } from '@/lib/supabase';

const ALLOWED_TABLES = ['contacts', 'campaigns', 'email_events', 'sequences'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

const MAX_ROWS_PER_TABLE = 10000;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { workspace_id, campaign_id, tables } = body as {
      workspace_id?: string;
      campaign_id?: string;
      tables?: string[];
    };

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    // Validate requested tables against allowlist
    const requestedTables: AllowedTable[] = (tables || [...ALLOWED_TABLES])
      .filter((t: string): t is AllowedTable => ALLOWED_TABLES.includes(t as AllowedTable));

    if (requestedTables.length === 0) {
      return NextResponse.json({ error: 'No valid tables specified' }, { status: 400 });
    }

    const supabase = getTypedSupabaseAdmin();
    const exportData: Record<string, unknown[]> = {};
    const meta: Record<string, { count: number; truncated: boolean }> = {};

    for (const table of requestedTables) {
      let query = supabase.from(table).select('*').eq('workspace_id', workspace_id);

      // Scope by campaign if provided & table supports it
      if (campaign_id && table !== 'campaigns') {
        query = query.eq('campaign_id', campaign_id);
      } else if (campaign_id && table === 'campaigns') {
        query = query.eq('id', campaign_id);
      }

      query = query.limit(MAX_ROWS_PER_TABLE);

      const { data, error } = await query;
      if (error) {
        console.error(`[backup-export] Error exporting ${table}:`, error);
        exportData[table] = [];
        meta[table] = { count: 0, truncated: false };
        continue;
      }

      exportData[table] = data || [];
      meta[table] = {
        count: (data || []).length,
        truncated: (data || []).length >= MAX_ROWS_PER_TABLE,
      };
    }

    return NextResponse.json({
      success: true,
      workspace_id,
      campaign_id: campaign_id || null,
      exported_at: new Date().toISOString(),
      tables: meta,
      data: exportData,
    });
  } catch (error) {
    console.error('[backup-export] Error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
