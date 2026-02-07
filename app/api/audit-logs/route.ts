/**
 * GET /api/audit-logs
 * 
 * Retrieves audit logs for the authenticated user's workspaces.
 * Supports filtering by workspace, action, date range, etc.
 * 
 * Phase 67: Audit Logging & Support Access
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuditLogs } from '@/lib/genesis/audit-logger';

export async function GET(request: NextRequest) {
  try {
    // Verify admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const action = searchParams.get('action');
    const actionCategory = searchParams.get('action_category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate workspace_id is provided
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this workspace
    const { data: membership } = await supabaseAdmin
      .from('user_workspaces')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Fetch audit logs
    const logs = await getAuditLogs(supabaseAdmin, workspaceId, {
      limit,
      offset,
      action: action || undefined,
      actionCategory: actionCategory as any || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        limit,
        offset,
        returned: logs.length,
      },
    });
  } catch (error) {
    console.error('[API] /api/audit-logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
