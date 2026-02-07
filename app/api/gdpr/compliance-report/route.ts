/**
 * GET /api/gdpr/compliance-report
 * 
 * Returns a comprehensive GDPR compliance report for a workspace
 * 
 * Phase 66: Data Residency & GDPR Protocol
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGDPRComplianceReport } from '@/lib/genesis/gdpr-service';

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

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id query parameter is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this workspace
    const { data: membership } = await supabaseAdmin
      .from('user_workspaces')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Get compliance report
    const report = await getGDPRComplianceReport(supabaseAdmin, workspaceId);

    if (!report) {
      return NextResponse.json(
        { error: 'Failed to generate compliance report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[API] /api/gdpr/compliance-report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
