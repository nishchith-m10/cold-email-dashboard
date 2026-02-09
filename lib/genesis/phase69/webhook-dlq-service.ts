/**
 * PHASE 69: WEBHOOK DEAD LETTER QUEUE SERVICE
 * 
 * Captures and retries failed webhook deliveries with exponential backoff.
 * Prevents data loss when Sidecar agents are temporarily unavailable.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.3
 */

import { createClient } from '@/lib/supabase';
import type {
  WebhookDLQEntry,
  WebhookDLQRecord,
  WebhookDeliveryFailure,
  DLQRetryResult,
  DLQRetryBatchResult,
  DLQStatus,
  mapDLQEntryFromDb,
} from './types';

// Import mapping function
import { mapDLQEntryFromDb as mapFromDb } from './types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Retry strategy: attempt count → delay
 * Attempt 1: 1 second
 * Attempt 2: 5 seconds
 * Attempt 3: 30 seconds
 * Attempt 4: 5 minutes
 * Attempt 5: 30 minutes
 */
const RETRY_DELAYS_MS: Record<number, number> = {
  0: 1000,      // 1 second
  1: 5000,      // 5 seconds
  2: 30000,     // 30 seconds
  3: 300000,    // 5 minutes
  4: 1800000,   // 30 minutes
};

const MAX_ATTEMPTS = 5;

// ============================================
// ADD TO DLQ
// ============================================

/**
 * Add a failed webhook delivery to the Dead Letter Queue.
 * 
 * @param failure - Webhook delivery failure details
 * @returns DLQ entry ID
 * 
 * @example
 * try {
 *   await deliverWebhook(url, payload);
 * } catch (error) {
 *   await addToDLQ({
 *     workspaceId: 'uuid',
 *     url: 'https://sidecar.example.com/webhook',
 *     payload: { event: 'workflow_completed' },
 *     error: {
 *       message: error.message,
 *       code: '500',
 *       stack: error.stack
 *     }
 *   });
 * }
 */
export async function addToDLQ(failure: WebhookDeliveryFailure): Promise<string | null> {
  try {
    const supabase = createClient();

    const nextRetryAt = new Date(Date.now() + (RETRY_DELAYS_MS[0] || 1000));

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_dlq')
      .insert({
        workspace_id: failure.workspaceId,
        webhook_url: failure.url,
        http_method: failure.method || 'POST',
        payload: failure.payload,
        headers: failure.headers,
        error_message: failure.error.message,
        error_code: failure.error.code,
        error_stack: failure.error.stack,
        attempt_count: 0,
        max_attempts: MAX_ATTEMPTS,
        next_retry_at: nextRetryAt.toISOString(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[WebhookDLQ] Error adding to DLQ:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('[WebhookDLQ] Unexpected error adding to DLQ:', error);
    return null;
  }
}

// ============================================
// FETCH DLQ ENTRIES
// ============================================

/**
 * Get DLQ entries ready for retry (status=pending/retrying, next_retry_at <= now).
 * 
 * @param limit - Maximum number of entries to return (default 100)
 * @returns Array of DLQ entries ready for retry
 * 
 * @example
 * // In /api/cron/process-webhook-dlq route:
 * const entries = await getDLQEntriesForRetry(100);
 * for (const entry of entries) {
 *   await retryWebhookDelivery(entry);
 * }
 */
export async function getDLQEntriesForRetry(limit: number = 100): Promise<WebhookDLQEntry[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_dlq')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[WebhookDLQ] Error fetching entries for retry:', error);
      return [];
    }

    return data.map((record: WebhookDLQRecord) => mapFromDb(record));
  } catch (error) {
    console.error('[WebhookDLQ] Unexpected error fetching entries:', error);
    return [];
  }
}

/**
 * Get a specific DLQ entry by ID.
 * 
 * @param entryId - DLQ entry UUID
 * @returns DLQ entry or null
 */
