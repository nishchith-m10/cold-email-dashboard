'use client';

/**
 * Custom Node Type Registry for React Flow
 *
 * Maps NodeCategory strings to their React Flow custom node components.
 * Used by WorkflowCanvas to render the correct node component per category.
 *
 * @module components/sandbox/flow/nodes
 */

import type { NodeTypes } from '@xyflow/react';
import { TriggerNode } from './TriggerNode';
import { AiLlmNode } from './AiLlmNode';
import { EmailSendNode } from './EmailSendNode';
import { DataDbNode } from './DataDbNode';
import { LogicRoutingNode } from './LogicRoutingNode';
import { TrackingNode } from './TrackingNode';

/**
 * React Flow nodeTypes mapping.
 *
 * Each key corresponds to a NodeCategory value.
 * When converting GraphNode → React Flow Node, set `node.type` to the category.
 * React Flow will then render the matching component.
 *
 * 'utility' and 'unknown' categories use LogicRoutingNode as a neutral fallback.
 */
export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  ai_llm: AiLlmNode,
  email_send: EmailSendNode,
  data_db: DataDbNode,
  logic_routing: LogicRoutingNode,
  tracking: TrackingNode,
  // Fallbacks for utility/unknown — reuse LogicRoutingNode (neutral gray style)
  utility: LogicRoutingNode,
  unknown: LogicRoutingNode,
};

export type { CustomNodeData } from './types';
export { TriggerNode } from './TriggerNode';
export { AiLlmNode } from './AiLlmNode';
export { EmailSendNode } from './EmailSendNode';
export { DataDbNode } from './DataDbNode';
export { LogicRoutingNode } from './LogicRoutingNode';
export { TrackingNode } from './TrackingNode';
