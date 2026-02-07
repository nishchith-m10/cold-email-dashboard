/**
 * DELETE /api/gdpr/delete
 * 
 * Permanently deletes all workspace data (GDPR Right to Erasure)
 * Requires confirmation code for safety
 * 
 * Phase 66: Data Residency & GDPR Protocol
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  deleteWorkspaceData,
  generateDeletionConfirmationCode,
} from '@/lib/genesis/gdpr-service';
import { logAuditEvent, AuditEvents } from '@/lib/genesis/audit-logger';

export async function DELETE(request: NextRequest) {
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
    const { workspace_id, confirmation_code } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    if (!confirmation_code) {
      const expectedCode = generateDeletionConfirmationCode(workspace_id);
      return NextResponse.json(
        { 
          error: 'confirmation_code is required',
          expected_code: expectedCode,
          message: 'To delete this workspace, provide the confirmation code'
        },
        { status: 400 }
      );
    }

    // Verify user is owner of the workspace
    const { data: membership } = await supabaseAdmin
      .from('user_workspaces')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only workspace owners can delete workspace data' },
        { status: 403 }
      );
    }

    // Perform deletion
    const result = await deleteWorkspaceData(
      supabaseAdmin,
      workspace_id,
      confirmation_code,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Deletion failed',
          operation: result.operation,
        },
        { status: result.operation === 'invalid_confirmation' ? 400 : 500 }
      );
    }

    // Log audit event (if deletion succeeded)
    if (result.deletedCounts) {
      await logAuditEvent(
        supabaseAdmin,
        AuditEvents.dataDeleted(
          workspace_id,
          user.id,
          result.deletedCounts as Record<string, number>
        )
      );
    }

    return NextResponse.json({
      success: true,
      operation: result.operation,
      deleted_counts: result.deletedCounts,
      message: 'Workspace data permanently deleted',
    });
  } catch (error) {
    console.error('[API] /api/gdpr/delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
