/**
 * D8-006: Supabase-backed WatchdogDB Implementation
 *
 * Implements the WatchdogDB interface using Supabase queries against
 * genesis.watchdog_runs and genesis.watchdog_drifts tables.
 *
 * Uses the `(getTypedSupabaseAdmin() as any).schema('genesis')` pattern
 * for genesis tables not in the auto-generated Database type.
 */

import { getTypedSupabaseAdmin } from '@/lib/supabase';
import type {
  WatchdogDB,
  DriftResult,
  WatchdogRunConfig,
  WatchdogRunResult,
  WatchdogEvent,
  OrphanWorkflow,
  OrphanDbRecord,
  StateMismatch,
  CredentialIssue,
  DriftType,
  DriftSeverity,
} from './watchdog-types';

function getGenesisClient() {
  return (getTypedSupabaseAdmin() as any).schema('genesis');
}

/**
 * SupabaseWatchdogDB — production implementation of WatchdogDB.
 *
 * The drift detection methods (detectOrphan*, detectStateMismatches, etc.)
 * require joining dashboard DB state with n8n data. Since these involve
 * external API calls (n8n), they remain stubs in this DB layer —
 * the actual detection logic lives in StateReconciliationWatchdog.
 *
 * This class focuses on PERSISTENCE: storing and retrieving runs + drifts.
 */
export class SupabaseWatchdogDB implements WatchdogDB {
  // ── Drift Detection (stubs — detection logic is in the watchdog service) ──

  async detectOrphanWorkflows(_workspaceId: string): Promise<OrphanWorkflow[]> {
    // Detection logic lives in StateReconciliationWatchdog.detectOrphanWorkflows()
    // which calls the n8n API. This DB layer only persists results.
    return [];
  }

  async detectOrphanDbRecords(_workspaceId: string): Promise<OrphanDbRecord[]> {
    return [];
  }

  async detectStateMismatches(_workspaceId: string): Promise<StateMismatch[]> {
    return [];
  }

  async detectCredentialIssues(_workspaceId: string): Promise<CredentialIssue[]> {
    return [];
  }

  // ── Drift Storage ──

