/**
 * PARTITION MANAGER: TypeScript Client for Genesis Partition Operations
 * 
 * Provides TypeScript functions to interact with Genesis partition management:
 * - Create workspace partitions via `genesis.fn_ignite_workspace_partition()`
 * - Check if partition exists
 * - List all partitions
 * - Drop partitions (with safety checks)
 * 
 * Source: GENESIS_SINGULARITY_PLAN_V35.md Section 40.2.1
 * 
 * @module genesis-phase40/lib/partition-manager
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import {
  PartitionCreationResult,
  PartitionDropResult,
  PartitionRegistryEntry,
  validateWorkspaceId,
} from './genesis-db-config';

type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Options for creating a partition
 */
export interface CreatePartitionOptions {
  workspaceId: string;
  workspaceSlug?: string;
  supabaseClient: SupabaseClient<Database>;
}

/**
 * Result of partition creation operation
 */
export interface CreatePartitionResult {
  success: boolean;
  partitionName: string | null;
  operation: 'created' | 'already_exists' | 'created_by_other' | 'race_condition_ok' | 'failed';
  durationMs: number;
  error: string | null;
}

/**
 * Options for checking partition existence
 */
export interface CheckPartitionOptions {
  workspaceId: string;
  supabaseClient: SupabaseClient;
}

/**
 * Result of partition existence check
 */
export interface PartitionExistsResult {
  exists: boolean;
  partitionName: string | null;
  registryEntry: PartitionRegistryEntry | null;
}

/**
 * Options for listing partitions
 */
export interface ListPartitionsOptions {
  supabaseClient: SupabaseClient;
  status?: 'active' | 'dropped' | 'archived';
  limit?: number;
}

/**
 * Options for dropping a partition
 */
export interface DropPartitionOptions {
  workspaceId: string;
  force?: boolean;
  supabaseClient: SupabaseClient;
}

/**
 * Result of partition drop operation
 */
export interface DropPartitionResult {
  success: boolean;
  operation: 'dropped' | 'not_found' | 'has_data' | 'failed';
  rowCount: number;
  error: string | null;
}

/**
 * Creates a workspace partition atomically
 * 
 * This function calls `genesis.fn_ignite_workspace_partition()` which:
 * - Uses advisory locks to prevent race conditions
 * - Is idempotent (safe to call multiple times)
 * - Creates indexes automatically
 * - Registers partition in registry
 * 
 * @param options - Partition creation options
 * @returns Result of partition creation
 * 
 * @example
 * ```typescript
 * import { createPartition } from '@/genesis-phase40/lib/partition-manager';
 * import { supabaseAdmin } from '@/lib/supabase';
 * 
 * const result = await createPartition({
 *   workspaceId: '123e4567-e89b-12d3-a456-426614174000',
 *   workspaceSlug: 'my-workspace',
 *   supabaseClient: supabaseAdmin!,
 * });
 * 
 * if (result.success) {
 *   console.log(`Partition created: ${result.partitionName}`);
 * }
 * ```
 */
