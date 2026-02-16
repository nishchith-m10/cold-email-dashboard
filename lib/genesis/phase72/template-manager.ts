/**
 * PHASE 72: TEMPLATE MANAGER — Golden Template Repository
 *
 * Manages versioned workflow templates (the "golden" JSON files):
 *   - Publishing new template versions
 *   - Promoting canary → current
 *   - Fetching templates for fleet deployment
 *   - Changelog management
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.5
 */

import {
  getCurrentTemplate,
  getTemplateVersion,
  listTemplateVersions,
  insertTemplate,
  promoteTemplate,
  setTemplateCanary,
} from './db-service';

import type {
  WorkflowTemplateRecord,
  PublishTemplateInput,
  PromoteTemplateInput,
  FleetComponent,
} from './types';

// ============================================
// WORKFLOW NAMES
// ============================================

/** Valid workflow names that can be managed as templates. */
export const MANAGED_WORKFLOWS: FleetComponent[] = [
  'workflow_email_1',
  'workflow_email_2',
  'workflow_email_3',
  'workflow_research',
  'workflow_opt_out',
];

/**
 * Validate that a workflow name is a managed workflow.
 */
function assertManagedWorkflow(name: string): asserts name is FleetComponent {
  if (!MANAGED_WORKFLOWS.includes(name as FleetComponent)) {
    throw new Error(
      `'${name}' is not a managed workflow. Valid names: ${MANAGED_WORKFLOWS.join(', ')}`
    );
  }
}

// ============================================
// PUBLISH
// ============================================

/**
 * Publish a new workflow template version.
 * Does NOT make it current — use promoteToCurrentVersion() for that.
 *
 * @param input - Template version data including workflow JSON and changelog.
 * @returns The inserted template record.
 * @throws If version already exists for this workflow.
 */
export async function publishTemplateVersion(
  input: PublishTemplateInput
): Promise<WorkflowTemplateRecord> {
  assertManagedWorkflow(input.workflow_name);

  // Check if version already exists
  const existing = await getTemplateVersion(input.workflow_name, input.version);
  if (existing) {
    throw new Error(
      `Template ${input.workflow_name} version ${input.version} already exists (id: ${existing.id})`
    );
  }

  // Validate semver format
  if (!isValidSemver(input.version)) {
    throw new Error(
      `Invalid version format: '${input.version}'. Must be semver (MAJOR.MINOR.PATCH)`
    );
  }

  // Validate workflow JSON has required fields
  validateWorkflowJson(input.workflow_json);

  return insertTemplate({
    workflow_name: input.workflow_name,
    version: input.version,
    workflow_json: input.workflow_json,
    changelog: input.changelog,
    is_current: false,
    is_canary: input.is_canary ?? false,
    created_by: input.created_by,
  });
}

/**
 * Promote a template version to current.
 * Un-sets current from all other versions of the same workflow.
 * Also clears any canary flag from the promoted version.
 */
export async function promoteToCurrentVersion(
  input: PromoteTemplateInput
): Promise<WorkflowTemplateRecord> {
  assertManagedWorkflow(input.workflow_name);

  // Verify the version exists
  const template = await getTemplateVersion(input.workflow_name, input.version);
  if (!template) {
    throw new Error(
      `Template ${input.workflow_name} version ${input.version} not found`
    );
  }

  // Promote
  await promoteTemplate(input.workflow_name, input.version);

  // Return updated record
  const updated = await getTemplateVersion(input.workflow_name, input.version);
  return updated!;
}

/**
 * Mark a template version as canary (for canary rollout testing).
 */
export async function markAsCanary(
  workflowName: string,
  version: string
): Promise<void> {
  assertManagedWorkflow(workflowName);

  const template = await getTemplateVersion(workflowName, version);
  if (!template) {
    throw new Error(`Template ${workflowName} version ${version} not found`);
  }

  await setTemplateCanary(workflowName, version, true);
}

/**
 * Remove canary flag from a template version.
 */
export async function unmarkCanary(
  workflowName: string,
  version: string
): Promise<void> {
  assertManagedWorkflow(workflowName);
  await setTemplateCanary(workflowName, version, false);
}

// ============================================
// QUERY
// ============================================

/**
 * Get the current (production) template for a workflow.
 */
export async function getCurrentTemplateVersion(
  workflowName: string
): Promise<WorkflowTemplateRecord | null> {
  assertManagedWorkflow(workflowName);
  return getCurrentTemplate(workflowName);
}

/**
 * Get a specific template version.
 */
export async function getSpecificVersion(
  workflowName: string,
  version: string
): Promise<WorkflowTemplateRecord | null> {
  assertManagedWorkflow(workflowName);
  return getTemplateVersion(workflowName, version);
}

/**
 * Get the full version history for a workflow (newest first).
 */
export async function getVersionHistory(
  workflowName: string
): Promise<WorkflowTemplateRecord[]> {
  assertManagedWorkflow(workflowName);
  return listTemplateVersions(workflowName);
}

/**
 * Get current templates for all managed workflows.
 */
export async function getAllCurrentTemplates(): Promise<
  Record<string, WorkflowTemplateRecord | null>
> {
  const results: Record<string, WorkflowTemplateRecord | null> = {};

  for (const wf of MANAGED_WORKFLOWS) {
    results[wf] = await getCurrentTemplate(wf);
  }

  return results;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate semver format: MAJOR.MINOR.PATCH
 */
function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * Validate that the workflow JSON has basic required n8n structure.
 */
function validateWorkflowJson(json: Record<string, unknown>): void {
  // n8n workflow JSON must have nodes array
  if (!json.nodes || !Array.isArray(json.nodes)) {
    throw new Error(
      'Invalid workflow JSON: must contain a "nodes" array'
    );
  }

  // Must have connections
  if (!json.connections || typeof json.connections !== 'object') {
    throw new Error(
      'Invalid workflow JSON: must contain a "connections" object'
    );
  }
}

/**
 * Compare two template versions to detect changes.
 * Returns a simple diff summary.
 */
export function compareTemplateVersions(
  older: WorkflowTemplateRecord,
  newer: WorkflowTemplateRecord
): {
  nodes_added: number;
  nodes_removed: number;
  nodes_modified: number;
  has_breaking_changes: boolean;
} {
  const olderNodes = (older.workflow_json.nodes as Array<{ name: string; type: string }>) ?? [];
  const newerNodes = (newer.workflow_json.nodes as Array<{ name: string; type: string }>) ?? [];

  const olderNames = new Set(olderNodes.map(n => n.name));
  const newerNames = new Set(newerNodes.map(n => n.name));

  let added = 0;
  let removed = 0;

  for (const name of newerNames) {
    if (!olderNames.has(name)) added++;
  }
  for (const name of olderNames) {
    if (!newerNames.has(name)) removed++;
  }

  // Nodes present in both but potentially modified
  const commonCount = olderNames.size - removed;
  // Simple heuristic: if total node count differs significantly, likely modifications
  const modified = Math.abs(olderNodes.length - newerNodes.length) > 0 ? commonCount : 0;

  // Breaking change heuristic: removed nodes or major structural changes
  const hasBreaking = removed > 0;

  return {
    nodes_added: added,
    nodes_removed: removed,
    nodes_modified: modified,
    has_breaking_changes: hasBreaking,
  };
}
