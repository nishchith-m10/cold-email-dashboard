/**
 * GENESIS PHASE 71 - DIAGNOSTIC GUIDE
 * Endpoint: GET /api/admin/api-health/diagnostics/:serviceId
 *
 * Retrieve actionable diagnostic guide for a specific service issue.
 * Route param:
 *   - serviceId: Service ID (e.g., 'openai', 'anthropic', 'supabase')
 *
 * Query params (optional):
 *   - status: Current status to filter diagnostics ('degraded' or 'error')
 *
 * Returns: DiagnosticGuide with step-by-step fix instructions
 *
 * Auth: Super Admin only
 * LAW #5 Compliance: 16-nines quality with comprehensive diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createDefaultRegistry,
  HealthRunner,
  DiagnosticEngine,
  type DiagnosticGuide,
  type HealthStatus,
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

const VALID_STATUSES: HealthStatus[] = ['ok', 'degraded', 'error'];

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

  return { valid: true };
}

// ============================================
// HELPER: Generate Diagnostic Guide
// ============================================
async function generateDiagnostic(
  serviceId: string,
  status?: HealthStatus
): Promise<DiagnosticGuide | null> {
  const registry = createDefaultRegistry();
  const runner = new HealthRunner(registry);
  const engine = new DiagnosticEngine();

  try {
    // Run the health check to get ServiceHealth result
    const serviceHealth = await runner.runOne(serviceId);
    
    if (!serviceHealth) {
      return null;
    }

    // Generate diagnostic guide from the health check result
    const guide = engine.getDiagnostic(serviceHealth);
    return guide;
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.warn(
      `[APIHealth] Diagnostic generation failed for ${serviceId} (live check may be unavailable):`,
      error instanceof Error ? error.message : error
    );
    // Return null instead of throwing — the UI handles null guide gracefully
    return null;
  }
}

// ============================================
// GET: Retrieve Diagnostic Guide
// ============================================
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
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
    const serviceId = params.serviceId;

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

    // Parse optional status query param
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    let status: HealthStatus | undefined;

    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as HealthStatus)) {
        return NextResponse.json(
          {
            error: 'Invalid status parameter',
            validStatuses: VALID_STATUSES,
          },
          { status: 400, headers: API_HEADERS }
        );
      }
      status = statusParam as HealthStatus;
    }

    // Generate diagnostic guide
    /* eslint-disable-next-line no-console */
    console.log(
      `[APIHealth] Generating diagnostic for: ${serviceId}${status ? ` (${status})` : ''}`
    );

    const guide = await generateDiagnostic(serviceId, status);

    // Get service metadata from registry
    const registry = createDefaultRegistry();
    const check = registry.getById(serviceId);

    return NextResponse.json(
      {
        success: true,
        serviceId,
        guide,
        metadata: {
          category: check?.category,
          criticalLevel: check?.criticalLevel,
          fixPath: check?.fixPath,
        },
      },
      { headers: API_HEADERS }
    );
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[APIHealth] Diagnostics GET error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: API_HEADERS }
    );
  }
}
