/**
 * PHASE 72: VERSION REGISTRY — Central Source of Truth
 *
 * The Version Registry is the authoritative record of what version each tenant
 * is running for every component. It provides:
 *   - Version lookup per tenant
 *   - Fleet-wide version summaries
 *   - Version compatibility checking
 *   - Drift detection (tenants behind target)
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 68.3
 */

import {
  getTenantVersion,
  upsertTenantVersion,
  updateTenantComponentVersion,
  getTenantsNeedingUpdate,
  getFleetVersionSummary,
  getCurrentTemplate,
  listTemplateVersions,
} from './db-service';

import type {
  FleetComponent,
  TenantVersionRecord,
  FleetVersionSummary,
  VersionCompatibilityRule,
  VERSION_COMPATIBILITY_MATRIX,
} from './types';

import {
  VERSION_COMPATIBILITY_MATRIX as COMPAT_MATRIX,
} from './types';

// ============================================
// VERSION QUERIES
// ============================================

/**
 * Get the current version a tenant is running for a specific component.
 */
export async function getComponentVersion(
  workspaceId: string,
  component: FleetComponent
): Promise<string | null> {
  const record = await getTenantVersion(workspaceId);
  if (!record) return null;

  const columnMap: Record<FleetComponent, keyof TenantVersionRecord> = {
    dashboard: 'dashboard_version',
    workflow_email_1: 'workflow_email_1',
    workflow_email_2: 'workflow_email_2',
    workflow_email_3: 'workflow_email_3',
    workflow_email_1_smtp: 'workflow_email_1_smtp',
    workflow_email_2_smtp: 'workflow_email_2_smtp',
    workflow_email_3_smtp: 'workflow_email_3_smtp',
    workflow_email_preparation: 'workflow_email_preparation',
    workflow_reply_tracker: 'workflow_reply_tracker',
    workflow_research: 'workflow_research',
    workflow_opt_out: 'workflow_opt_out',
    sidecar: 'sidecar_version',
  };

  return record[columnMap[component]] as string;
}

/**
 * Ensure a tenant has a version record (creates one with defaults if missing).
 */
export async function ensureTenantVersionRecord(
  workspaceId: string
): Promise<TenantVersionRecord> {
  const existing = await getTenantVersion(workspaceId);
  if (existing) return existing;

  return upsertTenantVersion({ workspace_id: workspaceId });
}

/**
 * Get a fleet-wide version summary for a component.
 */
export async function getVersionSummary(
  component: FleetComponent
): Promise<FleetVersionSummary> {
  const summary = await getFleetVersionSummary(component);

  // Compute needs_update based on current template
  const currentTemplate = await getCurrentTemplateVersion(component);
  let needsUpdate = 0;

  if (currentTemplate) {
    for (const [ver, count] of Object.entries(summary.by_version)) {
      if (ver !== currentTemplate) {
        needsUpdate += count;
      }
    }
  }

  return {
    component,
    total_tenants: summary.total,
    by_version: summary.by_version,
    needs_update: needsUpdate,
    currently_updating: summary.updating,
    failed: summary.failed,
  };
}

/**
 * Get currently targeted version for a component (from workflow_templates).
 * For non-workflow components (dashboard, sidecar), returns null (managed externally).
 */
async function getCurrentTemplateVersion(
  component: FleetComponent
): Promise<string | null> {
  // Only workflow components have template-managed versions
  const workflowComponents: FleetComponent[] = [
    'workflow_email_1',
    'workflow_email_2',
    'workflow_email_3',
    'workflow_research',
    'workflow_opt_out',
  ];

  if (!workflowComponents.includes(component)) return null;

  const template = await getCurrentTemplate(component);
  return template?.version ?? null;
}

/**
 * Detect tenants with version drift (not on the current version).
 */
