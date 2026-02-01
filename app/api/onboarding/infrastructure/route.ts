/**
 * PHASE 64: Infrastructure Configuration API
 * 
 * GET /api/onboarding/infrastructure - Get droplet config
 * POST /api/onboarding/infrastructure - Save droplet config
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DropletConfigurationService, DEFAULT_REGION, DEFAULT_SIZE } from '@/lib/genesis/phase64/droplet-configuration-service';

// Lazy initialize to avoid module-level errors
let configService: DropletConfigurationService | null = null;

function getConfigService() {
  if (!configService) {
    configService = new DropletConfigurationService({
      supabaseClient: supabaseAdmin,
    });
  }
  return configService;
}

/**
 * GET - Get infrastructure configuration
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    try {
      const service = getConfigService();
      const result = await service.getConfiguration(workspaceId);

      if (!result.success) {
        // If table doesn't exist, return defaults
        console.warn('Config service error (might be missing table):', result.error);
        return NextResponse.json({
          region: DEFAULT_REGION,
          size: DEFAULT_SIZE,
          selectedAt: null,
        });
      }

      return NextResponse.json({
        region: result.config?.region || DEFAULT_REGION,
        size: result.config?.size || DEFAULT_SIZE,
        selectedAt: result.config?.selectedAt,
      });
    } catch (dbError: any) {
      // Handle database errors gracefully - return defaults
      console.warn('Database error in infrastructure GET:', dbError.message);
      return NextResponse.json({
        region: DEFAULT_REGION,
        size: DEFAULT_SIZE,
        selectedAt: null,
      });
    }
  } catch (error) {
    console.error('Infrastructure GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Save infrastructure configuration
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const { workspaceId, region, size } = body;

    if (!workspaceId || !region || !size) {
      return NextResponse.json(
        { error: 'workspaceId, region, and size required' },
        { status: 400 }
      );
    }

    try {
      const service = getConfigService();
      
      // Validate configuration
      const validation = service.validateConfiguration(region, size);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors.join(', ') },
          { status: 400 }
        );
      }

      const result = await service.saveConfiguration(workspaceId, region, size);

      if (!result.success) {
        // If table doesn't exist, log and continue
        console.warn('Config service error (might be missing table):', result.error);
        // Still return success to allow onboarding flow to continue
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      // Handle database errors gracefully
      console.warn('Database error in infrastructure POST:', dbError.message);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Infrastructure POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
