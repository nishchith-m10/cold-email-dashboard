/**
 * PHASE 69: WEBHOOK SECRET ROTATION SERVICE
 * 
 * Handles webhook secret rotation with dual-key strategy (active + previous).
 * Enables zero-downtime rotation with 24-hour grace period.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 69.2.4
 */

import { getTypedSupabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import type {
  WebhookSecret,
  WebhookSecretRecord,
  WebhookSecretRotationRequest,
  mapWebhookSecretFromDb,
} from './types';

// Import mapper
import { mapWebhookSecretFromDb as mapFromDb } from './types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Default webhook secret rotation interval (90 days)
 */
const DEFAULT_ROTATION_INTERVAL_DAYS = 90;

/**
 * Default grace period for old secret (24 hours)
 */
const DEFAULT_GRACE_PERIOD_DAYS = 1;

// ============================================
// SECRET GENERATION
// ============================================

/**
 * Generate a cryptographically secure webhook secret.
 * 
 * Creates a 32-byte (256-bit) random secret, hex-encoded.
 * 
 * @returns Hex-encoded secret (64 characters)
 * 
 * @example
 * const newSecret = generateWebhookSecret();
 * // Returns: "a3f8b9c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

// ============================================
// FETCH WEBHOOK SECRET
// ============================================

/**
 * Get webhook secret for a workspace.
 * 
 * @param workspaceId - Workspace UUID
 * @returns Webhook secret with active and optional previous secret
 * 
 * @example
 * const secret = await getWebhookSecret(workspaceId);
 * if (!secret) {
 *   // No secret exists - create one
 *   await initializeWebhookSecret(workspaceId);
 * }
 */
export async function getWebhookSecret(workspaceId: string): Promise<WebhookSecret | null> {
  try {
    const supabase = getTypedSupabaseAdmin();

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_secrets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      return null;
    }

    // TODO: Decrypt secrets (Phase 64 encryption service)
    // For now, assume secrets are stored plaintext for development
    return mapFromDb(data as WebhookSecretRecord);
  } catch (error) {
    console.error('[WebhookSecretRotation] Error fetching secret:', error);
    return null;
  }
}

// ============================================
// INITIALIZE WEBHOOK SECRET
// ============================================

/**
 * Initialize webhook secret for a new workspace.
 * 
 * Creates the first active secret with no previous secret.
 * 
 * @param workspaceId - Workspace UUID
 * @param initiatedBy - User ID who initiated (optional)
 * @returns Created secret
 * 
 * @example
 * // When provisioning new workspace:
 * const secret = await initializeWebhookSecret(workspaceId, userId);
 */
