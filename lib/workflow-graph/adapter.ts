/**
 * n8n-to-Graph Adapter
 *
 * Pure function transforming raw n8n workflow JSON into a WorkflowGraph.
 * Handles node classification, connection parsing, editable parameter
 * detection, and auto-layout via dagre.
 *
 * @module lib/workflow-graph/adapter
 */

import type {
  WorkflowGraph,
  GraphNode,
  GraphEdge,
  WorkflowMetadata,
  WorkflowTemplateType,
  NodeCategory,
  EditableParamDescriptor,
} from './types';
import {
  normalizeNodeType,
  getNodeRegistryEntry,
  classifyHttpRequestNode,
  HTTP_REQUEST_CATEGORY_LABELS,
  HTTP_REQUEST_CATEGORY_COLORS,
} from './registry';
import { autoLayout, hasValidPositions } from './layout';

// ---------------------------------------------------------------------------
// Raw n8n JSON Interfaces (for internal parsing only)
// ---------------------------------------------------------------------------

/** A single node in the raw n8n workflow JSON */
interface RawN8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
  typeVersion?: number;
}

/** Connection target in n8n format */
interface RawN8nConnectionTarget {
  node: string; // target node name
  type: string; // usually 'main'
  index: number; // input index on target
}

/**
 * Connections in n8n format:
 * { "Source Node Name": { "main": [ [ { node, type, index }, ... ], ... ] } }
 *
 * Outer key: source node name
 * "main": output type
 * Array of arrays: each inner array is one output port
 * Each element: a target with node name, type, and index
 */
type RawN8nConnections = Record<
  string,
  Record<string, RawN8nConnectionTarget[][]>
>;

/** Top-level n8n workflow JSON structure */
interface RawN8nWorkflow {
  id?: string;
  name?: string;
  nodes?: RawN8nNode[];
  connections?: RawN8nConnections;
  active?: boolean;
  settings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Sticky Note Filter
// ---------------------------------------------------------------------------

const STICKY_NOTE_TYPES = [
  'n8n-nodes-base.stickyNote',
  'n8n-nodes-internal.stickyNote',
];

function isStickyNote(type: string): boolean {
  return STICKY_NOTE_TYPES.includes(type);
}

// ---------------------------------------------------------------------------
// Editable Parameter Detection
// ---------------------------------------------------------------------------

/**
 * Patterns for detecting editable parameters on specific node types.
 * Maps normalized node type → function that returns editable params.
 */
const EDITABLE_PARAM_DETECTORS: Record<
  string,
  (node: RawN8nNode, category: NodeCategory) => EditableParamDescriptor[]
> = {
  scheduleTrigger: (node) => {
    const params: EditableParamDescriptor[] = [];
    if (node.parameters?.rule) {
      params.push({
        key: 'schedule',
        label: 'Schedule',
        type: 'cron',
        path: 'rule.interval',
      });
    }
    return params;
  },

  limit: (node) => {
    const params: EditableParamDescriptor[] = [];
    if (node.parameters?.maxItems !== undefined) {
      params.push({
        key: 'maxItems',
        label: 'Max Items Per Batch',
        type: 'number',
        path: 'maxItems',
      });
    }
    return params;
  },

  httpRequest: (node, category) => {
    const params: EditableParamDescriptor[] = [];

    // AI prompt nodes: the prompt is in jsonBody or body
    if (category === 'ai_llm') {
      const bodyParam = node.parameters?.body || node.parameters?.jsonBody;
      if (typeof bodyParam === 'string') {
        // Try to extract the prompt from the JSON body
        try {
          const parsed = JSON.parse(bodyParam);
          // OpenAI format: messages[].content
          if (parsed.messages && Array.isArray(parsed.messages)) {
            const systemMsg = parsed.messages.find(
              (m: { role: string }) => m.role === 'system',
            );
            if (systemMsg) {
              params.push({
                key: 'systemPrompt',
                label: 'System Prompt',
                type: 'textarea',
                path: node.parameters?.jsonBody !== undefined
                  ? 'jsonBody'
                  : 'body',
              });
            }
          }
          // Anthropic format: messages + system
          if (parsed.system) {
            params.push({
              key: 'systemPrompt',
              label: 'System Prompt',
              type: 'textarea',
              path: node.parameters?.jsonBody !== undefined
                ? 'jsonBody'
                : 'body',
            });
          }
        } catch {
          // If JSON parsing fails, treat the whole body as editable
          params.push({
            key: 'body',
            label: 'Request Body',
            type: 'textarea',
            path: node.parameters?.jsonBody !== undefined
              ? 'jsonBody'
              : 'body',
          });
        }
      }

      // Model selection
      if (typeof bodyParam === 'string' && bodyParam.includes('"model"')) {
        params.push({
          key: 'model',
          label: 'AI Model',
          type: 'text',
          path: node.parameters?.jsonBody !== undefined
            ? 'jsonBody'
            : 'body',
        });
      }
    }

    return params;
  },

  wait: (node) => {
    const params: EditableParamDescriptor[] = [];
    if (node.parameters?.amount !== undefined) {
      params.push({
        key: 'waitAmount',
        label: 'Wait Duration',
        type: 'number',
        path: 'amount',
      });
    }
    return params;
  },

  gmail: (node) => {
    const params: EditableParamDescriptor[] = [];
    if (node.parameters?.subject !== undefined) {
      params.push({
        key: 'subject',
        label: 'Email Subject',
        type: 'text',
        path: 'subject',
      });
    }
    return params;
  },
};

/**
 * Detects editable parameters for a node based on its type and category.
 */
function detectEditableParams(
  node: RawN8nNode,
  normalizedType: string,
  category: NodeCategory,
): EditableParamDescriptor[] {
  const detector = EDITABLE_PARAM_DETECTORS[normalizedType];
  if (detector) {
    return detector(node, category);
  }

  // For any node type, check for YOUR_* placeholder values
  const params: EditableParamDescriptor[] = [];
  if (node.parameters) {
    for (const [key, value] of Object.entries(node.parameters)) {
      if (typeof value === 'string' && value.startsWith('YOUR_')) {
        params.push({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: 'text',
          path: key,
        });
      }
    }
  }

  return params;
}

// ---------------------------------------------------------------------------
// Main Adapter Function
// ---------------------------------------------------------------------------

/**
 * Transforms a raw n8n workflow JSON into a renderable WorkflowGraph.
 *
 * Steps:
 * 1. Parse and validate the raw JSON
 * 2. Filter out sticky notes
 * 3. Classify each node using the registry + httpRequest classifier
 * 4. Parse connections into typed edges
 * 5. Detect editable parameters
 * 6. Auto-layout if positions are missing/invalid
 * 7. Compute metadata
 *
 * @param n8nWorkflow - Raw n8n workflow JSON (unknown shape)
 * @param workflowType - The workflow template type for metadata
 * @returns A fully formed WorkflowGraph ready for rendering
 */
export function transformN8nToGraph(
  n8nWorkflow: unknown,
  workflowType: WorkflowTemplateType = 'email_1',
): WorkflowGraph {
  // 1. Parse and validate
  const raw = n8nWorkflow as RawN8nWorkflow;
  const rawNodes: RawN8nNode[] = raw.nodes ?? [];
  const rawConnections: RawN8nConnections = raw.connections ?? {};

  // 2. Filter sticky notes
  const filteredNodes = rawNodes.filter((n) => !isStickyNote(n.type));

  // Build name→id lookup (connections use names, graph uses IDs)
  const nameToId = new Map<string, string>();
  for (const node of filteredNodes) {
    nameToId.set(node.name, node.id);
  }

  // 3. Classify and convert nodes
  const graphNodes: GraphNode[] = filteredNodes.map((node) => {
    const normalizedType = normalizeNodeType(node.type);
    const registryEntry = getNodeRegistryEntry(normalizedType);

    // Extract credential type names
    const credentials = node.credentials
      ? Object.keys(node.credentials)
      : [];

    // Classify httpRequest nodes contextually
    let category = registryEntry.category;
    if (normalizedType === 'httpRequest') {
      category = classifyHttpRequestNode(
        node.parameters ?? {},
        credentials,
        node.name,
      );
    }

    // Detect editable parameters
    const editableParams = detectEditableParams(
      node,
      normalizedType,
      category,
    );

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      category,
      position: {
        x: node.position?.[0] ?? 0,
        y: node.position?.[1] ?? 0,
      },
      parameters: node.parameters ?? {},
      editableParams,
      credentials,
      disabled: node.disabled ?? false,
    };
  });