export async function getDLQEntry(entryId: string): Promise<WebhookDLQEntry | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_dlq')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapFromDb(data as WebhookDLQRecord);
  } catch (error) {
    console.error('[WebhookDLQ] Error fetching entry:', error);
    return null;
  }
}

/**
 * Get DLQ entries for a workspace with optional status filter.
 * 
 * @param workspaceId - Workspace UUID
 * @param status - Optional status filter
 * @param limit - Maximum entries to return
 * @returns Array of DLQ entries
 * 
 * @example
 * // Get all failed deliveries for workspace:
 * const failed = await getDLQEntriesForWorkspace(workspaceId, 'abandoned');
 */
export async function getDLQEntriesForWorkspace(
  workspaceId: string,
  status?: DLQStatus,
  limit: number = 100
): Promise<WebhookDLQEntry[]> {
  try {
    const supabase = createClient();

    let query = supabase
      .schema('genesis')
      .from('webhook_dlq')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[WebhookDLQ] Error fetching workspace entries:', error);
      return [];
    }

    return data.map((record: WebhookDLQRecord) => mapFromDb(record));
  } catch (error) {
    console.error('[WebhookDLQ] Unexpected error fetching workspace entries:', error);
    return [];
  }
}

// ============================================
// UPDATE DLQ ENTRY
// ============================================

/**
 * Update DLQ entry after retry attempt.
 * 
 * @param entryId - DLQ entry UUID
 * @param result - Retry result
 */
async function updateDLQAfterRetry(entryId: string, result: DLQRetryResult): Promise<void> {
  try {
    const supabase = createClient();

    const now = new Date().toISOString();
    const newAttemptCount = result.attemptCount + 1;

    // Determine new status and next retry time
    let status: DLQStatus;
    let nextRetryAt: string | null;
    let resolvedAt: string | null = null;
    let abandonedAt: string | null = null;

    if (result.success) {
      status = 'resolved';
      nextRetryAt = null;
      resolvedAt = now;
    } else if (newAttemptCount >= MAX_ATTEMPTS) {
      status = 'abandoned';
      nextRetryAt = null;
      abandonedAt = now;
    } else {
      status = 'retrying';
      const delayMs = RETRY_DELAYS_MS[newAttemptCount] || RETRY_DELAYS_MS[4]; // Default to 30min
      nextRetryAt = new Date(Date.now() + delayMs).toISOString();
    }

    // Build update payload
    const updatePayload: any = {
      attempt_count: newAttemptCount,
      last_attempt_at: now,
      status,
      next_retry_at: nextRetryAt,
      updated_at: now,
    };

    if (!result.success && result.error) {
      updatePayload.error_message = result.error.message;
      updatePayload.error_code = result.error.code;
    }

    if (resolvedAt) {
      updatePayload.resolved_at = resolvedAt;
    }

    if (abandonedAt) {
      updatePayload.abandoned_at = abandonedAt;
    }

    await supabase
      .schema('genesis')
      .from('webhook_dlq')
      .update(updatePayload)
      .eq('id', entryId);

  } catch (error) {
    console.error('[WebhookDLQ] Error updating entry after retry:', error);
  }
}

// ============================================
// RETRY WEBHOOK DELIVERY
// ============================================

/**
 * Retry a single webhook delivery from the DLQ.
 * 
 * Attempts to POST the webhook payload to the original URL.
 * Updates DLQ entry with result.
 * 
 * @param entry - DLQ entry to retry
 * @returns Retry result
 */
