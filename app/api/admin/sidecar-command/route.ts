/**
 * ADMIN PANELS EXPANSION: Sidecar Command API Route
 *
 * Sends commands to a specific sidecar agent via the HttpSidecarClient.
 *
 * POST /api/admin/sidecar-command
 * Body: { workspace_id: string, command: SidecarCommand }
 *
 * Ralph Loop: Research ✅ → Execute ✅
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';


const VALID_COMMANDS = [
  'HEALTH_CHECK',
  'RESTART_N8N',
  'COLLECT_METRICS',
  'GET_LOGS',
  'ROTATE_CREDENTIAL',
  'DEPLOY_WORKFLOW',
  'UPDATE_SIDECAR',
];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !isSuperAdmin(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { workspace_id, command } = body;

    if (!workspace_id || !command) {
      return NextResponse.json({ error: 'workspace_id and command are required' }, { status: 400 });
    }

    if (!VALID_COMMANDS.includes(command)) {
      return NextResponse.json({ error: `Invalid command. Valid: ${VALID_COMMANDS.join(', ')}` }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Look up the sidecar URL from fleet_status
    const { data: fleet } = await supabaseAdmin
      .schema('genesis' as any)
      .from('fleet_status')
      .select('ip_address, sslip_domain')
      .eq('workspace_id', workspace_id)
      .single();

    if (!fleet) {
      return NextResponse.json({ error: 'No active sidecar found for this workspace' }, { status: 404 });
    }

    const sidecarHost = fleet.sslip_domain || fleet.ip_address;
    if (!sidecarHost) {
      return NextResponse.json({ error: 'Sidecar host not available' }, { status: 404 });
    }

    // Send command to sidecar's REST API
    const sidecarUrl = `https://${sidecarHost}:3100/command`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const sidecarRes = await fetch(sidecarUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JWT auth would go here in production
        },
        body: JSON.stringify({ command, workspace_id }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const result = await sidecarRes.json().catch(() => ({}));

      return NextResponse.json({
        success: sidecarRes.ok,
        command,
        workspace_id,
        status_code: sidecarRes.status,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        command,
        workspace_id,
        error: fetchError.name === 'AbortError' ? 'Sidecar request timed out (15s)' : fetchError.message,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('[Admin:SidecarCommand] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
