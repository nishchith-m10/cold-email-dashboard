/**
 * D8-002: Workspace Frozen Status Cache
 *
 * Lightweight in-memory cache for checking if a workspace is frozen.
 * Used by event/cost ingestion routes that authenticate via webhook tokens
 * (not Clerk auth), so they can't use the access guard cache.
 *
 * 60-second TTL to avoid per-request DB lookups while still reacting
 * to freeze/unfreeze within a minute.
 */

import { supabaseAdmin } from '@/lib/supabase';

interface FrozenCacheEntry {
  isFrozen: boolean;
  timestamp: number;
}

const frozenCache = new Map<string, FrozenCacheEntry>();
const FROZEN_CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Check if a workspace is frozen. Returns true if frozen.
 * Uses a 60s in-memory cache to avoid per-request DB queries.
 */
export async function isWorkspaceFrozen(workspaceId: string): Promise<boolean> {
  // Check cache first
  const cached = frozenCache.get(workspaceId);
  if (cached && Date.now() - cached.timestamp < FROZEN_CACHE_TTL_MS) {
    return cached.isFrozen;
  }

  // Query DB
  if (!supabaseAdmin) return false;

  const { data } = await supabaseAdmin
    .from('workspaces')
    .select('status')
    .eq('id', workspaceId)
    .maybeSingle();

  const isFrozen = data?.status === 'frozen';

  // Cache result
  frozenCache.set(workspaceId, {
    isFrozen,
    timestamp: Date.now(),
  });

  return isFrozen;
}

/**
 * Invalidate the frozen cache for a workspace.
 * Called by freeze/unfreeze handlers to ensure immediate effect.
 */
export function invalidateFrozenCache(workspaceId: string): void {
  frozenCache.delete(workspaceId);
}