export async function detectVersionDrift(
  component: FleetComponent,
  targetVersion: string
): Promise<{ workspace_id: string; current_version: string }[]> {
  const tenants = await getTenantsNeedingUpdate(component, targetVersion);

  const columnMap: Record<FleetComponent, keyof TenantVersionRecord> = {
    dashboard: 'dashboard_version',
    workflow_email_1: 'workflow_email_1',
    workflow_email_2: 'workflow_email_2',
    workflow_email_3: 'workflow_email_3',
    workflow_email_1_smtp: 'workflow_email_1_smtp',
    workflow_email_2_smtp: 'workflow_email_2_smtp',
    workflow_email_3_smtp: 'workflow_email_3_smtp',
    workflow_email_preparation: 'workflow_email_preparation',
    workflow_reply_tracker: 'workflow_reply_tracker',
    workflow_research: 'workflow_research',
    workflow_opt_out: 'workflow_opt_out',
    sidecar: 'sidecar_version',
  };

  return tenants.map(t => ({
    workspace_id: t.workspace_id,
    current_version: t[columnMap[component]] as string,
  }));
}

// ============================================
// VERSION COMPATIBILITY (spec 68.10)
// ============================================

/**
 * Simple semver range check: does version match "x.y.z" in "x.y.z - x.y.z" range?
 * Supports formats: "1.0.x", "1.0.x - 1.2.x", "1.3.x+"
 */
function versionInRange(version: string, range: string): boolean {
  const parts = version.split('.').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return false;

  const [major, minor] = parts;

  // Handle "x.y.z+" format
  if (range.endsWith('+')) {
    const minParts = range.replace('+', '').replace(/x/g, '0').split('.').map(Number);
    const [minMajor, minMinor] = minParts;
    return major > minMajor || (major === minMajor && minor >= minMinor);
  }

  // Handle "x.y.z - x.y.z" format
  if (range.includes(' - ')) {
    const [minRange, maxRange] = range.split(' - ').map(s => s.trim());
    const minParts = minRange.replace(/x/g, '0').split('.').map(Number);
    const maxParts = maxRange.replace(/x/g, '999').split('.').map(Number);

    const [minMajor, minMinor] = minParts;
    const [maxMajor, maxMinor] = maxParts;

    const aboveMin = major > minMajor || (major === minMajor && minor >= minMinor);
    const belowMax = major < maxMajor || (major === maxMajor && minor <= maxMinor);

    return aboveMin && belowMax;
  }

  // Handle single "x.y.x" format
  const rangeParts = range.replace(/x/g, '0').split('.').map(Number);
  const [rangeMajor, rangeMinor] = rangeParts;
  return major === rangeMajor && (range.includes('x') || minor === rangeMinor);
}

/**
 * Check if a set of component versions are compatible.
 */
export function checkVersionCompatibility(
  dashboardVersion: string,
  sidecarVersion: string,
  workflowVersion: string
): {
  compatible: boolean;
  matching_rule: VersionCompatibilityRule | null;
  status: string;
} {
  for (const rule of COMPAT_MATRIX) {
    const dashOk = versionInRange(dashboardVersion, rule.dashboard_range);
    const sidecarOk = versionInRange(sidecarVersion, rule.sidecar_range);
    const workflowOk = versionInRange(workflowVersion, rule.workflow_range);

    if (dashOk && sidecarOk && workflowOk) {
      return { compatible: true, matching_rule: rule, status: rule.status };
    }
  }

  return { compatible: false, matching_rule: null, status: 'incompatible' };
}

/**
 * Get template version history for a workflow component.
 */
export async function getTemplateHistory(
  component: FleetComponent
): Promise<{ version: string; is_current: boolean; is_canary: boolean; created_at: string }[]> {
  const templates = await listTemplateVersions(component);
  return templates.map(t => ({
    version: t.version,
    is_current: t.is_current,
    is_canary: t.is_canary,
    created_at: t.created_at,
  }));
}

/**
 * Record a successful version update for a tenant.
 */
export async function recordVersionUpdate(
  workspaceId: string,
  component: FleetComponent,
  newVersion: string
): Promise<void> {
  await updateTenantComponentVersion(workspaceId, component, newVersion);
}
