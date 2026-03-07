/**
 * PHASE 64: Brand Info API
 * 
 * GET /api/onboarding/brand - Get brand info
 * POST /api/onboarding/brand - Save brand info
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { BrandVaultService } from '@/lib/genesis/phase64/brand-vault-service';

// Lazy initialize to avoid module-level errors
let brandService: BrandVaultService | null = null;

function getBrandService() {
  if (!brandService) {
    brandService = new BrandVaultService({
      supabaseClient: supabaseAdmin,
    });
  }
  return brandService;
}

/**
 * GET - Get brand information
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
      const service = getBrandService();
      const result = await service.getBrandInfo(workspaceId);

      if (!result.success) {
        // Return empty brand info if table doesn't exist yet
        return NextResponse.json({
          companyName: '',
          website: '',
          industry: '',
          description: '',
        });
      }

      return NextResponse.json(result.brandInfo);
    } catch (dbError: any) {
      console.warn('Database error in brand GET:', dbError.message);
      return NextResponse.json({
        companyName: '',
        website: '',
        industry: '',
        description: '',
      });
    }
  } catch (error) {
    console.error('Brand info GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Save brand information
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const {
      workspaceId,
      companyName,
      website,
      industry,
      description,
      logoUrl,
      targetAudience,
      products,
    } = body;

    if (!workspaceId || !companyName) {
      return NextResponse.json(
        { error: 'workspaceId and companyName required' },
        { status: 400 }
      );
    }

    try {
      const service = getBrandService();
      const result = await service.storeBrandInfo(workspaceId, {
        companyName,
        website,
        industry,
        description,
        logoUrl,
        targetAudience,
        products,
        autoScraped: false,
      });

      if (!result.success) {
        console.error('[brand POST] Store failed:', result.error);
        return NextResponse.json({ error: result.error || 'Failed to save brand info' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      console.error('[brand POST] Database error:', dbError.message);
      return NextResponse.json({ error: dbError.message || 'Database error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Brand info POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
