/**
 * Surgical Patch Builder for Node Updates
 *
 * Given an original n8n workflow JSON, a target node ID/name, and
 * a set of parameter changes, produces a new workflow object with
 * only the target node's parameters modified. Deep-merges changes
 * so nested structures are preserved.
 *
 * IMPORTANT: Never mutates the original workflow object.
 *
 * @module lib/workflow-graph/patch-builder
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawN8nNode {
  id?: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  [key: string]: unknown;
}

interface RawN8nWorkflow {
  nodes: RawN8nNode[];
  [key: string]: unknown;
}

export interface PatchResult {
  /** The complete workflow object with the target node patched */
  nodes: RawN8nNode[];
}

// ---------------------------------------------------------------------------
// Deep merge helper
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge `source` into `target`, producing a new object.
 * Arrays are replaced entirely (not merged element-by-element).
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Build a patched workflow with a single node's parameters updated.
 *
 * @param originalWorkflow - The raw n8n workflow JSON (with `nodes` array)
 * @param nodeId           - The ID or name of the node to patch
 * @param paramChanges     - Key/value pairs to merge into the node's parameters
 * @returns PatchResult    - { nodes: [...] } with the patched nodes array
 *
 * @throws Error if the nodeId is not found in the workflow
 * @throws Error if the workflow has no nodes array
 */
export function buildNodePatch(
  originalWorkflow: unknown,
  nodeId: string,
  paramChanges: Record<string, unknown>,
): PatchResult {
  // Validate input
  if (!originalWorkflow || typeof originalWorkflow !== 'object') {
    throw new Error('buildNodePatch: originalWorkflow must be an object');
  }

  const workflow = originalWorkflow as RawN8nWorkflow;

  if (!Array.isArray(workflow.nodes)) {
    throw new Error('buildNodePatch: workflow.nodes must be an array');
  }

  // Find the target node (by ID or by name)
  const targetIndex = workflow.nodes.findIndex(
    (node) => node.id === nodeId || node.name === nodeId,
  );

  if (targetIndex === -1) {
    throw new Error(
      `buildNodePatch: Node "${nodeId}" not found in workflow. ` +
      `Available nodes: ${workflow.nodes.map((n) => n.name).join(', ')}`,
    );
  }

  // Deep clone all nodes to avoid mutation
  const patchedNodes: RawN8nNode[] = workflow.nodes.map((node, index) => {
    // Copy the node structure
    const cloned: RawN8nNode = {
      ...node,
      parameters: { ...node.parameters },
    };

    // Deep-merge param changes only for the target node
    if (index === targetIndex) {
      cloned.parameters = deepMerge(
        node.parameters,
        paramChanges,
      ) as Record<string, unknown>;
    }

    return cloned;
  });

  return { nodes: patchedNodes };
}
