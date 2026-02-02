/**
 * Workspace Database Configuration Utilities
 * 
 * This module provides utilities for getting workspace-specific database configurations,
 * such as the leads table name. This enables multi-tenancy where each workspace can
 * have its own leads table.
 */

import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from './supabase';

// Default leads table name for backwards compatibility
// NOTE: Ohio workspace (DEFAULT_WORKSPACE_ID) uses leads_ohio and is kept separate
// from Genesis architecture as per Genesis Singularity Plan
const DEFAULT_LEADS_TABLE = 'leads_ohio';

// Cache for leads table names to avoid repeated DB lookups
const leadsTableCache = new Map<string, { tableName: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the leads table name for a workspace.
 * 
 * Reads from workspace.settings.leads_table if configured,
 * otherwise falls back to the default 'leads_ohio'.
 * 
 * Results are cached for 5 minutes to reduce database lookups.
 * 
 * @param workspaceId - The workspace ID to get the leads table for
 * @returns The leads table name (e.g., 'leads_ohio', 'leads_california')
 */
export async function getLeadsTableName(workspaceId: string): Promise<string> {
  // Check cache first
  const cached = leadsTableCache.get(workspaceId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[getLeadsTableName] Cache hit for workspace ${workspaceId}: ${cached.tableName}`);
    return cached.tableName;
  }

  // Default workspace always uses default table
  if (workspaceId === DEFAULT_WORKSPACE_ID) {
    console.log(`[getLeadsTableName] Using default table for workspace ${workspaceId}: ${DEFAULT_LEADS_TABLE}`);
    leadsTableCache.set(workspaceId, { tableName: DEFAULT_LEADS_TABLE, timestamp: Date.now() });
    return DEFAULT_LEADS_TABLE;
  }

  // No supabase? Return default
  if (!supabaseAdmin) {
    return DEFAULT_LEADS_TABLE;
  }

  try {
    // Fetch workspace settings
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .single();

    if (error || !data) {
      // Workspace not found or error - use default
      leadsTableCache.set(workspaceId, { tableName: DEFAULT_LEADS_TABLE, timestamp: Date.now() });
      return DEFAULT_LEADS_TABLE;
    }

    // Extract leads_table from settings, or use default
    const settings = data.settings as Record<string, unknown> | null;
    const leadsTable = typeof settings?.leads_table === 'string' 
      ? settings.leads_table 
      : DEFAULT_LEADS_TABLE;

    // Validate table name (basic sanitization - alphanumeric and underscores only)
    const sanitizedTableName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(leadsTable) 
      ? leadsTable 
      : DEFAULT_LEADS_TABLE;

    console.log(`[getLeadsTableName] Workspace ${workspaceId} resolved to table: ${sanitizedTableName}`);
    
    // Cache the result
    leadsTableCache.set(workspaceId, { tableName: sanitizedTableName, timestamp: Date.now() });
    
    return sanitizedTableName;
  } catch (err) {
    console.error('Error fetching leads table name:', err);
    return DEFAULT_LEADS_TABLE;
  }
}

/**
 * Synchronous version that returns the cached value or default.
 * Use this when you can't await (rare cases).
 * 
 * @param workspaceId - The workspace ID
 * @returns Cached table name or default
 */
export function getLeadsTableNameSync(workspaceId: string): string {
  const cached = leadsTableCache.get(workspaceId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.tableName;
  }
  return DEFAULT_LEADS_TABLE;
}

/**
 * Clear the leads table cache (useful for testing or after settings update)
 */
export function clearLeadsTableCache(): void {
  leadsTableCache.clear();
}

/**
 * Get the default leads table name constant
 */
export function getDefaultLeadsTable(): string {
  return DEFAULT_LEADS_TABLE;
}
