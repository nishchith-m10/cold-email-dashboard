/**
 * Workflow Graph Type System
 *
 * Core TypeScript types representing an n8n workflow as a renderable
 * directed graph for the Sandbox flow-based visualization engine.
 *
 * @module lib/workflow-graph/types
 */

// Re-use WorkflowType from phase45, but extend it to cover all 7 templates
// The phase45 WorkflowType is missing 'email_preparation', 'research_report', 'opt_out'
// We define our own complete union here.

/**
 * All workflow types corresponding to the 7 base templates.
 * Maps to keys in ignition-orchestrator TEMPLATE_FILE_MAP.
 */
export type WorkflowTemplateType =
  | 'email_preparation'
  | 'research_report'
  | 'email_1'
  | 'email_2'
  | 'email_3'
  | 'reply_tracker'
  | 'opt_out';

/**
 * Display names for each workflow template type.
 */
export const WORKFLOW_DISPLAY_NAMES: Record<WorkflowTemplateType, string> = {
  email_preparation: 'Email Preparation',
  research_report: 'Research Report',
  email_1: 'Email 1',
  email_2: 'Email 2',
  email_3: 'Email 3',
  reply_tracker: 'Reply Tracker',
  opt_out: 'Opt-Out',
};

/**
 * Template file names for each workflow type (Gmail variants).
 */
export const WORKFLOW_TEMPLATE_FILES: Record<WorkflowTemplateType, string> = {
  email_preparation: 'Email Preparation.json',
  research_report: 'Research Report.json',
  email_1: 'Email 1.json',
  email_2: 'Email 2.json',
  email_3: 'Email 3.json',
  reply_tracker: 'Reply Tracker.json',
  opt_out: 'Opt-Out.json',
};

// ---------------------------------------------------------------------------
// Node Categories
// ---------------------------------------------------------------------------

/**
 * Visual categories for graph nodes. Each category maps to a distinct
 * color, icon, and rendering style in the flow canvas.
 */
export type NodeCategory =
  | 'trigger'         // Schedule triggers, webhooks, email triggers
  | 'ai_llm'          // AI/LLM API calls (OpenAI, Anthropic, etc.)
  | 'email_send'      // Gmail send, SMTP send
  | 'data_db'         // Postgres, Google Sheets, data stores
  | 'logic_routing'   // If, SplitInBatches, Merge, Limit, Wait
  | 'tracking'        // Event tracking HTTP calls
  | 'utility'         // Code, Set, HTML, Respond, generic
  | 'unknown';        // Fallback for unrecognized node types

// ---------------------------------------------------------------------------
// Editable Parameter Descriptors
// ---------------------------------------------------------------------------

/**
 * Type of input to render for an editable parameter.
 */
export type EditableParamType =
  | 'text'       // Single-line text input
  | 'textarea'   // Multi-line text area (for AI prompts)
  | 'number'     // Numeric input
  | 'cron'       // Cron expression input
  | 'select';    // Dropdown select

/**
 * Describes an editable parameter on a graph node.
 * Used to render the appropriate input form in NodeEditForm.
 */
export interface EditableParamDescriptor {
  /** Unique key for this parameter (used as form field name) */
  key: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** Input type to render */
  type: EditableParamType;
  /**
   * JSON path into the n8n node's parameters object.
   * Dot-notation: e.g., "options.body.json" or "rule.interval"
   */
  path: string;
  /**
   * Options for 'select' type parameters.
   * Each option has a label and value.
   */
  options?: Array<{ label: string; value: string }>;
}

// ---------------------------------------------------------------------------
// Graph Node
// ---------------------------------------------------------------------------

/**
 * A single node in the workflow graph, enriched with visual metadata.
 */
export interface GraphNode {
  /** Unique node ID (from n8n node ID or generated) */
  id: string;
  /** Node display name (from n8n node name) */
  name: string;
  /** n8n node type identifier (e.g., 'n8n-nodes-base.gmail') */
  type: string;
  /** Visual category for rendering */
  category: NodeCategory;
  /** Position on the canvas { x, y } */
  position: { x: number; y: number };
  /** Full n8n node parameters (for detail view) */
  parameters: Record<string, unknown>;
  /** Parameters that can be edited by the user */
  editableParams: EditableParamDescriptor[];
  /** Credential type names used by this node */
  credentials: string[];
  /** Whether this node is disabled in n8n */
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// Graph Edge
// ---------------------------------------------------------------------------

/**
 * A directed edge connecting two nodes in the workflow graph.
 */
export interface GraphEdge {
  /** Unique edge ID (generated: source-target-index) */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Source handle identifier (output index) */
  sourceHandle: string;
  /** Target handle identifier (input index) */
  targetHandle: string;
}

// ---------------------------------------------------------------------------
// Workflow Metadata
// ---------------------------------------------------------------------------

/**
 * Metadata about the workflow as a whole.
 */
export interface WorkflowMetadata {
  /** n8n workflow ID (if deployed) */
  workflowId: string | null;
  /** Human-readable workflow name */
  workflowName: string;
  /** Workflow template type */
  workflowType: WorkflowTemplateType;
  /** Whether the workflow is active in n8n */
  active: boolean;
  /** Total number of nodes (excluding sticky notes) */
  nodeCount: number;
  /** Total number of edges */
  edgeCount: number;
}

// ---------------------------------------------------------------------------
// Workflow Graph (top-level)
// ---------------------------------------------------------------------------

/**
 * Complete renderable workflow graph.
 * This is what the adapter produces and the canvas consumes.
 */
export interface WorkflowGraph {
  /** All nodes in the graph */
  nodes: GraphNode[];
  /** All edges connecting nodes */
  edges: GraphEdge[];
  /** Workflow-level metadata */
  metadata: WorkflowMetadata;
}

// ---------------------------------------------------------------------------
// Node Registry Entry
// ---------------------------------------------------------------------------

/**
 * An entry in the node type registry mapping n8n node types
 * to their visual properties.
 */
export interface NodeRegistryEntry {
  /** Visual category */
  category: NodeCategory;
  /** Display label (e.g., 'Gmail', 'Database') */
  label: string;
  /** Tailwind color class for the node border */
  color: string;
}

// ---------------------------------------------------------------------------
// API Response types
// ---------------------------------------------------------------------------

/**
 * Response from GET /api/sandbox/workflow/[campaignId]
 */
export interface WorkflowGraphResponse {
  /** The transformed workflow graph */
  graph: WorkflowGraph;
  /** Source of the graph data */
  source: 'live' | 'template';
}

/**
 * Node execution status for live execution overlay.
 */
export type NodeExecutionOverlayStatus = 'idle' | 'running' | 'success' | 'error';
