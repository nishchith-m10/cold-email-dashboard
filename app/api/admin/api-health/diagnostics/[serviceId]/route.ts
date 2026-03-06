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
import { isSuperAdmin } from '@/lib/workspace-access';

// ============================================
// CONFIGURATION
// ============================================

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
  statusOverride?: HealthStatus,
  errorOverride?: string,
): Promise<DiagnosticGuide | null> {
  const registry = createDefaultRegistry();
  const engine  = new DiagnosticEngine();
  const check   = registry.getById(serviceId);
  if (!check) return null;

  // When the UI already knows the current status (non-ok), build a synthetic
  // ServiceHealth object and skip the live re-check.  A live re-check races
  // against the cached state and often returns 'ok', which incorrectly yields
  // "No diagnostic available" even though the service was recently in error.
  if (statusOverride && statusOverride !== 'ok') {
    const syntheticHealth = {
      id:            serviceId,
      name:          check.name,
      category:      check.category,
      criticalLevel: check.criticalLevel,
      status:        statusOverride,
      result: {
        status:    statusOverride,
        error:     errorOverride || `${check.name} is ${statusOverride}`,
        checkedAt: new Date().toISOString(),
      },
      fixPath: check.fixPath,
    };
    return engine.getDiagnostic(syntheticHealth);
  }

  // Fall back to live check only when no status hint is provided
  try {
    const runner = new HealthRunner(registry);
    const serviceHealth = await runner.runOne(serviceId);
    if (!serviceHealth) return null;
    return engine.getDiagnostic(serviceHealth);
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.warn(
      `[APIHealth] Diagnostic generation failed for ${serviceId}:`,
      error instanceof Error ? error.message : error
    );
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

    if (!isSuperAdmin(userId)) {
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

    // Parse optional status + error query params supplied by the UI
    const url         = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const errorParam  = url.searchParams.get('error') || undefined;
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

    const guide = await generateDiagnostic(serviceId, status, errorParam);

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
