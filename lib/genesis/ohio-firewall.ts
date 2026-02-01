/**
 * OHIO FIREWALL: Runtime Protection Against Cross-Contamination
 * 
 * This module implements code-level firewalls to prevent accidental mixing of:
 * - Ohio workspace → Legacy infrastructure (leads_ohio table, legacy n8n)
 * - New workspaces → V35 infrastructure (genesis.leads partitions, Sovereign Droplets)
 * 
 * Source: GENESIS_SINGULARITY_PLAN_V35.md Section 3.5
 * 
 * @module genesis-phase40/lib/ohio-firewall
 */

import { OHIO_WORKSPACE_ID } from './genesis-db-config';

/**
 * OHIO FIREWALL: Prevents Ohio-specific code from running for non-Ohio tenants
 * 
 * Use this at the entry of any function that accesses legacy infrastructure:
 * - `leads_ohio` table queries
 * - Legacy n8n API calls
 * - Any code path that should ONLY work for Ohio workspace
 * 
 * @param workspaceId - The workspace ID to check
 * @param context - Context string describing where this check is being performed (e.g., 'lib/legacy-n8n-client.ts')
 * @throws {Error} OHIO_FIREWALL_VIOLATION if workspace is not Ohio
 * 
 * @example
 * ```typescript
 * import { assertIsOhio } from '@/genesis-phase40/lib/ohio-firewall';
 * 
 * export async function callLegacyN8nAPI(workspaceId: string, endpoint: string) {
 *   assertIsOhio(workspaceId, 'callLegacyN8nAPI');
 *   // Safe to proceed with legacy logic
 * }
 * ```
 */
export function assertIsOhio(workspaceId: string, context: string): void {
  if (workspaceId !== OHIO_WORKSPACE_ID) {
    const error = new Error(
      `OHIO_FIREWALL_VIOLATION: ${context} invoked for non-Ohio workspace ${workspaceId}. ` +
      `This function must ONLY be used for the Ohio legacy workspace.`
    );
    // Log to monitoring (Sentry, Datadog, etc.)
    console.error(error);
    // Hard fail to prevent silent corruption
    throw error;
  }
}

/**
 * V35 FIREWALL: Prevents V35-specific code from running for Ohio
 * 
 * Use this at the entry of any function that accesses Sovereign Droplet infrastructure:
 * - `genesis.leads` partition queries
 * - Sovereign Droplet API calls
 * - BullMQ job queues
 * - Any code path that should NOT work for Ohio workspace
 * 
 * @param workspaceId - The workspace ID to check
 * @param context - Context string describing where this check is being performed (e.g., 'api/campaigns/start')
 * @throws {Error} V35_FIREWALL_VIOLATION if workspace is Ohio
 * 
 * @example
 * ```typescript
 * import { assertIsNotOhio } from '@/genesis-phase40/lib/ohio-firewall';
 * 
 * export async function POST(req: Request) {
 *   const { workspaceId } = await getWorkspaceContext(req);
 *   assertIsNotOhio(workspaceId, 'api/campaigns/start');
 *   // Safe to proceed with V35 logic
 * }
 * ```
 */
export function assertIsNotOhio(workspaceId: string, context: string): void {
  if (workspaceId === OHIO_WORKSPACE_ID) {
    const error = new Error(
      `V35_FIREWALL_VIOLATION: ${context} invoked for Ohio workspace. ` +
      `This function must NOT be used for the legacy Ohio workspace.`
    );
    console.error(error);
    throw error;
  }
}

/**
 * Safe table name getter with Ohio awareness
 * 
 * Returns the correct table name based on workspace:
 * - Ohio workspace → 'leads_ohio' (legacy table)
 * - New workspaces → 'genesis.leads' (partitioned table with RLS)
 * 
 * @param workspaceId - The workspace ID to get table name for
 * @returns The table name to use for queries
 * 
 * @example
 * ```typescript
 * import { getLeadsTable } from '@/genesis-phase40/lib/ohio-firewall';
 * 
 * const tableName = getLeadsTable(workspaceId);
 * const { data } = await supabase.from(tableName).select('*');
 * ```
 */
export function getLeadsTable(workspaceId: string): string {
  if (workspaceId === OHIO_WORKSPACE_ID) {
    return 'leads_ohio';
  }
  return 'genesis.leads'; // Uses RLS with workspace_id
}