  async storeDrift(drift: DriftResult): Promise<void> {
    const genesis = getGenesisClient();
    const { error } = await genesis
      .from('watchdog_drifts')
      .insert({
        workspace_id: drift.workspaceId,
        drift_type: drift.driftType,
        severity: drift.severity,
        details: drift.details,
        auto_healable: drift.autoHealable,
        healed: !!drift.healedAt,
        healed_at: drift.healedAt?.toISOString() || null,
        healing_attempts: drift.healingAttempts || 0,
        last_error: drift.lastError || null,
      });

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SupabaseWatchdogDB] Failed to store drift:', error.message);
    }
  }

  async updateDrift(driftId: string, updates: Partial<DriftResult>): Promise<void> {
    const genesis = getGenesisClient();
    const updateData: Record<string, unknown> = {};

    if (updates.severity !== undefined) updateData.severity = updates.severity;
    if (updates.autoHealable !== undefined) updateData.auto_healable = updates.autoHealable;
    if (updates.healedAt !== undefined) {
      updateData.healed = true;
      updateData.healed_at = updates.healedAt.toISOString();
    }
    if (updates.healingAttempts !== undefined) updateData.healing_attempts = updates.healingAttempts;
    if (updates.lastError !== undefined) updateData.last_error = updates.lastError;
    if (updates.details !== undefined) updateData.details = updates.details;

    const { error } = await genesis
      .from('watchdog_drifts')
      .update(updateData)
      .eq('id', driftId);

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SupabaseWatchdogDB] Failed to update drift:', error.message);
    }
  }

  // ── Run Tracking ──

  async createRun(config: WatchdogRunConfig, event: WatchdogEvent): Promise<string> {
    const genesis = getGenesisClient();
    const { data, error } = await genesis
      .from('watchdog_runs')
      .insert({
        run_type: 'drift_detection',
        trigger: event.trigger,
        workspace_ids: config.workspaceIds || [],
        started_at: event.timestamp.toISOString(),
        status: 'running',
        initiated_by: event.initiatedBy || null,
        metadata: {
          auto_heal: config.autoHeal,
          dry_run: config.dryRun,
          drift_types: config.driftTypes || [],
          timeout: config.timeout || null,
          ...event.metadata,
        },
      })
      .select('id')
      .single();

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SupabaseWatchdogDB] Failed to create run:', error.message);
      // Return a temporary ID so the watchdog can still operate
      return `temp-${Date.now()}`;
    }

    return data.id;
  }

  async updateRun(runId: string, result: Partial<WatchdogRunResult>): Promise<void> {
    // Skip update for temp IDs (created when DB insert failed)
    if (runId.startsWith('temp-')) return;

    const genesis = getGenesisClient();
    const updateData: Record<string, unknown> = {};

    if (result.completedAt !== undefined) updateData.completed_at = result.completedAt.toISOString();
    if (result.workspacesScanned !== undefined) updateData.workspaces_scanned = result.workspacesScanned;
    if (result.totalDrifts !== undefined) updateData.total_drifts_found = result.totalDrifts;
    if (result.driftsHealed !== undefined) updateData.drifts_healed = result.driftsHealed;
    if (result.driftsFailed !== undefined) updateData.drifts_failed = result.driftsFailed;
    if (result.driftsByType !== undefined) updateData.drifts_by_type = result.driftsByType;
    if (result.driftsBySeverity !== undefined) updateData.drifts_by_severity = result.driftsBySeverity;
    if (result.durationMs !== undefined) updateData.duration_ms = result.durationMs;
    if (result.errors !== undefined) updateData.errors = result.errors;

    // Determine status
    if (result.completedAt) {
      updateData.status = (result.errors && result.errors.length > 0) ? 'failed' : 'completed';
    }

    const { error } = await genesis
      .from('watchdog_runs')
      .update(updateData)
      .eq('id', runId);

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SupabaseWatchdogDB] Failed to update run:', error.message);
    }
  }

  async getRecentRuns(limit = 10): Promise<WatchdogRunResult[]> {
    const genesis = getGenesisClient();
    const { data, error } = await genesis
      .from('watchdog_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SupabaseWatchdogDB] Failed to get recent runs:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      runId: row.id,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : new Date(),
      durationMs: row.duration_ms || 0,
      workspacesScanned: row.workspaces_scanned || 0,
      totalDrifts: row.total_drifts_found || 0,
      driftsByType: (row.drifts_by_type || {}) as Record<DriftType, number>,
      driftsBySeverity: (row.drifts_by_severity || {}) as Record<DriftSeverity, number>,
      driftsDetected: row.total_drifts_found || 0,
      driftsHealed: row.drifts_healed || 0,
      driftsFailed: row.drifts_failed || 0,
      drifts: [], // Drifts are in a separate table; load via getDriftsForRun if needed
      errors: row.errors || [],
    }));
  }

  // ── Additional Query Methods ──

  /**
   * Get drifts for a specific run
   */
  async getDriftsForRun(runId: string): Promise<DriftResult[]> {
    const genesis = getGenesisClient();
    const { data, error } = await genesis
      .from('watchdog_drifts')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SupabaseWatchdogDB] Failed to get drifts for run:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      workspaceId: row.workspace_id,
      driftType: row.drift_type as DriftType,
      severity: row.severity as DriftSeverity,
      details: row.details || {},
      autoHealable: row.auto_healable,
      detectedAt: row.created_at ? new Date(row.created_at) : undefined,
      healedAt: row.healed_at ? new Date(row.healed_at) : undefined,
      healingAttempts: row.healing_attempts || 0,
      lastError: row.last_error || undefined,
    }));
  }

  /**
   * Get drifts with optional filters
   */
  async getDrifts(filters?: {
    workspaceId?: string;
    driftType?: DriftType;
    severity?: DriftSeverity;
    healed?: boolean;
    limit?: number;
  }): Promise<DriftResult[]> {
    const genesis = getGenesisClient();
    let query = genesis
      .from('watchdog_drifts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.workspaceId) query = query.eq('workspace_id', filters.workspaceId);
    if (filters?.driftType) query = query.eq('drift_type', filters.driftType);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.healed !== undefined) query = query.eq('healed', filters.healed);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[SupabaseWatchdogDB] Failed to get drifts:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      workspaceId: row.workspace_id,
      driftType: row.drift_type as DriftType,
      severity: row.severity as DriftSeverity,
      details: row.details || {},
      autoHealable: row.auto_healable,
      detectedAt: row.created_at ? new Date(row.created_at) : undefined,
      healedAt: row.healed_at ? new Date(row.healed_at) : undefined,
      healingAttempts: row.healing_attempts || 0,
      lastError: row.last_error || undefined,
    }));
  }
}
