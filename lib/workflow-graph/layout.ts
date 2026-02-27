/**
 * dagre-based Auto-Layout Engine
 *
 * Uses the dagre library to compute optimal left-to-right positions
 * for all nodes in a workflow graph, producing a visually clean
 * directed graph layout.
 *
 * @module lib/workflow-graph/layout
 */

import dagre from 'dagre';
import type { WorkflowGraph } from './types';

/** Layout configuration constants */
const LAYOUT_CONFIG = {
  /** Direction: left-to-right */
  rankdir: 'LR' as const,
  /** Horizontal separation between nodes */
  nodesep: 100,
  /** Vertical separation between ranks */
  ranksep: 180,
  /** Default node width for layout computation */
  nodeWidth: 240,
  /** Default node height for layout computation */
  nodeHeight: 80,
  /** Margin type */
  marginx: 40,
  marginy: 40,
};

/**
 * Applies dagre auto-layout to a WorkflowGraph.
 *
 * Computes left-to-right positions for all nodes based on their
 * edge connections, producing a clean directed graph layout with
 * no overlapping nodes.
 *
 * @param graph - The input graph (positions will be overwritten)
 * @returns A new WorkflowGraph with computed positions
 */
export function autoLayout(graph: WorkflowGraph): WorkflowGraph {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: LAYOUT_CONFIG.rankdir,
    nodesep: LAYOUT_CONFIG.nodesep,
    ranksep: LAYOUT_CONFIG.ranksep,
    marginx: LAYOUT_CONFIG.marginx,
    marginy: LAYOUT_CONFIG.marginy,
  });

  // Required for dagre
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes
  for (const node of graph.nodes) {
    g.setNode(node.id, {
      width: LAYOUT_CONFIG.nodeWidth,
      height: LAYOUT_CONFIG.nodeHeight,
    });
  }

  // Add edges
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Compute layout
  dagre.layout(g);

  // Apply computed positions to nodes
  const layoutedNodes = graph.nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        // dagre computes center position, we need top-left for React Flow
        x: dagreNode.x - LAYOUT_CONFIG.nodeWidth / 2,
        y: dagreNode.y - LAYOUT_CONFIG.nodeHeight / 2,
      },
    };
  });

  return {
    ...graph,
    nodes: layoutedNodes,
  };
}

/**
 * Checks whether a graph's nodes have meaningful positions.
 * Returns false if all nodes are at (0,0) or have no position data.
 */
export function hasValidPositions(graph: WorkflowGraph): boolean {
  if (graph.nodes.length === 0) return false;

  return graph.nodes.some(
    (node) => node.position.x !== 0 || node.position.y !== 0,
  );
}
