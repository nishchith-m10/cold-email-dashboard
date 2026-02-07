/**
 * GDPR API Routes
 * 
 * POST /api/gdpr/export - Export workspace data (Right to Access)
 * POST /api/gdpr/delete - Delete workspace data (Right to Erasure)
 * GET /api/gdpr/compliance-report - Get GDPR compliance report
 * 
 * Phase 66: Data Residency & GDPR Protocol
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  exportWorkspaceData,
  deleteWorkspaceData,
  getGDPRComplianceReport,
  generateDeletionConfirmationCode,
} from '@/lib/genesis/gdpr-service';
import { logAuditEvent, AuditEvents } from '@/lib/genesis/audit-logger';

/**
 * POST /api/gdpr/export
 * 
 * Exports all workspace data for GDPR Right to Access compliance
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    // Verify user is owner or admin of the workspace
    const { data: membership } = await supabaseAdmin
      .from('user_workspaces')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only workspace owners/admins can export data' },
        { status: 403 }
      );
    }

    // Export data (requires admin client for cross-workspace access)
    const exportData = await exportWorkspaceData(supabaseAdmin, workspace_id);

    if (!exportData) {
      return NextResponse.json(
        { error: 'Failed to export workspace data' },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent(
      supabaseAdmin,
      AuditEvents.dataExported(workspace_id, user.id, {
        leads: exportData.metadata.total_leads,
        events: exportData.metadata.total_events,
        campaigns: exportData.metadata.total_campaigns,
      })
    );

    return NextResponse.json({
      success: true,
      export: exportData,
    });
  } catch (error) {
    console.error('[API] /api/gdpr/export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