export async function retryWebhookDelivery(entry: WebhookDLQEntry): Promise<DLQRetryResult> {
  const startTime = Date.now();

  try {
    // Attempt HTTP request
    const response = await fetch(entry.webhookUrl, {
      method: entry.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        ...entry.headers,
      },
      body: JSON.stringify(entry.payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const executionTimeMs = Date.now() - startTime;

    // Check if successful
    if (response.ok) {
      const result: DLQRetryResult = {
        success: true,
        entryId: entry.id,
        attemptCount: entry.attemptCount,
        executionTimeMs,
      };

      await updateDLQAfterRetry(entry.id, result);
      return result;
    }

    // Non-2xx response - failure
    const errorText = await response.text().catch(() => 'Unknown error');
    const result: DLQRetryResult = {
      success: false,
      entryId: entry.id,
      attemptCount: entry.attemptCount,
      error: {
        message: `HTTP ${response.status}: ${errorText}`,
        code: response.status.toString(),
        retryable: response.status >= 500, // 5xx errors are retryable
      },
      executionTimeMs,
    };

    await updateDLQAfterRetry(entry.id, result);
    return result;

  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    // Network error or timeout
    const result: DLQRetryResult = {
      success: false,
      entryId: entry.id,
      attemptCount: entry.attemptCount,
      error: {
        message: error.message || 'Network error',
        code: error.code || 'NETWORK_ERROR',
        retryable: true, // Network errors are retryable
      },
      executionTimeMs,
    };

    await updateDLQAfterRetry(entry.id, result);
    return result;
  }
}

/**
 * Process a batch of DLQ entries for retry.
 * 
 * Called by cron job every 5 minutes.
 * 
 * @param limit - Maximum entries to process (default 100)
 * @returns Batch result summary
 * 
 * @example
 * // In /api/cron/process-webhook-dlq route:
 * const result = await processDLQBatch(100);
 * console.log(`Processed ${result.totalProcessed}, resolved ${result.successful}`);
 */
export async function processDLQBatch(limit: number = 100): Promise<DLQRetryBatchResult> {
  const entries = await getDLQEntriesForRetry(limit);

  const results: DLQRetryResult[] = [];
  let successful = 0;
  let failed = 0;
  let abandoned = 0;

  for (const entry of entries) {
    const result = await retryWebhookDelivery(entry);
    results.push(result);

    if (result.success) {
      successful++;
    } else {
      const newAttemptCount = result.attemptCount + 1;
      if (newAttemptCount >= MAX_ATTEMPTS) {
        abandoned++;
      } else {
        failed++;
      }
    }
  }

  return {
    totalProcessed: entries.length,
    successful,
    failed,
    abandoned,
    results,
  };
}

// ============================================
// DLQ STATISTICS
// ============================================

/**
 * Get DLQ statistics (for monitoring/admin dashboard).
 * 
 * @returns DLQ stats by status
 */
export async function getDLQStats(): Promise<Record<DLQStatus, number> & { total: number }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_dlq')
      .select('status');

    if (error || !data) {
      return { pending: 0, retrying: 0, resolved: 0, abandoned: 0, total: 0 };
    }

    const stats = {
      pending: 0,
      retrying: 0,
      resolved: 0,
      abandoned: 0,
      total: data.length,
    };

    for (const row of data) {
      stats[row.status as DLQStatus]++;
    }

    return stats;
  } catch (error) {
    console.error('[WebhookDLQ] Error fetching stats:', error);
    return { pending: 0, retrying: 0, resolved: 0, abandoned: 0, total: 0 };
  }
}

/**
 * Clean up old resolved/abandoned DLQ entries.
 * 
 * @param ageInDays - Delete entries older than this many days (default 30)
 * @returns Number of entries deleted
 */
export async function cleanOldDLQEntries(ageInDays: number = 30): Promise<number> {
  try {
    const supabase = createClient();

    const cutoffDate = new Date(Date.now() - ageInDays * 24 * 60 * 60 * 1000);

    const { count, error } = await supabase
      .schema('genesis')
      .from('webhook_dlq')
      .delete({ count: 'exact' })
      .in('status', ['resolved', 'abandoned'])
      .or(`resolved_at.lt.${cutoffDate.toISOString()},abandoned_at.lt.${cutoffDate.toISOString()}`);

    if (error) {
      console.error('[WebhookDLQ] Error cleaning old entries:', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[WebhookDLQ] Unexpected error cleaning entries:', error);
    return 0;
  }
}
