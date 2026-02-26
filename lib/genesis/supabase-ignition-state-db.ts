/**
 * SUPABASE IGNITION STATE DB
 *
 * Production implementation of IgnitionStateDB that persists ignition state
 * to genesis.ignition_state and operations to genesis.ignition_operations
 * via the service-role Supabase client.
 *
 * Replaces MockIgnitionStateDB for production use.
 *
 * @see ignition-orchestrator.ts — IgnitionStateDB interface
 * @see ignition-types.ts — IgnitionState type
 * @see POST_GENESIS_EXECUTION_PLAN.md — Task 1.3.1 / D1-002
 */

import { IgnitionStateDB } from './ignition-orchestrator';
import { IgnitionState } from './ignition-types';
import { getTypedSupabaseAdmin } from '../supabase';

// ============================================
// SUPABASE IGNITION STATE DB
// ============================================

export class SupabaseIgnitionStateDB implements IgnitionStateDB {
  /**
   * Returns a query builder scoped to the genesis schema.
   * Uses `as any` because genesis tables are not in the auto-generated Database type.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private genesis(): any {
    return (getTypedSupabaseAdmin() as any).schema('genesis');
  }

  /**
   * Save (upsert) ignition state for a workspace.
   * Uses ON CONFLICT workspace_id DO UPDATE to handle both insert and update.
   */
  async save(state: IgnitionState): Promise<void> {
    const row = {
      workspace_id: state.workspace_id,
      status: state.status,
      current_step: state.current_step,
      total_steps: state.total_steps,
      partition_name: state.partition_name ?? null,
      droplet_id: state.droplet_id ?? null,
      droplet_ip: state.droplet_ip ?? null,
      webhook_url: state.webhook_url ?? null,
      workflow_ids: state.workflow_ids,
      credential_ids: state.credential_ids,
      error_message: state.error_message ?? null,
      error_stack: state.error_stack ?? null,
      error_step: state.error_step ?? null,
      rollback_started_at: state.rollback_started_at ?? null,
      rollback_completed_at: state.rollback_completed_at ?? null,
      rollback_success: state.rollback_success ?? null,
      started_at: state.started_at,
      updated_at: new Date().toISOString(),
      completed_at: state.completed_at ?? null,
      requested_by: state.requested_by,
      region: state.region,
      droplet_size: state.droplet_size,
    };

    const { error } = await this.genesis()
      .from('ignition_state')
      .upsert(row, { onConflict: 'workspace_id' });

    if (error) {
      throw new Error(
        `SupabaseIgnitionStateDB.save() failed for workspace ${state.workspace_id}: ${error.message}`
      );
    }
  }

  /**
   * Load ignition state for a workspace.
   * Returns null if no state exists.
   */
  async load(workspaceId: string): Promise<IgnitionState | null> {
    const { data, error } = await this.genesis()
      .from('ignition_state')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `SupabaseIgnitionStateDB.load() failed for workspace ${workspaceId}: ${error.message}`
      );
    }

    if (!data) return null;

    return this.rowToState(data);
  }

  /**
   * Delete ignition state for a workspace.
   */
  async delete(workspaceId: string): Promise<void> {
    const { error } = await this.genesis()
      .from('ignition_state')
      .delete()
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(
        `SupabaseIgnitionStateDB.delete() failed for workspace ${workspaceId}: ${error.message}`
      );
    }
  }

  /**
   * Log an operation to the ignition_operations audit trail.
   */
  async logOperation(operation: {
    workspace_id: string;
    operation: string;
    status: string;
    result?: unknown;
    error?: string;
  }): Promise<void> {
    const row = {
      workspace_id: operation.workspace_id,
      operation: operation.operation,
      status: operation.status,
      result: operation.result ? JSON.parse(JSON.stringify(operation.result)) : null,
      error: operation.error ?? null,
    };

    const { error } = await this.genesis()
      .from('ignition_operations')
      .insert(row);

    if (error) {
      // Log operation failures are non-fatal — warn but don't throw
      console.warn(
        `SupabaseIgnitionStateDB.logOperation() failed for workspace ${operation.workspace_id}: ${error.message}`
      );
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Convert a database row to an IgnitionState object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rowToState(row: any): IgnitionState {
    return {
      workspace_id: row.workspace_id,
      status: row.status,
      current_step: row.current_step,
      total_steps: row.total_steps,
      partition_name: row.partition_name ?? undefined,
      droplet_id: row.droplet_id ?? undefined,
      droplet_ip: row.droplet_ip ?? undefined,
      webhook_url: row.webhook_url ?? undefined,
      workflow_ids: Array.isArray(row.workflow_ids) ? row.workflow_ids : [],
      credential_ids: Array.isArray(row.credential_ids) ? row.credential_ids : [],
      error_message: row.error_message ?? undefined,
      error_stack: row.error_stack ?? undefined,
      error_step: row.error_step ?? undefined,
      rollback_started_at: row.rollback_started_at ?? undefined,
      rollback_completed_at: row.rollback_completed_at ?? undefined,
      rollback_success: row.rollback_success ?? undefined,
      started_at: row.started_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at ?? undefined,
      requested_by: row.requested_by,
      region: row.region,
      droplet_size: row.droplet_size,
    };
  }
}
