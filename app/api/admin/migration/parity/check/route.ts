/**
 * GENESIS PHASE 46 - MIGRATION CONTROL CENTER
 * Endpoint: POST /api/admin/migration/parity/check
 *
 * Run parity verification for a workspace migration.
 * Compares source and target tables to detect mismatches.
 *
 * Auth: Super Admin only
 * Body: { workspaceId }
 * Query Params: dryRun=true (uses mock database)
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
// POST: Check Parity
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

    // Run parity check using orchestrator
    const orchestrator = new MigrationOrchestrator(db);
    const result = await orchestrator.runParityCheck(workspaceId);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: dryRun
          ? `Parity check completed (DRY RUN): ${result.parityScore}% match`
          : `Parity check completed: ${result.parityScore}% match`,
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Migration Parity] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check parity',
      },
      { status: 500, headers: API_HEADERS }
    );
  }
}
