/**
 * GENESIS PHASE 71 - SINGLE SERVICE CHECK
 * Endpoint: POST /api/admin/api-health/check/:id
 *
 * Run health check for a specific service.
 * Route param:
 *   - id: Service ID (e.g., 'openai', 'anthropic', 'supabase')
 *
 * Returns: ServiceHealth result for that specific service
 *
 * Auth: Super Admin only
 * LAW #5 Compliance: 16-nines quality with service validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createDefaultRegistry,
  HealthRunner,
  type ServiceHealth,
} from '@/lib/genesis/phase71';

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
// HELPER: Validate Service ID
// ============================================
function validateServiceId(serviceId: string): {
  valid: boolean;
  error?: string;
  availableServices?: string[];
} {
  if (!serviceId || serviceId.trim() === '') {
    return { valid: false, error: 'Service ID is required' };
  }

  const registry = createDefaultRegistry();
  const check = registry.getById(serviceId);

  if (!check) {
    const availableServices = registry.getAll().map((c) => c.id);
    return {
      valid: false,
      error: `Service '${serviceId}' not found`,
      availableServices,
    };
  }

  if (!check.enabled) {
    return {
      valid: false,
      error: `Service '${serviceId}' is disabled`,
    };
  }

  return { valid: true };
}

// ============================================
// HELPER: Run Single Check
// ============================================
async function runSingleCheck(serviceId: string): Promise<ServiceHealth> {
  const registry = createDefaultRegistry();
  const runner = new HealthRunner(registry);

  try {
    const result = await runner.runOne(serviceId);
    if (!result) throw new Error(`No result for service: ${serviceId}`);
    return result;
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error(`[APIHealth] Check failed for ${serviceId}:`, error);
    throw new Error(`Failed to run check for service: ${serviceId}`);
  }
}

// ============================================
// POST: Run Single Service Check
// ============================================
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // Check database availability (for logging/metrics)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable - database not configured' },
        { status: 503, headers: API_HEADERS }
      );
    }

    // Auth: Super Admin only
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401, headers: API_HEADERS }
      );
    }

    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Extract and validate service ID
    const params = await context.params;
    const serviceId = params.id;

    const validation = validateServiceId(serviceId);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          availableServices: validation.availableServices,
        },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Run the check
    /* eslint-disable-next-line no-console */
    console.log(`[APIHealth] Running check for service: ${serviceId}`);

    const result = await runSingleCheck(serviceId);
    const durationMs = Date.now() - startTime;

    /* eslint-disable-next-line no-console */
    console.log(
      `[APIHealth] Check complete: ${serviceId} -> ${result.status} (${durationMs}ms)`
    );

    return NextResponse.json(
      {
        success: true,
        serviceId,
        result,
        durationMs,
      },
      { headers: API_HEADERS }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;

    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] Single check error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage, durationMs },
      { status: 500, headers: API_HEADERS }
    );
  }
}
