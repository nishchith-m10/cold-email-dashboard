/**
 * Genesis Schema Availability Check
 * 
 * PostgREST only exposes schemas listed in "Exposed schemas" (Supabase Dashboard > Settings > API).
 * If `genesis` isn't exposed, all `.schema('genesis')` queries fail with PGRST106.
 * 
 * This module provides a cached check so we don't spam failed queries on every request.
 * Cache TTL: 60s — allows recovery without restart after schema is exposed.
 */

import { supabaseAdmin } from '@/lib/supabase';

let cachedResult: boolean | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Check if the `genesis` schema is accessible via PostgREST.
 * Result is cached for 60s to avoid repeated failed queries.
 */
export async function isGenesisSchemaAvailable(): Promise<boolean> {
  if (!supabaseAdmin) return false;

  const now = Date.now();
  if (cachedResult !== null && now < cacheExpiry) {
    return cachedResult;
  }

  try {
    // Minimal probe: select 1 row from any genesis table
    const { error } = await (supabaseAdmin as any)
      .schema('genesis')
      .from('sandbox_test_runs')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST106') {
      cachedResult = false;
      cacheExpiry = now + CACHE_TTL_MS;
      return false;
    }

    // Even if the table doesn't exist yet (42P01), the schema IS accessible
    // Only PGRST106 means the schema itself isn't exposed
    cachedResult = !(error && error.code === 'PGRST106');
    cacheExpiry = now + CACHE_TTL_MS;
    return cachedResult;
  } catch {
    cachedResult = false;
    cacheExpiry = now + CACHE_TTL_MS;
    return false;
  }
}

/** Reset the cache (useful for tests) */
export function resetGenesisSchemaCache(): void {
  cachedResult = null;
  cacheExpiry = 0;
}
