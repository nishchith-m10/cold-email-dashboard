/**
 * API Workspace Access Guard
 * 
 * Validates that a user has access to a workspace before allowing API operations.
 * Uses in-memory caching to avoid repeated database queries.
 */

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Super admin users who can access all workspaces
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

// In-memory cache for workspace access (60s TTL)
interface CacheEntry {
  hasAccess: boolean;
  timestamp: number;
  role?: string;
  workspaceStatus?: string; // D8-001: cache frozen status
}

const accessCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds (hardened in D5-003)

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of accessCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      accessCache.delete(key);
    }
  }
}

/**
 * D5-005: Async, non-blocking audit log for super admin workspace access.
 * Uses fire-and-forget pattern so the request is never delayed.
 */
function logSuperAdminAccess(userId: string, workspaceId: string, requestUrl?: string) {
  // Intentionally not awaited — fire-and-forget
  supabase
    .from('governance_audit_log')
    .insert({
      actor_id: userId,
      action: 'super_admin_access',
      workspace_id: workspaceId,
      metadata: { endpoint: requestUrl || 'unknown' },
    })
    .then(({ error }) => {
      if (error) {
        /* eslint-disable-next-line no-console */
        console.error('[D5-005] Failed to log super admin access:', error.message);
      }
    });
}

/**
 * Check if a user has access to a workspace
 * @param requestUrl - Optional URL string for audit logging of super admin access
 */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string,
  requestUrl?: string,
): Promise<{ hasAccess: boolean; role?: string; frozen?: boolean; freezeReason?: string }> {
  // Super admin bypass — can always access, even frozen workspaces
  if (SUPER_ADMIN_IDS.includes(userId)) {
    // D5-005: Fire-and-forget audit log for super admin access
    logSuperAdminAccess(userId, workspaceId, requestUrl);
    return { hasAccess: true, role: 'super_admin' };
  }

  // Check cache
  const cacheKey = `${userId}:${workspaceId}`;
  const cached = accessCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    // D8-001: If workspace is frozen, deny access
    if (cached.workspaceStatus === 'frozen') {
      return { hasAccess: false, role: cached.role, frozen: true };
    }
    return { hasAccess: cached.hasAccess, role: cached.role };
  }

  // Clear expired entries periodically
  if (Math.random() < 0.1) {
    clearExpiredCache();
  }

  // Query database — membership
  const { data, error } = await supabase
    .from('user_workspaces')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const hasAccess = !error && !!data;
  const role = data?.role;

  // D8-001: Query workspace status to check frozen state
  let workspaceStatus: string | undefined;
  if (hasAccess) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('status')
      .eq('id', workspaceId)
      .maybeSingle();
    workspaceStatus = ws?.status || undefined;
  }
  
  // Cache result (including workspace status)
  accessCache.set(cacheKey, {
    hasAccess,
    role,
    workspaceStatus,
    timestamp: Date.now(),
  });

  // D8-001: If workspace is frozen, deny access
  if (hasAccess && workspaceStatus === 'frozen') {
    return { hasAccess: false, role, frozen: true };
  }

  return { hasAccess, role };
}

/**
 * Extract workspace ID from request
 */
export function extractWorkspaceId(
  request: Request,
  searchParams?: URLSearchParams
): string | null {
  // Try query parameter
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('workspace_id') || searchParams?.get('workspace_id');
  
  if (fromQuery) {
    return fromQuery;
  }

  // Try header
  const headers = new Headers(request.headers);
  const fromHeader = headers.get('x-workspace-id');
  
  if (fromHeader) {
    return fromHeader;
  }

  return null;
}

/**
 * Validate workspace access and return error response if unauthorized
 * Returns null if access is granted
 */
export async function validateWorkspaceAccess(
  request: Request,
  searchParams?: URLSearchParams
): Promise<NextResponse | null> {
  // Get authenticated user
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  // Extract workspace ID
  const workspaceId = extractWorkspaceId(request, searchParams);
  
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400 }
    );
  }

  // Validate access (pass request URL for super admin audit logging)
  const { hasAccess, role, frozen } = await canAccessWorkspace(userId, workspaceId, request.url);
  
  // D8-001: Specific error for frozen workspaces
  if (frozen) {
    return NextResponse.json(
      { 
        error: 'Workspace is frozen',
        workspace_id: workspaceId,
        reason: 'This workspace has been suspended by an administrator',
      },
      { status: 403 }
    );
  }

  if (!hasAccess) {
    return NextResponse.json(
      { 
        error: 'Access denied to this workspace',
        workspace_id: workspaceId 
      },
      { status: 403 }
    );
  }

  // Access granted - return null to indicate success
  return null;
}

/**
 * Get user's default workspace
 */
export async function getUserDefaultWorkspace(userId: string): Promise<string | null> {
  // Super admin gets 'default' workspace
  if (SUPER_ADMIN_IDS.includes(userId)) {
    return 'default';
  }

  const { data, error } = await supabase
    .from('user_workspaces')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.workspace_id;
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string): Promise<
  Array<{
    workspace_id: string;
    role: string;
    workspace_name?: string;
  }>
> {
  const { data, error } = await supabase
    .from('user_workspaces')
    .select(`
      workspace_id,
      role,
      workspaces (
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    workspace_id: row.workspace_id,
    role: row.role,
    workspace_name: row.workspaces?.name,
  }));
}

/**
 * Clear cache for a specific user-workspace combination
 */
export function clearWorkspaceCache(userId: string, workspaceId: string) {
  const cacheKey = `${userId}:${workspaceId}`;
  accessCache.delete(cacheKey);
}

/**
 * Clear all cache entries for a user
 */
export function clearUserCache(userId: string) {
  for (const key of accessCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      accessCache.delete(key);
    }
  }
}

/**
 * Clear all cache entries for a workspace (all users)
 * Used when workspace membership changes or workspace is frozen/unfrozen.
 * D5-003: Ensures no stale access decisions survive membership mutations.
 */
export function clearAllWorkspaceEntries(workspaceId: string) {
  for (const key of accessCache.keys()) {
    if (key.endsWith(`:${workspaceId}`)) {
      accessCache.delete(key);
    }
  }
}

