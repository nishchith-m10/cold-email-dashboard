/**
 * SUPABASE PARTITION MANAGER
 *
 * Production implementation of PartitionManager that creates and drops
 * workspace-specific lead partitions using the existing Postgres functions:
 *   - genesis.fn_ignite_workspace_partition(uuid, text)
 *   - genesis.fn_drop_workspace_partition(uuid, boolean)
 *
 * @see ignition-orchestrator.ts — PartitionManager interface
 * @see supabase/migrations/20260126_003_create_partition_functions.sql
 * @see POST_GENESIS_EXECUTION_PLAN.md — Task 1.3.2 / D1-003
 */

import { PartitionManager } from './ignition-orchestrator';
import { getTypedSupabaseAdmin } from '../supabase';

// ============================================
// SUPABASE PARTITION MANAGER
// ============================================

export class SupabasePartitionManager implements PartitionManager {
  /**
   * Create a workspace partition by calling genesis.fn_ignite_workspace_partition().
   *
   * The Postgres function handles:
   *   - Slug sanitization
   *   - Advisory locking (prevents race conditions)
   *   - Idempotency (returns success if partition already exists)
   *   - Partition creation as LIST partition of genesis.leads
   *   - Local index creation (email, status, updated_at)
   *   - Registration in genesis.partition_registry
   */
  async create(
    workspaceId: string,
    workspaceSlug: string
  ): Promise<{
    success: boolean;
    partition_name?: string;
    error?: string;
  }> {
    const supabase = getTypedSupabaseAdmin();

    const { data, error } = await supabase.rpc(
      'fn_ignite_workspace_partition' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      {
        p_workspace_id: workspaceId,
        p_workspace_slug: workspaceSlug,
      }
    );

    if (error) {
      return {
        success: false,
        error: `Partition RPC failed: ${error.message}`,
      };
    }

    // The function returns a single-row table result
    // supabase.rpc returns it as an array
    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      return {
        success: false,
        error: 'Partition function returned no result',
      };
    }

    if (!row.success) {
      return {
        success: false,
        error: row.error_message || `Partition creation failed (operation: ${row.operation})`,
      };
    }

    return {
      success: true,
      partition_name: row.partition_name,
    };
  }

  /**
   * Drop a workspace partition by calling genesis.fn_drop_workspace_partition().
   *
   * The Postgres function handles:
   *   - Registry lookup
   *   - Safety check (requires force=true if partition has data)
   *   - Table drop
   *   - Registry status update to 'dropped'
   *
   * Note: force=true is used during rollback to ensure cleanup succeeds.
   */
  async drop(workspaceId: string): Promise<{ success: boolean }> {
    const supabase = getTypedSupabaseAdmin();

    const { data, error } = await supabase.rpc(
      'fn_drop_workspace_partition' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      {
        p_workspace_id: workspaceId,
        p_force: true, // Force drop during rollback
      }
    );

    if (error) {
      console.error(
        `SupabasePartitionManager.drop() RPC failed for workspace ${workspaceId}: ${error.message}`
      );
      return { success: false };
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row || !row.success) {
      console.error(
        `SupabasePartitionManager.drop() failed for workspace ${workspaceId}: ${row?.error_message || 'unknown error'}`
      );
      return { success: false };
    }

    return { success: true };
  }
}
