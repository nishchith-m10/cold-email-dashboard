/**
 * ADMIN PANELS EXPANSION: Sidecar Fleet API Route
 *
 * Returns fleet-wide sidecar agent health status by querying
 * genesis.fleet_status joined with workspaces.
 *
 * GET /api/admin/sidecar-fleet
 * 
 * Ralph Loop: Research ✅ → Execute ✅
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Query fleet_status from genesis schema
    const { data: fleetData, error: fleetError } = await supabaseAdmin
      .schema('genesis' as any)
      .from('fleet_status')
      .select('*')
      .order('updated_at', { ascending: false });

    if (fleetError) {
      console.error('[Admin:SidecarFleet] fleet_status query error:', fleetError);
      // Return empty state gracefully — table may not exist yet
      return NextResponse.json({
        agents: [],
        summary: { total: 0, healthy: 0, degraded: 0, zombie: 0, offline: 0, avgCpu: 0, avgMemory: 0 },
      });
    }

    // Get workspace names for display
    const workspaceIds = (fleetData || []).map((f: any) => f.workspace_id).filter(Boolean);
    let workspaceNames: Record<string, string> = {};

    if (workspaceIds.length > 0) {
      const { data: wsData } = await supabaseAdmin
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      for (const ws of wsData || []) {
        workspaceNames[ws.id] = ws.name;
      }
    }

    // Map to SidecarAgent shape
    const agents = (fleetData || []).map((f: any) => ({
      workspace_id: f.workspace_id,
      workspace_name: workspaceNames[f.workspace_id] || 'Unknown',
      droplet_id: f.droplet_id || '',
      ip_address: f.ip_address || '',
      region: f.region || '',
      state: f.status || 'INITIALIZING',
      n8n_status: f.n8n_status || 'unknown',
      n8n_version: f.n8n_version || 'unknown',
      active_workflows: f.active_workflows || 0,
      pending_executions: f.pending_executions || 0,
      cpu_usage_percent: f.cpu_usage_percent || 0,
      memory_usage_mb: f.memory_usage_mb || 0,
      memory_total_mb: f.memory_total_mb || 1024,
      disk_usage_percent: f.disk_usage_percent || 0,
      uptime_seconds: f.uptime_seconds || 0,
      last_heartbeat_at: f.last_heartbeat_at || f.updated_at || new Date().toISOString(),
      consecutive_missed: f.consecutive_missed_heartbeats || 0,
      sslip_domain: f.sslip_domain || null,
      sidecar_version: f.sidecar_version || null,
    }));

    // Compute summary
    const summary = {
      total: agents.length,
      healthy: agents.filter((a: any) => a.state === 'ACTIVE_HEALTHY' || a.state === 'active').length,
      degraded: agents.filter((a: any) => a.state === 'ACTIVE_DEGRADED').length,
      zombie: agents.filter((a: any) => a.state === 'ZOMBIE').length,
      offline: agents.filter((a: any) =>
        !['ACTIVE_HEALTHY', 'ACTIVE_DEGRADED', 'ZOMBIE', 'active'].includes(a.state)
      ).length,
      avgCpu: agents.length > 0
        ? Math.round(agents.reduce((acc: number, a: any) => acc + (a.cpu_usage_percent || 0), 0) / agents.length)
        : 0,
      avgMemory: agents.length > 0
        ? Math.round(agents.reduce((acc: number, a: any) => acc + (a.memory_usage_mb || 0), 0) / agents.length)
        : 0,
    };

    return NextResponse.json({ agents, summary });
  } catch (error: any) {
    console.error('[Admin:SidecarFleet] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
