/**
 * Workspace Auth Middleware (D5-004)
 *
 * Provides a consistent, composable wrapper for API route handlers that:
 * 1. Extracts workspace_id from the request
 * 2. Validates Clerk authentication
 * 3. Validates workspace membership via canAccessWorkspace()
 * 4. Sets tenant context for RLS (via setTenantContext on tenant-scoped client)
 * 5. Passes validated WorkspaceContext to the inner handler
 *
 * Routes that use this wrapper cannot accidentally skip workspace auth checks.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { extractWorkspaceId, canAccessWorkspace } from '@/lib/api-workspace-guard';
import { createTenantSupabaseClient, setTenantContext, supabaseAdmin } from '@/lib/supabase';
import type { TypedSupabaseClient } from '@/lib/supabase';

export interface WorkspaceContext {
  /** Authenticated Clerk user ID */
  userId: string;
  /** Validated workspace ID */
  workspaceId: string;
  /** User's role in the workspace (or 'super_admin') */
  role: string;
  /** Tenant-scoped Supabase client with RLS context set */
  tenantClient: TypedSupabaseClient;
  /** Service-role admin client (bypasses RLS) */
  adminClient: TypedSupabaseClient;
}

type WorkspaceHandler = (
  req: NextRequest,
  ctx: WorkspaceContext,
) => Promise<NextResponse>;

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * Wraps an API route handler with workspace authentication and tenant context.
 *
 * @example
 * ```ts
 * export const GET = withWorkspaceAuth(async (req, ctx) => {
 *   // ctx.workspaceId, ctx.userId, ctx.role, ctx.tenantClient are available
 *   const { data } = await ctx.adminClient.from('contacts').select('*').eq('workspace_id', ctx.workspaceId);
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withWorkspaceAuth(handler: WorkspaceHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // 1. Authenticate via Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401, headers: API_HEADERS },
      );
    }

    // 2. Extract workspace_id
    const url = new URL(req.url);
    const workspaceId = extractWorkspaceId(req, url.searchParams);
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400, headers: API_HEADERS },
      );
    }

    // 3. Validate membership / super admin (pass URL for audit logging)
    const { hasAccess, role, frozen } = await canAccessWorkspace(userId, workspaceId, req.url);

    // D8-001: Specific error for frozen workspaces
    if (frozen) {
      return NextResponse.json(
        { error: 'Workspace is frozen', workspace_id: workspaceId, reason: 'This workspace has been suspended by an administrator' },
        { status: 403, headers: API_HEADERS },
      );
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this workspace', workspace_id: workspaceId },
        { status: 403, headers: API_HEADERS },
      );
    }

    // 4. Build tenant-scoped client and set RLS context
    const tenantClient = createTenantSupabaseClient(workspaceId);
    await setTenantContext(tenantClient, workspaceId);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: API_HEADERS },
      );
    }

    // 5. Delegate to inner handler
    return handler(req, {
      userId,
      workspaceId,
      role: role || 'member',
      tenantClient,
      adminClient: supabaseAdmin,
    });
  };
}
