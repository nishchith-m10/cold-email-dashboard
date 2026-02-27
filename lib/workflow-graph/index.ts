/**
 * Workflow Graph Module
 *
 * Barrel export for the workflow graph type system, registry,
 * and adapter utilities.
 *
 * @module lib/workflow-graph
 */

// Types
export type {
  WorkflowTemplateType,
  NodeCategory,
  EditableParamType,
  EditableParamDescriptor,
  GraphNode,
  GraphEdge,
  WorkflowMetadata,
  WorkflowGraph,
  NodeRegistryEntry,
  WorkflowGraphResponse,
  NodeExecutionOverlayStatus,
} from './types';

// Constants
export {
  WORKFLOW_DISPLAY_NAMES,
  WORKFLOW_TEMPLATE_FILES,
} from './types';

// Registry
export {
  NODE_TYPE_REGISTRY,
  classifyHttpRequestNode,
  HTTP_REQUEST_CATEGORY_LABELS,
  HTTP_REQUEST_CATEGORY_COLORS,
  normalizeNodeType,
  getNodeRegistryEntry,
} from './registry';

// Adapter
export { transformN8nToGraph } from './adapter';

// Layout
export { autoLayout, hasValidPositions } from './layout';

// Cron humanizer
export { humanizeCron } from './cron-humanizer';

// Patch builder
export { buildNodePatch } from './patch-builder';
