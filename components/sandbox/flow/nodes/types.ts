/**
 * Custom Node Data Interface
 *
 * Shared data interface for all custom flow node components.
 *
 * @module components/sandbox/flow/nodes/types
 */

import type { NodeExecutionOverlayStatus, NodeCategory } from '@/lib/workflow-graph/types';

/**
 * Data payload passed to each custom node component via React Flow's data prop.
 */
export interface CustomNodeData {
  /** Display name of the node */
  label: string;
  /** n8n node type string (e.g., 'n8n-nodes-base.gmail') */
  nodeType: string;
  /** Type display label (e.g., 'Gmail', 'Database') */
  typeLabel: string;
  /** Visual category */
  category: NodeCategory;
  /** Whether the node is disabled */
  disabled: boolean;
  /** Execution overlay status */
  status: NodeExecutionOverlayStatus;
  /** Number of editable parameters */
  editableParamCount: number;
  [key: string]: unknown;
}
