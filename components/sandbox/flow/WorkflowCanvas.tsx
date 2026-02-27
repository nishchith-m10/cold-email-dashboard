'use client';

/**
 * WorkflowCanvas — ReactFlow wrapper for rendering workflow graphs.
 *
 * Provides a read-only canvas with custom node types, MiniMap,
 * Controls, Background, and animated smooth-step edges.
 *
 * @module components/sandbox/flow/WorkflowCanvas
 */

import { memo, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react';
import { nodeTypes } from './nodes';
import type { CustomNodeData } from './nodes/types';
import type { NodeExecutionOverlayStatus } from '@/lib/workflow-graph/types';
import { Loader2 } from 'lucide-react';

/* ---------- Types ---------- */

/** Map of node ID → execution status for live overlays */
export type NodeStatusMap = Map<string, NodeExecutionOverlayStatus>;

export interface WorkflowCanvasProps {
  /** Nodes to render */
  nodes: Node<CustomNodeData>[];
  /** Edges to render */
  edges: Edge[];
  /** Callback when a node is clicked */
  onNodeClick?: (node: Node<CustomNodeData>) => void;
  /** Whether the graph is loading */
  isLoading?: boolean;
  /** Optional execution status map — merges status into node data */
  nodeStatusMap?: NodeStatusMap;
}

/* ---------- Inner canvas (requires ReactFlowProvider ancestor) ---------- */

function WorkflowCanvasInner({
  nodes,
  edges,
  onNodeClick,
  isLoading,
  nodeStatusMap,
}: WorkflowCanvasProps) {
  const { fitView } = useReactFlow();

  // Fit view when nodes change (initial load / workflow switch)
  useEffect(() => {
    if (nodes.length > 0) {
      // Small delay to let React Flow finish layout
      const timer = setTimeout(() => fitView({ padding: 0.15 }), 50);
      return () => clearTimeout(timer);
    }
  }, [nodes, fitView]);

  // Merge nodeStatusMap into node data when present
  const nodesWithStatus = useMemo(() => {
    if (!nodeStatusMap || nodeStatusMap.size === 0) return nodes;
    return nodes.map((node) => {
      const status = nodeStatusMap.get(node.id);
      if (status && status !== node.data.status) {
        return { ...node, data: { ...node.data, status } };
      }
      return node;
    });
  }, [nodes, nodeStatusMap]);

  // Default edges to animated smooth-step via defaultEdgeOptions
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      animated: true,
      style: {
        strokeWidth: 2,
        stroke: '#3b82f6',
      },
    }),
    [],
  );

  // Handle node click — forward the node to parent
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<CustomNodeData>) => {
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-muted/30 rounded-lg">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading workflow&hellip;</span>
        </div>
      </div>
    );
  }

  /* Empty state */
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground">
          No workflow data available
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
    <ReactFlow
      nodes={nodesWithStatus}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onNodeClick={handleNodeClick}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      colorMode="dark"
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls
        showInteractive={false}
      />
      <MiniMap
        nodeStrokeWidth={3}
        zoomable
        pannable
        className="!bg-background/80 !border-border"
      />
    </ReactFlow>
    </div>
  );
}

/* ---------- Exported component with provider ---------- */

function WorkflowCanvasWithProvider(props: WorkflowCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <WorkflowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

export const WorkflowCanvas = memo(WorkflowCanvasWithProvider);