export async function initializeWebhookSecret(
  workspaceId: string,
  initiatedBy?: string
): Promise<WebhookSecret | null> {
  try {
    const supabase = getTypedSupabaseAdmin();

    const newSecret = generateWebhookSecret();
    const nextRotationAt = new Date(Date.now() + DEFAULT_ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    // TODO: Encrypt secret before storing (Phase 64 encryption service)
    const encryptedSecret = newSecret; // Placeholder

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_secrets')
      .insert({
        workspace_id: workspaceId,
        secret_active: encryptedSecret,
        secret_previous: null,
        rotation_initiated_by: initiatedBy,
        rotation_reason: 'scheduled',
        next_rotation_at: nextRotationAt.toISOString(),
        grace_period_ends_at: null,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[WebhookSecretRotation] Error initializing secret:', error);
      return null;
    }

    return mapFromDb(data as WebhookSecretRecord);
  } catch (error) {
    console.error('[WebhookSecretRotation] Unexpected error initializing secret:', error);
    return null;
  }
}

// ============================================
// ROTATE WEBHOOK SECRET
// ============================================

/**
 * Rotate webhook secret for a workspace.
 * 
 * Implements dual-key rotation:
 * 1. Generate new secret
 * 2. Move current active → previous
 * 3. Set new secret as active
 * 4. Start grace period (default 24 hours)
 * 
 * During grace period, webhooks can use either active or previous secret.
 * After grace period, previous secret is dropped.
 * 
 * @param request - Rotation request details
 * @returns Updated webhook secret
 * 
 * @example
 * const rotated = await rotateWebhookSecret({
 *   workspaceId: 'uuid',
 *   reason: 'scheduled',
 *   initiatedBy: 'user-uuid',
 *   gracePeriodDays: 1
 * });
 */
export async function rotateWebhookSecret(
  request: WebhookSecretRotationRequest
): Promise<WebhookSecret | null> {
  try {
    const supabase = getTypedSupabaseAdmin();

    // Fetch current secret
    const current = await getWebhookSecret(request.workspaceId);
    if (!current) {
      // No secret exists - initialize instead
      return await initializeWebhookSecret(request.workspaceId, request.initiatedBy);
    }

    // Generate new secret
    const newSecret = generateWebhookSecret();
    
    // TODO: Encrypt secrets (Phase 64 encryption service)
    const encryptedNew = newSecret; // Placeholder
    const encryptedPrevious = current.secretActive; // Move active to previous

    // Calculate next rotation and grace period
    const gracePeriodDays = request.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
    const gracePeriodEndsAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);
    const nextRotationAt = new Date(Date.now() + DEFAULT_ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    // Update database
    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_secrets')
      .update({
        secret_active: encryptedNew,
        secret_previous: encryptedPrevious,
        rotated_at: new Date().toISOString(),
        rotation_initiated_by: request.initiatedBy,
        rotation_reason: request.reason,
        next_rotation_at: nextRotationAt.toISOString(),
        grace_period_ends_at: gracePeriodEndsAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', request.workspaceId)
      .select('*')
      .single();

    if (error || !data) {
      console.error('[WebhookSecretRotation] Error rotating secret:', error);
      return null;
    }

    console.log(`[WebhookSecretRotation] Rotated secret for workspace ${request.workspaceId}, grace period ends at ${gracePeriodEndsAt.toISOString()}`);

    return mapFromDb(data as WebhookSecretRecord);
  } catch (error) {
    console.error('[WebhookSecretRotation] Unexpected error rotating secret:', error);
    return null;
  }
}

// ============================================
// CLEANUP EXPIRED PREVIOUS SECRETS
// ============================================

/**
 * Drop previous secrets that are past their grace period.
 * 
 * Called by cron job to clean up old secrets.
 * 
 * @returns Number of secrets cleaned up
 * 
 * @example
 * // In /api/cron/clean-webhook-secrets route:
 * const cleaned = await cleanupExpiredPreviousSecrets();
 * console.log(`Cleaned up ${cleaned} expired previous secrets`);
 */
export async function cleanupExpiredPreviousSecrets(): Promise<number> {
  try {
    const supabase = getTypedSupabaseAdmin();

    const now = new Date().toISOString();

    // Find secrets with expired grace periods
    const { data: expiredSecrets } = await supabase
      .schema('genesis')
      .from('webhook_secrets')
      .select('id, workspace_id')
      .not('grace_period_ends_at', 'is', null)
      .lte('grace_period_ends_at', now);

    if (!expiredSecrets || expiredSecrets.length === 0) {
      return 0;
    }

    // Clear previous secret and grace period
    const { error } = await supabase
      .schema('genesis')
      .from('webhook_secrets')
      .update({
        secret_previous: null,
        grace_period_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .not('grace_period_ends_at', 'is', null)
      .lte('grace_period_ends_at', now);

    if (error) {
      console.error('[WebhookSecretRotation] Error cleaning up expired secrets:', error);
      return 0;
    }

    console.log(`[WebhookSecretRotation] Cleaned up ${expiredSecrets.length} expired previous secrets`);
    return expiredSecrets.length;
  } catch (error) {
    console.error('[WebhookSecretRotation] Unexpected error during cleanup:', error);
    return 0;
  }
}

// ============================================
// SCHEDULED ROTATION (For Cron)
// ============================================

/**
 * Get webhook secrets due for rotation (next_rotation_at <= now).
 * 
 * @returns Array of workspace IDs needing rotation
 */
export async function getSecretsNeedingRotation(): Promise<string[]> {
  try {
    const supabase = getTypedSupabaseAdmin();

    const { data, error } = await supabase
      .schema('genesis')
      .from('webhook_secrets')
      .select('workspace_id')
      .lte('next_rotation_at', new Date().toISOString());

    if (error || !data) {
      return [];
    }

    return data.map(row => row.workspace_id);
  } catch (error) {
    console.error('[WebhookSecretRotation] Error fetching secrets needing rotation:', error);
    return [];
  }
}

/**
 * Rotate all webhook secrets that are due for rotation.
 * 
 * Called by cron job (e.g., daily).
 * 
 * @returns Number of secrets rotated
 * 
 * @example
 * // In /api/cron/rotate-webhook-secrets route:
 * const rotated = await rotateScheduledSecrets();
 * console.log(`Rotated ${rotated} webhook secrets`);
 */
export async function rotateScheduledSecrets(): Promise<number> {
  try {
    const workspaceIds = await getSecretsNeedingRotation();

    let rotatedCount = 0;
    for (const workspaceId of workspaceIds) {
      const rotated = await rotateWebhookSecret({
        workspaceId,
        reason: 'scheduled',
        gracePeriodDays: 1,
      });

      if (rotated) {
        rotatedCount++;
      }
    }

    console.log(`[WebhookSecretRotation] Rotated ${rotatedCount}/${workspaceIds.length} webhook secrets`);
    return rotatedCount;
  } catch (error) {
    console.error('[WebhookSecretRotation] Error rotating scheduled secrets:', error);
    return 0;
  }
}
