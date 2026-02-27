'use client';

/**
 * useWorkflowGraph — SWR hook for fetching and converting
 * workflow graph data for the sandbox flow canvas.
 *
 * Fetches from GET /api/sandbox/workflow/[campaignId]?workflowType=...&workspace_id=...
 * and converts GraphNode[]/GraphEdge[] into React Flow Node[]/Edge[].
 *
 * @module hooks/use-workflow-graph
 */

import useSWR from 'swr';
import { useMemo } from 'react';
import { fetcher } from '@/lib/fetcher';
import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from '@/components/sandbox/flow/nodes/types';
import type {
  WorkflowTemplateType,
  WorkflowGraphResponse,
  WorkflowMetadata,
  GraphNode,
  GraphEdge,
} from '@/lib/workflow-graph/types';
import { getNodeRegistryEntry } from '@/lib/workflow-graph/registry';

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert a GraphNode into a React Flow Node<CustomNodeData>.
 *
 * Sets `node.type` to the NodeCategory so React Flow uses the
 * matching custom node component from the nodeTypes registry.
 */
function toFlowNode(graphNode: GraphNode): Node<CustomNodeData> {
  const registryEntry = getNodeRegistryEntry(graphNode.type);

  return {
    id: graphNode.id,
    type: graphNode.category, // maps to nodeTypes keys (trigger, ai_llm, etc.)
    position: graphNode.position,
    data: {
      label: graphNode.name,
      nodeType: graphNode.type,
      typeLabel: registryEntry.label,
      category: graphNode.category,
      disabled: graphNode.disabled,
      status: 'idle',
      editableParamCount: graphNode.editableParams.length,
    },
  };
}

/**
 * Convert a GraphEdge into a React Flow Edge.
 */
function toFlowEdge(graphEdge: GraphEdge): Edge {
  return {
    id: graphEdge.id,
    source: graphEdge.source,
    target: graphEdge.target,
    sourceHandle: graphEdge.sourceHandle,
    targetHandle: graphEdge.targetHandle,
    type: 'smoothstep',
    animated: true,
    style: {
      strokeWidth: 2,
      stroke: '#3b82f6',
    },
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseWorkflowGraphOptions {
  /** Campaign ID to fetch the workflow for */
  campaignId: string | null;
  /** Which workflow template to load */
  workflowType: WorkflowTemplateType;
  /** Workspace ID for API auth */
  workspaceId: string | null;
}

interface UseWorkflowGraphReturn {
  /** React Flow nodes ready for <ReactFlow nodes={...} /> */
  flowNodes: Node<CustomNodeData>[];
  /** React Flow edges ready for <ReactFlow edges={...} /> */
  flowEdges: Edge[];
  /** Raw GraphNode array (for drawer, overlay, etc.) */
  graphNodes: GraphNode[];
  /** Workflow metadata */
  metadata: WorkflowMetadata | null;
  /** Whether this is from a live sidecar or a static template */
  source: 'live' | 'template' | null;
  /** SWR loading state */
  isLoading: boolean;
  /** SWR error */
  error: Error | undefined;
  /** SWR mutate for manual refresh */
  mutate: () => void;
}

export function useWorkflowGraph({
  campaignId,
  workflowType,
  workspaceId,
}: UseWorkflowGraphOptions): UseWorkflowGraphReturn {
  // Build SWR key — null disables fetching
  const swrKey =
    campaignId && workspaceId
      ? `/api/sandbox/workflow/${campaignId}?workflowType=${workflowType}&workspace_id=${workspaceId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<WorkflowGraphResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  // Convert GraphNode[] → React Flow Node[]
  const flowNodes = useMemo(() => {
    if (!data?.graph?.nodes) return [];
    return data.graph.nodes.map(toFlowNode);
  }, [data?.graph?.nodes]);

  // Convert GraphEdge[] → React Flow Edge[]
  const flowEdges = useMemo(() => {
    if (!data?.graph?.edges) return [];
    return data.graph.edges.map(toFlowEdge);
  }, [data?.graph?.edges]);

  const graphNodes = data?.graph?.nodes ?? [];

  return {
    flowNodes,
    flowEdges,
    graphNodes,
    metadata: data?.graph?.metadata ?? null,
    source: data?.source ?? null,
    isLoading,
    error,
    mutate,
  };
}
