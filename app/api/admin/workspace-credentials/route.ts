/**
 * ADMIN: Workspace Credentials List
 *
 * GET /api/admin/workspace-credentials?workspace_id=...
 *
 * Returns the credential rows for a workspace from genesis.workspace_credentials.
 * Never returns encrypted_data — metadata only (type, name, n8n ID, status).
 * Used by the Rotate Credential modal in the Sidecar Command Center.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !isSuperAdmin(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .schema('genesis' as any)
      .from('workspace_credentials')
      .select('id, credential_type, credential_name, n8n_credential_id, status, last_synced_at')
      .eq('workspace_id', workspaceId)
      .order('credential_type');

    if (error) {
      console.error('[Admin:WorkspaceCredentials]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ credentials: data || [] });
  } catch (err: any) {
    console.error('[Admin:WorkspaceCredentials] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