  // 4. Parse connections into edges
  const graphEdges: GraphEdge[] = [];
  let edgeIndex = 0;

  for (const [sourceName, outputs] of Object.entries(rawConnections)) {
    const sourceId = nameToId.get(sourceName);
    if (!sourceId) continue; // Skip connections from filtered-out nodes

    for (const [outputType, outputPorts] of Object.entries(outputs)) {
      for (
        let portIndex = 0;
        portIndex < outputPorts.length;
        portIndex++
      ) {
        const targets = outputPorts[portIndex];
        if (!targets) continue;

        for (const target of targets) {
          const targetId = nameToId.get(target.node);
          if (!targetId) continue; // Skip connections to filtered-out nodes

          graphEdges.push({
            id: `edge-${edgeIndex++}`,
            source: sourceId,
            target: targetId,
            sourceHandle: `${outputType}-${portIndex}`,
            targetHandle: `${target.type}-${target.index}`,
          });
        }
      }
    }
  }

  // 5. Build initial graph
  let graph: WorkflowGraph = {
    nodes: graphNodes,
    edges: graphEdges,
    metadata: buildMetadata(raw, workflowType, graphNodes, graphEdges),
  };

  // 6. Auto-layout if positions are invalid
  if (!hasValidPositions(graph)) {
    graph = autoLayout(graph);
  }

  return graph;
}

// ---------------------------------------------------------------------------
// Metadata Builder
// ---------------------------------------------------------------------------

function buildMetadata(
  raw: RawN8nWorkflow,
  workflowType: WorkflowTemplateType,
  nodes: GraphNode[],
  edges: GraphEdge[],
): WorkflowMetadata {
  return {
    workflowId: raw.id ?? null,
    workflowName: raw.name ?? 'Unnamed Workflow',
    workflowType,
    active: raw.active ?? false,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}
