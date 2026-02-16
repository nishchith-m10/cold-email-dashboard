/**
 * GENESIS PHASE 70: DISASTER RECOVERY DATABASE SERVICE
 *
 * Handles persistence for disaster recovery snapshots and regional health monitoring.
 * Supports both production and dry-run modes.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { Snapshot, HeartbeatStatus, DORegion } from './types';

// ============================================
// TYPES
// ============================================

export interface SnapshotRecord {
  id: string;
  workspace_id: string;
  droplet_id: string;
  snapshot_id: string;
  snapshot_name: string;
  region: string;
  backup_region: string | null;
  type: 'full' | 'incremental';
  size_bytes: number;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  created_at: string;
  expires_at: string;
  cost_estimate: number;
  metadata: Record<string, any>;
  is_dry_run: boolean;
}

export interface RegionalHealthRecord {
  id: string;
  region: string;
  status: 'healthy' | 'degraded' | 'outage';
  last_heartbeat_at: string;
  latency_ms: number | null;
  error_message: string | null;
  consecutive_failures: number;
  updated_at: string;
}

export interface SnapshotFilters {
  workspaceId?: string;
  region?: string;
  status?: 'pending' | 'completed' | 'failed' | 'expired';
  isDryRun?: boolean;
}

// ============================================
// SNAPSHOT OPERATIONS
// ============================================

/**
 * Save a snapshot record to the database
 */