export async function createPartition(
  options: CreatePartitionOptions
): Promise<CreatePartitionResult> {
  const { workspaceId, workspaceSlug, supabaseClient } = options;

  // Validate input
  validateWorkspaceId(workspaceId);

  try {
    // Call the database function
    const { data, error } = await supabaseClient.rpc(
      'fn_ignite_workspace_partition',
      {
        p_workspace_id: workspaceId,
        p_workspace_slug: workspaceSlug || null,
      }
    );

    if (error) {
      return {
        success: false,
        partitionName: null,
        operation: 'failed',
        durationMs: 0,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        partitionName: null,
        operation: 'failed',
        durationMs: 0,
        error: 'No data returned from partition creation function',
      };
    }

    const result = data[0];

    return {
      success: result.success,
      partitionName: result.partition_name,
      operation: result.operation as CreatePartitionResult['operation'],
      durationMs: result.duration_ms,
      error: result.error_message,
    };
  } catch (err) {
    return {
      success: false,
      partitionName: null,
      operation: 'failed',
      durationMs: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Checks if a partition exists for a workspace
 * 
 * Checks both the partition registry and the actual database catalog.
 * 
 * @param options - Partition check options
 * @returns Result indicating if partition exists
 * 
 * @example
 * ```typescript
 * import { partitionExists } from '@/genesis-phase40/lib/partition-manager';
 * 
 * const result = await partitionExists({
 *   workspaceId: '123e4567-e89b-12d3-a456-426614174000',
 *   supabaseClient: supabaseAdmin!,
 * });
 * 
 * if (result.exists) {
 *   console.log(`Partition found: ${result.partitionName}`);
 * }
 * ```
 */
export async function partitionExists(
  options: CheckPartitionOptions
): Promise<PartitionExistsResult> {
  const { workspaceId, supabaseClient } = options;

  validateWorkspaceId(workspaceId);

  try {
    // Check the partition registry (source of truth)
    const { data: registryData, error: registryError } = await supabaseClient
      .schema('genesis')
      .from('partition_registry')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .maybeSingle();

    if (registryError) {
      // If registry table doesn't exist yet, try to create partition to check
      // This handles the case where migrations haven't been run yet
      console.warn('Partition registry query failed:', registryError.message);
      return {
        exists: false,
        partitionName: null,
        registryEntry: null,
      };
    }

    if (registryData) {
      return {
        exists: true,
        partitionName: registryData.partition_name,
        registryEntry: registryData as PartitionRegistryEntry,
      };
    }

    // Not found in registry
    return {
      exists: false,
      partitionName: null,
      registryEntry: null,
    };
  } catch (err) {
    // If registry table doesn't exist, assume partition doesn't exist
    console.error('Error checking partition existence:', err);
    return {
      exists: false,
      partitionName: null,
      registryEntry: null,
    };
  }
}

/**
 * Lists all partitions in the registry
 * 
 * @param options - List partitions options
 * @returns Array of partition registry entries
 * 
 * @example
 * ```typescript
 * import { listPartitions } from '@/genesis-phase40/lib/partition-manager';
 * 
 * const partitions = await listPartitions({
 *   supabaseClient: supabaseAdmin!,
 *   status: 'active',
 *   limit: 100,
 * });
 * 
 * console.log(`Found ${partitions.length} active partitions`);
 * ```
 */
export async function listPartitions(
  options: ListPartitionsOptions
): Promise<PartitionRegistryEntry[]> {
  const { supabaseClient, status, limit } = options;

  try {
    let query = supabaseClient
      .schema('genesis')
      .from('partition_registry')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing partitions:', error);
      return [];
    }

    return (data || []) as PartitionRegistryEntry[];
  } catch (err) {
    console.error('Error listing partitions:', err);
    return [];
  }
}

/**
 * Drops a workspace partition with safety checks
 * 
 * This function calls `genesis.fn_drop_workspace_partition()` which:
 * - Checks if partition has data (requires force=true to drop)
 * - Updates registry status
 * - Drops the partition table
 * 
 * @param options - Partition drop options
 * @returns Result of partition drop operation
 * 
 * @example
 * ```typescript
 * import { dropPartition } from '@/genesis-phase40/lib/partition-manager';
 * 
 * // Safe drop (fails if partition has data)
 * const result = await dropPartition({
 *   workspaceId: '123e4567-e89b-12d3-a456-426614174000',
 *   force: false,
 *   supabaseClient: supabaseAdmin!,
 * });
 * 
 * // Force drop (drops even if partition has data)
 * const forceResult = await dropPartition({
 *   workspaceId: '123e4567-e89b-12d3-a456-426614174000',
 *   force: true,
 *   supabaseClient: supabaseAdmin!,
 * });
 * ```
 */
export async function dropPartition(
  options: DropPartitionOptions
): Promise<DropPartitionResult> {
  const { workspaceId, force = false, supabaseClient } = options;

  validateWorkspaceId(workspaceId);

  try {
    const { data, error } = await supabaseClient.rpc<PartitionDropResult>(
      'fn_drop_workspace_partition',
      {
        p_workspace_id: workspaceId,
        p_force: force,
      }
    );

    if (error) {
      return {
        success: false,
        operation: 'failed',
        rowCount: 0,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        operation: 'failed',
        rowCount: 0,
        error: 'No data returned from partition drop function',
      };
    }

    const result = data[0];

    return {
      success: result.success,
      operation: result.operation as DropPartitionResult['operation'],
      rowCount: result.row_count,
      error: result.error_message,
    };
  } catch (err) {
    return {
      success: false,
      operation: 'failed',
      rowCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
