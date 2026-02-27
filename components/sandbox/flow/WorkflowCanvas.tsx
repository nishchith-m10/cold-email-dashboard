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
  type OnNodeDrag,
} from '@xyflow/react';
import { nodeTypes } from './nodes';
import type { CustomNodeData } from './nodes/types';
import { Loader2 } from 'lucide-react';

/* ---------- Types ---------- */

export interface WorkflowCanvasProps {
  /** Nodes to render */
  nodes: Node<CustomNodeData>[];
  /** Edges to render */
  edges: Edge[];
  /** Callback when a node is clicked */
  onNodeClick?: (node: Node<CustomNodeData>) => void;
  /** Whether the graph is loading */
  isLoading?: boolean;
}

/* ---------- Inner canvas (requires ReactFlowProvider ancestor) ---------- */

function WorkflowCanvasInner({
  nodes,
  edges,
  onNodeClick,
  isLoading,
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

  // Default edges to animated smooth-step via defaultEdgeOptions
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      animated: true,
      style: { strokeWidth: 2 },
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

  // No-op drag handler to prevent default drag behavior
  const noop: OnNodeDrag<Node<CustomNodeData>> = useCallback(() => {}, []);

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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onNodeClick={handleNodeClick}
      onNodeDragStart={noop}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeStrokeWidth={3}
        zoomable
        pannable
        className="!bg-background/80 !border-border"
      />
    </ReactFlow>
  );
}

/* ---------- Exported component with provider ---------- */

function WorkflowCanvasWithProvider(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export const WorkflowCanvas = memo(WorkflowCanvasWithProvider);
