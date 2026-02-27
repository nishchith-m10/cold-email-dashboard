/**
 * PHASE 64: Onboarding Progress API
 * 
 * GET /api/onboarding/progress - Get current progress
 * POST /api/onboarding/progress - Update progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { OnboardingProgressService, ONBOARDING_STAGES } from '@/lib/genesis/phase64/onboarding-progress-service';

// Lazy initialize to avoid module-level errors
let progressService: OnboardingProgressService | null = null;

function getProgressService() {
  if (!progressService) {
    progressService = new OnboardingProgressService({
      supabaseClient: supabaseAdmin,
    });
  }
  return progressService;
}

/**
 * GET - Get onboarding progress
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
      const service = getProgressService();
      const result = await service.getProgress(workspaceId);

      if (!result.success) {
        // If table doesn't exist, return default progress
        console.warn('Progress service error (might be missing table):', result.error);
        return NextResponse.json({
          currentStage: ONBOARDING_STAGES[0],
          completedStages: [],
          startedAt: null,
          completedAt: null,
        });
      }

      return NextResponse.json({
        currentStage: result.progress?.currentStage || ONBOARDING_STAGES[0],
        completedStages: result.progress?.completedStages || [],
        startedAt: result.progress?.startedAt,
        completedAt: result.progress?.completedAt,
      });
    } catch (dbError: any) {
      // Handle database errors gracefully - return default state
      console.warn('Database error in progress GET:', dbError.message);
      return NextResponse.json({
        currentStage: ONBOARDING_STAGES[0],
        completedStages: [],
        startedAt: null,
        completedAt: null,
      });
    }
  } catch (error) {
    console.error('Onboarding progress GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Update onboarding progress
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const { workspaceId, completedStage } = body;

    if (!workspaceId || !completedStage) {
      return NextResponse.json(
        { error: 'workspaceId and completedStage required' },
        { status: 400 }
      );
    }

    try {
      const service = getProgressService();
      const result = await service.completeStage(workspaceId, completedStage);

      if (!result.success) {
        console.error('Progress update failed:', result.error);
        return NextResponse.json(
          { success: false, error: 'Progress could not be saved. Please try again.' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        nextStage: result.nextStage,
      });
    } catch (dbError: any) {
      console.error('Database error in progress POST:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Progress could not be saved. Please try again.' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Onboarding progress POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
