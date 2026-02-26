'use client';

/**
 * useCampaignGroups
 *
 * Fetches campaign groups for the current workspace, with their campaigns.
 * - SWR key includes workspaceId → cache is fully isolated per workspace.
 * - is_test=true groups are filtered server-side AND client-side (belt-and-suspenders).
 * - Returns null while workspaceId is not yet available (prevents premature fetch).
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { CampaignGroup } from '@/lib/dashboard-types';

interface CampaignGroupsResponse {
  groups: CampaignGroup[];
}

export interface UseCampaignGroupsResult {
  /** Non-test groups, sorted by created_at ascending */
  groups: CampaignGroup[];
  /** All groups including test (admin use) */
  allGroups: CampaignGroup[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Mutate to force refresh */
  mutate: () => void;
}

/**
 * @param workspaceId - Must be provided; hook suspends until truthy.
 * @param includeTest - Set true only for admin views that need to see test groups.
 */
export function useCampaignGroups(
  workspaceId: string | null | undefined,
  includeTest = false
): UseCampaignGroupsResult {
  // SWR key is null until workspaceId available → prevents stale/cross-tenant fetch
  const params = workspaceId
    ? `workspace_id=${workspaceId}${includeTest ? '&include_test=true' : ''}`
    : null;

  const swrKey = params ? `/api/campaign-groups?${params}` : null;

  const { data, error, isLoading, mutate } = useSWR<CampaignGroupsResponse>(
    swrKey,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,  // 5 min — groups change rarely
      dedupingInterval: 60 * 1000,
      revalidateOnFocus: false,
    }
  );

  const allGroups = data?.groups ?? [];

  // Client-side safety filter: never show is_test groups in UI unless explicitly requested
  const groups = includeTest
    ? allGroups
    : allGroups.filter(g => !g.is_test);

  return {
    groups,
    allGroups,
    isLoading: isLoading || !workspaceId,
    isError: !!error,
    error,
    mutate,
  };
}
