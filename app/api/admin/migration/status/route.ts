/**
 * GENESIS PHASE 46 - MIGRATION CONTROL CENTER
 * Endpoint: GET /api/admin/migration/status
 *
 * Returns current migration state for all workspaces or specific workspace.
 * Used by admin UI for real-time status polling.
 *
 * Auth: Super Admin only
 * Query Params:
 *   - workspaceId: Filter by specific workspace (optional)
 *   - dryRun: Use mock database (default: false)
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SupabaseMigrationDB } from '@/lib/genesis/phase46/supabase-migration-db';
import { MockMigrationDB } from '@/lib/genesis/phase46/mock-migration-db';
import type { MigrationDB } from '@/lib/genesis/phase46/types';

// ============================================
// CONFIGURATION
// ============================================
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '')
  .split(',')
  .filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

// ============================================
// HELPER: Get DB Instance
// ============================================
function getDB(dryRun: boolean): MigrationDB {
  if (dryRun) {
    return new MockMigrationDB();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return new SupabaseMigrationDB(supabaseUrl, supabaseKey);
}

// ============================================
// GET: Fetch Migration Status
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Auth: Super Admin only
    const { userId } = await auth();

    if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const dryRun = searchParams.get('dryRun') === 'true';

    const db = getDB(dryRun);

    // Fetch migration state
    if (workspaceId) {
      const state = await db.getMigrationState(workspaceId);

      if (!state) {
        return NextResponse.json(
          { success: false, error: 'Migration not found' },
          { status: 404, headers: API_HEADERS }
        );
      }

      return NextResponse.json(
        { success: true, data: state },
        { status: 200, headers: API_HEADERS }
      );
    }

    // List all migrations
    const states = await db.listMigrationStates();

    return NextResponse.json(
      { success: true, data: states },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Migration Status] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch migration status',
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}
