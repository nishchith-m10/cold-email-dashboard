/**
 * PHASE 73: Control Plane Health API Route
 *
 * Proxies health check requests from the admin dashboard
 * to the Control Plane service. Returns a graceful fallback
 * when the Control Plane is not deployed (Stage 1).
 *
 * GET /api/admin/control-plane-health
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5
 */

import { NextResponse } from 'next/server';

const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_URL || '';

export async function GET() {
  // Stage 1 (Vercel-only): no Control Plane deployed
  if (!CONTROL_PLANE_URL) {
    return NextResponse.json(
      {
        status: 'not_deployed',
        stage: 'MVP',
        message: 'Control Plane not deployed. Running in Vercel-only mode (Stage 1).',
        workers: {},
        services: {},
        uptime_seconds: 0,
        started_at: null,
        version: 'N/A',
      },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(`${CONTROL_PLANE_URL}/health`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          message: `Control Plane returned HTTP ${response.status}`,
          workers: {},
          services: {},
          uptime_seconds: 0,
          started_at: null,
          version: 'unknown',
        },
        { status: 503 }
      );
    }

    const health = await response.json();
    return NextResponse.json(health);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reach Control Plane';

    return NextResponse.json(
      {
        status: 'unreachable',
        message,
        workers: {},
        services: {},
        uptime_seconds: 0,
        started_at: null,
        version: 'unknown',
      },
      { status: 503 }
    );
  }
}
