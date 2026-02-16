/**
 * GENESIS PHASE 46 - MIGRATION CONTROL CENTER
 * Endpoint: POST /api/admin/migration/dual-write/enable
 *
 * Enable dual-write triggers for a workspace migration.
 * Creates database triggers that write to both source and target tables.
 *
 * Auth: Super Admin only
 * Body: { workspaceId }
 * Query Params: dryRun=true (simulates without creating triggers)
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SupabaseMigrationDB } from '@/lib/genesis/phase46/supabase-migration-db';
import { MockMigrationDB } from '@/lib/genesis/phase46/mock-migration-db';
import { MigrationOrchestrator } from '@/lib/genesis/phase46/migration-orchestrator';

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
// POST: Enable Dual-Write
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Auth: Super Admin only
    const { userId } = await auth();

    if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Parse body
    const body = (await request.json()) as { workspaceId: string };
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: workspaceId' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    // Get DB instance
    const db = dryRun ? new MockMigrationDB() : (() => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      return new SupabaseMigrationDB(supabaseUrl, supabaseKey);
    })();

    // Enable dual-write using orchestrator
    const orchestrator = new MigrationOrchestrator(db);
    const state = await orchestrator.startDualWrite(workspaceId);

    return NextResponse.json(
      {
        success: true,
        data: state,
        message: dryRun
          ? 'Dual-write enabled (DRY RUN - no triggers created)'
          : 'Dual-write enabled successfully',
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Migration Dual-Write] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable dual-write',
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}
