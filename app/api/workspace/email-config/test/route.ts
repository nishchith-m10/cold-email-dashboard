/**
 * Phase 64.B: Email Provider Test Connection API
 * 
 * POST: Test email provider connection before saving
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { EmailProviderService } from '@/lib/genesis/phase64b/email-provider-service';
import { TestEmailRequest } from '@/lib/genesis/phase64b/email-provider-types';
import { getTypedSupabaseAdmin } from '@/lib/supabase';

/**
 * POST: Test email provider connection
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body: TestEmailRequest = await request.json();
    
    // Create service instance
    const supabase = getTypedSupabaseAdmin();
    const service = new EmailProviderService(supabase as any);
    
    // Test connection
    const result = await service.testConnection(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing email connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
