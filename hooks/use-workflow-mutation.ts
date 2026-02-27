'use client';

/**
 * useWorkflowMutation — SWR mutation hook for updating
 * workflow node parameters with optimistic UI.
 *
 * @module hooks/use-workflow-mutation
 */

import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import type { WorkflowTemplateType, WorkflowGraphResponse } from '@/lib/workflow-graph/types';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseWorkflowMutationOptions {
  /** Campaign ID */
  campaignId: string | null;
  /** Currently selected workflow type */
  workflowType: WorkflowTemplateType;
  /** Workspace ID for API auth */
  workspaceId: string | null;
}

interface UseWorkflowMutationReturn {
  /** Mutate a node's parameters */
  mutateNode: (nodeId: string, paramChanges: Record<string, unknown>) => Promise<void>;
  /** Whether a mutation is in progress */
  isMutating: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkflowMutation({
  campaignId,
  workflowType,
  workspaceId,
}: UseWorkflowMutationOptions): UseWorkflowMutationReturn {
  const { mutate } = useSWRConfig();
  const { toast } = useToast();
  const [isMutating, setIsMutating] = useState(false);

  // SWR key matching useWorkflowGraph
  const swrKey =
    campaignId && workspaceId
      ? `/api/sandbox/workflow/${campaignId}?workflowType=${workflowType}&workspace_id=${workspaceId}`
      : null;

  const mutateNode = useCallback(
    async (nodeId: string, paramChanges: Record<string, unknown>) => {
      if (!campaignId || !workspaceId || !swrKey) {
        toast({
          title: 'Cannot save',
          description: 'No campaign or workspace selected',
          variant: 'destructive',
        });
        return;
      }

      setIsMutating(true);

      try {
        // Optimistic update: update the SWR cache immediately
        await mutate(
          swrKey,
          async (currentData: WorkflowGraphResponse | undefined) => {
            // Call the API
            const res = await fetch(
              `/api/sandbox/workflow/update?workspace_id=${workspaceId}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  campaignId,
                  workflowType,
                  nodeId,
                  paramChanges,
                }),
              },
            );

            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(
                errBody.error || `Update failed with status ${res.status}`,
              );
            }

            const updated: WorkflowGraphResponse = await res.json();
            return updated;
          },
          {
            // If mutation fails, revert to previous data
            revalidate: false,
            rollbackOnError: true,
            // Keep showing current data while updating
            populateCache: true,
          },
        );

        toast({
          title: 'Saved',
          description: 'Node parameters updated successfully',
        });
      } catch (error) {
        toast({
          title: 'Save failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setIsMutating(false);
      }
    },
    [campaignId, workflowType, workspaceId, swrKey, mutate, toast],
  );

  return { mutateNode, isMutating };
}
