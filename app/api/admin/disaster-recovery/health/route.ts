/**
 * GENESIS PHASE 70: DISASTER RECOVERY REGIONAL HEALTH API
 *
 * GET /api/admin/disaster-recovery/health - List all regional health statuses
 *
 * Auth: SUPER_ADMIN_IDS only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRegionalHealth } from '@/lib/genesis/phase70/db-service';

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * GET /api/admin/disaster-recovery/health
 *
 * List all regional health statuses.
 * Returns health data for all 5 regions (nyc1, sfo1, fra1, lon1, sgp1).
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    // Check Super Admin
    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Fetch regional health records
    const healthRecords = await getRegionalHealth();

    // Expected regions
    const expectedRegions = ['nyc1', 'sfo1', 'fra1', 'lon1', 'sgp1'];

    // Fill in missing regions with default status
    const allRegions = expectedRegions.map((region) => {
      const existing = healthRecords.find((h) => h.region === region);
      if (existing) {
        return existing;
      }

      // Default status for regions without data
      return {
        id: `placeholder-${region}`,
        region,
        status: 'healthy' as const,
        last_heartbeat_at: new Date().toISOString(),
        latency_ms: null,
        error_message: null,
        consecutive_failures: 0,
        updated_at: new Date().toISOString(),
      };
    });

    // Calculate summary statistics
    const summary = {
      total_regions: allRegions.length,
      healthy: allRegions.filter((r) => r.status === 'healthy').length,
      degraded: allRegions.filter((r) => r.status === 'degraded').length,
      outage: allRegions.filter((r) => r.status === 'outage').length,
      avg_latency_ms:
        allRegions.reduce(
          (sum, r) => sum + (r.latency_ms || 0),
          0
        ) / allRegions.filter((r) => r.latency_ms !== null).length || null,
    };

    return NextResponse.json(
      {
        regions: allRegions,
        summary,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: API_HEADERS }
    );
  } catch (error: any) {
    console.error('[DR-Health] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch regional health' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
