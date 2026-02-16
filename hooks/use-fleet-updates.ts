/**
 * PHASE 72: Fleet Updates SWR Hooks
 *
 * Hooks for fetching fleet update data from the admin API.
 * Follows the same SWR pattern as use-scale-health.ts.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.9
 */

'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { fetcher } from '@/lib/fetcher';
import type {
  ActiveRolloutStatus,
  FleetVersionSummary,
  FleetRolloutRecord,
  FleetComponent,
  RolloutStrategy,
  RollbackScope,
  RolloutProgressSnapshot,
  WorkflowTemplateRecord,
} from '@/lib/genesis/phase72/types';

// ============================================
// TYPES
// ============================================

interface FleetDashboardResponse {
  success: boolean;
  active_rollouts: ActiveRolloutStatus[];
  fleet_overview: {
    components: FleetVersionSummary[];
    active_rollouts: number;
    recent_failures: number;
  };
  recent_history: FleetRolloutRecord[];
}

interface RolloutProgressResponse {
  success: boolean;
  progress: RolloutProgressSnapshot;
}

interface VersionsResponse {
  success: boolean;
  overview?: {
    components: FleetVersionSummary[];
    active_rollouts: number;
    recent_failures: number;
  };
  distribution?: FleetVersionSummary;
}

interface TemplatesResponse {
  success: boolean;
  templates?: Record<string, WorkflowTemplateRecord | null>;
  versions?: WorkflowTemplateRecord[];
}

// ============================================
// CONFIG
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  keepPreviousData: true,
};

// ============================================
// HOOKS
// ============================================

/**
 * Fetch the full fleet updates dashboard data.
 * Includes active rollouts, fleet overview, and recent history.
 */
export function useFleetUpdates() {
  const { data, error, isLoading, mutate } = useSWR<FleetDashboardResponse>(
    '/api/admin/fleet-updates',
    fetcher,
    {
      ...defaultConfig,
      // Only refresh frequently when there are active rollouts
      refreshInterval: (data) => {
        const hasActiveRollouts = (data?.active_rollouts?.length ?? 0) > 0;
        return hasActiveRollouts ? 15000 : 120000; // 15s if active, 2min otherwise
      },
    }
  );

  return {
    activeRollouts: data?.active_rollouts ?? [],
    fleetOverview: data?.fleet_overview ?? null,
    recentHistory: data?.recent_history ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Fetch rollout progress for a specific rollout ID.
 */
export function useRolloutProgress(rolloutId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RolloutProgressResponse>(
    rolloutId ? `/api/admin/fleet-updates/rollouts?id=${rolloutId}` : null,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 5000, // Fast refresh for live rollout
    }
  );

  return {
    progress: data?.progress ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Fetch fleet version overview or distribution for a single component.
 */
export function useFleetVersions(component?: FleetComponent) {
  const url = component
    ? `/api/admin/fleet-updates/versions?component=${component}`
    : '/api/admin/fleet-updates/versions';

  const { data, error, isLoading, mutate } = useSWR<VersionsResponse>(
    url,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
    }
  );

  return {
    overview: data?.overview ?? null,
    distribution: data?.distribution ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Fetch workflow templates (all current or specific workflow history).
 */
export function useFleetTemplates(workflowName?: string) {
  const url = workflowName
    ? `/api/admin/fleet-updates/templates?workflow_name=${workflowName}`
    : '/api/admin/fleet-updates/templates';

  const { data, error, isLoading, mutate } = useSWR<TemplatesResponse>(
    url,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000,
    }
  );

  return {
    templates: data?.templates ?? null,
    versions: data?.versions ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

// ============================================
// MUTATIONS (POST / PATCH actions)
// ============================================

/**
 * Initiate a new fleet rollout.
 */
export async function initiateFleetRollout(params: {
  component: FleetComponent;
  from_version: string;
  to_version: string;
  strategy: RolloutStrategy;
  error_threshold?: number;
  canary_percentage?: number;
}): Promise<{ success: boolean; rollout?: FleetRolloutRecord; error?: string }> {
  const response = await fetch('/api/admin/fleet-updates/rollouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

/**
 * Control a rollout (pause / resume / abort).
 */
export async function controlRollout(params: {
  rollout_id: string;
  action: 'pause' | 'resume' | 'abort';
  reason?: string;
}): Promise<{ success: boolean; rollout?: FleetRolloutRecord; error?: string }> {
  const response = await fetch('/api/admin/fleet-updates/rollouts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

/**
 * Execute an emergency rollback.
 */
export async function executeRollback(params: {
  component: FleetComponent;
  rollback_to_version: string;
  scope: RollbackScope;
  specific_workspace_id?: string;
  reason: string;
}): Promise<{ success: boolean; result?: unknown; estimated_time?: string; error?: string }> {
  const response = await fetch('/api/admin/fleet-updates/emergency-rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

/**
 * Publish a new workflow template version.
 */
export async function publishTemplate(params: {
  workflow_name: string;
  version: string;
  workflow_json: Record<string, unknown>;
  changelog: string;
  is_canary?: boolean;
}): Promise<{ success: boolean; template?: WorkflowTemplateRecord; error?: string }> {
  const response = await fetch('/api/admin/fleet-updates/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

/**
 * Promote or manage canary flag on a template version.
 */
export async function manageTemplate(params: {
  workflow_name: string;
  version: string;
  action: 'promote' | 'mark_canary' | 'unmark_canary';
}): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/admin/fleet-updates/templates', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}
