/**
 * PHASE 69: REQUEST ID DEDUPLICATION SERVICE
 * 
 * Prevents replay attacks by tracking webhook request IDs.
 * Uses database storage with 10-minute TTL for request ID deduplication.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.2.5
 */

import { createClient } from '@/lib/supabase';
import type { RequestIdCheckResult } from './types';

// ============================================
// REQUEST ID CHECKING
// ============================================

/**
 * Check if a request ID has been seen before (duplicate detection).
 * 
 * If the request ID is new, it's recorded in the database.
 * If it already exists, returns isDuplicate=true.
 * 
 * @param requestId - Unique request ID from X-Genesis-Request-Id header
 * @param source - Source of the webhook ('sidecar', 'n8n', 'dashboard')
 * @param endpoint - API endpoint path
 * @returns Check result indicating if this is a duplicate
 * 
 * @example
 * const result = await checkRequestIdDuplicate(
 *   'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   'sidecar',
 *   '/api/n8n/execution-event'
 * );
 * 
 * if (result.isDuplicate) {
 *   return res.status(401).json({ 
 *     error: 'duplicate_request_id',
 *     seenAt: result.seenAt 
 *   });
 * }
 */
export async function checkRequestIdDuplicate(
  requestId: string,
  source: string,
  endpoint: string
): Promise<RequestIdCheckResult> {
  try {
    const supabase = createClient();

    // Attempt to insert the request ID
    // If it already exists, INSERT will fail due to PRIMARY KEY constraint
    const { error } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .insert({
        request_id: requestId,
        source,
        endpoint,
        seen_at: new Date().toISOString(),
      });

    // If no error, this is a new request ID
    if (!error) {
      return { isDuplicate: false };
    }

    // Check if error is due to duplicate key
    if (error.code === '23505') { // PostgreSQL unique violation
      // Fetch the existing record to get seen_at timestamp
      const { data: existing } = await supabase
        .schema('genesis')
        .from('webhook_request_ids')
        .select('seen_at')
        .eq('request_id', requestId)
        .single();

      return {
        isDuplicate: true,
        seenAt: existing ? new Date(existing.seen_at) : undefined,
      };
    }

    // Other database error - log and allow request (fail open)
    console.error('[RequestIdDeduplicator] Database error:', error);
    return { isDuplicate: false };

  } catch (error) {
    // Unexpected error - log and fail open (allow request)
    console.error('[RequestIdDeduplicator] Unexpected error:', error);
    return { isDuplicate: false };
  }
}

/**
 * Check if a request ID exists without inserting it.
 * 
 * Used for read-only checks (e.g., testing, admin queries).
 * 
 * @param requestId - Request ID to check
 * @returns True if request ID exists
 */
export async function requestIdExists(requestId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .select('request_id')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      console.error('[RequestIdDeduplicator] Error checking existence:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('[RequestIdDeduplicator] Unexpected error:', error);
    return false;
  }
}

// ============================================
// CLEANUP
// ============================================

/**
 * Clean up old request IDs (older than TTL).
 * 
 * Called by cron job to prevent table bloat.
 * Default TTL is 10 minutes (per Phase 69 spec).
 * 
 * @param ttlMinutes - Time-to-live in minutes (default 10)
 * @returns Number of records deleted
 * 
 * @example
 * // In /api/cron/clean-webhook-request-ids route:
 * const deleted = await cleanOldRequestIds(10);
 * console.log(`Deleted ${deleted} old request IDs`);
 */
export async function cleanOldRequestIds(ttlMinutes: number = 10): Promise<number> {
  try {
    const supabase = createClient();

    // Calculate cutoff timestamp
    const cutoffDate = new Date(Date.now() - ttlMinutes * 60 * 1000);

    // Delete old records
    const { error, count } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .delete({ count: 'exact' })
      .lt('seen_at', cutoffDate.toISOString());

    if (error) {
      console.error('[RequestIdDeduplicator] Error cleaning old IDs:', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[RequestIdDeduplicator] Unexpected error during cleanup:', error);
    return 0;
  }
}

/**
 * Get statistics about request ID storage.
 * 
 * Useful for monitoring and debugging.
 * 
 * @returns Stats about request ID table
 */
export async function getRequestIdStats(): Promise<{
  totalCount: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  sourceBreakdown: Record<string, number>;
}> {
  try {
    const supabase = createClient();

    // Get total count
    const { count: totalCount } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .select('*', { count: 'exact', head: true });

    // Get oldest and newest entries
    const { data: oldestData } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .select('seen_at')
      .order('seen_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: newestData } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .select('seen_at')
      .order('seen_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get source breakdown
    const { data: sourceData } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .select('source');

    const sourceBreakdown: Record<string, number> = {};
    if (sourceData) {
      for (const row of sourceData) {
        sourceBreakdown[row.source] = (sourceBreakdown[row.source] || 0) + 1;
      }
    }

    return {
      totalCount: totalCount ?? 0,
      oldestEntry: oldestData ? new Date(oldestData.seen_at) : undefined,
      newestEntry: newestData ? new Date(newestData.seen_at) : undefined,
      sourceBreakdown,
    };
  } catch (error) {
    console.error('[RequestIdDeduplicator] Error getting stats:', error);
    return {
      totalCount: 0,
      sourceBreakdown: {},
    };
  }
}

// ============================================
// BATCH OPERATIONS (For Testing)
// ============================================

/**
 * Clear all request IDs from the deduplication table.
 * 
 * **WARNING:** Only use in testing environments!
 * 
 * @returns Number of records deleted
 */
export async function clearAllRequestIds(): Promise<number> {
  try {
    const supabase = createClient();

    const { error, count } = await supabase
      .schema('genesis')
      .from('webhook_request_ids')
      .delete({ count: 'exact' })
      .neq('request_id', ''); // Delete all (PostgreSQL trick)

    if (error) {
      console.error('[RequestIdDeduplicator] Error clearing all IDs:', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[RequestIdDeduplicator] Unexpected error during clear:', error);
    return 0;
  }
}
