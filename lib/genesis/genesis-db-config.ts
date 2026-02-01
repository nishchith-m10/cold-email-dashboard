/**
 * GENESIS DATABASE CONFIGURATION
 * 
 * Central configuration for Genesis Phase 40 database operations.
 * Provides constants, type definitions, and database connection helpers.
 * 
 * Source: GENESIS_SINGULARITY_PLAN_V35.md Section 3.5
 * 
 * @module genesis-phase40/lib/genesis-db-config
 */

/**
 * Ohio Workspace ID constant
 * 
 * This is the UUID of the legacy Ohio workspace that uses:
 * - `leads_ohio` table (not partitioned)
 * - Legacy n8n workflows
 * - Old infrastructure patterns
 * 
 * Must be set in environment variable: NEXT_PUBLIC_OHIO_WORKSPACE_ID
 * 
 * @throws {Error} If environment variable is not set
 */
export const OHIO_WORKSPACE_ID: string = (() => {
  const id = process.env.NEXT_PUBLIC_OHIO_WORKSPACE_ID;
  if (!id) {
    throw new Error(
      'NEXT_PUBLIC_OHIO_WORKSPACE_ID environment variable is required. ' +
      'Set this to the UUID of the legacy Ohio workspace.'
    );
  }
  return id;
})();

/**
 * Type definition for partition creation result
 * 
 * Matches the return type of `genesis.fn_ignite_workspace_partition()`
 */
export interface PartitionCreationResult {
  success: boolean;
  partition_name: string | null;
  operation: string;
  duration_ms: number;
  error_message: string | null;
}

/**
 * Type definition for partition registry entry
 * 
 * Matches the `genesis.partition_registry` table structure
 */
export interface PartitionRegistryEntry {
  workspace_id: string;
  partition_name: string;
  status: 'active' | 'dropped' | 'archived';
  created_at: string;
  updated_at: string | null;
}

/**
 * Type definition for partition drop result
 * 
 * Matches the return type of `genesis.fn_drop_workspace_partition()`
 */
export interface PartitionDropResult {
  success: boolean;
  operation: string;
  row_count: number;
  error_message: string | null;
}

/**
 * Database operation context
 * 
 * Used for setting workspace context in database queries
 */
export interface WorkspaceContext {
  workspaceId: string;
  userId?: string;
}

/**
 * Validates if a string is a valid UUID format
 * 
 * @param str - String to validate
 * @returns True if string is a valid UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validates if a workspace ID is valid
 * 
 * @param workspaceId - Workspace ID to validate
 * @throws {Error} If workspace ID is invalid
 */
export function validateWorkspaceId(workspaceId: string): void {
  if (!workspaceId || !workspaceId.trim()) {
    throw new Error('workspace_id cannot be empty');
  }
  if (!isValidUUID(workspaceId)) {
    throw new Error(`Invalid workspace_id format: ${workspaceId}. Must be a valid UUID.`);
  }
}

/**
 * Sets workspace context for RLS enforcement
 * 
 * This function calls `genesis.set_workspace_context()` which sets a session-level
 * parameter that RLS policies use to filter data. Must be called before querying
 * partitioned data to ensure proper isolation.
 * 
 * @param supabaseClient - Supabase client instance
 * @param workspaceId - Workspace ID to set as context
 * @throws {Error} If workspace ID is invalid or function call fails
 * 
 * @example
 * ```typescript
 * import { setWorkspaceContext } from '@/genesis-phase40/lib/genesis-db-config';
 * import { supabaseAdmin } from '@/lib/supabase';
 * 
 * await setWorkspaceContext(supabaseAdmin!, workspaceId);
 * // Now queries to genesis.leads will be filtered by workspace_id
 * ```
 */
export async function setWorkspaceContext(
  supabaseClient: any, // Using any to avoid circular dependency with @supabase/supabase-js
  workspaceId: string
): Promise<void> {
  validateWorkspaceId(workspaceId);

  const { error } = await supabaseClient.rpc('set_workspace_context', {
    p_workspace_id: workspaceId,
  });

  if (error) {
    throw new Error(`Failed to set workspace context: ${error.message}`);
  }
}

/**
 * Gets the current workspace context
 * 
 * This function calls `genesis.get_workspace_context()` which returns the
 * current workspace ID set in the session, or a sentinel UUID if not set.
 * 
 * @param supabaseClient - Supabase client instance
 * @returns Workspace ID or null if not set
 * 
 * @example
 * ```typescript
 * import { getWorkspaceContext } from '@/genesis-phase40/lib/genesis-db-config';
 * 
 * const currentWorkspaceId = await getWorkspaceContext(supabaseAdmin!);
 * ```
 */
export async function getWorkspaceContext(
  supabaseClient: any
): Promise<string | null> {
  const { data, error } = await supabaseClient.rpc(
    'get_workspace_context'
  );

  if (error) {
    throw new Error(`Failed to get workspace context: ${error.message}`);
  }

  // Function returns scalar string directly, not array
  const workspaceId = data as string;
  
  // Return null if sentinel UUID (means context not set)
  if (workspaceId === '00000000-0000-0000-0000-000000000000') {
    return null;
  }

  return workspaceId || null;
}
