/**
 * ADMIN PANELS EXPANSION: Sidecar Fleet Hook
 *
 * SWR-based hook for fetching fleet-wide sidecar health data.
 * Queries genesis.fleet_status and genesis.droplet_health tables
 * via a dedicated admin API route.
 *
 * Ralph Loop: Research ✅ (fleet_status table, heartbeat route, phase54 types)
 * → Execute ✅
 */

'use client';

import useSWR from 'swr';
import type { HealthState, N8nStatus } from '@/lib/genesis/phase54/heartbeat-types';

// ============================================
// TYPES
// ============================================

export interface SidecarAgent {
  workspace_id: string;
  workspace_name: string;
  droplet_id: string;
  ip_address: string;
  region: string;
  state: HealthState;
  n8n_status: N8nStatus;
  n8n_version: string;
  active_workflows: number;
  pending_executions: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  memory_total_mb: number;
  disk_usage_percent: number;
  uptime_seconds: number;
  last_heartbeat_at: string;
  consecutive_missed: number;
  sslip_domain: string | null;
  sidecar_version: string | null;
}

export interface FleetSummary {
  total: number;
  healthy: number;
  degraded: number;
  zombie: number;
  offline: number;
  avgCpu: number;
  avgMemory: number;
}

interface FleetResponse {
  agents: SidecarAgent[];
  summary: FleetSummary;
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string): Promise<FleetResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ============================================
// HOOK
// ============================================

export function useSidecarFleet() {
  const { data, error, isLoading, mutate } = useSWR<FleetResponse>(
    '/api/admin/sidecar-fleet',
    fetcher,
    {
      refreshInterval: 15000, // Match heartbeat cadence
      revalidateOnFocus: true,
    }
  );

  const agents = data?.agents ?? [];

  // Compute summary from agents if not provided by API
  const summary: FleetSummary = data?.summary ?? {
    total: agents.length,
    healthy: agents.filter(a => a.state === 'ACTIVE_HEALTHY').length,
    degraded: agents.filter(a => a.state === 'ACTIVE_DEGRADED').length,
    zombie: agents.filter(a => a.state === 'ZOMBIE').length,
    offline: agents.filter(a =>
      !['ACTIVE_HEALTHY', 'ACTIVE_DEGRADED', 'ZOMBIE'].includes(a.state)
    ).length,
    avgCpu: agents.length > 0
      ? Math.round(agents.reduce((acc, a) => acc + a.cpu_usage_percent, 0) / agents.length)
      : 0,
    avgMemory: agents.length > 0
      ? Math.round(agents.reduce((acc, a) => acc + a.memory_usage_mb, 0) / agents.length)
      : 0,
  };

  return {
    agents,
    summary,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

// ============================================
// SIDECAR COMMAND ACTION
// ============================================

export type SidecarCommand =
  | 'HEALTH_CHECK'
  | 'RESTART_N8N'
  | 'COLLECT_METRICS'
  | 'GET_LOGS'
  | 'ROTATE_CREDENTIAL'
  | 'DEPLOY_WORKFLOW'
  | 'UPDATE_SIDECAR';

export async function sendSidecarCommand(
  workspaceId: string,
  command: SidecarCommand
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch('/api/admin/sidecar-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, command }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
