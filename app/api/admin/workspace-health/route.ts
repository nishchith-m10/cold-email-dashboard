/**
 * GET  /api/admin/workspace-health?workspace_id=<id>  — last cached results
 * POST /api/admin/workspace-health                     — run checks, save, return
 *
 * Auth: Super Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isSuperAdmin } from '@/lib/workspace-access';
import {
  runWorkspaceHealthCheck,
  getWorkspaceHealth,
} from '@/lib/genesis/workspace-health-runner';

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } as const;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: HEADERS });
  if (!isSuperAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: HEADERS });

  const workspaceId = new URL(req.url).searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400, headers: HEADERS });

  try {
    const report = await getWorkspaceHealth(workspaceId);
    return NextResponse.json({ success: true, report }, { headers: HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500, headers: HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: HEADERS });
  if (!isSuperAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: HEADERS });

  let workspaceId: string;
  try {
    const body = await req.json();
    workspaceId = body.workspace_id;
    if (!workspaceId) throw new Error('workspace_id required');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid body' }, { status: 400, headers: HEADERS });
  }

  try {
    const report = await runWorkspaceHealthCheck(workspaceId);
    return NextResponse.json({ success: true, report }, { headers: HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500, headers: HEADERS });
  }
}
