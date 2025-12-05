import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ, RATE_LIMIT_STRICT } from '@/lib/rate-limit';
import { 
  getWorkspaceAccess, 
  getWorkspaceMembers, 
  addUserToWorkspace, 
  removeUserFromWorkspace,
  updateUserRole,
  WorkspaceRole,
} from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/members
 * 
 * Get all members of a workspace
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members:${clientId}`, RATE_LIMIT_READ);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check access
  const access = await getWorkspaceAccess(userId, workspaceId);
  if (!access) {
    return NextResponse.json(
      { error: 'Access denied to this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  // Get members
  const { members, error } = await getWorkspaceMembers(workspaceId);

  if (error) {
    return NextResponse.json(
      { error },
      { status: 500, headers: API_HEADERS }
    );
  }

  return NextResponse.json({
    members,
    workspaceId,
    yourRole: access.role,
    canManage: access.canManage,
  }, { headers: API_HEADERS });
}

/**
 * POST /api/workspaces/[workspaceId]/members
 * 
 * Add a member to the workspace
 * Body: { userId: string, role?: 'admin' | 'member' | 'viewer' }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members-add:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check management access
  const access = await getWorkspaceAccess(currentUserId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { userId: newUserId, role = 'member' } = body;

    if (!newUserId || typeof newUserId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Validate role
    const validRoles: WorkspaceRole[] = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, member, or viewer' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Add user
    const { success, error } = await addUserToWorkspace(workspaceId, newUserId, role);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to add member' },
        { status: 400, headers: API_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User added to workspace as ${role}`,
    }, { status: 201, headers: API_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }
}

/**
 * PATCH /api/workspaces/[workspaceId]/members
 * 
 * Update a member's role
 * Body: { userId: string, role: 'admin' | 'member' | 'viewer' }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members-update:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check management access
  const access = await getWorkspaceAccess(currentUserId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { userId: targetUserId, role } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Validate role
    const validRoles: WorkspaceRole[] = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, member, or viewer' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Can't change owner's role
    const targetAccess = await getWorkspaceAccess(targetUserId, workspaceId);
    if (targetAccess?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Update role
    const { success, error } = await updateUserRole(workspaceId, targetUserId, role);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to update role' },
        { status: 400, headers: API_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
    }, { headers: API_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/members
 * 
 * Remove a member from the workspace
 * Query: ?userId=xxx
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members-remove:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check management access
  const access = await getWorkspaceAccess(currentUserId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId');

  if (!targetUserId) {
    return NextResponse.json(
      { error: 'userId query parameter is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  // Can't remove owner
  const targetAccess = await getWorkspaceAccess(targetUserId, workspaceId);
  if (targetAccess?.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot remove workspace owner' },
      { status: 400, headers: API_HEADERS }
    );
  }

  // Remove user
  const { success, error } = await removeUserFromWorkspace(workspaceId, targetUserId);

  if (!success) {
    return NextResponse.json(
      { error: error || 'Failed to remove member' },
      { status: 400, headers: API_HEADERS }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'User removed from workspace',
  }, { headers: API_HEADERS });
}