export async function saveSnapshot(
  snapshot: Snapshot,
  isDryRun: boolean = false
): Promise<SnapshotRecord> {
  if (!supabaseAdmin) {
    /* eslint-disable-next-line no-console */
    console.error('[Phase70] Database unavailable - supabaseAdmin not initialized. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
    throw new Error('Database unavailable - Supabase credentials not configured');
  }

  // Convert GB to bytes
  const sizeBytes = Math.round(snapshot.sizeGb * 1024 * 1024 * 1024);

  // Calculate cost estimate (DigitalOcean snapshot pricing: ~$0.05/GB/month)
  const costEstimate = snapshot.sizeGb * 0.05;

  // Determine snapshot type based on the type field
  const snapshotType = snapshot.type === 'cross_region' || snapshot.type === 'daily' ? 'full' : 'full';

  // Build snapshot name in expected format
  const snapshotName = `${snapshot.type}_${new Date(snapshot.createdAt).toISOString().split('T')[0]}_${snapshot.workspaceId}`;

  const { data, error } = await supabaseAdmin.rpc('save_dr_snapshot', {
    p_workspace_id: snapshot.workspaceId,
    p_droplet_id: snapshot.dropletId,
    p_snapshot_id: snapshot.id,
    p_snapshot_name: snapshotName,
    p_region: snapshot.region,
    p_backup_region: snapshot.transferredTo || null,
    p_type: snapshotType,
    p_size_bytes: sizeBytes,
    p_status: snapshot.status === 'completed' ? 'completed' : 'pending',
    p_created_at: snapshot.createdAt,
    p_expires_at: snapshot.expiresAt,
    p_cost_estimate: costEstimate,
    p_metadata: {
      original_type: snapshot.type,
      transferred_to: snapshot.transferredTo,
    },
    p_is_dry_run: isDryRun,
  });

  if (error) {
    console.error('[Phase70-DB] Failed to save snapshot:', error);
    throw new Error(`Failed to save snapshot: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from snapshot insert');
  }

  return data as SnapshotRecord;
}

/**
 * List snapshots with optional filters
 */
export async function listSnapshots(
  filters: SnapshotFilters = {}
): Promise<SnapshotRecord[]> {
  if (!supabaseAdmin) {
    /* eslint-disable-next-line no-console */
    console.error('[Phase70] Database unavailable - supabaseAdmin not initialized. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
    throw new Error('Database unavailable - Supabase credentials not configured');
  }

  const { data, error } = await supabaseAdmin.rpc('list_dr_snapshots', {
    p_workspace_id: filters.workspaceId || null,
    p_limit: 100,
  });

  if (error) {
    console.error('[Phase70-DB] Failed to list snapshots:', error);
    throw new Error(`Failed to list snapshots: ${error.message}`);
  }

  // Apply additional filters client-side for now
  let results = (data || []) as SnapshotRecord[];

  if (filters.region) {
    results = results.filter(s => s.region === filters.region);
  }

  if (filters.status) {
    results = results.filter(s => s.status === filters.status);
  }

  if (filters.isDryRun !== undefined) {
    results = results.filter(s => s.is_dry_run === filters.isDryRun);
  }

  return results;
}

/**
 * Update snapshot status
 */
export async function updateSnapshotStatus(
  id: string,
  status: 'pending' | 'completed' | 'failed' | 'expired'
): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  const { error } = await supabaseAdmin.rpc('update_snapshot_status', {
    p_id: id,
    p_status: status,
  });

  if (error) {
    console.error('[Phase70-DB] Failed to update snapshot status:', error);
    throw new Error(`Failed to update snapshot status: ${error.message}`);
  }
}

/**
 * Mark expired snapshots (utility for cleanup jobs)
 */
export async function markExpiredSnapshots(): Promise<number> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  const { data, error } = await supabaseAdmin.rpc('mark_expired_snapshots');

  if (error) {
    console.error('[Phase70-DB] Failed to mark expired snapshots:', error);
    throw new Error(`Failed to mark expired snapshots: ${error.message}`);
  }

  return Number(data) || 0;
}

// ============================================
// REGIONAL HEALTH OPERATIONS
// ============================================

/**
 * Save or update regional health status
 */
export async function saveRegionalHealth(
  region: DORegion,
  heartbeat: HeartbeatStatus
): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  // Determine status based on health percentage
  let status: 'healthy' | 'degraded' | 'outage';
  if (heartbeat.healthPercentage >= 95) {
    status = 'healthy';
  } else if (heartbeat.healthPercentage >= 70) {
    status = 'degraded';
  } else {
    status = 'outage';
  }

  // Calculate latency if available (mock implementation)
  const latency_ms = Math.round(Math.random() * 100 + 50); // 50-150ms

  // Get existing record for consecutive failures tracking
  const existingData = await supabaseAdmin.rpc('get_region_health', { p_region: region });
  const existing = existingData.data as any;

  const consecutive_failures =
    status === 'healthy' ? 0 : ((existing?.consecutive_failures as number) || 0) + 1;

  // Upsert health status
  const { error } = await supabaseAdmin.rpc('upsert_regional_health', {
    p_region: region,
    p_status: status,
    p_last_heartbeat_at: heartbeat.timestamp,
    p_latency_ms: latency_ms,
    p_error_message: status !== 'healthy' ? `Health: ${heartbeat.healthPercentage.toFixed(1)}%` : null,
    p_consecutive_failures: consecutive_failures,
  });

  if (error) {
    console.error('[Phase70-DB] Failed to update regional health:', error);
    throw new Error(`Failed to update regional health: ${error.message}`);
  }
}

/**
 * Get all regional health records
 */
export async function getRegionalHealth(): Promise<RegionalHealthRecord[]> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  const { data, error } = await supabaseAdmin.rpc('get_regional_health');

  if (error) {
    console.error('[Phase70-DB] Failed to get regional health:', error);
    throw new Error(`Failed to get regional health: ${error.message}`);
  }

  return (data || []) as RegionalHealthRecord[];
}

/**
 * Get health status for a specific region
 */
export async function getRegionHealth(region: DORegion): Promise<RegionalHealthRecord | null> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  const { data, error } = await supabaseAdmin.rpc('get_region_health', {
    p_region: region,
  });

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found
    console.error('[Phase70-DB] Failed to get region health:', error);
    throw new Error(`Failed to get region health: ${error.message}`);
  }

  return data as RegionalHealthRecord | null;
}

// ============================================
// ANALYTICS & COVERAGE
// ============================================

/**
 * Calculate backup coverage: % of workspaces with snapshots < 24h old
 */
export async function getBackupCoverage(): Promise<number> {
  if (!supabaseAdmin) {
    console.warn('[Phase70-DB] Database unavailable, returning 0% coverage');
    return 0;
  }

  const { data, error } = await supabaseAdmin.rpc('get_backup_coverage');

  if (error) {
    console.error('[Phase70-DB] Failed to get backup coverage:', error);
    return 0;
  }

  return Number(data) || 0;
}

/**
 * Get snapshot statistics by region
 */
export async function getSnapshotStatsByRegion(): Promise<
  Array<{
    region: string;
    total_count: number;
    total_size_gb: number;
    total_cost: number;
  }>
> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  const { data, error } = await supabaseAdmin.rpc('get_snapshot_stats_by_region');

  if (error) {
    console.error('[Phase70-DB] Failed to get snapshot stats:', error);
    throw new Error(`Failed to get snapshot stats: ${error.message}`);
  }

  return ((data || []) as any[]).map((row: any) => ({
    region: row.region,
    total_count: Number(row.total_count),
    total_size_gb: Number(row.total_size_gb),
    total_cost: Number(row.total_cost),
  }));
}

// ============================================
// SNAPSHOT LOOKUP
// ============================================

/**
 * Get a single snapshot by ID
 */
export async function getSnapshot(
  snapshotId: string
): Promise<(SnapshotRecord & { workspaceId: string; sizeGb: number; created_at: string }) | null> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  const { data, error } = await supabaseAdmin.rpc('get_snapshot', {
    p_snapshot_id: snapshotId,
  });

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[Phase70-DB] Failed to get snapshot:', error);
    throw new Error(`Failed to get snapshot: ${error.message}`);
  }

  if (!data) return null;

  const snapshot = data as any;
  return {
    ...snapshot,
    workspaceId: snapshot.workspace_id,
    sizeGb: snapshot.size_bytes / (1024 * 1024 * 1024),
    created_at: snapshot.created_at,
  } as any;
}

// ============================================
// FAILOVER EVENT LOGGING
// ============================================

/**
 * Log a failover event to the database
 */
export async function logFailoverEvent(event: {
  workspaceId: string;
  sourceRegion: string;
  targetRegion: string;
  triggeredBy: string;
  reason: string;
  isDryRun?: boolean;
}): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Database unavailable - supabaseAdmin not initialized');
  }

  const { error } = await supabaseAdmin.rpc('log_failover_event', {
    p_workspace_id: event.workspaceId,
    p_source_region: event.sourceRegion,
    p_target_region: event.targetRegion,
    p_triggered_by: event.triggeredBy,
    p_reason: event.reason,
    p_is_dry_run: event.isDryRun ?? false,
  });

  if (error) {
    console.error('[Phase70-DB] Failed to log failover event:', error);
    // Don't throw - failover logging should not block the operation
  }
}
