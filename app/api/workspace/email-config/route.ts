/**
 * Phase 64.B: Email Provider Configuration API
 * 
 * GET: Return decrypted email config for n8n runtime
 * POST: Save email provider configuration
 * DELETE: Remove email provider configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTypedSupabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { EmailProviderService } from '@/lib/genesis/phase64b/email-provider-service';
import { SaveEmailConfigRequest } from '@/lib/genesis/phase64b/email-provider-types';
import { EncryptionService } from '@/lib/genesis/phase64';

// Lazy initialization to prevent errors when env vars not configured
let encryptionService: EncryptionService | null = null;

function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY not configured');
    }
    encryptionService = new EncryptionService(masterKey);
  }
  return encryptionService;
}

/**
 * Create EmailProviderService with typed Supabase admin client
 */
function createEmailProviderService() {
  const supabase = getTypedSupabaseAdmin();
  return new EmailProviderService(supabase as any);
}

/**
 * GET: Return decrypted email configuration for n8n runtime
 * 
 * This endpoint is called by n8n workflows to determine which email provider to use
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }
    
    // Verify user has access to workspace
    const supabase = getTypedSupabaseAdmin();
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single();
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    // Get decrypted config
    const service = createEmailProviderService();
    const config = await service.getDecryptedConfig(workspaceId);
    
    if (!config) {
      // Default to Gmail if no config exists
      return NextResponse.json({ provider: 'gmail' });
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error getting email config:', error);
    
    // Graceful fallback - return Gmail as default
    return NextResponse.json({ provider: 'gmail' });
  }
}

/**
 * POST: Save email provider configuration
 * 
 * Phase 64.B: Accepts workspace_id from either:
 * - Query param: ?workspace_id=xxx
 * - Request body: { workspace_id: 'xxx', ... }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const body: SaveEmailConfigRequest & { workspace_id?: string } = await request.json();
    
    // Phase 64.B: Accept workspace_id from either query param or body
    const workspaceId = searchParams.get('workspace_id') || body.workspace_id;
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }
    
    // Verify user has access to workspace
    const supabase = getTypedSupabaseAdmin();
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single();
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    // Save configuration
    const service = createEmailProviderService();
    const config = await service.saveConfig(workspaceId, body);
    
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error saving email config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save email configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove email provider configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }
    
    // Verify user has access to workspace
    const supabase = getTypedSupabaseAdmin();
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single();
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    // Delete configuration
    const service = createEmailProviderService();
    await service.deleteConfig(workspaceId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete email configuration' },
      { status: 500 }
    );
  }
}
